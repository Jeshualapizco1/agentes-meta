export type Horizon = "72h" | "7d" | "14d";
export type ResultTone = "ok" | "crit" | "amber" | "neutral";
type Metrics = { days?: number; roas?: number | null; purchases?: number | null; spend?: number | null };
export type Win = {
  session_id: string; horizon: string; status: string; confidence: string | null;
  verdict?: string | null; caveats?: string[] | null; agreement: string | null; reading: string | null;
  missing_refs?: unknown; closed_days?: number;
  delta?: { roas_pct?: number | null; control_roas_pct?: number | null; cpa_pct?: number | null; diff_roas_pts?: number | null; self_roas_pct?: number | null } | null;
  metrics_before?: Metrics | null; metrics_after?: Metrics | null;
};
export const RESULT_HORIZONS: Horizon[] = ["72h", "7d", "14d"];
const days = { "72h": 3, "7d": 7, "14d": 14 };
const labels = { "72h": "72 h", "7d": "7 d", "14d": "14 d" };
export const resultPercent = (value: number | null | undefined): string => value == null || !Number.isFinite(value) ? "—" : `${value < 0 ? "−" : "+"}${Math.abs(value).toFixed(0)}\u2009%`;
function presentWindow(w: Win, horizon: Horizon) {
  let tone: ResultTone = "neutral", label: string;
  const suffix = ` (${labels[horizon]})`;
  if (w.status === "pending") label = "Esperando días completos";
  else if (w.confidence === "insufficient") label = "Sin evidencia suficiente";
  else if (w.agreement === "mixed") { label = "Resultado mixto" + suffix; tone = "amber"; }
  else if (w.reading === "up" || w.reading === "down") {
    label = `${w.reading === "up" ? "Mejoró" : "Empeoró"} · ROAS ${resultPercent(w.delta?.roas_pct)}${suffix}`;
    tone = w.status === "preliminary" ? "amber" : w.reading === "up" ? "ok" : "crit";
  } else label = "Sin cambio claro" + suffix;
  if (w.status === "preliminary") label += " · preliminar";
  // La fila persistida guarda los días medidos dentro de metrics_after.
  const measured = w.closed_days ?? w.metrics_after?.days;
  const confidence = w.confidence === "high" ? "sólida" : w.confidence === "medium" ? "media" : "débil";
  const detail = `${measured ?? "—"} de ${days[horizon]} días medidos · evidencia ${confidence}${w.caveats?.[0] ? ` · ${w.caveats[0]}` : ""}`;
  return { horizon, status: w.status, label, tone, detail };
}
export function presentResult(wins: Win[]) {
  const horizons = RESULT_HORIZONS.flatMap(h => { const w = wins.find(w => w.horizon === h); return w ? [presentWindow(w, h)] : []; });
  const main = ["mature", "preliminary", "pending"].flatMap(status => [...horizons].reverse().filter(w => w.status === status))[0];
  return { tone: main?.tone ?? "neutral" as ResultTone, label: main?.label ?? "Todavía sin días completos para medir.", detail: main?.detail ?? "", horizon: main?.horizon ?? null, horizons };
}
export type PresentedResult = ReturnType<typeof presentResult>;
