import "server-only";
import { db, fetchAll } from "./db";
import { calendarOffset, decisionOpportunities, readEntityWindow, type DecisionEntity, type DecisionInsight, type DecisionSource } from "@agentes-meta/core";
import type { CampaignReading } from "./hoy-view";

export async function loadCampaignReadings(accountId: string, today: string, now = new Date().toISOString()): Promise<CampaignReading[]> {
  const sb = db();
  const [entities, insights, profile] = await Promise.all([
    fetchAll<DecisionEntity>(() => sb.from("entities").select("id,name,level,campaign_id,effective_status,daily_budget,snapshot_at").eq("account_id", accountId).eq("level", "campaign").eq("effective_status", "ACTIVE").order("id")),
    fetchAll<DecisionInsight>(() => sb.from("insights_daily").select("entity_id,date,spend,purchases,purchase_value,is_closed_day,fetched_at").eq("account_id", accountId).eq("level", "campaign").gte("date", calendarOffset(today, -14)).lte("date", calendarOffset(today, -1)).order("entity_id").order("date")),
    sb.from("account_profiles").select("target_roas,breakeven_roas,target_cpa").eq("account_id", accountId).maybeSingle(),
  ]);
  if (profile.error) throw new Error("No se pudieron leer las metas de las campañas.");
  const num = (n: unknown) => n == null || n === "" || !Number.isFinite(Number(n)) ? null : Number(n);
  // Meta omite compras/valor cuando no hubo eventos; una fila ausente sigue ausente.
  const source: DecisionSource = { today, now, entities, insights: insights.map(r => ({ ...r, spend: num(r.spend), purchases: num(r.purchases ?? 0), purchase_value: num(r.purchase_value ?? 0) })) };
  const targets = { target_roas: num(profile.data?.target_roas), breakeven_roas: num(profile.data?.breakeven_roas), target_cpa: num(profile.data?.target_cpa) };
  const kinds = new Map(decisionOpportunities(source, targets).map(o => [o.entityId, o.kind]));
  return entities.flatMap(entity => {
    const current = readEntityWindow(source, entity.id, 7, 0), previous = readEntityWindow(source, entity.id, 7, 7);
    if (!(current.spend > 0)) return [];
    return [{ id: entity.id, name: entity.name, spend: current.spend, purchases: current.purchases, roas: current.roas, cpa: current.cpa, previousRoas: previous.roas, available: current.available, previousAvailable: previous.available, kind: kinds.get(entity.id) ?? "observe", targetRoas: targets.target_roas, breakevenRoas: targets.breakeven_roas }];
  }).sort((a, b) => Number(b.kind === "protect") - Number(a.kind === "protect") || b.spend - a.spend || a.id.localeCompare(b.id));
}
