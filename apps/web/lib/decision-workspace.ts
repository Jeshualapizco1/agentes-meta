import "server-only";
import { db, fetchAll } from "./db";
import { calendarOffset, ceilingCheck, decisionOpportunities, evaluateDecisionRules, runPass, toZoned, type DecisionEntity, type DecisionInsight, type DecisionSource, type Rule, type LockContext, type PassProposal } from "@agentes-meta/core";

export type WorkspaceRule = Rule & { version: number; description: string | null };
export type WorkspaceProfile = {
  mode: string; dry_run: boolean; target_roas: number | null; breakeven_roas: number | null; target_cpa: number | null;
  daily_spend_ceiling: number | null; daily_spend_floor: number | null; max_budget_change_pct: number; max_cumulative_change_pct: number;
  cumulative_window_days: number; cooldown_hours: number; max_actions_per_day: number; max_committed_budget_factor: number;
  whitelist_campaign_ids: string[]; hard_noes: string | null; updated_at: string;
};
type Change = { object_id: string; campaign_id: string | null; started_at: string; kind: string; details: unknown; actor_kind: "person" | "agent" | "meta" | "rule" };
type Pending = { id: string; entity_id: string; campaign_id: string | null; status: string; decided_at: string | null };
export async function loadDecisionWorkspace(accountId: string, now = new Date()) {
  if (!/^\d{1,30}$/.test(accountId)) throw new Error("Cuenta inválida.");
  const sb = db();
  const acc = await sb.from("accounts").select("id,name,currency,timezone_name").eq("id", accountId).eq("enabled", true).single();
  if (acc.error || !acc.data) throw new Error("La cuenta no está disponible.");
  const account = acc.data;
  const today = toZoned(now, account.timezone_name).date;
  const get = async <T>(request: PromiseLike<{ data: unknown; error: unknown }>): Promise<T> => { const r = await request; if (r.error) throw new Error("No se pudo completar la lectura para decidir. Actualiza e intenta de nuevo."); return r.data as T; };
  const profile = await get<WorkspaceProfile | null>(sb.from("account_profiles").select("mode,dry_run,target_roas,breakeven_roas,target_cpa,daily_spend_ceiling,daily_spend_floor,max_budget_change_pct,max_cumulative_change_pct,cumulative_window_days,cooldown_hours,max_actions_per_day,max_committed_budget_factor,whitelist_campaign_ids,hard_noes,updated_at").eq("account_id", accountId).maybeSingle());
  if (!profile) throw new Error("Completa el perfil de la cuenta para evaluar decisiones.");
  const [entities, insights, rules, brake, changes, pending, freezes, experiments, reviews] = await Promise.all([
    fetchAll<DecisionEntity>(() => sb.from("entities").select("id,name,level,campaign_id,effective_status,daily_budget,snapshot_at").eq("account_id", accountId).order("id")),
    fetchAll<DecisionInsight>(() => sb.from("insights_daily").select("entity_id,date,spend,purchases,purchase_value,is_closed_day,fetched_at").eq("account_id", accountId).gte("date", calendarOffset(today, -14)).lte("date", calendarOffset(today, -1)).order("entity_id").order("date")),
    fetchAll<WorkspaceRule>(() => sb.from("rules").select("id,name,action,condition,params,status,mode,valid_from,valid_to,version,description").eq("account_id", accountId).order("id")),
    get<{ active: boolean } | null>(sb.from("emergency_brakes").select("active").eq("account_id", accountId).maybeSingle()),
    fetchAll<Change>(() => sb.from("change_groups").select("object_id,campaign_id,started_at,kind,details,actor_kind").eq("account_id", accountId).gte("started_at", new Date(now.getTime() - Math.max(profile.cumulative_window_days * 86400000, profile.cooldown_hours * 3600000)).toISOString()).order("id")),
    fetchAll<Pending>(() => sb.from("proposals").select("id,entity_id,campaign_id,status,decided_at").eq("account_id", accountId).in("status", ["pendiente", "aprobada", "fallida", "simulada", "ejecutada"]).order("id")),
    fetchAll<{ entity_id: string; until: string }>(() => sb.from("entity_freezes").select("entity_id,until").eq("account_id", accountId).gt("until", now.toISOString()).order("entity_id")),
    fetchAll<{ id: string; campaign_ids: string[] }>(() => sb.from("experiments").select("id,campaign_ids").eq("account_id", accountId).in("status", ["activo", "evaluando"]).order("id")),
    get<{ id: string; entity_id: string; kind: string; rationale: string | null; status: string; decided_by: string | null; decided_at: string | null; payload: unknown }[]>(sb.from("recommendations").select("id,entity_id,kind,rationale,status,decided_by,decided_at,payload").eq("account_id", accountId).eq("kind", "decision_review").order("created_at", { ascending: false }).limit(12)),
  ]);
  const num = (v: unknown): number | null => v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null;
  // La ingesta histórica guarda null cuando Meta omite el evento de compra en una fila válida.
  const source: DecisionSource = { today, now: now.toISOString(), entities: entities.map(e => ({ ...e, daily_budget: num(e.daily_budget) })), insights: insights.map(r => ({ ...r, spend: num(r.spend), purchases: num(r.purchases ?? 0), purchase_value: num(r.purchase_value ?? 0) })) };
  const yesterdayRows = source.insights.filter(r => r.date === calendarOffset(today, -1) && entities.some(e => e.id === r.entity_id && e.level === "campaign"));
  const closed = yesterdayRows.length > 0 && yesterdayRows.every(r => r.is_closed_day && r.spend !== null);
  const ceiling = ceilingCheck({ ceiling: num(profile.daily_spend_ceiling), committedFactor: num(profile.max_committed_budget_factor), spendLastClosed: closed ? yesterdayRows.reduce((sum, r) => sum + r.spend!, 0) : null, spendTodayPartial: null, ents: source.entities.map(e => ({ ...e, daily_budget_cents: e.daily_budget })) });
  const ctx: LockContext = { now: source.now, brakeActive: !!brake?.active, lastClosedAvailable: closed, whitelist: profile.whitelist_campaign_ids ?? [], maxChangePct: Number(profile.max_budget_change_pct), maxCumulativePct: Number(profile.max_cumulative_change_pct), cumulativeWindowDays: Number(profile.cumulative_window_days), cooldownHours: Number(profile.cooldown_hours), maxPerPass: Number(profile.max_actions_per_day), ceiling,
    recentChanges: changes.map(c => ({ entity_id: c.object_id, at: c.started_at, pct: c.kind === "budget" ? (c.details as { budget?: { pct?: number } } | null)?.budget?.pct ?? null : null, actor_kind: c.actor_kind })) };
  const opportunities = decisionOpportunities(source, { target_roas: num(profile.target_roas), breakeven_roas: num(profile.breakeven_roas), target_cpa: num(profile.target_cpa) });
  return { account, profile, source, rules, ctx, changes, pending, freezes, experiments, reviews, opportunities, ceiling };
}
export type DecisionWorkspace = Awaited<ReturnType<typeof loadDecisionWorkspace>>;
export function evaluateWorkspace(workspace: DecisionWorkspace, rules = workspace.rules, excludingProposal?: string) {
  const evaluated = evaluateDecisionRules(rules, workspace.source);
  const pass = runPass({ candidates: evaluated.candidates, ctx: workspace.ctx, entitiesReviewed: workspace.source.entities.length });
  const today = workspace.source.today;
  const dailyCount = workspace.pending.filter(p => p.id !== excludingProposal && ["simulada", "ejecutada"].includes(p.status) && p.decided_at && toZoned(new Date(p.decided_at), workspace.account.timezone_name).date === today).length;
  const proposals = pass.proposals.map(p => {
    const reasons: string[] = [];
    if (workspace.profile.mode !== "semi") reasons.push("La cuenta debe estar en revisión humana (semi).");
    if (workspace.profile.dry_run !== true) reasons.push("Esta integración de decisiones requiere la simulación activada.");
    if (workspace.freezes.some(f => f.entity_id === p.entity_id || f.entity_id === p.campaign_id)) reasons.push("La entidad o su campaña están congeladas.");
    if (workspace.experiments.some(e => e.campaign_ids.includes(p.campaign_id ?? p.entity_id))) reasons.push("La campaña participa en un experimento activo o en evaluación.");
    if (workspace.pending.some(x => x.id !== excludingProposal && (x.entity_id === p.entity_id || (x.campaign_id && x.campaign_id === p.campaign_id)) && ["pendiente", "aprobada", "fallida"].includes(x.status))) reasons.push("Ya hay una decisión pendiente o un resultado por resolver en la campaña.");
    if (dailyCount >= workspace.profile.max_actions_per_day) reasons.push("Ya se alcanzó el límite diario de decisiones.");
    if (workspace.changes.some(c => (c.object_id === p.entity_id || c.object_id === p.campaign_id || c.campaign_id === p.campaign_id) && Date.parse(workspace.source.now) - Date.parse(c.started_at) < workspace.profile.cooldown_hours * 3600000)) reasons.push("La campaña tiene cambios recientes dentro del tiempo de espera.");
    if (p.action === "bajar_presupuesto" && workspace.profile.daily_spend_floor != null && typeof p.before === "number" && typeof p.after === "number" && workspace.ceiling.budget_active - (p.before - p.after) < workspace.profile.daily_spend_floor) reasons.push("El presupuesto resultante quedaría por debajo del piso configurado.");
    if (p.action === "subir_presupuesto" && workspace.profile.daily_spend_ceiling != null && typeof p.before === "number" && typeof p.after === "number" && workspace.ceiling.budget_active + p.after - p.before > workspace.profile.daily_spend_ceiling * workspace.profile.max_committed_budget_factor) reasons.push("El presupuesto resultante superaría el techo comprometido de la cuenta.");
    return { ...p, blocked: p.blocked || reasons.length > 0, reasons: [...p.locks.filter(l => !l.ok).map(l => l.reason), ...reasons] };
  });
  return { proposals, exclusions: evaluated.exclusions, evaluatedAt: workspace.source.now };
}
export type EvaluatedDecision = PassProposal & { reasons: string[] };
