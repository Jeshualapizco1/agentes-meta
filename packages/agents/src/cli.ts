import { dbFromEnv, loadDotenv } from "@agentes-meta/db";
import { MetaClient } from "@agentes-meta/meta";
import { runCollector, regroup } from "./collector.js";

loadDotenv(process.env.DOTENV_PATH ?? ".env");
const [cmd, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(rest.filter(a => a.startsWith("--")).map(a => { const [k, v] = a.slice(2).split("="); return [k, v ?? "true"]; }));

if (cmd === "collector") {
  const db = dbFromEnv();
  const meta = new MetaClient({ token: process.env.META_TOKEN_AROMANTE!, version: process.env.META_API_VERSION, log: console.log });
  await runCollector({ db, meta, accountIds: args.accounts?.split(","), backfillDays: args.days ? Number(args.days) : 90, insightsDays: args.insightsDays ? Number(args.insightsDays) : 14, hourlyDays: args.hourlyDays ? Number(args.hourlyDays) : 7, skipInsights: args.skipInsights === "true", triggeredBy: args.trigger ?? "manual", log: console.log });
} else if (cmd === "regroup") {
  // Mantenimiento: rehace sesiones y grupos desde --since (ISO, default 1970) para las cuentas dadas; conserva anotaciones.
  const db = dbFromEnv();
  const meta = new MetaClient({ token: process.env.META_TOKEN_AROMANTE!, version: process.env.META_API_VERSION, log: console.log });
  const { data: accounts } = await db.from("accounts").select("id,name").eq("enabled", true);
  for (const acc of (accounts ?? []).filter(a => !args.accounts || args.accounts.split(",").includes(a.id))) {
    const ents = new Map<string, { name: string; level: "campaign" | "adset" | "ad"; campaignId?: string }>();
    const { data: rows } = await db.from("entities").select("id,name,level,campaign_id").eq("account_id", acc.id);
    for (const r of rows ?? []) ents.set(r.id, { name: r.name, level: r.level, campaignId: r.campaign_id ?? undefined });
    const res = await regroup(db, acc.id, new Date(args.since ?? "1970-01-01T00:00:00Z"), ents);
    console.log(`✔ ${acc.name}: ${JSON.stringify(res)}`);
  }
  void meta;
} else {
  console.error("uso: tsx src/cli.ts collector [--accounts=id,id] [--days=90] [--trigger=schedule|manual] | regroup [--accounts=id,id] [--since=ISO]"); process.exit(1);
}
