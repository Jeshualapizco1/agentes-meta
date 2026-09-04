/**
 * Fase 3 · Ventanas de evaluación por sesión de cambios. Determinista, sin LLM.
 *  - Tratamiento: las campañas tocadas en la sesión. Control: el resto de la cuenta.
 *  - "Antes" = N días completos previos al día del cambio; "después" = N días completos posteriores (el día del cambio se excluye: es mixto).
 *  - Estado: pending (aún no hay días después), preliminary (faltan días), mature (los N días ya pasaron).
 *  - Confianza por compras (tocado, antes+después): ≥60 alta, ≥30 media, ≥10 baja, menos = insuficiente. Un control con
 *    menos de MIN_CONTROL_PURCHASES compras deja la confianza en baja como máximo.
 *  - Salvedades (`caveats`): presupuesto compartido (un cambio de presupuesto mueve el gasto del resto: el control no es
 *    independiente), gasto del control que se movió mucho, control pequeño. El reporte las dice tal cual.
 *  - Lenguaje: "coincidió con", nunca "causó". Definiciones completas en docs/05-analista.md.
 */
export type Horizon = "72h" | "7d" | "14d";
export const HORIZON_DAYS: Record<Horizon, number> = { "72h": 3, "7d": 7, "14d": 14 };
export type DailyRow = { entity_id: string; date: string; spend: number; purchases: number; value: number };
export interface WindowMetrics { days: number; spend: number; purchases: number; value: number; roas: number | null; cpa: number | null }
export type Confidence = "high" | "medium" | "low" | "insufficient";
export interface Evaluation {
  horizon: Horizon; status: "pending" | "preliminary" | "mature"; starts_at: string; ends_at: string;
  treatment: { before: WindowMetrics; after: WindowMetrics }; control: { before: WindowMetrics; after: WindowMetrics } | null;
  delta: { roas_pct: number | null; cpa_pct: number | null; spend_pct: number | null; control_roas_pct: number | null; control_cpa_pct: number | null; control_spend_pct: number | null; diff_roas_pts: number | null; diff_cpa_pts: number | null };
  confidence: Confidence; verdict: string; caveats: string[];
}
/** Umbrales de la evaluación (documentados en docs/05-analista.md). */
export const THRESHOLD_PTS = 10;           // puntos porcentuales de variación de ROAS frente al control para hablar de mejora o deterioro
export const MIN_PURCHASES = { low: 10, medium: 30, high: 60 };
export const MIN_CONTROL_PURCHASES = 10;   // con menos compras en el control (antes+después) la confianza se queda en baja
export const CONTROL_SPEND_SHIFT_PCT = 20; // si el gasto del control se movió más que esto, el control no fue estable

const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const pct = (after: number | null, before: number | null) => (after != null && before != null && before > 0 ? ((after - before) / before) * 100 : null);
const r1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);

function metrics(rows: DailyRow[], from: string, to: string, ids: Set<string> | null, invert = false): WindowMetrics {
  const days = new Set<string>(); let spend = 0, purchases = 0, value = 0;
  for (const r of rows) {
    if (r.date < from || r.date > to) continue;
    const inSet = ids ? ids.has(r.entity_id) : true;
    if (invert ? inSet : !inSet) continue;
    days.add(r.date); spend += r.spend; purchases += r.purchases; value += r.value;
  }
  return { days: days.size, spend, purchases, value, roas: spend > 0 ? value / spend : null, cpa: purchases > 0 ? spend / purchases : null };
}

/** Evalúa un cambio hecho el día `changeDate` (fecha en zona de la cuenta) sobre `campaignIds`, con filas diarias por campaña de toda la cuenta (solo días completos). */
export function evaluateChange(o: { changeDate: string; campaignIds: string[]; rows: DailyRow[]; horizon: Horizon; today: string; kind?: string }): Evaluation {
  const N = HORIZON_DAYS[o.horizon];
  const beforeFrom = addDays(o.changeDate, -N), beforeTo = addDays(o.changeDate, -1);
  const afterFrom = addDays(o.changeDate, 1), afterToPlanned = addDays(o.changeDate, N);
  const lastClosed = addDays(o.today, -1);
  const afterTo = afterToPlanned < lastClosed ? afterToPlanned : lastClosed;
  const closedAfterDays = afterTo >= afterFrom ? Math.round((new Date(`${afterTo}T12:00:00Z`).getTime() - new Date(`${afterFrom}T12:00:00Z`).getTime()) / 86400_000) + 1 : 0;
  const status: Evaluation["status"] = closedAfterDays <= 0 ? "pending" : closedAfterDays < N ? "preliminary" : "mature";
  const ids = o.campaignIds.length ? new Set(o.campaignIds) : null;
  const rows = o.rows.filter(r => r.date <= lastClosed);
  const treatment = { before: metrics(rows, beforeFrom, beforeTo, ids), after: metrics(rows, afterFrom, afterTo, ids) };
  const control = ids ? { before: metrics(rows, beforeFrom, beforeTo, ids, true), after: metrics(rows, afterFrom, afterTo, ids, true) } : null;
  const hasControl = !!control && control.before.spend > 0 && control.after.spend > 0;
  const roas_pct = pct(treatment.after.roas, treatment.before.roas), cpa_pct = pct(treatment.after.cpa, treatment.before.cpa), spend_pct = pct(treatment.after.spend, treatment.before.spend);
  const control_roas_pct = hasControl ? pct(control!.after.roas, control!.before.roas) : null, control_cpa_pct = hasControl ? pct(control!.after.cpa, control!.before.cpa) : null;
  const control_spend_pct = hasControl ? pct(control!.after.spend, control!.before.spend) : null;
  const diff_roas_pts = roas_pct != null && control_roas_pct != null ? roas_pct - control_roas_pct : null;
  const diff_cpa_pts = cpa_pct != null && control_cpa_pct != null ? cpa_pct - control_cpa_pct : null;
  const purchases = treatment.before.purchases + treatment.after.purchases;
  let confidence: Confidence = status === "pending" || treatment.after.spend === 0 || treatment.before.spend === 0 ? "insufficient" : purchases >= MIN_PURCHASES.high ? "high" : purchases >= MIN_PURCHASES.medium ? "medium" : purchases >= MIN_PURCHASES.low ? "low" : "insufficient";
  if (confidence === "high" && status === "preliminary") confidence = "medium";
  // salvedades: el control no es independiente ni estable en todos los casos
  const caveats: string[] = [];
  const s = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(0)}%`;
  if (hasControl && status !== "pending") {
    const controlPurchases = control!.before.purchases + control!.after.purchases;
    if (controlPurchases < MIN_CONTROL_PURCHASES) {
      caveats.push(`Control pequeño: el resto de la cuenta tuvo ${controlPurchases} compras en la ventana (mínimo ${MIN_CONTROL_PURCHASES}); la comparación vale poco.`);
      if (confidence === "high" || confidence === "medium") confidence = "low";
    }
    if (o.kind === "budget") caveats.push(`Presupuesto compartido: al mover el presupuesto de una campaña cambia el gasto del resto de la cuenta${control_spend_pct != null ? ` (gasto del control ${s(control_spend_pct)})` : ""}, así que el control no es independiente.`);
    else if (control_spend_pct != null && Math.abs(control_spend_pct) >= CONTROL_SPEND_SHIFT_PCT) caveats.push(`El gasto del resto de la cuenta se movió ${s(control_spend_pct)} en la ventana: el control no fue estable.`);
  }
  const verdict = buildVerdict({ status, confidence, roas_pct, cpa_pct, control_roas_pct, diff_roas_pts, hasControl, N, closedAfterDays });
  return { horizon: o.horizon, status, starts_at: afterFrom, ends_at: afterToPlanned, treatment, control, delta: { roas_pct: r1(roas_pct), cpa_pct: r1(cpa_pct), spend_pct: r1(spend_pct), control_roas_pct: r1(control_roas_pct), control_cpa_pct: r1(control_cpa_pct), control_spend_pct: r1(control_spend_pct), diff_roas_pts: r1(diff_roas_pts), diff_cpa_pts: r1(diff_cpa_pts) }, confidence, verdict, caveats };
}

function buildVerdict(x: { status: Evaluation["status"]; confidence: Confidence; roas_pct: number | null; cpa_pct: number | null; control_roas_pct: number | null; diff_roas_pts: number | null; hasControl: boolean; N: number; closedAfterDays: number }): string {
  const s = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(0)}%`;
  if (x.status === "pending") return `Todavía no hay días completos después del cambio (ventana de ${x.N} días).`;
  if (x.confidence === "insufficient") return `Sin evidencia suficiente: pocas compras o sin gasto en la ventana de ${x.N} días${x.status === "preliminary" ? ` (van ${x.closedAfterDays} de ${x.N} días)` : ""}.`;
  const prelim = x.status === "preliminary" ? ` Preliminar: van ${x.closedAfterDays} de ${x.N} días.` : "";
  if (x.hasControl && x.diff_roas_pts != null && x.roas_pct != null && x.control_roas_pct != null) {
    const rel = x.diff_roas_pts >= THRESHOLD_PTS ? "una mejora" : x.diff_roas_pts <= -THRESHOLD_PTS ? "un deterioro" : null;
    if (rel) return `Coincidió con ${rel} de ROAS: ${s(x.roas_pct)} en lo tocado frente a ${s(x.control_roas_pct)} en el resto de la cuenta${x.cpa_pct != null ? `; CPA ${s(x.cpa_pct)}` : ""}.${prelim}`;
    return `Sin cambio claro frente al resto de la cuenta: ROAS ${s(x.roas_pct)} en lo tocado, ${s(x.control_roas_pct)} en el resto (umbral ±${THRESHOLD_PTS} pts).${prelim}`;
  }
  if (x.roas_pct != null) {
    const rel = x.roas_pct >= THRESHOLD_PTS ? "una mejora" : x.roas_pct <= -THRESHOLD_PTS ? "un deterioro" : null;
    return rel ? `Coincidió con ${rel} de ROAS de ${s(x.roas_pct)} respecto a los ${x.N} días previos (sin control: se tocó toda la cuenta).${prelim}` : `Sin cambio claro de ROAS (${s(x.roas_pct)}) respecto a los ${x.N} días previos.${prelim}`;
  }
  return `Sin ROAS comparable en la ventana de ${x.N} días.${prelim}`;
}

/** Paquete de evidencia semanal (determinista): totales de la semana vs. la previa, sesiones con veredicto, mejores y peores campañas. */
export interface WeeklySession { ref?: string; id: string; started_at: string; actor_name: string; summary: string; resets_learning: boolean; kind: string; evaluations: Pick<Evaluation, "horizon" | "status" | "confidence" | "verdict" | "delta" | "caveats">[] }
/** Fila de campaña del ranking semanal; `ref` (C1, C2…) es la referencia que la narrativa debe citar. */
export interface WeeklyCampaign { ref: string; id: string; name: string; spend: number; purchases: number; roas: number }
export interface WeeklyEvidence {
  period: { start: string; end: string }; previous: { start: string; end: string };
  totals: { week: WindowMetrics; previous: WindowMetrics; roas_pct: number | null; cpa_pct: number | null; spend_pct: number | null };
  sessions: WeeklySession[]; learning_resets: number;
  campaigns: { best: WeeklyCampaign[]; worst: WeeklyCampaign[] };
  targets: { target_roas: number | null; breakeven_roas: number | null; target_cpa: number | null; daily_spend_ceiling: number | null };
  /** Cómo citar cada fila en la narrativa: [T] totales de la semana, [T-1] semana previa, [O] objetivos del perfil, [S#] sesión, [C#] campaña. */
  refs: { totals: "T"; previous: "T-1"; targets: "O" };
}
export function buildWeeklyEvidence(o: { periodEnd: string; rows: DailyRow[]; campaignNames: Map<string, string>; sessions: WeeklySession[]; targets: WeeklyEvidence["targets"]; minPurchases?: number }): WeeklyEvidence {
  const start = addDays(o.periodEnd, -6), pStart = addDays(o.periodEnd, -13), pEnd = addDays(o.periodEnd, -7);
  const week = metrics(o.rows, start, o.periodEnd, null), previous = metrics(o.rows, pStart, pEnd, null);
  const byCamp = new Map<string, { spend: number; purchases: number; value: number }>();
  for (const r of o.rows) { if (r.date < start || r.date > o.periodEnd) continue; const c = byCamp.get(r.entity_id) ?? { spend: 0, purchases: 0, value: 0 }; c.spend += r.spend; c.purchases += r.purchases; c.value += r.value; byCamp.set(r.entity_id, c); }
  const min = o.minPurchases ?? 10;
  const ranked = [...byCamp.entries()].filter(([, c]) => c.spend > 0 && c.purchases >= min).map(([id, c]) => ({ id, name: o.campaignNames.get(id) ?? id, spend: Math.round(c.spend), purchases: c.purchases, roas: Math.round((c.value / c.spend) * 100) / 100 })).sort((a, b) => b.roas - a.roas)
    .map((c, i) => ({ ref: `C${i + 1}`, ...c }));
  const sessions = o.sessions.map((s, i) => ({ ...s, ref: `S${i + 1}` }));
  return {
    period: { start, end: o.periodEnd }, previous: { start: pStart, end: pEnd },
    totals: { week, previous, roas_pct: r1(pct(week.roas, previous.roas)), cpa_pct: r1(pct(week.cpa, previous.cpa)), spend_pct: r1(pct(week.spend, previous.spend)) },
    sessions, learning_resets: sessions.filter(s => s.resets_learning).length,
    campaigns: { best: ranked.slice(0, 3), worst: ranked.slice(3).slice(-3).reverse() }, targets: o.targets,   // sin traslape entre mejores y peores
    refs: { totals: "T", previous: "T-1", targets: "O" },
  };
}
