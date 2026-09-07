import { describe, expect, it } from "vitest";
import { closeOpenAlerts, resolvedAlertKinds } from "./alerts.js";

describe("resolvedAlertKinds", () => {
  it("cierra fallos de agentes sólo después de una corrida correcta", () => {
    expect(resolvedAlertKinds({ agent: "collector", status: "ok", insightsStatus: "ok" }))
      .toEqual(["collector_failed", "insights_failed"]);
    expect(resolvedAlertKinds({ agent: "analyst", status: "ok" })).toEqual(["analyst_failed"]);
    expect(resolvedAlertKinds({ agent: "strategist", status: "ok" })).toEqual(["strategist_failed"]);
    expect(resolvedAlertKinds({ agent: "collector", status: "failed", insightsStatus: "ok" })).toEqual([]);
  });

  it("no da por recuperadas métricas fallidas u omitidas", () => {
    expect(resolvedAlertKinds({ agent: "collector", status: "ok", insightsStatus: "failed" }))
      .toEqual(["collector_failed"]);
    expect(resolvedAlertKinds({ agent: "collector", status: "ok", insightsStatus: "skipped" }))
      .toEqual(["collector_failed"]);
  });

  it("resuelve sólo las condiciones de techo que dejaron de cumplirse", () => {
    expect(resolvedAlertKinds({ ceiling: { over_spend: false, over_committed: true } }))
      .toEqual(["spend_over_ceiling", "budget_over_ceiling"]);
    expect(resolvedAlertKinds({ ceiling: { over_spend: true, over_committed: false } }))
      .toEqual(["budget_committed", "budget_over_ceiling"]);
  });

  it("cierra vencimiento y estado de cuenta cuando se recuperan", () => {
    expect(resolvedAlertKinds({ token: { is_valid: true, days_left: 10 }, accountStatus: 1 }))
      .toEqual(["meta_token_expiring", "account_status"]);
    expect(resolvedAlertKinds({ token: { is_valid: true, days_left: null } })).toEqual(["meta_token_expiring"]);
    expect(resolvedAlertKinds({ token: { is_valid: false, days_left: 30 }, accountStatus: 2 })).toEqual([]);
  });

  it("registra el error de cierre y no lo propaga", async () => {
    const logs: string[] = [];
    const query = {
      update() { return this; }, in() { return this; }, is() { return this; }, eq() { return this; }, or() { return this; },
      then(resolve: (value: unknown) => unknown) { return Promise.resolve(resolve({ error: { message: "sin conexión" } })); },
    };
    const db = { from: () => query } as unknown as Parameters<typeof closeOpenAlerts>[0];
    await expect(closeOpenAlerts(db, "cuenta-1", ["collector_failed"], m => logs.push(m)))
      .resolves.toBe(false);
    expect(logs).toEqual(["⚠ no se pudieron cerrar alertas collector_failed: sin conexión"]);
  });

  it("tolera también una excepción de red al cerrar", async () => {
    const logs: string[] = [];
    const db = { from: () => { throw new Error("red caída"); } } as unknown as Parameters<typeof closeOpenAlerts>[0];
    await expect(closeOpenAlerts(db, "cuenta-1", ["analyst_failed"], m => logs.push(m)))
      .resolves.toBe(false);
    expect(logs[0]).toContain("red caída");
  });
});
