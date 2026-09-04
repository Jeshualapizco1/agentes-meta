import { dbFromEnv, loadDotenv } from "@agentes-meta/db";
import { MetaClient } from "@agentes-meta/meta";
import { ShopifyClient } from "@agentes-meta/shopify";
import { runCollector } from "./collector.js";

loadDotenv(process.env.DOTENV_PATH ?? ".env");
const [cmd, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(rest.filter(a => a.startsWith("--")).map(a => { const [k, v] = a.slice(2).split("="); return [k, v ?? "true"]; }));

if (cmd === "collector") {
  const db = dbFromEnv();
  const meta = new MetaClient({ token: process.env.META_TOKEN_AROMANTE!, version: process.env.META_API_VERSION, log: console.log });
  const shopify = process.env.SHOPIFY_ADMIN_TOKEN && process.env.SHOPIFY_STORE_DOMAIN ? new ShopifyClient({ domain: process.env.SHOPIFY_STORE_DOMAIN, token: process.env.SHOPIFY_ADMIN_TOKEN, version: process.env.SHOPIFY_API_VERSION, log: console.log }) : undefined;
  await runCollector({ db, meta, shopify, accountIds: args.accounts?.split(","), backfillDays: args.days ? Number(args.days) : 90, insightsDays: args.insightsDays ? Number(args.insightsDays) : 14, hourlyDays: args.hourlyDays ? Number(args.hourlyDays) : 7, shopifyDays: args.shopifyDays ? Number(args.shopifyDays) : 14, skipInsights: args.skipInsights === "true", triggeredBy: args.trigger ?? "manual", log: console.log });
} else {
  console.error("uso: tsx src/cli.ts collector [--accounts=id,id] [--days=90] [--shopifyDays=14] [--trigger=schedule|manual]"); process.exit(1);
}
