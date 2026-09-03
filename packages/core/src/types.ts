export type ActorKind = "person" | "agent" | "meta" | "rule";
export type ObjectLevel = "campaign" | "adset" | "ad" | "account" | "audience" | "unknown";
export type ChangeKind = "budget"|"status"|"targeting"|"creative"|"bid"|"schedule"|"audience"|"name"|"objective"|"delivery"|"review"|"other";
export type Significance = "major" | "minor" | "system";

/** Fila cruda tal como la devuelve /act_<id>/activities */
export interface RawActivity {
  event_time: string; event_type: string;
  actor_id?: string; actor_name?: string;
  object_id?: string; object_name?: string; object_type?: string;
  application_id?: string; application_name?: string;
  extra_data?: string; date_time_in_timezone?: string;
}

export interface NormalizedEvent {
  accountId: string;
  eventTime: Date;
  eventType: string;
  actorId: string; actorName: string; actorKind: ActorKind;
  objectId: string; objectName: string; objectType: string; level: ObjectLevel;
  campaignId?: string;   // solo cuando el objeto es campaña o se resolvió vía entidades
  parentId?: string;     // ad → ad set (Meta lo llama campaign_id en eventos ADGROUP); ad set → campaña
  applicationName?: string;
  extra: Record<string, unknown>;
  oldValue: unknown; newValue: unknown;
  kind: ChangeKind; significance: Significance;
  runStatusOld?: number; runStatusNew?: number;
  lastLearningExit?: Date;
  budgetOldCents?: number; budgetNewCents?: number; budgetPeriod?: "daily"|"lifetime";
  fingerprint: string;
}

export interface ChangeGroup {
  accountId: string;
  actorId: string; actorName: string; actorKind: ActorKind;
  objectId: string; objectName: string; objectType: string; level: ObjectLevel; campaignId?: string; parentId?: string;
  startedAt: Date; endedAt: Date;
  kind: ChangeKind; significance: Significance; resetsLearning: boolean;
  summary: string; details: Record<string, unknown>;
  events: NormalizedEvent[];
}
