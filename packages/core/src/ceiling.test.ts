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
  it("marca cuando el presupuesto activo o el gasto real del último día cerrado rebasan el techo", () => {
    const c = ceilingCheck({ ceiling: 10000, ents, spendLastClosed: 9500, spendTodayPartial: 4000 });
    expect(c.over_budget).toBe(true); expect(c.over_spend).toBe(false); expect(c.budget_pct).toBe(110); expect(c.spend_pct).toBe(95);
    expect(ceilingCheck({ ceiling: 10000, ents, spendLastClosed: 10500, spendTodayPartial: null }).over_spend).toBe(true);
  });
  it("sin techo configurado no marca nada", () => {
    const c = ceilingCheck({ ceiling: null, ents, spendLastClosed: 99999, spendTodayPartial: null });
    expect(c.over_budget).toBe(false); expect(c.over_spend).toBe(false); expect(c.budget_pct).toBeNull();
  });
});
