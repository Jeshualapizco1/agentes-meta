/**
 * Fase 2 · Agregación diaria de pedidos de Shopify (verdad de negocio).
 * Determinista: recibe pedidos ya bajados y devuelve un renglón por día en la zona horaria de la TIENDA.
 * Definiciones (aproximan a los reportes de Shopify; la cifra oficial es la de Analítica de Shopify):
 *  - gross_sales  = subtotal (después de descuentos) + descuentos  → precio de lista × cantidad
 *  - discounts    = descuentos aplicados
 *  - refunds      = reembolsos acumulados, atribuidos a la FECHA DEL PEDIDO (no a la del reembolso)
 *  - net_sales    = subtotal − reembolsos (sin envío; con IVA si la tienda tiene precios con impuestos incluidos)
 *  - orders       = pedidos no cancelados y no de prueba
 *  - new_customers = pedidos que son el PRIMER pedido de su cliente (por el historial del cliente, no por su fecha de alta)
 *  - new_customer_revenue = ventas netas de esos pedidos
 * Pedidos sin cliente (invitado sin registro) cuentan en ventas pero no como cliente nuevo.
 */
import { toZoned } from "./time.js";

export interface ShopifyOrderLite {
  id: string; createdAt: string; test: boolean; cancelledAt: string | null;
  subtotal: number; discounts: number; refunded: number;
  customerId: string | null; firstOrderId: string | null;
}

export interface ShopifyDay {
  date: string; gross_sales: number; discounts: number; refunds: number; net_sales: number;
  orders: number; new_customers: number; new_customer_revenue: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Agrega por día en `tz`. Si se pasa `range`, rellena con ceros los días sin pedidos dentro de [since, until]. */
export function aggregateShopifyDays(orders: ShopifyOrderLite[], tz: string, range?: { since: string; until: string }): ShopifyDay[] {
  const days = new Map<string, ShopifyDay>();
  const blank = (date: string): ShopifyDay => ({ date, gross_sales: 0, discounts: 0, refunds: 0, net_sales: 0, orders: 0, new_customers: 0, new_customer_revenue: 0 });
  if (range) { for (let d = new Date(`${range.since}T00:00:00Z`); d.toISOString().slice(0, 10) <= range.until; d.setUTCDate(d.getUTCDate() + 1)) { const k = d.toISOString().slice(0, 10); days.set(k, blank(k)); } }
  for (const o of orders) {
    if (o.test || o.cancelledAt) continue;
    const date = toZoned(new Date(o.createdAt), tz).date;
    if (range && (date < range.since || date > range.until)) continue;
    const d = days.get(date) ?? blank(date); days.set(date, d);
    const net = o.subtotal - o.refunded;
    d.gross_sales += o.subtotal + o.discounts; d.discounts += o.discounts; d.refunds += o.refunded; d.net_sales += net; d.orders += 1;
    if (o.customerId && o.firstOrderId === o.id) { d.new_customers += 1; d.new_customer_revenue += net; }
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date)).map(d => ({ ...d, gross_sales: r2(d.gross_sales), discounts: r2(d.discounts), refunds: r2(d.refunds), net_sales: r2(d.net_sales), new_customer_revenue: r2(d.new_customer_revenue) }));
}

/** MER = ventas netas ÷ gasto en Meta (todas las cuentas que venden en esa tienda). null si no hubo gasto. */
export const mer = (netSales: number, spend: number): number | null => (spend > 0 ? netSales / spend : null);
/** CAC = gasto ÷ clientes nuevos. null si no hubo clientes nuevos. */
export const cac = (spend: number, newCustomers: number): number | null => (newCustomers > 0 ? spend / newCustomers : null);
