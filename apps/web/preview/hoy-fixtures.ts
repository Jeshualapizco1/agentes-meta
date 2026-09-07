import { shiftCalendarDay, type HoySnapshot, type DailyReading, type HoyAccount } from "../lib/hoy-view";

export const HOY_ACCOUNTS: HoyAccount[] = [
  { id: "100", name: "Horizonte Studio", currency: "MXN", timeZone: "America/Mazatlan" },
  { id: "200", name: "Órbita Lab", currency: "MXN", timeZone: "America/Mexico_City" },
];
export const HOY_SCENARIOS = {
  simulation: "Propuestas en simulación", "no-proposals": "Sin propuestas pendientes", partial: "Datos parciales", stale: "Datos desactualizados",
  error: "Fallos de lectura", empty: "Sin datos", loading: "Cargando", forbidden: "Sin permiso", brake: "Freno activo", off: "Agente detenido",
  unconfirmed: "Resultado por confirmar", live: "Modo real · solo lectura", expired: "Propuesta vencida",
} as const;
export type HoyScenario = keyof typeof HOY_SCENARIOS;
const AS_OF = "2026-09-06T16:30:00Z";
const REPORT_DATE = "2026-09-06";
function readings(): DailyReading[] {
  const spend = [3300, 3400, 3500, 3550, 3650, 3600, 3630, 2900, 3300, 3620, 3480, 3990, 3770, 3800];
  const purchases = [23, 25, 26, 27, 30, 29, 31, 25, 28, 31, 30, 35, 32, 33];
  const roas = [2.55, 2.70, 2.85, 2.95, 3.15, 3.05, 3.25, 2.85, 3.05, 3.23, 3.46, 3.7, 3.54, 3.9076315789473684];
  return spend.map((s, i) => ({ date: shiftCalendarDay(REPORT_DATE, i - 14), closed: true, spend: s, purchases: purchases[i]!, revenue: Math.round(s * roas[i]! * 100) / 100 }));
}
/** Datos enteramente sintéticos. Cada llamada crea objetos nuevos; ninguna modificación llega a una cuenta real. */
export function makeHoyFixture(scenario: HoyScenario = "simulation", accountId = "100", longContent = false): HoySnapshot {
  const account = HOY_ACCOUNTS.find(a => a.id === accountId);
  if (!account) throw new Error("Cuenta de demostración no disponible");
  const snapshot: HoySnapshot = {
    account: { ...account }, asOf: AS_OF, reportingDate: REPORT_DATE, access: "allowed", readings: { state: "ready", rows: readings() },
    agent: { mode: "semi", execution: "simulation", brake: "released", collectedAt: "2026-09-06T15:50:00Z", collection: "ok", strategyAt: "2026-09-06T16:00:00Z" },
    proposals: { state: "ready", data: [
      { id: `demo-${accountId}-budget`, accountId, title: "Ajustar presupuesto diario", entity: "Colección Esencia · Prospecting", entityLevel: "Campaña", rule: "Regla sintética de presupuesto", change: { kind: "budget", beforeMinor: 180000, afterMinor: 198000 }, createdAt: "2026-09-06T16:00:00Z", expiresAt: "2026-09-07T16:00:00Z", evidenceAt: "2026-09-06T15:50:00Z",
        evidence: [{ ref: "D1", label: "ROAS de la entidad · ventana de ejemplo", value: "3.80× en 7 días cerrados" }, { ref: "D2", label: "Compras atribuidas · misma entidad y ventana", value: "58 compras" }, { ref: "D3", label: "Cambio solicitado sobre presupuesto diario", value: "+$180 MXN · +10% · fixture, no umbral de operación" }],
        locks: [{ id: "brake", label: "Freno del agente", ok: true, reason: "Estaba liberado al crear esta propuesta de ejemplo." }, { id: "closed", label: "Días cerrados", ok: true, reason: "La evidencia sintética no incluye el día en curso." }, { id: "scope", label: "Entidad incluida", ok: true, reason: "Entidad ficticia incluida en la evaluación de ejemplo." }] },
      { id: `demo-${accountId}-pause`, accountId, title: "Revisar pausa de un anuncio", entity: "Esencia 02 · Video vertical", entityLevel: "Anuncio", rule: "Regla sintética de revisión", change: { kind: "pause" }, createdAt: "2026-09-06T16:05:00Z", expiresAt: "2026-09-07T16:05:00Z", evidenceAt: "2026-09-06T15:50:00Z",
        evidence: [{ ref: "A1", label: "Inversión del anuncio · ejemplo", value: "$680 MXN en 7 días cerrados" }, { ref: "A2", label: "Compras atribuidas del anuncio · ejemplo", value: "0 compras registradas en la ventana" }], locks: [{ id: "scope", label: "Alcance de la acción", ok: true, reason: "Solo el anuncio indicado, no su campaña ni otros anuncios." }] },
    ] },
    alerts: { state: "ready", data: [{ id: "demo-review", severity: "warning", title: "5 anuncios necesitan revisión", description: "Anuncios activos con gasto y sin una revisión reciente registrada en este ejemplo.", at: "2026-09-06T16:00:00Z" }] },
    decisions: { state: "ready", data: [{ id: "demo-decision", entity: "Colección Esencia · Retargeting", action: "Ajuste de presupuesto", status: "simulated", at: "2026-09-05T18:20:00Z", detail: "Se ensayó el cambio de $1,200 a $1,080 MXN diarios." }] },
    activity: { state: "ready", data: [{ id: "demo-change-1", actor: "Equipo de medios", at: "2026-09-05T17:10:00Z", summary: "Ajustó el presupuesto de la campaña de retargeting. El registro no atribuye causalidad sobre el rendimiento." }, { id: "demo-change-2", actor: "Equipo creativo", at: "2026-09-04T19:45:00Z", summary: "Registró la revisión del video Esencia 01 y su hipótesis de prueba." }] },
  };
  if (accountId === "200") {
    snapshot.readings.rows = snapshot.readings.rows.map(r => ({ ...r, spend: r.spend! / 2, purchases: Math.floor(r.purchases! / 2), revenue: r.revenue! / 2 }));
    snapshot.proposals = { state: "ready", data: [] }; snapshot.alerts = { state: "ready", data: [] }; snapshot.decisions = { state: "ready", data: [] }; snapshot.activity = { state: "ready", data: [] };
  }
  if (scenario === "no-proposals") { snapshot.proposals = { state: "ready", data: [] }; snapshot.alerts = { state: "ready", data: [] }; }
  if (scenario === "partial") { snapshot.readings.state = "partial"; snapshot.readings.rows = snapshot.readings.rows.filter((_, i) => ![9, 12, 13].includes(i)); }
  if (scenario === "stale") { snapshot.readings.state = "stale"; snapshot.agent.collectedAt = "2026-09-04T12:00:00Z"; snapshot.agent.collection = "error"; }
  if (scenario === "error" || scenario === "loading") {
    snapshot.readings = { state: scenario, rows: [] }; snapshot.proposals = { state: scenario }; snapshot.alerts = { state: scenario }; snapshot.decisions = { state: scenario }; snapshot.activity = { state: scenario };
    snapshot.agent = { mode: "unknown", execution: "unknown", brake: "unknown", collectedAt: null, collection: "unknown", strategyAt: null };
  }
  if (scenario === "empty") {
    snapshot.readings.rows = []; snapshot.proposals = { state: "ready", data: [] }; snapshot.alerts = { state: "ready", data: [] }; snapshot.decisions = { state: "ready", data: [] }; snapshot.activity = { state: "ready", data: [] };
    snapshot.agent = { mode: "unknown", execution: "unknown", brake: "unknown", collectedAt: null, collection: "unknown", strategyAt: null };
  }
  if (scenario === "forbidden") snapshot.access = "forbidden";
  if (scenario === "brake") { snapshot.agent.brake = "engaged"; snapshot.agent.mode = "off"; snapshot.agent.brakeReason = "Pausa de revisión del equipo · ejemplo"; }
  if (scenario === "off") snapshot.agent.mode = "off";
  if (scenario === "live") snapshot.agent.execution = "live";
  if (scenario === "unconfirmed") snapshot.decisions = { state: "ready", data: [{ id: "demo-unknown", entity: "Colección Esencia · Prospecting", action: "Cambio de presupuesto", status: "unconfirmed", at: "2026-09-06T16:15:00Z", detail: "No hay confirmación suficiente del efecto de la solicitud. No se afirma que fue aplicada ni revertida." }] };
  if (scenario === "expired" && snapshot.proposals.state === "ready") snapshot.proposals.data.forEach(p => p.expiresAt = "2026-09-06T16:00:00Z");
  if (longContent) {
    snapshot.account.name = "Horizonte Studio · Colección internacional de fragancias y experiencias extraordinarias";
    snapshot.readings.rows = snapshot.readings.rows.map(r => ({ ...r, spend: r.spend! * 10000000, revenue: r.revenue! * 10000000 }));
    if (snapshot.proposals.state === "ready") snapshot.proposals.data.forEach(p => { p.entity += " · Audiencia de prueba con un nombre deliberadamente extenso para verificar lectura y adaptación"; if (p.change.kind === "budget") { p.change.beforeMinor *= 1000000; p.change.afterMinor *= 1000000; } });
  }
  return snapshot;
}
