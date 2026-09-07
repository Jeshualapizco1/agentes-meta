import { isCalendarDate } from "./range";

/** Contrato de presentación del piloto. No autoriza acciones ni reemplaza los candados del servidor. */
export type ReadingState = "ready" | "partial" | "stale" | "error" | "loading";
export type HoyMetricState = ReadingState | "missing" | "forbidden";
export type Section<T> = { state: "ready"; data: T } | { state: "error" | "loading"; data?: never };
export type DailyReading = { date: string; closed: boolean; spend: number | null; purchases: number | null; revenue: number | null };
export type HoyTrendPoint = { date: string; value: number | null; unavailable: "missing" | "not-calculable" | null };
export type HoyAccount = { id: string; name: string; currency: string; timeZone: string };
export type ProposalChange =
  | { kind: "budget"; beforeMinor: number; afterMinor: number }
  | { kind: "pause" }
  | { kind: "move"; origin: { name: string; beforeMinor: number; afterMinor: number }; destination: { name: string; beforeMinor: number; afterMinor: number } };
export type HoyProposal = {
  id: string; accountId: string; title: string; entity: string; entityLevel: string; rule: string;
  change: ProposalChange; createdAt: string; expiresAt: string | null; evidenceAt: string;
  evidence: { ref: string; label: string; value: string }[];
  locks: { id: string; label: string; ok: boolean; reason: string }[];
};
export type DecisionStatus = "approved" | "simulated" | "execution-recorded" | "failed" | "rejected" | "unconfirmed";
export type HoyDecision = { id: string; entity: string; action: string; status: DecisionStatus; at: string; detail: string };
export type HoyAlert = { id: string; severity: "critical" | "warning" | "info"; title: string; description: string; at: string };
export type HoySnapshot = {
  account: HoyAccount; asOf: string; reportingDate: string; access: "allowed" | "forbidden";
  readings: { state: ReadingState; rows: DailyReading[] };
  agent: { mode: "off" | "semi" | "auto" | "unknown"; execution: "simulation" | "live" | "unknown"; brake: "engaged" | "released" | "unknown"; brakeReason?: string;
    collectedAt: string | null; collection: "ok" | "error" | "running" | "unknown"; strategyAt: string | null };
  proposals: Section<HoyProposal[]>; alerts: Section<HoyAlert[]>; decisions: Section<HoyDecision[]>;
  activity: Section<{ id: string; actor: string; summary: string; at: string }[]>;
};
const DAY = 86_400_000;
export const shiftCalendarDay = (date: string, offset: number): string => {
  if (!isCalendarDate(date) || !Number.isInteger(offset)) throw new Error("Fecha de lectura inválida");
  return new Date(Date.parse(`${date}T12:00:00Z`) + offset * DAY).toISOString().slice(0, 10);
};
export function shortDate(date: string): string {
  if (!isCalendarDate(date)) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)).replaceAll(".", "");
}
export function momentLabel(instant: string | null): string {
  if (!instant || !Number.isFinite(Date.parse(instant))) return "Sin fecha verificada";
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Mexico_City" }).format(new Date(instant)).replaceAll(".", "") + " CDMX";
}
export function money(value: number | null, currency: string): string {
  if (value === null || !Number.isFinite(value)) return "—";
  try { return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 2 }).format(value); } catch { return "Moneda no disponible"; }
}
const valid = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const complete = (r: DailyReading) => r.closed && valid(r.spend) && valid(r.revenue) && valid(r.purchases) && Number.isInteger(r.purchases);
export function summarizeHoy(snapshot: HoySnapshot) {
  const dates = Array.from({ length: 14 }, (_, i) => shiftCalendarDay(snapshot.reportingDate, i - 14));
  const byDate = new Map<string, DailyReading | null>();
  for (const row of snapshot.readings.rows) byDate.set(row.date, byDate.has(row.date) ? null : row);
  const readable = snapshot.access === "allowed" && !["error", "loading"].includes(snapshot.readings.state);
  const series = dates.map(date => {
    const row = byDate.get(date);
    return { date, row: readable && row && complete(row) ? row : null };
  });
  const window = (items: typeof series) => {
    const rows = items.flatMap(item => item.row ? [item.row] : []);
    const total = (key: "spend" | "purchases" | "revenue") => {
      const value = rows.reduce((sum, r) => sum + r[key]!, 0);
      return rows.length && Number.isFinite(value) ? value : null;
    };
    const spend = total("spend"), purchases = total("purchases"), revenue = total("revenue");
    const ratio = (a: number | null, b: number | null) => { const value = a !== null && b !== null && b > 0 ? a / b : NaN; return Number.isFinite(value) ? value : null; };
    return { spend, purchases, revenue, roas: ratio(revenue, spend), cpa: ratio(spend, purchases), validTotals: spend !== null && purchases !== null && revenue !== null, available: rows.length, from: items[0]!.date, to: items.at(-1)!.date };
  };
  const current = window(series.slice(7)), previous = window(series.slice(0, 7));
  const state: HoyMetricState = snapshot.access === "forbidden" ? "forbidden" : !readable ? snapshot.readings.state as "error" | "loading" : snapshot.readings.state === "stale" ? "stale" : !current.available ? "missing" : current.available < 7 || !current.validTotals || snapshot.readings.state === "partial" ? "partial" : "ready";
  return { current, previous, state, canCompare: state === "ready" && previous.available === 7 && previous.validTotals,
    period: `${shortDate(current.from)} – ${shortDate(current.to)}`,
    series: series.map((item): HoyTrendPoint => {
      const value = item.row && item.row.spend! > 0 ? item.row.revenue! / item.row.spend! : null;
      const calculable = value !== null && Number.isFinite(value);
      return { date: item.date, value: calculable ? value : null, unavailable: calculable ? null : item.row ? "not-calculable" : "missing" };
    }) };
}
export function orderedAlerts(alerts: HoyAlert[]): HoyAlert[] {
  const rank = { critical: 0, warning: 1, info: 2 };
  return [...alerts].sort((a, b) => rank[a.severity] - rank[b.severity] || (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0) || a.id.localeCompare(b.id));
}
export const decisionPresentation: Record<DecisionStatus, { label: string; tone: "neutral" | "meta" | "crit" | "amber"; explanation: string }> = {
  approved: { label: "Aprobada · por confirmar", tone: "amber", explanation: "La aprobación no acredita un cambio en Meta." },
  simulated: { label: "Simulada", tone: "meta", explanation: "No se enviaron cambios a Meta." },
  "execution-recorded": { label: "Ejecución registrada", tone: "neutral", explanation: "Registro del sistema; no es una verificación nueva del estado en Meta." },
  failed: { label: "Ejecución fallida", tone: "crit", explanation: "Revisa el alcance: un fallo no garantiza que no hubo cambios." },
  rejected: { label: "Rechazada", tone: "neutral", explanation: "Decisión de revisión; no confirma el estado actual de Meta." },
  unconfirmed: { label: "Resultado por confirmar", tone: "amber", explanation: "No repitas la acción hasta verificar si hubo cambios." },
};
/** Solo controla qué se puede ensayar. La habilitación real requiere validación servidor independiente. */
export function previewApprovalBlock(snapshot: HoySnapshot, proposal: HoyProposal, now = snapshot.asOf): string | null {
  if (snapshot.access !== "allowed") return "No tienes permiso para revisar esta cuenta.";
  const current = snapshot.proposals.state === "ready" ? snapshot.proposals.data.find(p => p.id === proposal.id) : undefined;
  if (!current) return "La propuesta ya no está disponible en esta lectura.";
  if (proposal.accountId !== snapshot.account.id || current.accountId !== snapshot.account.id) return "La propuesta pertenece a otra cuenta.";
  // La referencia seleccionada puede ser vieja: comprobar la versión presente en el snapshot.
  proposal = current;
  if (snapshot.agent.execution === "live") return "La ejecución real no está habilitada en este piloto.";
  if (snapshot.agent.execution !== "simulation") return "No se pudo verificar el modo de ejecución.";
  if (snapshot.agent.brake !== "released") return snapshot.agent.brake === "engaged" ? "El freno del agente está activo." : "No se pudo verificar el freno del agente.";
  if (snapshot.agent.mode !== "semi") return snapshot.agent.mode === "off" ? "El agente está detenido." : "No se pudo verificar el modo del agente.";
  if (summarizeHoy(snapshot).state !== "ready") return "Necesitas una lectura completa y vigente para ensayar una aprobación.";
  if (snapshot.decisions.state !== "ready") return "No se pudo comprobar si hay decisiones sin resolver.";
  if (snapshot.decisions.data.some(d => d.status === "unconfirmed" || d.status === "approved" || d.status === "failed")) return "Primero verifica los resultados de ejecución pendientes o fallidos.";
  if (!Number.isFinite(Date.parse(now)) || !proposal.expiresAt || !Number.isFinite(Date.parse(proposal.expiresAt)) || Date.parse(proposal.expiresAt) <= Date.parse(now)) return "La propuesta venció o no tiene una vigencia verificable.";
  if (!proposal.evidence.length || !proposal.locks.length || proposal.locks.some(l => !l.ok)) return "Revisa la evidencia y los candados de esta propuesta.";
  if (proposal.change.kind === "move") return "La revisión de movimientos entre campañas es de solo lectura en este piloto.";
  if (proposal.change.kind === "budget" && (!valid(proposal.change.beforeMinor) || !valid(proposal.change.afterMinor) || !Number.isSafeInteger(proposal.change.beforeMinor) || !Number.isSafeInteger(proposal.change.afterMinor) || proposal.change.afterMinor <= 0)) return "El importe de la propuesta no es válido.";
  return null;
}
export function parseBudgetDraft(raw: string): number | null {
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(raw.trim())) return null;
  const minor = Math.round(Number(raw.trim()) * 100);
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}
