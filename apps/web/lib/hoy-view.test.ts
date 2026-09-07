import { describe, expect, it } from "vitest";
import { decisionPresentation, momentLabel, money, orderedAlerts, parseBudgetDraft, previewApprovalBlock, summarizeHoy, type HoyProposal } from "./hoy-view";
import { makeHoyFixture, HOY_SCENARIOS, type HoyScenario } from "../preview/hoy-fixtures";

describe("lectura determinista de Hoy", () => {
  it("los cuatro KPI usan la misma ventana cerrada y unidades explícitas", () => {
    const model = summarizeHoy(makeHoyFixture());
    expect(model.current).toMatchObject({ from: "2026-08-30", to: "2026-09-05", available: 7, spend: 24860, purchases: 214 });
    expect(model.current.roas).toBeCloseTo(3.42, 2); expect(model.current.cpa).toBeCloseTo(116.17, 2);
    expect(model.previous).toMatchObject({ from: "2026-08-23", to: "2026-08-29", available: 7 });
    expect(model.canCompare).toBe(true);
  });
  it("ignora hoy y fechas fuera de la ventana en KPI y gráfica", () => {
    const fixture = makeHoyFixture();
    const before = summarizeHoy(fixture);
    fixture.readings.rows.push({ date: "2026-09-06", closed: false, spend: 1e12, purchases: 10000, revenue: 1e15 }, { date: "2020-01-01", closed: true, spend: 100, purchases: 2, revenue: 200 });
    expect(summarizeHoy(fixture)).toEqual(before);
  });
  it("no reemplaza huecos con días anteriores ni cero", () => {
    const fixture = makeHoyFixture("partial"); const model = summarizeHoy(fixture);
    expect(model.current.available).toBe(4); expect(model.state).toBe("partial"); expect(model.canCompare).toBe(false);
    expect(model.series).toHaveLength(14); expect(model.series.filter(p => p.value === null)).toHaveLength(3);
    expect(model.series.filter(p => p.value === null).every(p => p.unavailable === "missing")).toBe(true);
  });
  it("un día no cerrado o duplicado no cuenta como cobertura", () => {
    const fixture = makeHoyFixture(); fixture.readings.rows[13]!.closed = false;
    fixture.readings.rows.push({ ...fixture.readings.rows[12]! });
    expect(summarizeHoy(fixture).current.available).toBe(5);
  });
  it.each([null, NaN, Infinity, -1, "100"])("un importe inválido no se convierte en cero: %s", spend => {
    const fixture = makeHoyFixture(); fixture.readings.rows[13]!.spend = spend as number;
    expect(summarizeHoy(fixture).state).toBe("partial"); expect(summarizeHoy(fixture).canCompare).toBe(false);
  });
  it("rechaza compras fraccionarias y suprime comparaciones si falta la ventana anterior", () => {
    const fixture = makeHoyFixture(); fixture.readings.rows[0]!.purchases = 0.5;
    const model = summarizeHoy(fixture); expect(model.state).toBe("ready"); expect(model.canCompare).toBe(false);
  });
  it("cero sigue siendo cero; razones con denominador cero quedan sin valor", () => {
    const fixture = makeHoyFixture(); fixture.readings.rows.forEach(row => Object.assign(row, { spend: 0, purchases: 0, revenue: 0 }));
    expect(summarizeHoy(fixture).current).toMatchObject({ spend: 0, purchases: 0, roas: null, cpa: null });
    expect(summarizeHoy(fixture).series.every(p => p.unavailable === "not-calculable")).toBe(true);
  });
  it("desbordamiento numérico no produce totales ni series infinitas", () => {
    const fixture = makeHoyFixture(); fixture.readings.rows.forEach(row => Object.assign(row, { spend: Number.MAX_VALUE, revenue: Number.MAX_VALUE }));
    const model = summarizeHoy(fixture); expect(model.state).toBe("partial"); expect(model.current.spend).toBeNull(); expect(model.canCompare).toBe(false);
    fixture.readings.rows[13]!.spend = Number.MIN_VALUE;
    expect(summarizeHoy(fixture).series.at(-1)!.value).toBeNull();
  });
  it.each(["error", "loading", "forbidden"] as HoyScenario[])("%s no revela cifras guardadas en un snapshot", state => {
    const fixture = makeHoyFixture(state); fixture.readings.rows = makeHoyFixture().readings.rows;
    const model = summarizeHoy(fixture); expect(model.current.spend).toBeNull(); expect(model.current.purchases).toBeNull(); expect(model.series.every(p => p.value === null)).toBe(true);
  });
  it("ausencia de datos no significa gasto cero ni tendencia favorable", () => {
    const model = summarizeHoy(makeHoyFixture("empty")); expect(model.state).toBe("missing"); expect(model.current.spend).toBeNull(); expect(model.canCompare).toBe(false);
  });
  it("un dato desactualizado no se compara como vigente", () => expect(summarizeHoy(makeHoyFixture("stale")).canCompare).toBe(false));
  it("el orden prioriza impacto antes de recencia y no muta la fuente", () => {
    const alerts = [ { id: "info", severity: "info" as const, title: "Información", description: "", at: "2026-09-06T16:00:00Z" }, { id: "critical", severity: "critical" as const, title: "Crítico", description: "", at: "2026-09-05T16:00:00Z" } ];
    expect(orderedAlerts(alerts).map(a => a.id)).toEqual(["critical", "info"]); expect(alerts[0]!.id).toBe("info");
  });
  it("los estados aprobada/fallida/registrada no prometen una confirmación de Meta", () => {
    expect(decisionPresentation.approved.label).toContain("por confirmar"); expect(decisionPresentation.failed.explanation).toContain("no garantiza");
    expect(decisionPresentation["execution-recorded"].label).toBe("Ejecución registrada");
    expect(Object.values(decisionPresentation).every(s => s.label !== "Ejecución confirmada")).toBe(true);
  });
  it("formatea el timestamp con fecha y zona inequívocas", () => {
    const label = momentLabel("2026-09-06T16:30:00Z"); expect(label).toContain("2026"); expect(label).toContain("10:30"); expect(label).toContain("CDMX");
    expect(momentLabel(null)).toBe("Sin fecha verificada"); expect(momentLabel("invalid")).toBe("Sin fecha verificada");
    expect(money(Infinity, "MXN")).toBe("—"); expect(money(100, "not-a-currency")).toBe("Moneda no disponible");
  });
});

describe("límites del ensayo de revisión, sin permisos de ejecución real", () => {
  function fixture() { const snapshot = makeHoyFixture(); const proposal = snapshot.proposals.state === "ready" ? snapshot.proposals.data[0]! : null!; return { snapshot, proposal }; }
  it("permite el ensayo solo sobre la propuesta de esta cuenta en simulación", () => { const { snapshot, proposal } = fixture(); expect(previewApprovalBlock(snapshot, proposal)).toBeNull(); });
  it.each(["partial", "stale", "error", "loading", "forbidden", "brake", "off", "unconfirmed", "live", "expired"] as HoyScenario[])("bloquea el ensayo de aprobación en %s", scenario => {
    const { proposal } = fixture(); expect(previewApprovalBlock(makeHoyFixture(scenario), proposal)).not.toBeNull();
  });
  it("rechaza otra cuenta, modo y freno desconocidos, aunque el botón pudiera manipularse", () => {
    const { snapshot, proposal } = fixture();
    expect(previewApprovalBlock({ ...snapshot, account: { ...snapshot.account, id: "200" } }, proposal)).toContain("otra cuenta");
    snapshot.agent.brake = "unknown"; expect(previewApprovalBlock(snapshot, proposal)).toContain("verificar el freno");
    snapshot.agent.execution = "unknown"; expect(previewApprovalBlock(snapshot, proposal)).toContain("verificar el modo");
  });
  it.each([null, "invalid", "2026-09-06T16:30:00Z"])("rechaza vigencia ausente, inválida o al límite: %s", expiresAt => {
    const { snapshot, proposal } = fixture(); proposal.expiresAt = expiresAt; expect(previewApprovalBlock(snapshot, proposal)).toContain("vigencia");
  });
  it("requiere evidencia, candados y resultado verificable de las decisiones previas", () => {
    const { snapshot, proposal } = fixture(); proposal.locks[0]!.ok = false; expect(previewApprovalBlock(snapshot, proposal)).toContain("candados");
    proposal.locks[0]!.ok = true; proposal.evidence = []; expect(previewApprovalBlock(snapshot, proposal)).toContain("evidencia");
    snapshot.decisions = { state: "error" }; expect(previewApprovalBlock(snapshot, proposal)).toContain("decisiones");
  });
  it("movimientos de dos campañas quedan en lectura", () => {
    const { snapshot, proposal } = fixture(); proposal.change = { kind: "move", origin: { name: "A", beforeMinor: 10000, afterMinor: 8000 }, destination: { name: "B", beforeMinor: 5000, afterMinor: 7000 } };
    expect(previewApprovalBlock(snapshot, proposal)).toContain("solo lectura");
  });
  it.each(["", "0", "-1", "1,000", "1e3", "Infinity", "1.001", "1.", ".1"])("rechaza importe de borrador ambiguo: %s", value => expect(parseBudgetDraft(value)).toBeNull());
  it("convierte unidades monetarias a enteros menores, no mil veces más", () => { expect(parseBudgetDraft("1980.50")).toBe(198050); expect(parseBudgetDraft("0.01")).toBe(1); });
  it("cada escenario es independiente y cambiar de cuenta no reutiliza propuestas", () => {
    for (const scenario of Object.keys(HOY_SCENARIOS) as HoyScenario[]) expect(makeHoyFixture(scenario).account.id).toBe("100");
    const a = fixture(); a.proposal.title = "Cambio local"; expect((makeHoyFixture().proposals as { data: HoyProposal[] }).data[0]!.title).not.toBe("Cambio local");
    expect(makeHoyFixture("simulation", "200").proposals).toEqual({ state: "ready", data: [] });
  });
});
