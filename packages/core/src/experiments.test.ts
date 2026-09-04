import { describe, it, expect } from "vitest";
import { validateExperiment, explorationBudget, evaluateExperiment, type DailyRow, type ExperimentDraft } from "./index.js";

const day = (i: number) => { const d = new Date("2026-08-01T12:00:00Z"); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); };
function rows(aRoasAfter: number, bRoasAfter: number): DailyRow[] {
  const out: DailyRow[] = [];
  for (let i = 0; i < 30; i++) { const date = day(i), after = date > "2026-08-10"; out.push({ entity_id: "A", date, spend: 1000, purchases: 5, value: 1000 * (after ? aRoasAfter : 3) }); out.push({ entity_id: "B", date, spend: 2000, purchases: 10, value: 2000 * (after ? bRoasAfter : 3) }); }
  return out;
}
const full: ExperimentDraft = { hypothesis: "Un video UGC baja el CPA", metric: "cpa", threshold: 180, min_purchases: 20, window_days: 7, budget: 500, campaign_ids: ["A"], start_date: "2026-08-10" };

describe("experimentos", () => {
  it("no se activa sin hipótesis, criterio de éxito y presupuesto", () => {
    expect(validateExperiment(full)).toEqual([]);
    const errs = validateExperiment({ ...full, hypothesis: " ", metric: null, threshold: null, budget: null });
    expect(errs).toEqual([expect.stringMatching(/hipótesis/), expect.stringMatching(/métrica/), expect.stringMatching(/umbral/), expect.stringMatching(/presupuesto/)]);
    expect(validateExperiment({ ...full, min_purchases: 0, window_days: null, campaign_ids: [] })).toHaveLength(3);
  });
  it("presupuesto de exploración excedido: techo 15,000 × 10 % = 1,500; activos 1,300 + nuevo 300 no cabe, 200 sí", () => {
    const no = explorationBudget({ ceiling: 15000, pct: 10, activeBudgets: [800, 500], newBudget: 300 });
    expect(no.limit).toBe(1500); expect(no.committed).toBe(1300); expect(no.ok).toBe(false); expect(no.error).toMatch(/excedido/);
    expect(explorationBudget({ ceiling: 15000, pct: 10, activeBudgets: [800, 500], newBudget: 200 }).ok).toBe(true);
    expect(explorationBudget({ ceiling: null, pct: 10, activeBudgets: [], newBudget: 1 })).toMatchObject({ ok: false, error: expect.stringMatching(/Sin presupuesto de exploración/) });
  });
  it("evaluación contra umbral de ROAS: 4.5 cumple ≥ 4 (graduar) y no cumple ≥ 5 (descartar); antes de cerrar la ventana, esperar", () => {
    const base = { min_purchases: 10, window_days: 7, campaign_ids: ["A"], start_date: "2026-08-10" };
    const ok = evaluateExperiment({ exp: { ...base, metric: "roas", threshold: 4 }, rows: rows(4.5, 3), today: "2026-08-25" });
    expect(ok.status).toBe("mature"); expect(ok.value).toBeCloseTo(4.5); expect(ok.purchases).toBe(35); expect(ok.meets).toBe(true); expect(ok.proposed).toBe("graduar");
    expect(ok.verdict).toMatch(/^ROAS 4\.50 en 7 de 7 días cerrados \(35 compras\) contra criterio ROAS ≥ 4\.00 con ≥ 10 compras en 7 días cerrados: cumple\./);
    expect(evaluateExperiment({ exp: { ...base, metric: "roas", threshold: 5 }, rows: rows(4.5, 3), today: "2026-08-25" }).proposed).toBe("descartar");
    expect(evaluateExperiment({ exp: { ...base, metric: "roas", threshold: 4 }, rows: rows(4.5, 3), today: "2026-08-14" })).toMatchObject({ status: "preliminary", closed_days: 3, proposed: "esperar" });
  });
  it("evaluación contra umbral de CPA: $200 cumple ≤ 250 y no cumple ≤ 150; con menos compras que el mínimo, sin evidencia; lecturas contradictorias, revisar", () => {
    const base = { min_purchases: 10, window_days: 7, campaign_ids: ["A"], start_date: "2026-08-10" };
    expect(evaluateExperiment({ exp: { ...base, metric: "cpa", threshold: 250 }, rows: rows(4.5, 3), today: "2026-08-25" })).toMatchObject({ value: 200, meets: true, proposed: "graduar" });
    expect(evaluateExperiment({ exp: { ...base, metric: "cpa", threshold: 150 }, rows: rows(4.5, 3), today: "2026-08-25" })).toMatchObject({ meets: false, proposed: "descartar" });
    expect(evaluateExperiment({ exp: { ...base, metric: "cpa", threshold: 250, min_purchases: 100 }, rows: rows(4.5, 3), today: "2026-08-25" }).proposed).toBe("sin_evidencia");
    // A sube a 4.5 pero el resto sube a 6: frente al resto deterioro, frente a sí misma mejora → mixto → revisar
    expect(evaluateExperiment({ exp: { ...base, metric: "roas", threshold: 4 }, rows: rows(4.5, 6), today: "2026-08-25" })).toMatchObject({ meets: true, proposed: "revisar" });
  });
});
