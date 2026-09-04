import { dbFromEnv, loadDotenv } from "@agentes-meta/db";
import { MetaClient } from "@agentes-meta/meta";
import { runCollector, regroup, loadEntityMap } from "./collector.js";
import { runAnalyst } from "./analyst.js";

loadDotenv(process.env.DOTENV_PATH ?? ".env");
const [cmd, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(rest.filter(a => a.startsWith("--")).map(a => { const [k, v] = a.slice(2).split("="); return [k, v ?? "true"]; }));

if (cmd === "collector") {
  const db = dbFromEnv();
  const meta = new MetaClient({ token: process.env.META_TOKEN_AROMANTE!, version: process.env.META_API_VERSION, log: console.log });
  await runCollector({ db, meta, accountIds: args.accounts?.split(","), backfillDays: args.days ? Number(args.days) : 90, insightsDays: args.insightsDays ? Number(args.insightsDays) : 14, hourlyDays: args.hourlyDays ? Number(args.hourlyDays) : 7, skipInsights: args.skipInsights === "true", triggeredBy: args.trigger ?? "manual", log: console.log });
} else if (cmd === "analyst") {
  // Agente 2: ventanas de evaluación por sesión y reporte semanal (--weekly=auto|force|off; auto = lunes)
  await runAnalyst({ db: dbFromEnv(), accountIds: args.accounts?.split(","), days: args.days ? Number(args.days) : 30, weekly: (args.weekly as "auto" | "force" | "off" | undefined) ?? "auto", anthropicKey: process.env.ANTHROPIC_API_KEY || undefined, triggeredBy: args.trigger ?? "manual", log: console.log });
} else if (cmd === "notify") {
  // Manda por Telegram lo pendiente de avisar (últimos 3 días) sin correr el collector
  const { notifyPending, telegramFromEnv } = await import("./telegram.js");
  console.log(await notifyPending(dbFromEnv(), telegramFromEnv(), console.log));
} else if (cmd === "regroup") {
  // Mantenimiento: rehace sesiones y grupos desde --since (ISO, default 1970) para las cuentas dadas; conserva anotaciones.
  const db = dbFromEnv();
  const meta = new MetaClient({ token: process.env.META_TOKEN_AROMANTE!, version: process.env.META_API_VERSION, log: console.log });
  const { data: accounts } = await db.from("accounts").select("id,name").eq("enabled", true);
  for (const acc of (accounts ?? []).filter(a => !args.accounts || args.accounts.split(",").includes(a.id))) {
    // mapa completo (paginado: antes se leía sin range y PostgREST cortaba en 1000 de ~3700 filas, dejando sesiones sin campaña)
    const ents = await loadEntityMap(db, acc.id);
    const res = await regroup(db, acc.id, new Date(args.since ?? "1970-01-01T00:00:00Z"), ents, { meta, log: console.log });
    console.log(`✔ ${acc.name}: ${JSON.stringify(res)}`);
  }
} else {
  console.error("uso: tsx src/cli.ts collector [--accounts=id,id] [--days=90] [--trigger=schedule|manual] | analyst [--accounts=id,id] [--days=30] [--weekly=auto|force|off] | regroup [--accounts=id,id] [--since=ISO] | notify"); process.exit(1);
}
