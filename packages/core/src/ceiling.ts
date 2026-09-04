/**
 * Techo de gasto contra la realidad de la cuenta, calculado en cada pasada del collector (idea 8 de Testmia: "techo de
 * gasto calculado del gasto real"). Puro, sin base de datos. Definiciones en docs/06-criterio-operacion.md.
 *  - Presupuesto activo = suma de presupuestos diarios de lo que hoy puede gastar: campañas activas con presupuesto propio
 *    (CBO) + ad sets activos de campañas activas sin presupuesto propio (ABO). Presupuestos totales (lifetime) no entran.
 *  - Política en dos capas (decisión del dueño, 2026-09-04; docs/06 G1/G2):
 *      1. gasto real del último día cerrado > techo → alerta warning y el estratega no propone subidas ese día;
 *      2. presupuesto activo > techo × factor (max_committed_budget_factor, 1.3 por defecto) → alerta info
 *         "presupuesto comprometido X % del techo" y el estratega tampoco propone subidas.
 */
export interface BudgetEntity { id: string; level: "campaign" | "adset" | "ad"; campaign_id: string | null; effective_status: string | null; daily_budget_cents: number | null }
export interface CeilingCheck {
  ceiling: number | null; committed_factor: number; committed_limit: number | null; budget_active: number; active_campaigns: number;
  spend_last_closed: number | null; spend_today_partial: number | null;
  budget_pct: number | null; spend_pct: number | null;
  /** presupuesto activo > techo × factor */ over_committed: boolean;
  /** gasto real del último día cerrado > techo */ over_spend: boolean;
  /** cualquiera de las dos capas cerrada: el estratega no propone subidas */ blocks_scaling: boolean;
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

export const DEFAULT_COMMITTED_FACTOR = 1.3;
export function ceilingCheck(o: { ceiling: number | null; ents: BudgetEntity[]; spendLastClosed: number | null; spendTodayPartial: number | null; committedFactor?: number | null }): CeilingCheck {
  const { budget, campaigns } = activeDailyBudget(o.ents);
  const factor = o.committedFactor && o.committedFactor > 0 ? o.committedFactor : DEFAULT_COMMITTED_FACTOR;
  const pctOf = (v: number | null) => (o.ceiling && v != null ? Math.round((v / o.ceiling) * 100) : null);
  const over_committed = !!o.ceiling && budget > o.ceiling * factor;
  const over_spend = !!o.ceiling && o.spendLastClosed != null && o.spendLastClosed > o.ceiling;
  return {
    ceiling: o.ceiling, committed_factor: factor, committed_limit: o.ceiling ? Math.round(o.ceiling * factor * 100) / 100 : null, budget_active: Math.round(budget * 100) / 100, active_campaigns: campaigns,
    spend_last_closed: o.spendLastClosed, spend_today_partial: o.spendTodayPartial,
    budget_pct: pctOf(budget), spend_pct: pctOf(o.spendLastClosed),
    over_committed, over_spend, blocks_scaling: over_committed || over_spend,
  };
}
