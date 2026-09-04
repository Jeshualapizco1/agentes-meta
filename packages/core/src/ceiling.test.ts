import { describe, it, expect } from "vitest";
import { activeDailyBudget, ceilingCheck, type BudgetEntity } from "./index.js";

const ents: BudgetEntity[] = [
  { id: "c1", level: "campaign", campaign_id: "c1", effective_status: "ACTIVE", daily_budget_cents: 800000 },           // CBO 8,000
  { id: "a1", level: "adset", campaign_id: "c1", effective_status: "ACTIVE", daily_budget_cents: null },
  { id: "c2", level: "campaign", campaign_id: "c2", effective_status: "ACTIVE", daily_budget_cents: null },             // ABO
  { id: "a2", level: "adset", campaign_id: "c2", effective_status: "ACTIVE", daily_budget_cents: 300000 },
  { id: "a3", level: "adset", campaign_id: "c2", effective_status: "PAUSED", daily_budget_cents: 500000 },              // pausado: no cuenta
  { id: "c3", level: "campaign", campaign_id: "c3", effective_status: "PAUSED", daily_budget_cents: 900000 },           // campaña pausada: no cuenta
  { id: "a4", level: "adset", campaign_id: "c3", effective_status: "ACTIVE", daily_budget_cents: 100000 },              // hijo de campaña pausada: no cuenta
];

describe("techo de gasto contra presupuesto activo y gasto real", () => {
  it("suma CBO de campañas activas y ABO de ad sets activos de campañas activas sin presupuesto propio", () => {
    expect(activeDailyBudget(ents)).toEqual({ budget: 11000, campaigns: 2 });
  });
  it("dos capas: gasto real > techo cierra; presupuesto activo > techo × factor cierra; por debajo del factor no", () => {
    // presupuesto activo 11,000 = 110 % del techo: dentro del factor 1.3 → no cierra; gasto real 9,500 < 10,000 → no cierra
    const c = ceilingCheck({ ceiling: 10000, ents, spendLastClosed: 9500, spendTodayPartial: 4000 });
    expect(c.over_committed).toBe(false); expect(c.over_spend).toBe(false); expect(c.blocks_scaling).toBe(false); expect(c.budget_pct).toBe(110); expect(c.spend_pct).toBe(95); expect(c.committed_limit).toBe(13000);
    // gasto real 10,500 > techo → capa 1 cerrada
    expect(ceilingCheck({ ceiling: 10000, ents, spendLastClosed: 10500, spendTodayPartial: null })).toMatchObject({ over_spend: true, blocks_scaling: true });
    // factor 1.0: 11,000 > 10,000 → capa 2 cerrada aunque el gasto real esté por debajo
    expect(ceilingCheck({ ceiling: 10000, ents, spendLastClosed: 9500, spendTodayPartial: null, committedFactor: 1.0 })).toMatchObject({ over_committed: true, blocks_scaling: true });
    // caso real de Aromante 1 (2026-09-04): 28,200 comprometidos contra techo 15,000 × 1.3 = 19,500 → cerrada
    expect(ceilingCheck({ ceiling: 15000, ents: [{ id: "c", level: "campaign", campaign_id: "c", effective_status: "ACTIVE", daily_budget_cents: 2820000 }], spendLastClosed: 13585, spendTodayPartial: null })).toMatchObject({ over_committed: true, over_spend: false, budget_pct: 188, committed_limit: 19500 });
  });
  it("sin techo configurado no marca nada", () => {
    const c = ceilingCheck({ ceiling: null, ents, spendLastClosed: 99999, spendTodayPartial: null });
    expect(c.over_committed).toBe(false); expect(c.over_spend).toBe(false); expect(c.blocks_scaling).toBe(false); expect(c.budget_pct).toBeNull();
  });
});
