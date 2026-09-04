/**
 * Fase 3 · Experimentos con presupuesto de exploración (idea 12 de Testmia). Puro, sin base de datos.
 *  - Un experimento no se activa sin hipótesis, criterio de éxito (métrica, umbral, compras mínimas, ventana) y presupuesto.
 *  - La suma de presupuestos de experimentos activos no rebasa el presupuesto de exploración (techo × exploration_budget_pct).
 *  - Al cumplirse la ventana se evalúa contra su propio criterio con las mismas dos referencias que cualquier cambio
 *    (evaluateChange) y se propone un veredicto; el final lo confirma una persona. Definiciones en docs/05-analista.md §11.
 */
import { evaluateChange, type DailyRow, type Evaluation } from "./evaluation.js";

export type ExperimentMetric = "roas" | "cpa";
export type ExperimentStatus = "borrador" | "activo" | "evaluando" | "graduado" | "descartado" | "cancelado";
export const EXPERIMENT_STATUS_LABEL: Record<ExperimentStatus, string> = { borrador: "borrador", activo: "activo", evaluando: "evaluando", graduado: "graduado", descartado: "descartado", cancelado: "cancelado" };
export interface ExperimentCriterion { metric: ExperimentMetric | null; threshold: number | null; min_purchases: number | null; window_days: number | null }
export interface ExperimentDraft extends ExperimentCriterion { hypothesis: string | null; budget: number | null; campaign_ids: string[]; start_date: string | null }

/** Qué le falta a un experimento para poder activarse (vacío = puede activarse). */
export function validateExperiment(d: ExperimentDraft): string[] {
  const errs: string[] = [];
  if (!d.hypothesis?.trim()) errs.push("Falta la hipótesis.");
  if (d.metric !== "roas" && d.metric !== "cpa") errs.push("Falta la métrica objetivo (ROAS o CPA).");
  if (d.threshold == null || !(d.threshold > 0)) errs.push("Falta el umbral del criterio de éxito.");
  if (d.min_purchases == null || d.min_purchases < 1) errs.push("Faltan las compras mínimas del criterio.");
  if (d.window_days == null || d.window_days < 1) errs.push("Falta la ventana de evaluación en días cerrados.");
  if (d.budget == null || !(d.budget > 0)) errs.push("Falta el presupuesto asignado.");
  if (!d.campaign_ids.length) errs.push("Falta al menos una campaña vinculada.");
  if (!d.start_date) errs.push("Falta la fecha de inicio.");
  return errs;
}

/** Presupuesto de exploración = techo diario × porcentaje. Los activos más el nuevo no pueden rebasarlo. */
export function explorationBudget(o: { ceiling: number | null; pct: number | null; activeBudgets: number[]; newBudget: number }): { limit: number | null; committed: number; remaining: number | null; ok: boolean; error: string | null } {
  const committed = o.activeBudgets.reduce((a, b) => a + b, 0);
  const limit = o.ceiling != null && o.pct != null && o.pct > 0 ? Math.round((o.ceiling * o.pct) / 100 * 100) / 100 : null;
  if (limit == null) return { limit, committed, remaining: null, ok: false, error: "Sin presupuesto de exploración: captura techo de gasto y porcentaje de exploración en Configuración." };
  const remaining = Math.round((limit - committed) * 100) / 100;
  const ok = committed + o.newBudget <= limit + 1e-9;
  return { limit, committed, remaining, ok, error: ok ? null : `Presupuesto de exploración excedido: activos $${committed.toLocaleString("es-MX")} + nuevo $${o.newBudget.toLocaleString("es-MX")} > límite $${limit.toLocaleString("es-MX")} (${o.pct}% del techo). Quedan $${Math.max(0, remaining).toLocaleString("es-MX")}.` };
}

export type ExperimentProposal = "esperar" | "graduar" | "descartar" | "sin_evidencia" | "revisar";
export interface ExperimentEvaluation {
  status: Evaluation["status"]; closed_days: number; window_days: number;
  metric: ExperimentMetric; value: number | null; threshold: number; purchases: number; meets: boolean | null;
  proposed: ExperimentProposal; verdict: string; window: Evaluation;
}

/** Evalúa el experimento contra su propio criterio declarado. `today` en la zona de la cuenta; solo días cerrados. */
export function evaluateExperiment(o: { exp: { metric: ExperimentMetric; threshold: number; min_purchases: number; window_days: number; campaign_ids: string[]; start_date: string }; rows: DailyRow[]; today: string }): ExperimentEvaluation {
  const { exp } = o;
  const window = evaluateChange({ changeDate: exp.start_date, campaignIds: exp.campaign_ids, rows: o.rows, horizon: "7d", windowDays: exp.window_days, today: o.today });
  const after = window.treatment.after;
  const value = exp.metric === "roas" ? after.roas : after.cpa;
  const meets = value == null ? null : exp.metric === "roas" ? value >= exp.threshold : value <= exp.threshold;
  const purchases = after.purchases;
  let proposed: ExperimentProposal;
  if (window.status !== "mature") proposed = "esperar";
  else if (purchases < exp.min_purchases || meets == null) proposed = "sin_evidencia";
  else if (window.agreement === "mixed") proposed = "revisar";
  else proposed = meets ? "graduar" : "descartar";
  const fmt = (v: number | null) => (v == null ? "—" : exp.metric === "roas" ? v.toFixed(2) : `$${Math.round(v).toLocaleString("es-MX")}`);
  const crit = `${exp.metric.toUpperCase()} ${exp.metric === "roas" ? "≥" : "≤"} ${fmt(exp.threshold)} con ≥ ${exp.min_purchases} compras en ${exp.window_days} días cerrados`;
  const head = window.status === "pending" ? `Todavía sin días cerrados. Criterio: ${crit}.`
    : `${exp.metric.toUpperCase()} ${fmt(value)} en ${window.closed_days} de ${exp.window_days} días cerrados (${purchases} compras) contra criterio ${crit}: ${meets == null ? "sin dato" : meets ? "cumple" : "no cumple"}${purchases < exp.min_purchases ? ", pero faltan compras" : ""}.`;
  const tail = { esperar: "Se propone esperar a que cierre la ventana.", graduar: "Se propone graduar al presupuesto principal.", descartar: "Se propone descartar.", sin_evidencia: "Sin evidencia suficiente: se propone extender la ventana o descartar.", revisar: "Las dos referencias se contradicen: se propone revisar a mano." }[proposed];
  return { status: window.status, closed_days: window.closed_days, window_days: exp.window_days, metric: exp.metric, value, threshold: exp.threshold, purchases, meets, proposed, verdict: `${head} ${tail} Lecturas: ${window.verdict}`, window };
}
