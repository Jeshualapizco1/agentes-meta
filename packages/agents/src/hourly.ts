/**
 * Fase 2 · Insights por hora (base del dayparting).
 *  - Meta entrega la hora en la zona de la CUENTA (Aromante 1/2 = Mazatlán). Se guarda tal cual en insights_hourly
 *    (date, hour en zona de cuenta); la conversión a CDMX se hace al consultar con shiftHourCell.
 *  - Nivel campaña (para dayparting por campaña) y cuenta (nivel 'campaign' con entity_id = account id no; se usa level=campaign y se agrega).
 */
import { toZoned } from "@agentes-meta/core";
import type { MetaClient } from "@agentes-meta/meta";
import { upsertChunks, type Db } from "@agentes-meta/db";

interface Row { date_start: string; campaign_id?: string; hourly_stats_aggregated_by_advertiser_time_zone?: string; spend?: string; impressions?: string; clicks?: string; actions?: { action_type: string; value: string }[]; action_values?: { action_type: string; value: string }[] }
const act = (xs: { action_type: string; value: string }[] | undefined, ...types: string[]) => { for (const t of types) { const x = xs?.find(a => a.action_type === t); if (x) return Number(x.value); } return undefined; };

export async function ingestHourly(db: Db, meta: MetaClient, acc: { id: string; timezone_name: string }, opts: { days?: number } = {}): Promise<Record<string, number>> {
  const days = opts.days ?? 28;
  const today = toZoned(new Date(), acc.timezone_name).date;
  const since = toZoned(new Date(Date.now() - days * 86400_000), acc.timezone_name).date;
  const rows = await meta.paginate<Row>(`act_${acc.id}/insights`, { level: "campaign", time_increment: 1, time_range: JSON.stringify({ since, until: today }), breakdowns: "hourly_stats_aggregated_by_advertiser_time_zone", fields: "date_start,campaign_id,spend,impressions,clicks,actions,action_values", limit: 500 });
  const out = rows.filter(r => r.campaign_id && r.hourly_stats_aggregated_by_advertiser_time_zone).map(r => ({
    account_id: acc.id, level: "campaign", entity_id: r.campaign_id!, date: r.date_start, hour: Number(r.hourly_stats_aggregated_by_advertiser_time_zone!.slice(0, 2)),
    spend: Number(r.spend ?? 0), impressions: Number(r.impressions ?? 0), clicks: Number(r.clicks ?? 0),
    purchases: act(r.actions, "omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase") ?? null,
    purchase_value: act(r.action_values, "omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase") ?? null,
    fetched_at: new Date().toISOString(),
  }));
  if (out.length) await upsertChunks(db, "insights_hourly", out, "entity_id,date,hour");
  return { hourly_rows: out.length, hourly_days: days };
}
