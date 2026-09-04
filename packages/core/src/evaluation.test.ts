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
  });
  it("si toda la cuenta sube igual, no se le atribuye al cambio", () => {
    const e = evaluateChange({ changeDate: "2026-08-10", campaignIds: ["A"], rows: rows(4.5, 4.5), horizon: "7d", today: "2026-08-25" });
    expect(e.delta.diff_roas_pts).toBe(0); expect(e.verdict).toMatch(/^Sin cambio claro/);
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
  it("sin campañas identificadas se evalúa toda la cuenta sin control", () => {
    const e = evaluateChange({ changeDate: "2026-08-10", campaignIds: [], rows: rows(4.5, 4.5), horizon: "7d", today: "2026-08-25" });
    expect(e.control).toBeNull(); expect(e.verdict).toMatch(/sin control/);
  });
});

describe("buildWeeklyEvidence", () => {
  it("semana vs. previa y ranking de campañas con evidencia mínima", () => {
    const ev = buildWeeklyEvidence({ periodEnd: "2026-08-24", rows: rows(4.5, 3), campaignNames: new Map([["A", "Alfa"], ["B", "Beta"]]), sessions: [], targets: { target_roas: 6, breakeven_roas: 3.3, target_cpa: 170, daily_spend_ceiling: 15000 } });
    expect(ev.period).toEqual({ start: "2026-08-18", end: "2026-08-24" }); expect(ev.totals.week.days).toBe(7);
    expect(ev.campaigns.best[0]!.name).toBe("Alfa"); expect(ev.campaigns.worst[0]!.name).toBe("Beta");
    expect(ev.totals.spend_pct).toBe(0);
  });
});
