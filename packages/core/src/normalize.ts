import { createHash } from "node:crypto";
import type { RawActivity, NormalizedEvent, ObjectLevel, ActorKind, ChangeKind, Significance } from "./types.js";

/** Meta usa nombres heredados: CAMPAIGN_GROUP = campaña, CAMPAIGN = ad set, ADGROUP = anuncio. */
export const OBJECT_LEVEL: Record<string, ObjectLevel> = {
  CAMPAIGN_GROUP: "campaign", CAMPAIGN: "adset", ADGROUP: "ad", ACCOUNT: "account", AUDIENCE: "audience",
};

/** Códigos numéricos de run_status observados. Los textos vienen localizados (es/en), no se usan. */
export const RUN_STATUS: Record<number, string> = { 1: "active", 8: "paused", 15: "paused", 17: "pending_process", 9: "deleted", 3: "archived" };
export const isPending = (c?: number) => c === 17;
export const isActive = (c?: number) => c === 1;
export const isPaused = (c?: number) => c === 8 || c === 15;

const KIND_BY_TYPE: Array<[RegExp, ChangeKind]> = [
  [/budget_scheduling_state/, "schedule"],
  [/budget/, "budget"],
  [/run_status/, "status"],
  [/target_spec|targets_spec/, "targeting"],
  [/creative|images/, "creative"],
  [/bid_strategy|bidding|bid_adjust/, "bid"],
  [/optimization_goal|conversion_event/, "objective"],
  [/duration|schedule/, "schedule"],
  [/audience/, "audience"],
  [/name/, "name"],
  [/delivery/, "delivery"],
  [/review/, "review"],
  [/^create_/, "status"],
];

export function classifyKind(eventType: string): ChangeKind {
  for (const [re, kind] of KIND_BY_TYPE) if (re.test(eventType)) return kind;
  return "other";
}

export function actorKindOf(actorId?: string, actorName?: string, applicationName?: string): ActorKind {
  if (actorId === "0" || actorName === "Meta") return "meta";
  if (applicationName?.toLowerCase().includes("agentes-meta")) return "agent";
  return "person";
}

function parseExtra(s?: string): Record<string, unknown> {
  if (!s) return {};
  try { return JSON.parse(s) as Record<string, unknown>; } catch { return { _raw: s }; }
}

function budgetOf(v: unknown): { cents?: number; period?: "daily"|"lifetime" } {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  const cents = (typeof o.new_value === "number" ? o.new_value : typeof o.old_value === "number" ? o.old_value : undefined) as number | undefined;
  const add = String(o.additional_value ?? "").toLowerCase();
  const period = add.includes("día") || add.includes("day") ? "daily" : add.includes("total") || add.includes("lifetime") ? "lifetime" : undefined;
  return { cents, period };
}

export function fingerprintOf(accountId: string, r: RawActivity): string {
  return createHash("sha256").update([accountId, r.event_time, r.event_type, r.actor_id ?? "", r.object_id ?? "", r.extra_data ?? ""].join("|")).digest("hex");
}

export function normalize(accountId: string, r: RawActivity): NormalizedEvent {
  const extra = parseExtra(r.extra_data);
  const level = OBJECT_LEVEL[r.object_type ?? ""] ?? "unknown";
  const kind = classifyKind(r.event_type);
  const rs = extra.run_status as { old_value?: number; new_value?: number } | undefined;
  const runStatusOld = rs?.old_value, runStatusNew = rs?.new_value;
  const lle = extra.last_learning_exit as number | undefined;
  const bo = budgetOf(extra.old_value), bn = budgetOf(extra.new_value);

  let significance: Significance = "minor";
  if (kind === "delivery" || kind === "review") significance = "system";
  else if (kind === "status" && (isPending(runStatusOld) || isPending(runStatusNew))) significance = "system"; // artefacto de edición
  else if (["budget", "status", "targeting", "bid", "objective", "creative"].includes(kind)) significance = "major";
  else if (kind === "schedule" || kind === "audience") significance = "minor";

  const campaignIdRaw = extra.campaign_id as unknown;
  const campaignId = typeof campaignIdRaw === "number" || typeof campaignIdRaw === "string" ? String(campaignIdRaw)
    : campaignIdRaw && typeof campaignIdRaw === "object" && "new" in (campaignIdRaw as object) ? String((campaignIdRaw as { new: unknown }).new) : undefined;

  const actorKind = actorKindOf(r.actor_id, r.actor_name, r.application_name);
  // Aprobaciones/activaciones de Meta tras revisión (17→1) son sistema, no decisiones
  if (actorKind === "meta" && kind === "status" && !isPaused(runStatusNew)) significance = "system";
  // En eventos de anuncio, extra.campaign_id es el AD SET (nomenclatura heredada); en ad set es la campaña
  const parentId = level === "ad" || level === "adset" ? campaignId : undefined;

  return {
    accountId, eventTime: new Date(r.event_time), eventType: r.event_type,
    actorId: r.actor_id ?? "", actorName: r.actor_name ?? "", actorKind,
    objectId: r.object_id ?? "", objectName: r.object_name ?? "", objectType: r.object_type ?? "", level,
    campaignId: level === "campaign" ? r.object_id : undefined,
    parentId,
    applicationName: r.application_name,
    extra, oldValue: extra.old_value, newValue: extra.new_value,
    kind, significance,
    runStatusOld, runStatusNew,
    lastLearningExit: lle ? new Date(lle * 1000) : undefined,
    budgetOldCents: bo.cents, budgetNewCents: bn.cents, budgetPeriod: bn.period ?? bo.period,
    fingerprint: fingerprintOf(accountId, r),
  };
}
