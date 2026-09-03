import type { ChangeGroup, ChangeKind, Significance, ActorKind } from "./types.js";
import { SESSION_GAP_MS } from "./grouping.js";

/** Sesión de edición: un actor, una ventana de tiempo, muchos objetos. Es la unidad legible de la bitácora. */
export interface ChangeSession {
  accountId: string;
  actorId: string; actorName: string; actorKind: ActorKind;
  startedAt: Date; endedAt: Date;
  kind: ChangeKind; significance: Significance; resetsLearning: boolean;
  summary: string;                     // "Pausó 30 anuncios en «CBO | SCALE» · Presupuesto diario $600 → $500 (-17%) en «CBO | SCALE»"
  campaignIds: string[];
  groups: ChangeGroup[];
  counts: { groups: number; events: number; byLevel: Record<string, number> };
}

const SIG_RANK: Significance[] = ["major", "minor", "system"];
const KIND_RANK: ChangeKind[] = ["budget", "status", "targeting", "bid", "objective", "creative", "schedule", "audience", "name", "review", "delivery", "other"];
const PLURAL: Record<string, [string, string]> = { campaign: ["campaña", "campañas"], adset: ["ad set", "ad sets"], ad: ["anuncio", "anuncios"], account: ["cuenta", "cuenta"], audience: ["audiencia", "audiencias"], unknown: ["objeto", "objetos"] };

export interface EntityRef { name: string; campaignId?: string; level: "campaign" | "adset" | "ad" }
export type EntityMap = Map<string, EntityRef>;

/** Resuelve "en qué campaña" a partir del objeto o de su padre, usando el mapa de entidades. */
export function campaignOf(g: ChangeGroup, ents: EntityMap): { id?: string; name?: string } {
  if (g.level === "campaign") return { id: g.objectId, name: g.objectName };
  const self = ents.get(g.objectId);
  const parent = g.parentId ? ents.get(g.parentId) : undefined;
  const cid = g.campaignId ?? self?.campaignId ?? parent?.campaignId ?? (g.level === "adset" ? g.parentId : undefined);
  const name = cid ? ents.get(cid)?.name : undefined;
  return { id: cid, name: name ?? (parent?.level === "adset" ? parent.name : undefined) ?? cid };
}

export function groupSessions(groups: ChangeGroup[], gapMs = SESSION_GAP_MS, entities: EntityMap = new Map()): ChangeSession[] {
  const sorted = [...groups].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  const open = new Map<string, ChangeSession>();
  const out: ChangeSession[] = [];
  for (const g of sorted) {
    const s = open.get(g.actorId);
    if (s && g.startedAt.getTime() - s.endedAt.getTime() <= gapMs) { s.groups.push(g); if (g.endedAt > s.endedAt) s.endedAt = g.endedAt; }
    else {
      if (s) out.push(finalize(s, entities));
      open.set(g.actorId, { accountId: g.accountId, actorId: g.actorId, actorName: g.actorName, actorKind: g.actorKind, startedAt: g.startedAt, endedAt: g.endedAt, kind: "other", significance: "system", resetsLearning: false, summary: "", campaignIds: [], groups: [g], counts: { groups: 0, events: 0, byLevel: {} } });
    }
  }
  for (const s of open.values()) out.push(finalize(s, entities));
  return out.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
}

function finalize(s: ChangeSession, ents: EntityMap): ChangeSession {
  const gs = s.groups;
  s.kind = gs.map(g => g.kind).sort((a, b) => KIND_RANK.indexOf(a) - KIND_RANK.indexOf(b))[0] ?? "other";
  s.significance = gs.map(g => g.significance).sort((a, b) => SIG_RANK.indexOf(a) - SIG_RANK.indexOf(b))[0] ?? "system";
  s.resetsLearning = gs.some(g => g.resetsLearning);
  s.campaignIds = [...new Set(gs.map(g => campaignOf(g, ents).id).filter((x): x is string => !!x))];
  s.counts = { groups: gs.length, events: gs.reduce((n, g) => n + g.events.length, 0), byLevel: count(gs.map(g => g.level)) };

  // Frases: los grupos "major" individuales se citan; los repetidos se agregan por (verbo, nivel, campaña)
  const singles: string[] = [];
  const agg = new Map<string, { verb: string; level: string; campaign?: string; n: number }>();
  for (const g of gs) {
    const campaign = campaignOf(g, ents).name;
    const verb = verbOf(g);
    if (g.kind === "budget" || g.kind === "targeting" || g.kind === "bid" || g.kind === "objective" || g.kind === "name") {
      singles.push(`${g.summary} en «${g.objectName}»`);
    } else if (verb) {
      const k = `${verb}|${g.level}|${campaign ?? ""}`;
      const a = agg.get(k) ?? { verb, level: g.level, campaign, n: 0 }; a.n++; agg.set(k, a);
    }
  }
  const aggPhrases = [...agg.values()].sort((a, b) => b.n - a.n).map(a => {
    const [sing, plur] = PLURAL[a.level] ?? PLURAL.unknown!;
    const what = a.level === "account" ? "cuenta" : a.level === "campaign" && a.n === 1 ? `la campaña «${a.campaign}»` : `${a.n} ${a.n === 1 ? sing : plur}${a.campaign && a.level !== "campaign" ? ` en «${a.campaign}»` : ""}`;
    return `${a.verb} ${what}`;
  });
  const phrases = [...singles.slice(0, 4), ...aggPhrases.slice(0, 4)];
  if (singles.length > 4) phrases.push(`y ${singles.length - 4} cambio(s) más`);
  s.summary = phrases.join(" · ") || `${gs.length} cambio(s) ${s.kind}`;
  return s;
}

function verbOf(g: ChangeGroup): string | undefined {
  const d = g.details as { status?: { from?: number; to?: number } };
  if (g.summary.startsWith("Pausó")) return "Pausó";
  if (g.summary.startsWith("Envió a revisión")) return "Envió a revisión";
  if (g.summary.startsWith("Aprobó y activó")) return "Aprobó y activó";
  if (g.summary.startsWith("Editó") && g.kind === "status") return "Editó";
  if (g.summary.startsWith("Activó")) return "Activó";
  if (g.summary.startsWith("Creó")) return "Creó";
  if (g.kind === "creative") return g.level === "account" ? "Subió imágenes a la" : "Cambió creativo de";
  if (g.kind === "delivery") return "Meta inició entrega de";
  if (g.kind === "review") return "Meta revisó";
  if (g.kind === "schedule") return "Cambió programación de";
  if (g.kind === "audience") return "Editó";
  return undefined;
}

function count(xs: string[]): Record<string, number> { const r: Record<string, number> = {}; for (const x of xs) r[x] = (r[x] ?? 0) + 1; return r; }
