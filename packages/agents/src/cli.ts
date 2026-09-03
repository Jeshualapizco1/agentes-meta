import { dbFromEnv, loadDotenv } from "@agentes-meta/db";
import { MetaClient } from "@agentes-meta/meta";
import { runCollector } from "./collector.js";

loadDotenv(process.env.DOTENV_PATH ?? ".env");
const [cmd, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(rest.filter(a => a.startsWith("--")).map(a => { const [k, v] = a.slice(2).split("="); return [k, v ?? "true"]; }));

if (cmd === "collector") {
  const db = dbFromEnv();
  const meta = new MetaClient({ token: process.env.META_TOKEN_AROMANTE!, version: process.env.META_API_VERSION, log: console.log });
  await runCollector({ db, meta, accountIds: args.accounts?.split(","), backfillDays: args.days ? Number(args.days) : 90, triggeredBy: args.trigger ?? "manual", log: console.log });
} else {
  console.error("uso: tsx src/cli.ts collector [--accounts=id,id] [--days=90] [--trigger=schedule|manual]"); process.exit(1);
}
