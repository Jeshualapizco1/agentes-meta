/**
 * Reporte de "primera semana en solitario": al cumplirse 7 días de corridas programadas sin intervención manual, un
 * resumen por Telegram para decidir si se activan las primeras reglas. Formato puro; los números los junta el agente.
 */
import { escapeHtml, type Notification } from "./notifications.js";

export interface WeekReportData {
  period_start: string; period_end: string;
  runs: { agent: string; ok: number; failed: number }[];
  alerts_by_kind: Record<string, number>;
  proposals: { generated: number; blocked: number; approved: number; rejected: number; expired: number; simulated: number; executed: number };
  windows_matured: number;
  verdicts_changed: { when: string; session: string; horizon: string; from: string | null; to: string | null }[];
  experiments: { active: number; evaluating: number; decided: number };
  manual_runs: number;
}
const R: Record<string, string> = { up: "mejora", down: "deterioro", flat: "sin cambio" };
const reading = (r: string | null) => (r ? R[r] ?? r : "sin lectura");

export function formatWeekReport(d: WeekReportData, appUrl: string): Notification {
  const runs = d.runs.map(r => `${escapeHtml(r.agent)} ${r.ok} ok${r.failed ? ` / ${r.failed} fallidas` : ""}`).join(", ");
  const alerts = Object.entries(d.alerts_by_kind).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${escapeHtml(k)} ${n}`).join(", ") || "ninguna";
  const p = d.proposals;
  const changed = d.verdicts_changed.slice(0, 8).map(v => `• ${escapeHtml(v.when)} ${escapeHtml(v.session)} [${escapeHtml(v.horizon)}]: ${reading(v.from)} → <b>${reading(v.to)}</b>`).join("\n");
  const more = d.verdicts_changed.length > 8 ? `\n… y ${d.verdicts_changed.length - 8} más en /analisis` : "";
  return {
    key: `week_report:${d.period_end}`, kind: "resumen_diario",
    text: `🗓 <b>Primera semana en solitario</b> · ${escapeHtml(d.period_start)} a ${escapeHtml(d.period_end)}${d.manual_runs ? ` · ⚠ ${d.manual_runs} corrida(s) manual(es)` : " · sin intervención manual"}
<b>Corridas:</b> ${runs || "ninguna"}
<b>Alertas:</b> ${alerts}
<b>Propuestas:</b> ${p.generated} generadas (${p.blocked} descartadas por candados), ${p.approved} aprobadas, ${p.rejected} rechazadas, ${p.expired} expiradas, ${p.simulated} simuladas, ${p.executed} ejecutadas
<b>Ventanas maduradas:</b> ${d.windows_matured} · <b>Experimentos:</b> ${d.experiments.active} activos, ${d.experiments.evaluating} por confirmar, ${d.experiments.decided} cerrados
<b>Veredictos que cambiaron al madurar:</b>${changed ? `\n${changed}${more}` : " ninguno"}
Punto de revisión: decidir si se activan las primeras reglas. <a href="${appUrl}/estado">Estado</a> · <a href="${appUrl}/analisis">Análisis</a>`,
  };
}
