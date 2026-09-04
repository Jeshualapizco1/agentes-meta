import { describe, it, expect } from "vitest";
import { aggregateShopifyDays, mer, cac, type ShopifyOrderLite } from "./index.js";

// Basados en pedidos reales del 2026-09-01 (montos de la tienda; ids acortados)
const o = (p: Partial<ShopifyOrderLite> & { id: string }): ShopifyOrderLite => ({ createdAt: "2026-09-01T13:11:26Z", test: false, cancelledAt: null, subtotal: 1617.3, discounts: 179.7, refunded: 0, customerId: "c1", firstOrderId: "x", ...p });
const TZ = "America/Mazatlan";

describe("aggregateShopifyDays", () => {
  it("agrupa por día en la zona de la tienda (07:25Z del 1 sep = 00:25 Mazatlán = 1 sep; 05:00Z = 22:00 del 31 ago)", () => {
    const days = aggregateShopifyDays([o({ id: "a", createdAt: "2026-09-01T07:25:52Z" }), o({ id: "b", createdAt: "2026-09-01T05:00:00Z" })], TZ);
    expect(days.map(d => d.date)).toEqual(["2026-08-31", "2026-09-01"]);
  });
  it("gross = subtotal + descuentos; net = subtotal − reembolsos", () => {
    const [d] = aggregateShopifyDays([o({ id: "a", subtotal: 2844.75, discounts: 449.25, refunded: 100 })], TZ);
    expect(d!.gross_sales).toBe(3294); expect(d!.discounts).toBe(449.25); expect(d!.refunds).toBe(100); expect(d!.net_sales).toBe(2744.75); expect(d!.orders).toBe(1);
  });
  it("cliente nuevo = el pedido es el primero de su cliente; invitados no cuentan", () => {
    const [d] = aggregateShopifyDays([
      o({ id: "a", customerId: "c1", firstOrderId: "a" }),          // nuevo
      o({ id: "b", customerId: "c2", firstOrderId: "old" }),        // recurrente
      o({ id: "c", customerId: null, firstOrderId: null }),         // invitado
    ], TZ);
    expect(d!.orders).toBe(3); expect(d!.new_customers).toBe(1); expect(d!.new_customer_revenue).toBe(1617.3);
  });
  it("excluye pedidos de prueba y cancelados", () => {
    const days = aggregateShopifyDays([o({ id: "a", test: true }), o({ id: "b", cancelledAt: "2026-09-02T00:00:00Z" })], TZ);
    expect(days).toEqual([]);
  });
  it("rellena con ceros los días sin pedidos dentro del rango y descarta los de fuera", () => {
    const days = aggregateShopifyDays([o({ id: "a", createdAt: "2026-09-02T15:00:00Z" }), o({ id: "z", createdAt: "2026-08-20T15:00:00Z" })], TZ, { since: "2026-09-01", until: "2026-09-03" });
    expect(days.map(d => [d.date, d.orders])).toEqual([["2026-09-01", 0], ["2026-09-02", 1], ["2026-09-03", 0]]);
  });
  it("mer y cac devuelven null sin denominador", () => {
    expect(mer(1000, 250)).toBe(4); expect(mer(1000, 0)).toBeNull(); expect(cac(1000, 4)).toBe(250); expect(cac(1000, 0)).toBeNull();
  });
});
