"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadDecisionWorkspace, evaluateWorkspace, type WorkspaceRule } from "@/lib/decision-workspace";
import { parseDecisionPolicy, uuidV5, type RuleAction } from "@agentes-meta/core";
import { parseBudgetDraft } from "@/lib/hoy-view";
import type { DecisionFormResult } from "@/lib/decision-contract";

const fail = (message: string): DecisionFormResult => ({ ok: false, message });
const errorText = "No se pudo guardar la decisión. Tu borrador sigue disponible; actualiza si otra persona ya decidió.";
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
function policyInput(form: FormData) {
  const name = String(form.get("name") ?? "").trim(), action = String(form.get("action") ?? "") as RuleAction;
  if (!name || name.length > 100) throw new Error("Escribe un nombre de hasta 100 caracteres.");
  const number = (key: string) => { const raw = String(form.get(key) ?? "").trim(); if (!/^\d+(\.\d{1,4})?$/.test(raw)) throw new Error(`Revisa el valor de ${key}.`); return Number(raw); };
  const condition = parseDecisionPolicy({ version: 1, level: form.get("level"), metric: form.get("metric"), operator: form.get("operator"), threshold: number("threshold"), days: number("days"), minPurchases: number("minPurchases"), minSpend: number("minSpend"), changePct: action === "pausar_anuncio" ? 0 : number("changePct"), consecutive: form.get("consecutive") === "on" }, action);
  return { name, action, condition };
}
export async function previewDecisionPolicy(_previous: DecisionFormResult, form: FormData): Promise<DecisionFormResult> {
  await requireMember("/decisiones");
  let policy; try { policy = policyInput(form); } catch (e) { return fail((e as Error).message); }
  try {
    const workspace = await loadDecisionWorkspace(String(form.get("account") ?? ""));
    const rule: WorkspaceRule = { ...policy, condition: { ...policy.condition }, id: "preview", status: "activa", mode: "semi", params: {}, version: 1, description: null };
    const preview = evaluateWorkspace(workspace, [rule]);
    return { ok: true, message: `${preview.proposals.length} candidatos detectados; ${preview.proposals.filter(p => !p.blocked).length} cumplen los límites actuales.`, preview };
  } catch { return fail("No se pudo completar la evaluación con datos de la cuenta. Intenta de nuevo."); }
}
export async function saveDecisionPolicy(_previous: DecisionFormResult, form: FormData): Promise<DecisionFormResult> {
  const user = await requireAdmin("/decisiones");
  let policy; try { policy = policyInput(form); } catch (e) { return fail((e as Error).message); }
  const id = String(form.get("ruleId") ?? ""), expected = Number(form.get("version")), active = form.get("intent") === "activate";
  if (id && (!uuid(id) || !Number.isInteger(expected) || expected < 1)) return fail("La versión de la regla no es válida.");
  try {
    const workspace = await loadDecisionWorkspace(String(form.get("account") ?? ""));
    if (active && (workspace.profile.dry_run !== true || workspace.profile.mode !== "semi")) return fail("Para usar esta regla, configura la cuenta en semi y simulación.");
    if (policy.condition.changePct > workspace.profile.max_budget_change_pct) return fail("El porcentaje supera el máximo por cambio configurado en la cuenta.");
    if (active && form.get("acknowledge") !== "on") return fail("Confirma que revisaste estos criterios antes de usar la regla.");
    const sb = db(), patch = { ...policy, condition: { ...policy.condition }, description: "Criterios estructurados revisados por un administrador", definition: { source: "decision-workspace-v1" }, params: { review_only: true }, status: active ? "activa" : "inactiva", active, mode: "semi", updated_by: user.email };
    const saved = id
      ? await sb.from("rules").update(patch).eq("id", id).eq("account_id", workspace.account.id).eq("version", expected).select("id").maybeSingle()
      : await sb.from("rules").insert({ ...patch, account_id: workspace.account.id, origin: "decision-workspace-v1" }).select("id").single();
    if (saved.error || !saved.data) return fail("No se guardó: la regla cambió o la base no respondió. Actualiza antes de reintentar.");
    revalidatePath("/decisiones"); revalidatePath("/hoy");
    return { ok: true, message: active ? "Regla guardada para propuestas en simulación. Ya puedes generar la cola." : "Borrador guardado. Puedes editarlo y evaluar sus criterios antes de usarlo." };
  } catch { return fail(errorText); }
}
export async function generateDecisionProposals(_previous: DecisionFormResult, form: FormData): Promise<DecisionFormResult> {
  await requireMember("/decisiones");
  try {
    const w = await loadDecisionWorkspace(String(form.get("account") ?? ""));
    const evaluation = evaluateWorkspace(w);
    const accepted = evaluation.proposals.filter(p => !p.blocked);
    if (!accepted.length) return { ok: true, message: w.rules.some(r => r.status === "activa" && r.condition?.version === 1) ? "Ningún candidato cumple todos los criterios y límites. Revisa las razones de la evaluación." : "Guarda y habilita una regla revisada para generar propuestas.", preview: evaluation };
    const unique = new Set<string>();
    const rows = accepted.filter(p => { const key = p.campaign_id ?? p.entity_id; if (unique.has(key)) return false; unique.add(key); return true; }).map(p => {
      const rule = w.rules.find(r => r.id === p.rule_id)!;
      return { id: uuidV5(`decision-v1|${w.account.id}|${p.rule_id}|${rule.version}|${p.entity_id}|${w.source.today}`), account_id: w.account.id, rule_id: p.rule_id, rule_name: p.rule_name, entity_id: p.entity_id, entity_name: p.entity_name, entity_level: p.entity_level, campaign_id: p.campaign_id, action: p.action, before_value: p.before, after_value: p.after, status: "pendiente", expires_at: new Date(Date.parse(w.source.now) + 86400000).toISOString(), evidence: [...p.evidence, { ref: "RULE_VERSION", label: "Versión de la regla", value: rule.version }], locks: p.locks };
    });
    const saved = await db().from("proposals").upsert(rows, { onConflict: "id", ignoreDuplicates: true }).select("id");
    if (saved.error) return fail(errorText);
    revalidatePath("/hoy"); revalidatePath("/decisiones");
    return { ok: true, message: `${saved.data?.length ?? 0} propuestas nuevas en Hoy. Cada una requiere tu revisión.`, preview: evaluation };
  } catch { return fail("No se pudo generar la cola con una lectura completa. Intenta de nuevo."); }
}
export async function reviewDecisionProposal(_previous: DecisionFormResult, form: FormData): Promise<DecisionFormResult> {
  const user = await requireMember("/hoy");
  const id = String(form.get("id") ?? ""), account = String(form.get("account") ?? ""), decision = String(form.get("decision") ?? ""), reason = String(form.get("reason") ?? "").trim();
  if (!uuid(id) || !/^\d{1,30}$/.test(account) || !["simulada", "rechazada"].includes(decision) || reason.length > 1000) return fail("Revisa los datos de la decisión.");
  if (form.get("acknowledge") !== "on") return fail("Confirma que revisaste la evidencia y las restricciones de la cuenta.");
  if (decision === "rechazada" && !reason) return fail("Escribe la razón del rechazo.");
  try {
    const sb = db(), read = await sb.from("proposals").select("id,account_id,status,rule_id,before_value,after_value,action,entity_id,evidence").eq("id", id).eq("account_id", account).single();
    if (read.error || !read.data || read.data.status !== "pendiente") return fail("La propuesta ya no está pendiente o no pertenece a esta cuenta.");
    const proposal = read.data;
    const w = await loadDecisionWorkspace(account);
    let after = proposal.after_value;
    if (decision === "simulada") {
      const current = evaluateWorkspace(w, w.rules, id).proposals.find(p => p.rule_id === proposal.rule_id && p.entity_id === proposal.entity_id && p.action === proposal.action);
      if (!current || current.blocked) return fail(current?.reasons.join(" ") || "La evidencia actual ya no cumple la regla. Genera una evaluación nueva.");
      if (current.before !== proposal.before_value || current.after !== proposal.after_value) return fail("El presupuesto o la propuesta cambiaron desde su creación. Vuelve a evaluar.");
      if (typeof proposal.after_value === "number") { const amount = parseBudgetDraft(String(form.get("after") ?? "")); if (amount === null) return fail("Escribe un presupuesto positivo con hasta dos decimales."); after = amount / 100; }
      if (after !== proposal.after_value && !reason) return fail("Explica la corrección de presupuesto.");
    }
    const rule = w.rules.find(r => r.id === proposal.rule_id);
    const storedVersion = Array.isArray(proposal.evidence) ? proposal.evidence.find(e => e.ref === "RULE_VERSION")?.value : undefined;
    if (decision === "simulada" && (!rule || storedVersion !== rule.version)) return fail("La regla cambió o la propuesta no tiene versión verificable. Evalúa de nuevo.");
    const response = await sb.rpc("review_proposal_simulation_v1", { p_actor: user.email, p_account: account, p_id: id, p_decision: decision, p_after: after, p_reason: reason, p_profile_at: w.profile.updated_at, p_rule_version: rule?.version ?? 0 });
    if (response.error) return fail(response.error.code === "PGRST202" ? "Falta instalar la actualización de decisiones en la base de datos." : "No se guardó: cambió la propuesta, la política o alguno de sus límites. Actualiza la evidencia.");
    revalidatePath("/hoy"); revalidatePath("/decisiones");
    return { ok: true, message: decision === "simulada" ? "Decisión y orden simulada guardadas. No se enviaron cambios a Meta." : "Rechazo registrado con su razón." };
  } catch { return fail(errorText); }
}
export async function recordOpportunityDecision(_previous: DecisionFormResult, form: FormData): Promise<DecisionFormResult> {
  const user = await requireMember("/decisiones");
  const entity = String(form.get("entity") ?? ""), reason = String(form.get("reason") ?? "").trim(), decision = String(form.get("decision") ?? "");
  if (!reason || reason.length > 1000 || !["approved", "rejected"].includes(decision)) return fail("Registra una razón de hasta 1,000 caracteres.");
  try {
    const w = await loadDecisionWorkspace(String(form.get("account") ?? ""));
    const opportunity = w.opportunities.find(o => o.entityId === entity);
    if (!opportunity) return fail("La oportunidad ya no está en esta lectura. Actualiza.");
    const id = uuidV5(`review-v1|${w.account.id}|${opportunity.id}|${user.email}`);
    const response = await db().from("recommendations").upsert({ id, account_id: w.account.id, kind: "decision_review", entity_id: entity, rationale: reason, confidence: "insufficient", status: decision, decided_by: user.email, decided_at: w.source.now, decision_reason: reason, payload: { opportunity, review: decision === "approved" ? "Investigar y dar seguimiento" : "No intervenir", action_sent: false } }, { onConflict: "id", ignoreDuplicates: true }).select("id");
    if (response.error) return fail(errorText);
    revalidatePath("/decisiones"); revalidatePath("/hoy");
    return { ok: true, message: response.data?.length ? "Decisión guardada con la evidencia de esta ventana." : "Esta oportunidad ya tiene una decisión tuya registrada para esta ventana." };
  } catch { return fail(errorText); }
}
