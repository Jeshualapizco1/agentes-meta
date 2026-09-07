import { LOCK_LABEL, RULE_ACTION_LABEL, type LockName, type RuleAction } from "@agentes-meta/core";
import type { DailyReading, HoyAlert, HoyDecision, HoyProposal, HoySnapshot, Section } from "./hoy-view";
import { presentAlert, type AlertRow } from "./alerts";

export type ReadResult<T> = { data: T; error: null } | { data: null; error: true };
export type RealInsight = { date: string; spend: unknown; purchases: unknown; purchase_value: unknown; is_closed_day: boolean; fetched_at: string };
export type RealProposal = { id: string; account_id: string; rule_name: string | null; action: string; entity_name: string | null; entity_level: string; entity_id: string; before_value: unknown; after_value: unknown; move_to_entity_id?: string | null; move_to_before?: unknown; evidence: unknown; locks: unknown; created_at: string; expires_at: string | null };
export type RealDecision = { id: string; status: string; action: string; entity_name: string | null; before_value: unknown; after_value: unknown; decided_at: string | null; decision_reason?: string | null; execution_note: string | null };
export type RealRun = { started_at: string; finished_at: string | null; status: string; stats?: unknown };
export type RealProfile = { mode: string; dry_run: boolean; target_roas?: number | null };
export type RealBrake = { active: boolean; engage_reason: string | null };

const record = (value: unknown): Record<string, unknown> | null => typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
const list = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.map(record).filter((x): x is Record<string, unknown> => !!x) : [];
const display = (value: unknown) => typeof value === "string" ? value : value == null ? "—" : typeof value === "number" || typeof value === "boolean" ? String(value) : "Dato no disponible";
const simpleDisplay = (value: unknown): string | null => typeof value === "string" || typeof value === "number" ? String(value) : null;
const finite = (value: unknown) => { const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN; return Number.isFinite(number) && number >= 0 ? number : null; };
const minor = (value: unknown) => { const number = finite(value); const cents = number === null ? NaN : Math.round(number * 100); if (!Number.isSafeInteger(cents)) throw new Error("Importe de propuesta inválido"); return cents; };
const section = <T, U>(read: ReadResult<T>, map: (data: T) => U): Section<U> => {
  if (read.error) return { state: "error" };
  try { return { state: "ready", data: map(read.data) }; } catch { return { state: "error" }; }
};

export function aggregateRealInsights(rows: RealInsight[]): DailyReading[] {
  const days = new Map<string, { spend: number; purchases: number; revenue: number; closed: boolean; valid: boolean }>();
  for (const row of rows) {
    const spend = finite(row.spend ?? 0), purchases = finite(row.purchases ?? 0), revenue = finite(row.purchase_value ?? 0);
    const day = days.get(row.date) ?? { spend: 0, purchases: 0, revenue: 0, closed: true, valid: true };
    day.valid = day.valid && spend !== null && purchases !== null && revenue !== null;
    day.closed = day.closed && row.is_closed_day;
    if (spend !== null) day.spend += spend;
    if (purchases !== null) day.purchases += purchases;
    if (revenue !== null) day.revenue += revenue;
    days.set(row.date, day);
  }
  return [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, day]) => ({ date, closed: day.closed, spend: day.valid ? day.spend : null, purchases: day.valid ? day.purchases : null, revenue: day.valid ? day.revenue : null }));
}

export function mapRealProposal(row: RealProposal): HoyProposal {
  const before = finite(row.before_value), after = finite(row.after_value);
  const change: HoyProposal["change"] = row.action === "pausar_anuncio"
    ? { kind: "pause" }
    : row.action === "mover_presupuesto"
      ? { kind: "move", origin: { name: row.entity_name ?? row.entity_id, beforeMinor: minor(row.before_value), afterMinor: minor(row.after_value) }, destination: { name: row.move_to_entity_id ?? "Campaña destino", beforeMinor: minor(row.move_to_before), afterMinor: minor(row.move_to_before) + (minor(row.before_value) - minor(row.after_value)) } }
      : before !== null && after !== null
        ? { kind: "budget", beforeMinor: minor(before), afterMinor: minor(after) }
        : (() => { throw new Error("Cambio de propuesta no representable"); })();
  return {
    id: row.id, accountId: row.account_id, title: RULE_ACTION_LABEL[row.action as RuleAction] ?? row.action.replaceAll("_", " "), entity: row.entity_name ?? row.entity_id,
    entityLevel: row.entity_level, rule: row.rule_name ?? "Regla sin nombre", change, createdAt: row.created_at, expiresAt: row.expires_at, evidenceAt: row.created_at,
    evidence: list(row.evidence).map((item, index) => ({ ref: display(item.ref ?? `E${index + 1}`), label: display(item.label ?? "Evidencia"), value: display(item.value) })),
    locks: list(row.locks).map((item, index) => { const id = display(item.lock ?? item.id ?? `candado-${index + 1}`); return { id, label: LOCK_LABEL[id as LockName] ?? display(item.label ?? id), ok: item.ok === true, reason: display(item.reason ?? "Sin detalle registrado") }; }),
  };
}

function mapDecision(row: RealDecision): HoyDecision {
  const status: HoyDecision["status"] = row.status === "simulada" ? "simulated" : row.status === "rechazada" ? "rejected" : row.status === "fallida" ? "failed" : row.status === "ejecutada" ? "execution-recorded" : row.status === "aprobada" ? "approved" : "unconfirmed";
  const before = simpleDisplay(row.before_value), after = simpleDisplay(row.after_value);
  const values = before !== null && after !== null ? ` · ${before} → ${after}` : "";
  return { id: row.id, entity: row.entity_name ?? "Entidad sin nombre", action: `${RULE_ACTION_LABEL[row.action as RuleAction] ?? row.action.replaceAll("_", " ")}${values}`, status, at: row.decided_at ?? "", detail: row.execution_note ?? row.decision_reason ?? "Sin nota adicional registrada." };
}

export function buildRealHoySnapshot(input: {
  account: { id: string; name: string; currency: string; timezone_name: string }; reportingDate: string; asOf: string;
  insights: ReadResult<RealInsight[]>; profile: ReadResult<RealProfile | null>; proposals: ReadResult<RealProposal[]>; decisions: ReadResult<RealDecision[]>;
  alerts: ReadResult<AlertRow[]>;
  activity: ReadResult<{ id: string; actor_name: string | null; summary: string; started_at: string }[]>;
  brake: ReadResult<RealBrake | null>; collector: ReadResult<RealRun | null>; strategist: ReadResult<RealRun | null>;
}): HoySnapshot {
  const collector = input.collector.error ? null : input.collector.data;
  const readingState = input.insights.error ? "error" : input.collector.error || !collector || collector.status === "running" ? "partial" : collector.status === "failed" ? "stale" : "ready";
  const profile = input.profile.error ? null : input.profile.data;
  const brake = input.brake.error ? null : input.brake.data;
  return {
    account: { id: input.account.id, name: input.account.name, currency: input.account.currency, timeZone: input.account.timezone_name }, asOf: input.asOf, reportingDate: input.reportingDate, access: "allowed",
    readings: { state: readingState, rows: input.insights.error ? [] : aggregateRealInsights(input.insights.data) },
    agent: { mode: profile?.mode === "off" || profile?.mode === "semi" || profile?.mode === "auto" ? profile.mode : "unknown", execution: profile ? profile.dry_run ? "simulation" : "live" : "unknown", brake: input.brake.error ? "unknown" : brake?.active ? "engaged" : "released", brakeReason: brake?.engage_reason ?? undefined, collectedAt: collector?.finished_at ?? collector?.started_at ?? null, collection: input.collector.error || !collector ? "unknown" : collector.status === "ok" ? "ok" : collector.status === "failed" ? "error" : "running", strategyAt: input.strategist.error ? null : input.strategist.data?.finished_at ?? input.strategist.data?.started_at ?? null },
    proposals: section(input.proposals, rows => rows.map(mapRealProposal)),
    alerts: section(input.alerts, rows => rows.map((row): HoyAlert => presentAlert(row, { accountId: input.account.id }))),
    decisions: section(input.decisions, rows => rows.map(mapDecision)),
    activity: section(input.activity, rows => rows.map(row => ({ id: row.id, actor: row.actor_name ?? "Persona sin nombre", summary: row.summary, at: row.started_at }))),
  };
}
