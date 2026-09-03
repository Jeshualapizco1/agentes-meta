// Vista previa offline: agrupa data/raw/activities_<acc>.ndjson en sesiones legibles (zona CDMX)
import { readFileSync } from "node:fs";
import { normalize, groupEvents, groupSessions, toZoned, CDMX } from "../packages/core/src/index.ts";
const acc = process.argv[2] ?? "1703313583465547", n = Number(process.argv[3] ?? 40);
const rows = readFileSync(`data/raw/activities_${acc}.ndjson`, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
const load = f => readFileSync(`data/raw/${f}_${acc}.ndjson`, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
const ents = new Map();
for (const c of load("campaigns")) ents.set(c.id, { name: c.name, level: "campaign" });
for (const a of load("adsets")) ents.set(a.id, { name: a.name, campaignId: a.campaign_id, level: "adset" });
for (const a of load("ads")) ents.set(a.id, { name: a.name, campaignId: a.campaign_id, level: "ad" });
const groups = groupEvents(rows.map(r => normalize(acc, r)));
const sessions = groupSessions(groups, undefined, ents);
console.log(`${rows.length} eventos → ${groups.length} grupos → ${sessions.length} sesiones`);
const bySig = {}; for (const s of sessions) bySig[s.significance] = (bySig[s.significance] ?? 0) + 1; console.log("por significancia:", bySig);
for (const s of sessions.filter(s => s.significance !== "system").slice(-n)) {
  const z = toZoned(s.startedAt, CDMX);
  console.log(`${z.iso.replace("T", " ")}  ${s.actorName.padEnd(18)} ${s.significance.padEnd(5)} ${s.resetsLearning ? "↻" : " "} ${s.summary}`);
}
