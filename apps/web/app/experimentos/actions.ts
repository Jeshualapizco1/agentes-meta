"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, fetchAll } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { validateExperiment, explorationBudget, type ExperimentMetric } from "@agentes-meta/core";

const num = (v: FormDataEntryValue | null) => { const s = String(v ?? "").trim().replace(/[$,%\s]/g, ""); if (!s) return null; const n = Number(s); return Number.isFinite(n) ? n : null; };
function back(account: string, q: Record<string, string>): never { redirect(`/experimentos?account=${account}&${new URLSearchParams(q).toString()}`); }

/** Límite de exploración y lo comprometido por los experimentos activos/evaluando de la cuenta (sin contar `excludeId`). */
async function budgetCheck(sb: ReturnType<typeof db>, account: string, newBudget: number, excludeId?: string) {
  const [{ data: prof, error }, active] = await Promise.all([
    sb.from("account_profiles").select("daily_spend_ceiling,exploration_budget_pct").eq("account_id", account).maybeSingle(),
    fetchAll<{ id: string; budget: number | null }>(() => sb.from("experiments").select("id,budget").eq("account_id", account).in("status", ["activo", "evaluando"]).order("id")),
  ]);
  if (error) throw new Error("No se pudo verificar el presupuesto disponible.");
  return explorationBudget({ ceiling: prof?.daily_spend_ceiling != null ? Number(prof.daily_spend_ceiling) : null, pct: prof?.exploration_budget_pct != null ? Number(prof.exploration_budget_pct) : null, activeBudgets: (active ?? []).filter(x => x.id !== excludeId).map(x => Number(x.budget ?? 0)), newBudget });
}

/** Guarda un experimento como borrador o lo activa (intent=activar). Activar exige hipótesis, criterio y presupuesto, y cabida en el presupuesto de exploración. */
async function persistExperiment(form: FormData): Promise<{ error: string }> {
  const user = await requireMember("/experimentos");
  const account = String(form.get("account_id") ?? ""), sb = db();
  const entity_ids = [...new Set(form.getAll("entity").map(String))];
  if (!/^\d{1,30}$/.test(account) || entity_ids.length > 100) return { error: "Cuenta o selección de campañas inválida." };
  const { data: acc, error: accountError } = await sb.from("accounts").select("id").eq("id", account).eq("enabled", true).maybeSingle();
  if (accountError || !acc) return { error: "La cuenta no está disponible." };
  const { data: ents } = entity_ids.length ? await sb.from("entities").select("id,campaign_id").eq("account_id", account).eq("level", "campaign").in("id", entity_ids) : { data: [] };
  if (!ents || ents.length !== entity_ids.length) return { error: "Elige campañas disponibles de esta cuenta." };
  const sessionId = String(form.get("session_id") ?? "");
  if (sessionId) {
    const { data: session, error } = await sb.from("change_sessions").select("id").eq("id", sessionId).eq("account_id", account).maybeSingle();
    if (error || !session) return { error: "La sesión no corresponde a esta cuenta." };
  }
  const campaign_ids = [...new Set((ents ?? []).map(e => (e.campaign_id as string | null) ?? (e.id as string)))];
  const metric = String(form.get("metric") ?? ""); const m: ExperimentMetric | null = metric === "roas" || metric === "cpa" ? metric : null;
  const draft = { hypothesis: String(form.get("hypothesis") ?? "").trim() || null, metric: m, threshold: num(form.get("threshold")), min_purchases: num(form.get("min_purchases")), window_days: num(form.get("window_days")), budget: num(form.get("budget")), campaign_ids, start_date: String(form.get("start_date") ?? "").trim() || null };
  const name = String(form.get("name") ?? "").trim() || (draft.hypothesis ?? "").slice(0, 60) || "Experimento";
  const activar = String(form.get("intent")) === "activar";
  if (!["activar", "borrador"].includes(String(form.get("intent")))) return { error: "Elige guardar borrador o iniciar seguimiento." };
  const errs = validateExperiment(draft);
  if (errs.length) return { error: errs.join(" ") };
  if (activar) {
    try {
      const b = await budgetCheck(sb, account, draft.budget!); if (!b.ok) return { error: b.error! };
    } catch { return { error: "No se pudo verificar el presupuesto. Conservamos tu plan; inténtalo de nuevo." }; }
  }
  const payload = { account_id: account, name, hypothesis: draft.hypothesis ?? "", success_criterion: draft.metric ? `${draft.metric.toUpperCase()} ${draft.metric === "roas" ? "≥" : "≤"} ${draft.threshold} con ≥ ${draft.min_purchases} compras en ${draft.window_days} días cerrados` : null, metric: draft.metric, threshold: draft.threshold, min_purchases: draft.min_purchases ?? 10, window_days: draft.window_days ?? 7, budget: draft.budget, entity_ids, campaign_ids, start_date: draft.start_date, session_id: String(form.get("session_id") ?? "") || null, status: activar ? "activo" : "borrador", created_by: user.email };
  const draftId = String(form.get("draft_id") ?? "");
  const { error, data: saved } = draftId
    ? await sb.from("experiments").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", draftId).eq("account_id", account).eq("status", "borrador").select("id").maybeSingle()
    : await sb.from("experiments").insert(payload).select("id").single();
  if (error || !saved) return { error: "No se pudo guardar la prueba. Tu plan sigue aquí; inténtalo de nuevo." };
  revalidatePath("/experimentos"); back(account, { saved: activar ? "activado" : "borrador" });
}

/** Compatible con enlaces/formularios anteriores. */
export async function saveExperiment(form: FormData) {
  const result = await persistExperiment(form);
  back(String(form.get("account_id") ?? ""), { error: result.error });
}

/** Los errores esperables se muestran sin perder el plan escrito. */
export async function saveGuidedExperiment(_previous: { error: string }, form: FormData): Promise<{ error: string }> {
  return persistExperiment(form);
}

export async function activateExperiment(form: FormData) {
  const user = await requireMember("/experimentos");
  const id = String(form.get("id")), sb = db();
  const { data: x } = await sb.from("experiments").select("*").eq("id", id).single(); if (!x) redirect("/experimentos");
  if (x.status !== "borrador") back(x.account_id, { error: "Esta prueba ya no es un borrador. Actualiza la página." });
  const errs = validateExperiment({ hypothesis: x.hypothesis, metric: x.metric, threshold: x.threshold != null ? Number(x.threshold) : null, min_purchases: x.min_purchases, window_days: x.window_days, budget: x.budget != null ? Number(x.budget) : null, campaign_ids: x.campaign_ids ?? [], start_date: x.start_date });
  if (errs.length) back(x.account_id, { error: `No se puede activar: ${errs.join(" ")}` });
  const b = await budgetCheck(sb, x.account_id, Number(x.budget), id); if (!b.ok) back(x.account_id, { error: b.error! });
  const { data: changed, error } = await sb.from("experiments").update({ status: "activo", updated_at: new Date().toISOString() }).eq("id", id).eq("status", "borrador").select("id").maybeSingle();
  if (error || !changed) back(x.account_id, { error: "No se inició el seguimiento. Actualiza e inténtalo de nuevo." });
  revalidatePath("/experimentos"); back(x.account_id, { saved: "activado" });
}

export async function cancelExperiment(form: FormData) {
  const user = await requireMember("/experimentos");
  const id = String(form.get("id")), sb = db();
  const { data: x } = await sb.from("experiments").update({ status: "cancelado", verdict_reason: String(form.get("reason") ?? "").trim() || "cancelado a mano", decided_by: user.email, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).in("status", ["borrador", "activo", "evaluando"]).select("account_id").single();
  if (!x) back("", { error: "No se pudo cancelar; la prueba puede estar ya cerrada." });
  revalidatePath("/experimentos"); back(x?.account_id ?? "", { saved: "cancelado" });
}

/** Veredicto final: lo confirma una persona a partir del propuesto por el analista. La razón es obligatoria. */
export async function decideExperiment(form: FormData) {
  const user = await requireMember("/experimentos");
  const id = String(form.get("id")), decision = String(form.get("decision")), reason = String(form.get("reason") ?? "").trim(), sb = db();
  const { data: x } = await sb.from("experiments").select("account_id,evaluation,status").eq("id", id).single(); if (!x) redirect("/experimentos");
  if (x.status !== "evaluando") back(x.account_id, { error: "Espera a que el analista termine la evaluación." });
  if (!["graduado", "descartado"].includes(decision)) back(x.account_id, { error: "Decisión inválida." });
  if (!reason) back(x.account_id, { error: "La razón del veredicto es obligatoria." });
  const { data: changed, error } = await sb.from("experiments").update({ status: decision, verdict: (x.evaluation as { verdict?: string } | null)?.verdict ?? null, verdict_reason: reason, decided_by: user.email, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("status", "evaluando").select("id").maybeSingle();
  if (error || !changed) back(x.account_id, { error: "No se guardó la decisión. Actualiza e inténtalo de nuevo." });
  revalidatePath("/experimentos"); back(x.account_id, { saved: decision });
}
