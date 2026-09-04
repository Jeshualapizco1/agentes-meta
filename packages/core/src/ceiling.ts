/**
 * Techo de gasto contra la realidad de la cuenta, calculado en cada pasada del collector (idea 8 de Testmia: "techo de
 * gasto calculado del gasto real"). Puro, sin base de datos. Definiciones en docs/06-criterio-operacion.md.
 *  - Presupuesto activo = suma de presupuestos diarios de lo que hoy puede gastar: campañas activas con presupuesto propio
 *    (CBO) + ad sets activos de campañas activas sin presupuesto propio (ABO). Presupuestos totales (lifetime) no entran.
 *  - Se compara el techo con ese presupuesto y con el gasto real del último día cerrado.
 */
export interface BudgetEntity { id: string; level: "campaign" | "adset" | "ad"; campaign_id: string | null; effective_status: string | null; daily_budget_cents: number | null }
export interface CeilingCheck {
  ceiling: number | null; budget_active: number; active_campaigns: number;
  spend_last_closed: number | null; spend_today_partial: number | null;
  budget_pct: number | null; spend_pct: number | null; over_budget: boolean; over_spend: boolean;
}

export function activeDailyBudget(ents: BudgetEntity[]): { budget: number; campaigns: number } {
  const active = (e: BudgetEntity) => e.effective_status === "ACTIVE";
  const camps = ents.filter(e => e.level === "campaign" && active(e));
  let cents = 0;
  for (const c of camps) {
    if (c.daily_budget_cents) cents += c.daily_budget_cents;
    else for (const a of ents) if (a.level === "adset" && a.campaign_id === c.id && active(a) && a.daily_budget_cents) cents += a.daily_budget_cents;
  }
  return { budget: cents / 100, campaigns: camps.length };
}

export function ceilingCheck(o: { ceiling: number | null; ents: BudgetEntity[]; spendLastClosed: number | null; spendTodayPartial: number | null }): CeilingCheck {
  const { budget, campaigns } = activeDailyBudget(o.ents);
  const pctOf = (v: number | null) => (o.ceiling && v != null ? Math.round((v / o.ceiling) * 100) : null);
  return {
    ceiling: o.ceiling, budget_active: Math.round(budget * 100) / 100, active_campaigns: campaigns,
    spend_last_closed: o.spendLastClosed, spend_today_partial: o.spendTodayPartial,
    budget_pct: pctOf(budget), spend_pct: pctOf(o.spendLastClosed),
    over_budget: !!o.ceiling && budget > o.ceiling, over_spend: !!o.ceiling && o.spendLastClosed != null && o.spendLastClosed > o.ceiling,
  };
}
