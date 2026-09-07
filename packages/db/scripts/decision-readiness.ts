/** Diagnóstico de solo lectura. Nunca imprime credenciales ni llama a Meta. */
import { createClient } from "@supabase/supabase-js";
import { decisionOpportunities, calendarOffset, toZoned, type DecisionEntity, type DecisionInsight } from "../../core/src/index.js";
import { fetchAll } from "../src/index.js";
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const accounts = await sb.from("accounts").select("id,name,timezone_name").eq("enabled", true).order("name");
if (accounts.error) throw new Error("No se pudieron leer cuentas");
for (const account of accounts.data) {
  const now = new Date(), today = toZoned(now, account.timezone_name).date;
  const [entities, insights, profile, rules, reviews] = await Promise.all([
    fetchAll<DecisionEntity>(() => sb.from("entities").select("id,name,level,campaign_id,effective_status,daily_budget,snapshot_at").eq("account_id", account.id).order("id")),
    fetchAll<DecisionInsight>(() => sb.from("insights_daily").select("entity_id,date,spend,purchases,purchase_value,is_closed_day,fetched_at").eq("account_id", account.id).gte("date", calendarOffset(today, -14)).lt("date", today).order("entity_id").order("date")),
    sb.from("account_profiles").select("mode,dry_run,target_roas,breakeven_roas,target_cpa,whitelist_campaign_ids,updated_at").eq("account_id", account.id).single(),
    sb.from("rules").select("id,condition,status,version").eq("account_id", account.id),
    sb.from("recommendations").select("id", { count: "exact", head: true }).eq("account_id", account.id).eq("kind", "decision_review"),
  ]);
  if (profile.error || rules.error || reviews.error) throw new Error("Lectura incompleta del espacio de decisiones");
  const opportunities = decisionOpportunities({ today, now: now.toISOString(), entities: entities.map(e => ({ ...e, daily_budget: e.daily_budget === null ? null : Number(e.daily_budget) })), insights: insights.map(r => ({ ...r, spend: r.spend === null ? null : Number(r.spend), purchases: Number(r.purchases ?? 0), purchase_value: Number(r.purchase_value ?? 0) })) }, profile.data);
  console.log(JSON.stringify({ account: account.name, today, mode: profile.data.mode, dryRun: profile.data.dry_run, entities: entities.length, insightRows: insights.length, structuredRules: rules.data.filter(r => r.condition?.version === 1 && r.status === "activa").length, reviews: reviews.count, opportunities: opportunities.map(o => ({ entity: o.entityName, title: o.title, coverage: o.reading.available, spend: o.reading.spend, purchases: o.reading.purchases, roas: o.reading.roas, fetchedAt: o.reading.fetchedAt })) }));
}
