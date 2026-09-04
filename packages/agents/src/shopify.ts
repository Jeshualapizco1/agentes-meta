/**
 * Fase 2 · Ingesta diaria de Shopify (ventas netas, pedidos, clientes nuevos) → shopify_daily.
 *  - Ventana: últimos N días (default 14) en la zona horaria de la TIENDA. Se rebaja cada corrida para captar reembolsos
 *    y ediciones de pedidos recientes; los reembolsos de pedidos más viejos requieren una corrida con --shopifyDays=90.
 *  - is_closed_day = fecha < hoy en la zona de la tienda. El día en curso se guarda pero nunca se juzga.
 *  - Los números los calcula aggregateShopifyDays (core, con pruebas); aquí solo se baja y se guarda.
 */
import { aggregateShopifyDays, toZoned, type ShopifyOrderLite } from "@agentes-meta/core";
import type { ShopifyClient, ShopifyOrder } from "@agentes-meta/shopify";
import { upsertChunks, type Db } from "@agentes-meta/db";

const lite = (o: ShopifyOrder): ShopifyOrderLite => ({
  id: o.id, createdAt: o.createdAt, test: o.test, cancelledAt: o.cancelledAt,
  subtotal: Number(o.subtotalPriceSet.shopMoney.amount), discounts: Number(o.totalDiscountsSet.shopMoney.amount), refunded: Number(o.totalRefundedSet.shopMoney.amount),
  customerId: o.customer?.id ?? null, firstOrderId: o.customer?.orders.nodes[0]?.id ?? null,
});

export async function ingestShopify(db: Db, shopify: ShopifyClient, acc: { id: string; shopify_domain: string }, opts: { days?: number } = {}): Promise<Record<string, number | string>> {
  const days = opts.days ?? 14;
  const shop = await shopify.shop();
  const tz = shop.ianaTimezone;
  const today = toZoned(new Date(), tz).date;
  const since = toZoned(new Date(Date.now() - days * 86400_000), tz).date;
  // rango UTC con un día de margen por lado; el filtro exacto por fecha en zona de la tienda lo hace la agregación
  const raw = await shopify.orders(new Date(new Date(`${since}T00:00:00Z`).getTime() - 86400_000), new Date(Date.now() + 3600_000));
  const agg = aggregateShopifyDays(raw.map(lite), tz, { since, until: today });
  const fetched_at = new Date().toISOString();
  const rows = agg.map(d => ({ account_id: acc.id, ...d, sessions: null, is_closed_day: d.date < today, fetched_at }));
  if (rows.length) await upsertChunks(db, "shopify_daily", rows, "account_id,date");
  return { shopify_orders: raw.length, shopify_days: rows.length, shopify_tz: tz };
}
