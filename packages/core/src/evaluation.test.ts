import { describe, it, expect } from "vitest";
import { evaluateChange, buildWeeklyEvidence, type DailyRow } from "./index.js";

// Cuenta con dos campañas: A (tocada) y B (control). Cambio el 2026-08-10. Días completos hasta el 2026-08-24 (hoy 25).
const day = (i: number) => { const d = new Date("2026-08-01T12:00:00Z"); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); };
function rows(aRoasAfter: number, bRoasAfter: number): DailyRow[] {
  const out: DailyRow[] = [];
  for (let i = 0; i < 30; i++) {
    const date = day(i), after = date > "2026-08-10";
    out.push({ entity_id: "A", date, spend: 1000, purchases: 5, value: 1000 * (after ? aRoasAfter : 3) });
    out.push({ entity_id: "B", date, spend: 2000, purchases: 10, value: 2000 * (after ? bRoasAfter : 3) });
  }
  return out;
}

describe("evaluateChange", () => {
  it("mejora frente al control: A sube a 4.5 y B se queda en 3 → coincidió con una mejora", () => {
    const e = evaluateChange({ changeDate: "2026-08-10", campaignIds: ["A"], rows: rows(4.5, 3), horizon: "7d", today: "2026-08-25" });
    expect(e.status).toBe("mature"); expect(e.starts_at).toBe("2026-08-11"); expect(e.ends_at).toBe("2026-08-17");
    expect(e.treatment.after.roas).toBeCloseTo(4.5); expect(e.control!.after.roas).toBeCloseTo(3);
    expect(e.delta.roas_pct).toBe(50); expect(e.delta.control_roas_pct).toBe(0); expect(e.delta.diff_roas_pts).toBe(50);
    expect(e.verdict).toMatch(/^Coincidió con una mejora/); expect(e.verdict).not.toMatch(/caus/);
    expect(e.delta.self_roas_pct).toBe(50); expect(e.agreement).toBe("agree"); expect(e.reading).toBe("up"); expect(e.baseline.days).toBe(7);
  });
  it("mixto: frente al resto deterioro pero frente a sí misma mejora → no se concluye y la confianza baja a 'low'", () => {
    // A 3 → 4.5 (+50 %); B 3 → 6 (+100 %): frente al resto −50 pts (deterioro), frente a su semana previa +50 % (mejora)
    const e = evaluateChange({ changeDate: "2026-08-10", campaignIds: ["A"], rows: rows(4.5, 6), horizon: "7d", today: "2026-08-25" });
    expect(e.agreement).toBe("mixed"); expect(e.reading).toBeNull(); expect(e.confidence).toBe("low");
    expect(e.verdict).toMatch(/^Mixto: frente al resto de la cuenta un deterioro/); expect(e.verdict).toMatch(/se contradicen/);
  });
  it("parcial: claro frente al resto pero plano frente a sí misma → 'indicio' y la confianza no pasa de media", () => {
    // A 3 → 3.2 (+6.7 %, plano); B 3 → 2.4 (−20 %): frente al resto +26.7 pts
    const e = evaluateChange({ changeDate: "2026-08-10", campaignIds: ["A"], rows: rows(3.2, 2.4), horizon: "7d", today: "2026-08-25" });
    expect(e.agreement).toBe("partial"); expect(e.confidence).toBe("medium");
    expect(e.verdict).toMatch(/^Indicio de mejora frente al resto de la cuenta/); expect(e.verdict).toMatch(/sin cambio claro frente a su semana previa/);
  });
  it("si toda la cuenta sube igual, no se concluye: frente a sí misma mejora, frente al resto plano → indicio, no mejora", () => {
    const e = evaluateChange({ changeDate: "2026-08-10", campaignIds: ["A"], rows: rows(4.5, 4.5), horizon: "7d", today: "2026-08-25" });
    expect(e.delta.diff_roas_pts).toBe(0); expect(e.delta.self_roas_pct).toBe(50);
    expect(e.agreement).toBe("partial"); expect(e.reading).toBeNull(); expect(e.confidence).toBe("medium");
    expect(e.verdict).toMatch(/^Indicio de mejora frente a su propia semana previa/); expect(e.verdict).toMatch(/sin cambio claro frente al resto/);
  });
  it("deterioro y confianza por compras", () => {
    const e = evaluateChange({ changeDate: "2026-08-10", campaignIds: ["A"], rows: rows(2, 3), horizon: "14d", today: "2026-08-25" });
    expect(e.verdict).toMatch(/deterioro/); expect(e.confidence).toBe("high"); // 5 compras × 28 días = 140
  });
  it("pendiente cuando el cambio fue ayer; preliminar cuando faltan días", () => {
    expect(evaluateChange({ changeDate: "2026-08-24", campaignIds: ["A"], rows: rows(4.5, 3), horizon: "72h", today: "2026-08-25" }).status).toBe("pending");
    const p = evaluateChange({ changeDate: "2026-08-20", campaignIds: ["A"], rows: rows(4.5, 3), horizon: "14d", today: "2026-08-25" });
    expect(p.status).toBe("preliminary"); expect(p.verdict).toMatch(/Preliminar: van 4 de 14 días/); expect(p.confidence).not.toBe("high");
  });
  it("cambio de presupuesto: salvedad de presupuesto compartido con el gasto del control", () => {
    const e = evaluateChange({ changeDate: "2026-08-10", campaignIds: ["A"], rows: rows(4.5, 3), horizon: "7d", today: "2026-08-25", kind: "budget" });
    expect(e.delta.control_spend_pct).toBe(0);
    expect(e.caveats).toEqual([expect.stringMatching(/^Presupuesto compartido/)]); expect(e.caveats[0]).toMatch(/no es independiente/);
  });
  it("control pequeño: el resto no cuenta como lectura (causa guardada), queda una sola lectura y la confianza no pasa de media; gasto del control movido ≥ 20 % se dice", () => {
    // B (control) gasta 100 y compra 0.2 al día → 5.6 compras en 14 días < 10; A tiene 5×14 = 70 compras (alta si el control fuera bueno)
    const small: DailyRow[] = rows(4.5, 3).map(r => (r.entity_id === "B" ? { ...r, spend: 100, purchases: 0.2, value: 300 } : r));
    const e = evaluateChange({ changeDate: "2026-08-10", campaignIds: ["A"], rows: small, horizon: "7d", today: "2026-08-25" });
    expect(e.missing_refs).toEqual({ rest: "resto_compras_insuficientes", self: null }); expect(e.agreement).toBe("single"); expect(e.reading).toBe("up");
    expect(e.confidence).toBe("medium"); expect(e.caveats).toEqual([]);
    const shifted: DailyRow[] = rows(4.5, 3).map(r => (r.entity_id === "B" && r.date > "2026-08-10" ? { ...r, spend: 1000, value: 3000 } : r));
    const f = evaluateChange({ changeDate: "2026-08-10", campaignIds: ["A"], rows: shifted, horizon: "7d", today: "2026-08-25" });
    expect(f.delta.control_spend_pct).toBe(-50); expect(f.caveats).toEqual([expect.stringMatching(/se movió -50%/)]);
    expect(evaluateChange({ changeDate: "2026-08-10", campaignIds: ["A"], rows: rows(4.5, 3), horizon: "7d", today: "2026-08-25" }).caveats).toEqual([]);
  });
  it("sin campañas identificadas se evalúa toda la cuenta sin control", () => {
    const e = evaluateChange({ changeDate: "2026-08-10", campaignIds: [], rows: rows(4.5, 4.5), horizon: "7d", today: "2026-08-25" });
    expect(e.control).toBeNull(); expect(e.verdict).toMatch(/sin control/); expect(e.agreement).toBe("single"); expect(e.reading).toBe("up");
    expect(e.missing_refs).toEqual({ rest: "sin_campana_identificada", self: null });
  });
  it("causas de referencia faltante: campaña nueva, pausada antes, pendiente y sin gasto después", () => {
    const base = rows(4.5, 3);
    // A solo tiene datos desde el 08-08 (menos de 7 días antes del cambio del 08-10)
    const nueva = base.filter(r => r.entity_id !== "A" || r.date >= "2026-08-08");
    expect(evaluateChange({ changeDate: "2026-08-10", campaignIds: ["A"], rows: nueva, horizon: "7d", today: "2026-08-25" }).missing_refs.self).toBe("menos_de_7_dias_previos");
    // A existía pero no gastó en los 7 días previos
    const pausada = base.map(r => (r.entity_id === "A" && r.date >= "2026-08-03" && r.date <= "2026-08-09" ? { ...r, spend: 0, purchases: 0, value: 0 } : r));
    expect(evaluateChange({ changeDate: "2026-08-10", campaignIds: ["A"], rows: pausada, horizon: "7d", today: "2026-08-25" }).missing_refs.self).toBe("sin_gasto_previo");
    expect(evaluateChange({ changeDate: "2026-08-24", campaignIds: ["A"], rows: base, horizon: "72h", today: "2026-08-25" }).missing_refs).toEqual({ rest: "pendiente", self: "pendiente" });
    const apagada = base.map(r => (r.entity_id === "A" && r.date > "2026-08-10" ? { ...r, spend: 0, purchases: 0, value: 0 } : r));
    expect(evaluateChange({ changeDate: "2026-08-10", campaignIds: ["A"], rows: apagada, horizon: "7d", today: "2026-08-25" }).missing_refs).toEqual({ rest: "sin_gasto_despues", self: "sin_gasto_despues" });
  });
});

describe("buildWeeklyEvidence", () => {
  it("semana vs. previa y ranking de campañas con evidencia mínima", () => {
    const ev = buildWeeklyEvidence({ periodEnd: "2026-08-24", rows: rows(4.5, 3), campaignNames: new Map([["A", "Alfa"], ["B", "Beta"]]), sessions: [], targets: { target_roas: 6, breakeven_roas: 3.3, target_cpa: 170, daily_spend_ceiling: 15000 } });
    expect(ev.period).toEqual({ start: "2026-08-18", end: "2026-08-24" }); expect(ev.totals.week.days).toBe(7);
    expect(ev.campaigns.best.map(c => c.name)).toEqual(["Alfa", "Beta"]); expect(ev.campaigns.worst).toEqual([]);   // con pocas campañas no se repiten en "peores"
    expect(ev.totals.spend_pct).toBe(0);
    expect(ev.campaigns.best.map(c => c.ref)).toEqual(["C1", "C2"]); expect(ev.refs.totals).toBe("T");
  });
  it("las sesiones reciben referencia S1, S2… en orden", () => {
    const s = (id: string) => ({ id, started_at: "2026-08-20T10:00:00Z", actor_name: "Eduardo", summary: "x", resets_learning: false, kind: "budget", evaluations: [] });
    const ev = buildWeeklyEvidence({ periodEnd: "2026-08-24", rows: rows(3, 3), campaignNames: new Map(), sessions: [s("a"), s("b")], targets: { target_roas: null, breakeven_roas: null, target_cpa: null, daily_spend_ceiling: null } });
    expect(ev.sessions.map(x => x.ref)).toEqual(["S1", "S2"]);
  });
});
