import { Chip } from "./Chip";
const states = {
  off: { label: "Agente detenido", tone: "neutral", symbol: "Ⅱ" },
  simulation: { label: "Modo simulado", tone: "meta", symbol: "◇" },
  simulated: { label: "Simulada", tone: "meta", symbol: "◇" },
  pending: { label: "Pendiente de revisión", tone: "amber", symbol: "◷" },
  confirmed: { label: "Ejecución confirmada", tone: "ok", symbol: "✓" },
  failed: { label: "Falló la ejecución", tone: "crit", symbol: "×" },
  unconfirmed: { label: "Resultado por confirmar", tone: "amber", symbol: "?" },
  partial: { label: "Datos parciales", tone: "amber", symbol: "◐" },
  stale: { label: "Datos desactualizados", tone: "amber", symbol: "◷" },
} as const;
export type DisplayStatus = keyof typeof states;
/** Traducción de un estado explícito. Nunca deduce éxito de un modo, una aprobación o una URL. */
export function StatusBadge({ status }: { status: DisplayStatus }) {
  const state = states[status];
  return <Chip tone={state.tone}><span aria-hidden="true">{state.symbol}</span>{state.label}</Chip>;
}
