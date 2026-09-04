import { describe, it, expect } from "vitest";
import { formatWeekReport } from "./index.js";

describe("reporte de primera semana en solitario", () => {
  it("resume corridas, alertas por tipo, propuestas, ventanas maduradas y veredictos que cambiaron; clave por fin de periodo", () => {
    const n = formatWeekReport({ period_start: "2026-09-05", period_end: "2026-09-11", runs: [{ agent: "collector", ok: 28, failed: 0 }, { agent: "analyst", ok: 27, failed: 1 }, { agent: "strategist", ok: 7, failed: 0 }],
      alerts_by_kind: { budget_committed: 7, meta_token_expiring: 1 }, proposals: { generated: 3, blocked: 1, approved: 1, rejected: 1, expired: 0, simulated: 1, executed: 0 }, windows_matured: 12,
      verdicts_changed: [{ when: "09-08", session: "Presupuesto diario $4,600 → $5,200 (+13%) en «CBO | PROMO»", horizon: "7d", from: null, to: "down" }], experiments: { active: 1, evaluating: 0, decided: 0 }, manual_runs: 0 }, "https://x");
    expect(n.key).toBe("week_report:2026-09-11");
    expect(n.text).toMatch(/^🗓 <b>Primera semana en solitario<\/b> · 2026-09-05 a 2026-09-11 · sin intervención manual\n<b>Corridas:<\/b> collector 28 ok, analyst 27 ok \/ 1 fallidas, strategist 7 ok\n<b>Alertas:<\/b> budget_committed 7, meta_token_expiring 1\n<b>Propuestas:<\/b> 3 generadas \(1 descartadas por candados\), 1 aprobadas, 1 rechazadas, 0 expiradas, 1 simuladas, 0 ejecutadas\n<b>Ventanas maduradas:<\/b> 12 · <b>Experimentos:<\/b> 1 activos, 0 por confirmar, 0 cerrados\n<b>Veredictos que cambiaron al madurar:<\/b>\n• 09-08 Presupuesto diario \$4,600 → \$5,200 \(\+13%\) en «CBO \| PROMO» \[7d\]: sin lectura → <b>deterioro<\/b>\nPunto de revisión/);
  });
  it("con intervención manual lo dice, y sin cambios de veredicto dice ninguno", () => {
    const n = formatWeekReport({ period_start: "a", period_end: "b", runs: [], alerts_by_kind: {}, proposals: { generated: 0, blocked: 0, approved: 0, rejected: 0, expired: 0, simulated: 0, executed: 0 }, windows_matured: 0, verdicts_changed: [], experiments: { active: 0, evaluating: 0, decided: 0 }, manual_runs: 2 }, "https://x");
    expect(n.text).toMatch(/⚠ 2 corrida\(s\) manual\(es\)/); expect(n.text).toMatch(/<b>Alertas:<\/b> ninguna/); expect(n.text).toMatch(/madurar:<\/b> ninguno/);
  });
});
