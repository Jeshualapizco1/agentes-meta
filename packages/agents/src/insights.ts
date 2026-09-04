/**
 * Fase 2 · Ingesta de insights diarios (campaña, ad set, anuncio) con reexpresión.
 *  - Ventana: últimos N días (default 14) en la zona horaria de la CUENTA (así los entrega Meta).
 *  - is_closed_day = fecha < hoy en la zona de la cuenta. El día en curso se guarda pero nunca se juzga.
 *  - Si un día ya existía con otros valores, se conserva la captura anterior en insights_daily_history.
 */
import { toZoned, type EntityMap } from "@agentes-meta/core";
import type { MetaClient } from "@agentes-meta/meta";
import { upsertChunks, fetchAll, type Db } from "@agentes-meta/db";

type Level = "campaign" | "adset" | "ad";
interface Row { date_start: string; campaign_id?: string; adset_id?: string; ad_id?: string; spend?: string; impressions?: string; reach?: string; clicks?: string; inline_link_clicks?: string; cpm?: string; ctr?: string; frequency?: string; actions?: { action_type: string; value: string }[]; action_values?: { action_type: string; value: string }[]; purchase_roas?: { action_type: string; value: string }[] }

const FIELDS = "date_start,campaign_id,adset_id,ad_id,spend,impressions,reach,clicks,inline_link_clicks,cpm,ctr,frequency,actions,action_values,purchase_roas";
const act = (xs: { action_type: string; value: string }[] | undefined, ...types: string[]) => { for (const t of types) { const x = xs?.find(a => a.action_type === t); if (x) return Number(x.value); } return undefined; };

export async function ingestInsights(db: Db, meta: MetaClient, acc: { id: string; timezone_name: string }, opts: { days?: number; levels?: Level[] } = {}): Promise<Record<string, number>> {
  const days = opts.days ?? 14, levels = opts.levels ?? ["campaign", "adset", "ad"];
  const today = toZoned(new Date(), acc.timezone_name).date;
  const sinceD = new Date(Date.now() - days * 86400_000);
  const time_range = JSON.stringify({ since: toZoned(sinceD, acc.timezone_name).date, until: today });
  const stats: Record<string, number> = {};
  for (const level of levels) {
    const rows = await meta.paginate<Row>(`act_${acc.id}/insights`, { level, time_increment: 1, time_range, fields: FIELDS, limit: 500 });
    const out = rows.map(r => {
      const entity_id = level === "campaign" ? r.campaign_id! : level === "adset" ? r.adset_id! : r.ad_id!;
      const spend = Number(r.spend ?? 0);
      const purchases = act(r.actions, "omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase");
      const purchase_value = act(r.action_values, "omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase");
      return { account_id: acc.id, level, entity_id, date: r.date_start, spend, impressions: Number(r.impressions ?? 0), reach: Number(r.reach ?? 0), clicks: Number(r.clicks ?? 0), link_clicks: Number(r.inline_link_clicks ?? 0),
        purchases: purchases ?? null, purchase_value: purchase_value ?? null,
        add_to_cart: act(r.actions, "omni_add_to_cart", "add_to_cart") ?? null, initiate_checkout: act(r.actions, "omni_initiated_checkout", "initiate_checkout") ?? null,
        roas: purchase_value != null && spend > 0 ? purchase_value / spend : null, cpa: purchases && spend > 0 ? spend / purchases : null,
        cpm: r.cpm ? Number(r.cpm) : null, ctr: r.ctr ? Number(r.ctr) : null, frequency: r.frequency ? Number(r.frequency) : null,
        is_closed_day: r.date_start < today, fetched_at: new Date().toISOString(), raw: r };
    });
    // historial de reexpresiones: guardar la versión previa si cambió gasto o compras
    if (out.length) {
      const ids = [...new Set(out.map(o => o.entity_id))];
      const prev = new Map<string, { spend: number; purchases: number | null; purchase_value: number | null; fetched_at: string; raw: unknown }>();
      for (let i = 0; i < ids.length; i += 200) {
        // paginado: 200 entidades × 14 días pasan de las 1000 filas que devuelve PostgREST por petición (antes se perdían reexpresiones)
        const data = await fetchAll<{ entity_id: string; date: string; spend: number; purchases: number | null; purchase_value: number | null; fetched_at: string; raw: unknown }>(() => db.from("insights_daily").select("entity_id,date,spend,purchases,purchase_value,fetched_at,raw").in("entity_id", ids.slice(i, i + 200)).gte("date", out[0]!.date < today ? toZoned(sinceD, acc.timezone_name).date : today));
        for (const p of data) prev.set(`${p.entity_id}|${p.date}`, p);
      }
      const hist = out.filter(o => { const p = prev.get(`${o.entity_id}|${o.date}`); return p && (Number(p.spend) !== o.spend || Number(p.purchases ?? 0) !== Number(o.purchases ?? 0) || Number(p.purchase_value ?? 0) !== Number(o.purchase_value ?? 0)); })
        .map(o => { const p = prev.get(`${o.entity_id}|${o.date}`)!; return { entity_id: o.entity_id, date: o.date, fetched_at: p.fetched_at, spend: p.spend, purchases: p.purchases, purchase_value: p.purchase_value, raw: p.raw }; });
      if (hist.length) await upsertChunks(db, "insights_daily_history", hist, "id");
      await upsertChunks(db, "insights_daily", out, "entity_id,date");
      stats[`${level}_restated`] = hist.length;
    }
    stats[level] = out.length;
  }
  return stats;
}
