import { describe, it, expect } from "vitest";
import { validateOrder, transition, expandOrders, orderForProposal, inverseOrder, confirmMatches, pairFailurePlan, describeOrder, isOwnOrder, ALLOWED_OPS, type WriteOrder } from "./index.js";

describe("solo tres operaciones", () => {
  it("acepta pausar anuncio, cambiar presupuesto y mover presupuesto con campos completos", () => {
    expect(ALLOWED_OPS).toEqual(["pausar_anuncio", "cambiar_presupuesto", "mover_presupuesto"]);
    expect(validateOrder({ op: "pausar_anuncio", ad_id: "AD1", previous_status: "ACTIVE" }).op).toBe("pausar_anuncio");
    expect(validateOrder({ op: "cambiar_presupuesto", entity_id: "C1", level: "campaign", daily_budget_cents: 115000, previous_cents: 100000 }).op).toBe("cambiar_presupuesto");
    expect(validateOrder({ op: "mover_presupuesto", from_id: "C1", to_id: "C2", amount_cents: 20000, from_previous_cents: 100000, to_previous_cents: 50000 }).op).toBe("mover_presupuesto");
  });
  it("rechaza cualquier otra operación: borrar, activar, creativo, segmentación, puja, objetivo", () => {
    for (const op of ["borrar", "activar_anuncio", "cambiar_creativo", "cambiar_segmentacion", "cambiar_puja", "cambiar_objetivo", "delete", ""]) expect(() => validateOrder({ op, ad_id: "x" })).toThrow(/no permitida/);
    expect(() => validateOrder(null)).toThrow(); expect(() => validateOrder({ op: "cambiar_presupuesto", entity_id: "C1", level: "ad", daily_budget_cents: 1, previous_cents: 1 })).toThrow(/campaign o adset/);
    expect(() => validateOrder({ op: "cambiar_presupuesto", entity_id: "C1", level: "campaign", daily_budget_cents: 0, previous_cents: 1 })).toThrow(/mayor que cero/);
    expect(() => validateOrder({ op: "mover_presupuesto", from_id: "C1", to_id: "C2", amount_cents: 200000, from_previous_cents: 100000, to_previous_cents: 0 })).toThrow(/supera/);
  });
  it("una propuesta sin orden de escritura (bloquear_subidas) no produce orden", () => {
    expect(() => orderForProposal({ action: "bloquear_subidas", entity_id: "C1", entity_level: "campaign", before_value: 1, after_value: 1 })).toThrow(/no tiene orden/);
  });
});

describe("write-ahead log en cuatro estados", () => {
  it("registrada → enviada → confirmada", () => { expect(transition(transition("registrada", "enviada"), "confirmada")).toBe("confirmada"); });
  it("registrada → fallida y enviada → fallida (con rollback) son válidas", () => { expect(transition("registrada", "fallida")).toBe("fallida"); expect(transition("enviada", "fallida")).toBe("fallida"); });
  it("no se puede enviar sin registrar, ni confirmar sin enviar, ni salir de confirmada o fallida", () => {
    expect(() => transition("registrada", "confirmada")).toThrow(/no permitida/);
    expect(() => transition("confirmada", "enviada")).toThrow(); expect(() => transition("fallida", "enviada")).toThrow(); expect(() => transition("confirmada", "fallida")).toThrow();
  });
  it("confirmación: la entidad releída coincide con lo ordenado", () => {
    const o = validateOrder({ op: "cambiar_presupuesto", entity_id: "C1", level: "campaign", daily_budget_cents: 115000, previous_cents: 100000 });
    expect(confirmMatches(o, { daily_budget: "115000" })).toBe(true); expect(confirmMatches(o, { daily_budget: "100000" })).toBe(false);
    const p = validateOrder({ op: "pausar_anuncio", ad_id: "AD1", previous_status: "ACTIVE" });
    expect(confirmMatches(p, { status: "PAUSED" })).toBe(true); expect(confirmMatches(p, { status: "ACTIVE" })).toBe(false);
  });
});

describe("órdenes desde propuestas y par atado", () => {
  it("subir presupuesto: MXN → centavos; pausar anuncio solo a nivel anuncio", () => {
    expect(orderForProposal({ action: "subir_presupuesto", entity_id: "C1", entity_level: "campaign", before_value: 1000, after_value: 1150 })).toEqual({ op: "cambiar_presupuesto", entity_id: "C1", level: "campaign", daily_budget_cents: 115000, previous_cents: 100000, pair_key: undefined, step: undefined });
    expect(() => orderForProposal({ action: "pausar_anuncio", entity_id: "C1", entity_level: "campaign", before_value: "ACTIVE", after_value: "PAUSED" })).toThrow(/solo aplica a anuncios/);
  });
  it("mover presupuesto se expande en dos órdenes atadas: baja origen, sube destino", () => {
    const o = orderForProposal({ action: "mover_presupuesto", entity_id: "C1", entity_level: "campaign", before_value: 1000, after_value: 800, move_to: { entity_id: "C2", before_value: 500 } });
    const pair = expandOrders(o, "move:p1");
    expect(pair).toEqual([
      { op: "cambiar_presupuesto", entity_id: "C1", level: "campaign", daily_budget_cents: 80000, previous_cents: 100000, pair_key: "move:p1", step: 1 },
      { op: "cambiar_presupuesto", entity_id: "C2", level: "campaign", daily_budget_cents: 70000, previous_cents: 50000, pair_key: "move:p1", step: 2 },
    ]);
  });
  it("rollback del par: si falla la segunda, se revierte la primera y ambas campañas quedan congeladas 72 h", () => {
    const pair = expandOrders(validateOrder({ op: "mover_presupuesto", from_id: "C1", to_id: "C2", amount_cents: 20000, from_previous_cents: 100000, to_previous_cents: 50000 }), "move:p1");
    const plan = pairFailurePlan(pair, 2, "2026-09-05T06:20:00.000Z");
    expect(plan.rollback).toEqual([{ op: "cambiar_presupuesto", entity_id: "C1", level: "campaign", daily_budget_cents: 100000, previous_cents: 80000, pair_key: "move:p1", step: 1 }]);
    expect(plan.freeze).toEqual(["C1", "C2"]); expect(plan.until).toBe("2026-09-08T06:20:00.000Z");
    // si falla la primera no hay nada que revertir, pero igual se congelan
    expect(pairFailurePlan(pair, 1, "2026-09-05T06:20:00.000Z").rollback).toEqual([]);
  });
  it("pausar no tiene inversa: reactivar está prohibido al agente", () => {
    expect(inverseOrder(validateOrder({ op: "pausar_anuncio", ad_id: "AD1", previous_status: "ACTIVE" }))).toBeNull();
    expect(inverseOrder(validateOrder({ op: "cambiar_presupuesto", entity_id: "C1", level: "adset", daily_budget_cents: 5000, previous_cents: 4000 }))).toMatchObject({ daily_budget_cents: 4000, previous_cents: 5000 });
  });
  it("descripción para la bitácora y reconocimiento de la orden propia en activities", () => {
    const o: WriteOrder = { op: "cambiar_presupuesto", entity_id: "C1", level: "campaign", daily_budget_cents: 115000, previous_cents: 100000 };
    expect(describeOrder(o, "CBO | SCALE").summary).toBe("Presupuesto diario $1,000 → $1,150 (+15%) en «CBO | SCALE» (estratega, propuesta aprobada)");
    const sent = [{ entity_id: "C1", sent_at: "2026-09-05T06:20:00Z", new_value: 115000, kind: "budget" as const }];
    expect(isOwnOrder({ objectId: "C1", eventTime: new Date("2026-09-05T06:24:00Z"), kind: "budget", newValue: "115000" }, sent)).toBe(true);
    expect(isOwnOrder({ objectId: "C1", eventTime: new Date("2026-09-05T08:00:00Z"), kind: "budget", newValue: "115000" }, sent)).toBe(false);   // fuera de ventana: fue una persona
    expect(isOwnOrder({ objectId: "C1", eventTime: new Date("2026-09-05T06:24:00Z"), kind: "budget", newValue: "120000" }, sent)).toBe(false);   // otro valor
  });
});
