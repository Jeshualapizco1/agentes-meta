/**
 * Fase 4 · Estratega en modo semi: infraestructura pura (sin base, sin Meta). Definiciones en docs/06-criterio-operacion.md.
 *  - Las reglas (tabla `rules`) producen candidatos; los candados se evalúan EN FILA antes de crear cualquier propuesta:
 *    basta uno cerrado para que no salga, y la razón queda escrita en la propuesta descartada.
 *  - Las dos reglas de techo ya decididas (gasto real > techo; presupuesto comprometido > techo × factor) entran como
 *    candados sobre cualquier subida de presupuesto.
 *  - Una propuesta pendiente expira si no se decide antes de la siguiente pasada que la volvería a proponer.
 *  - Cada pasada deja registro aunque no proponga nada ("revisó N entidades y no propuso cambios").
 */
export type RuleAction = "pausar_anuncio" | "subir_presupuesto" | "bajar_presupuesto" | "mover_presupuesto" | "bloquear_subidas";
export const RULE_ACTION_LABEL: Record<RuleAction, string> = { pausar_anuncio: "Pausar anuncio", subir_presupuesto: "Subir presupuesto", bajar_presupuesto: "Bajar presupuesto", mover_presupuesto: "Mover presupuesto entre campañas", bloquear_subidas: "Bloquear subidas (candado)" };
export interface Rule { id: string; name: string; action: RuleAction; condition: Record<string, unknown>; params: Record<string, unknown>; status: "activa" | "inactiva"; mode: "semi" | "auto"; valid_from?: string | null; valid_to?: string | null }
export interface EvidenceRow { ref: string; label: string; value: string | number | null }
export interface Candidate {
  rule_id: string; rule_name: string; action: RuleAction;
  entity_id: string; entity_level: "campaign" | "adset" | "ad"; entity_name: string; campaign_id: string | null;
  /** valor anterior y propuesto (presupuesto diario en MXN para subir/bajar; estado para pausar) */
  before: number | string | null; after: number | string | null;
  evidence: EvidenceRow[];
}
export type LockName = "freno" | "dia_cerrado" | "lista_blanca" | "cambio_maximo" | "cambio_acumulado" | "espera" | "tope_por_pasada" | "techo_gasto_real" | "techo_presupuesto_comprometido";
export const LOCK_LABEL: Record<LockName, string> = { freno: "Freno de emergencia", dia_cerrado: "Día cerrado disponible", lista_blanca: "Lista blanca", cambio_maximo: "Cambio máximo por movimiento", cambio_acumulado: "Cambio acumulado en la ventana", espera: "Tiempo de espera desde el último cambio", tope_por_pasada: "Tope de acciones por pasada", techo_gasto_real: "Techo por gasto real", techo_presupuesto_comprometido: "Techo por presupuesto comprometido" };
export interface LockResult { lock: LockName; ok: boolean; reason: string }
export interface RecentChange { entity_id: string; at: string; pct: number | null; actor_kind: "person" | "agent" | "meta" | "rule" }
export interface LockContext {
  now: string;                       // ISO
  brakeActive: boolean;
  lastClosedAvailable: boolean;      // ya hay insights del último día cerrado
  whitelist: string[];               // campañas que el agente puede tocar
  maxChangePct: number; maxCumulativePct: number; cumulativeWindowDays: number; cooldownHours: number; maxPerPass: number;
  ceiling: { ceiling: number | null; over_spend: boolean; over_committed: boolean; budget_pct: number | null; spend_pct: number | null } | null;
  recentChanges: RecentChange[];     // cambios de presupuesto previos sobre entidades (persona o agente), últimos cumulativeWindowDays
}

const isBudget = (a: RuleAction) => a === "subir_presupuesto" || a === "bajar_presupuesto" || a === "mover_presupuesto";
const pctOf = (c: Candidate) => (typeof c.before === "number" && typeof c.after === "number" && c.before > 0 ? ((c.after - c.before) / c.before) * 100 : null);
const NA = (lock: LockName): LockResult => ({ lock, ok: true, reason: "no aplica a esta acción" });

/** Evalúa todos los candados en fila para un candidato en la posición `index` de la pasada. Todos se reportan; basta uno cerrado. */
export function evaluateLocks(c: Candidate, ctx: LockContext, index: number): LockResult[] {
  const out: LockResult[] = [];
  out.push({ lock: "freno", ok: !ctx.brakeActive, reason: ctx.brakeActive ? "freno de emergencia activo: nada sale hasta liberarlo a mano" : "freno liberado" });
  out.push({ lock: "dia_cerrado", ok: ctx.lastClosedAvailable, reason: ctx.lastClosedAvailable ? "hay datos del último día cerrado" : "no hay datos del último día cerrado: no se opera sobre el día en curso" });
  const target = c.campaign_id ?? c.entity_id;
  out.push({ lock: "lista_blanca", ok: ctx.whitelist.includes(target), reason: ctx.whitelist.length === 0 ? "lista blanca vacía: el agente no toca nada" : ctx.whitelist.includes(target) ? "la campaña está en la lista blanca" : "la campaña no está en la lista blanca" });
  const pct = pctOf(c);
  if (isBudget(c.action) && pct != null) {
    out.push({ lock: "cambio_maximo", ok: Math.abs(pct) <= ctx.maxChangePct + 1e-9, reason: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% contra máximo ±${ctx.maxChangePct}%` });
    const since = new Date(ctx.now).getTime() - ctx.cumulativeWindowDays * 86400_000;
    const prior = ctx.recentChanges.filter(r => r.entity_id === c.entity_id && new Date(r.at).getTime() >= since && r.pct != null).reduce((a, r) => a + Math.abs(r.pct!), 0);
    const total = prior + Math.abs(pct);
    out.push({ lock: "cambio_acumulado", ok: total <= ctx.maxCumulativePct + 1e-9, reason: `${total.toFixed(1)}% acumulado en ${ctx.cumulativeWindowDays} días (previo ${prior.toFixed(1)}% + este ${Math.abs(pct).toFixed(1)}%) contra máximo ${ctx.maxCumulativePct}%` });
  } else { out.push(NA("cambio_maximo")); out.push(NA("cambio_acumulado")); }
  const last = ctx.recentChanges.filter(r => r.entity_id === c.entity_id).map(r => new Date(r.at).getTime()).sort((a, b) => b - a)[0];
  const hoursSince = last != null ? (new Date(ctx.now).getTime() - last) / 3600_000 : null;
  out.push({ lock: "espera", ok: hoursSince == null || hoursSince >= ctx.cooldownHours, reason: hoursSince == null ? "sin cambios previos sobre la entidad" : `último cambio hace ${hoursSince.toFixed(0)} h (persona o agente) contra espera de ${ctx.cooldownHours} h` });
  out.push({ lock: "tope_por_pasada", ok: index < ctx.maxPerPass, reason: `propuesta ${index + 1} de ${ctx.maxPerPass} permitidas por pasada` });
  if (c.action === "subir_presupuesto" || c.action === "mover_presupuesto") {
    const ce = ctx.ceiling;
    if (!ce || ce.ceiling == null) { out.push({ lock: "techo_gasto_real", ok: false, reason: "sin techo de gasto configurado" }); out.push({ lock: "techo_presupuesto_comprometido", ok: false, reason: "sin techo de gasto configurado" }); }
    else {
      out.push({ lock: "techo_gasto_real", ok: !ce.over_spend, reason: ce.over_spend ? `gasto real ${ce.spend_pct ?? "?"}% del techo: sin subidas hoy` : `gasto real ${ce.spend_pct ?? "?"}% del techo` });
      out.push({ lock: "techo_presupuesto_comprometido", ok: !ce.over_committed, reason: ce.over_committed ? `presupuesto comprometido ${ce.budget_pct ?? "?"}% del techo: sin subidas` : `presupuesto comprometido ${ce.budget_pct ?? "?"}% del techo` });
    }
  } else { out.push(NA("techo_gasto_real")); out.push(NA("techo_presupuesto_comprometido")); }
  return out;
}

export interface PassProposal extends Candidate { locks: LockResult[]; blocked: boolean; blocked_by: LockName[] }
export interface PassResult { proposals: PassProposal[]; accepted: number; blocked: number; summary: string }

/** Reglas vigentes hoy: activas y dentro de su vigencia. */
export function activeRules(rules: Rule[], today: string): Rule[] {
  return rules.filter(r => r.status === "activa" && (!r.valid_from || r.valid_from <= today) && (!r.valid_to || r.valid_to >= today));
}

/**
 * Candidatos a partir de las reglas con acción. Punto de extensión: cada acción se implementa cuando llegue la regla
 * transcrita de Eduardo (docs/06). Hoy solo existen reglas de tipo `bloquear_subidas`, que actúan como candado, no como
 * propuesta, así que la pasada revisa y no propone.
 */
export function generateCandidates(rules: Rule[]): Candidate[] {
  return rules.filter(r => r.action !== "bloquear_subidas").flatMap(() => []);
}

/** Una pasada: candados en fila por candidato; los que pasan quedan pendientes, los bloqueados se descartan con su razón. */
export function runPass(o: { candidates: Candidate[]; ctx: LockContext; entitiesReviewed: number }): PassResult {
  const proposals: PassProposal[] = [];
  let accepted = 0;
  for (const c of o.candidates) {
    const locks = evaluateLocks(c, o.ctx, accepted);
    const blocked_by = locks.filter(l => !l.ok).map(l => l.lock);
    const blocked = blocked_by.length > 0;
    if (!blocked) accepted++;
    proposals.push({ ...c, locks, blocked, blocked_by });
  }
  const blocked = proposals.length - accepted;
  const summary = proposals.length === 0 ? `Revisó ${o.entitiesReviewed} entidades y no propuso cambios`
    : `Revisó ${o.entitiesReviewed} entidades: ${accepted} propuesta(s) pendiente(s) de aprobación${blocked ? `, ${blocked} descartada(s) por candados` : ""}`;
  return { proposals, accepted, blocked, summary };
}

/** Pendientes que no se decidieron antes de esta pasada: expiran (la pasada las volvería a proponer si siguen aplicando). */
export function expirePending(pending: { id: string; created_at: string }[], passAt: string): string[] {
  const t = new Date(passAt).getTime();
  return pending.filter(p => new Date(p.created_at).getTime() < t).map(p => p.id);
}

/** Disparadores automáticos del freno de emergencia. Vacío = no se frena. Se libera solo a mano. */
export const BRAKE_SPEND_FACTOR = 1.5;
export const PAYMENT_PROBLEM_STATUSES = [3, 8, 9];   // Meta account_status: 3 unsettled, 8 pending settlement, 9 grace period
export function brakeTriggers(o: { spendTodayPartial: number | null; ceiling: number | null; candidates: number; maxPerPass: number; proposalWriteFailed: boolean; accountStatus: number | null }): string[] {
  const out: string[] = [];
  if (o.ceiling != null && o.spendTodayPartial != null && o.spendTodayPartial > o.ceiling * BRAKE_SPEND_FACTOR) out.push(`gasto real del día en curso $${Math.round(o.spendTodayPartial).toLocaleString("es-MX")} por encima de techo × ${BRAKE_SPEND_FACTOR} ($${Math.round(o.ceiling * BRAKE_SPEND_FACTOR).toLocaleString("es-MX")})`);
  if (o.candidates > o.maxPerPass) out.push(`${o.candidates} propuestas en una pasada, más de las ${o.maxPerPass} permitidas`);
  if (o.proposalWriteFailed) out.push("fallo al registrar una propuesta (write-ahead log incompleto)");
  if (o.accountStatus != null && PAYMENT_PROBLEM_STATUSES.includes(o.accountStatus)) out.push(`cuenta con problema de pago (account_status ${o.accountStatus})`);
  return out;
}
