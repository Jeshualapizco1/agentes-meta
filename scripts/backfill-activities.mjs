// Fase 0: backfill crudo de activities + entidades de Meta a data/raw/*.ndjson
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const env = Object.fromEntries(readFileSync(".env","utf8").split("\n").filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(), l.slice(i+1).split("#")[0].trim()];}));
const TOKEN = env.META_TOKEN_AROMANTE, V = env.META_API_VERSION || "v23.0";
const ACCOUNTS = { "1703313583465547":"Aromante 1 Principal", "868659071242640":"Aromante 2", "699409435248329":"Aromante 3" };
const DAYS = Number(process.argv[2] || 90);
const since = Math.floor(Date.now()/1000) - DAYS*86400;
async function page(url){ const out=[]; let next=url, n=0;
  while(next){ const r=await fetch(next); const j=await r.json();
    if(j.error){ throw new Error(JSON.stringify(j.error)); }
    out.push(...(j.data||[])); next=j.paging?.next; n++; if(n%10===0) process.stdout.write(`.`); }
  return out; }
mkdirSync("data/raw",{recursive:true});
for (const [id,name] of Object.entries(ACCOUNTS)) {
  const base=`https://graph.facebook.com/${V}/act_${id}`;
  const acts = await page(`${base}/activities?fields=event_time,event_type,actor_id,actor_name,object_id,object_name,object_type,application_id,application_name,extra_data,date_time_in_timezone&since=${since}&limit=500&access_token=${TOKEN}`);
  writeFileSync(`data/raw/activities_${id}.ndjson`, acts.map(a=>JSON.stringify(a)).join("\n"));
  const camps = await page(`${base}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,bid_strategy,buying_type,created_time,updated_time,start_time,stop_time&limit=500&access_token=${TOKEN}`);
  const adsets = await page(`${base}/adsets?fields=id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,bid_strategy,bid_amount,optimization_goal,billing_event,targeting,adset_schedule,pacing_type,learning_stage_info,created_time,updated_time,start_time,end_time&limit=500&access_token=${TOKEN}`);
  const ads = await page(`${base}/ads?fields=id,name,adset_id,campaign_id,status,effective_status,created_time,updated_time,creative{id,name,thumbnail_url}&limit=500&access_token=${TOKEN}`);
  writeFileSync(`data/raw/campaigns_${id}.ndjson`, camps.map(a=>JSON.stringify(a)).join("\n"));
  writeFileSync(`data/raw/adsets_${id}.ndjson`, adsets.map(a=>JSON.stringify(a)).join("\n"));
  writeFileSync(`data/raw/ads_${id}.ndjson`, ads.map(a=>JSON.stringify(a)).join("\n"));
  const tmin = acts.at(-1)?.event_time, tmax = acts[0]?.event_time;
  console.log(`\n${name} (${id}): ${acts.length} activities [${tmin} .. ${tmax}] · ${camps.length} campaigns · ${adsets.length} adsets · ${ads.length} ads`);
}
