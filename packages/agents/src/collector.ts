/**
 * Agente 1 · Collector. Idempotente y reejecutable.
 *  1. Refresca entidades (campañas, ad sets, anuncios) + snapshot del día.
 *  2. Baja activities nuevas (con traslape) y las inserta por huella (fingerprint).
 *  3. Reagrupa eventos → grupos → sesiones desde un corte con margen, borrando lo anterior en ese rango.
 *  4. Registra la corrida en agent_runs y alertas si algo falla.
 */
import { normalize, groupEvents, groupSessions, parseName, namingIssues, toZoned, CDMX, type RawActivity, type NormalizedEvent, type EntityMap } from "@agentes-meta/core";
import { MetaClient, MetaApiError } from "@agentes-meta/meta";
import { upsertChunks, insertReturning, type Db } from "@agentes-meta/db";
import { ingestInsights } from "./insights.js";

export interface CollectorOptions { db: Db; meta: MetaClient; accountIds?: string[]; backfillDays?: number; overlapHours?: number; insightsDays?: number; skipInsights?: boolean; triggeredBy?: string; log?: (m: string) => void }

export async function runCollector(o: CollectorOptions): Promise<void> {
  const log = o.log ?? console.log;
  const { data: accounts, error } = await o.db.from("accounts").select("id,name,timezone_name").eq("enabled", true);
  if (error) throw new Error(error.message);
  const targets = (accounts ?? []).filter(a => !o.accountIds || o.accountIds.includes(a.id));
  for (const acc of targets) {
    const { data: run } = await o.db.from("agent_runs").insert({ agent: "collector", account_id: acc.id, triggered_by: o.triggeredBy ?? "manual" }).select("id").single();
    const t0 = Date.now();
    try {
      const stats = await collectAccount(o, acc, log);
      await o.db.from("agent_runs").update({ status: "ok", finished_at: new Date().toISOString(), stats: { ...stats, ms: Date.now() - t0 } }).eq("id", run!.id);
      log(`✔ ${acc.name}: ${JSON.stringify(stats)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await o.db.from("agent_runs").update({ status: "failed", finished_at: new Date().toISOString(), error: msg }).eq("id", run!.id);
      const kind = e instanceof MetaApiError && e.isAuth ? "meta_auth" : "collector_failed";
      await o.db.from("alerts").insert({ account_id: acc.id, kind, severity: "critical", message: kind === "meta_auth" ? `Token de Meta inválido o vencido: ${msg}` : `Falló el collector: ${msg}` });
      log(`✖ ${acc.name}: ${msg}`);
    }
  }
}

async function collectAccount(o: CollectorOptions, acc: { id: string; name: string; timezone_name: string }, log: (m: string) => void) {
  const { db, meta } = o;
  const now = new Date();

  // 0. Estado de la cuenta (detecta deshabilitada / cambio de zona horaria)
  const info = await meta.account(acc.id);
  if (info.account_status !== 1) await db.from("alerts").insert({ account_id: acc.id, kind: "account_status", severity: "critical", message: `La cuenta ${acc.name} no está activa (status ${info.account_status})` });
  await db.from("accounts").update({ account_status: info.account_status, timezone_name: info.timezone_name, currency: info.currency }).eq("id", acc.id);

  // 1. Entidades
  const [camps, adsets, ads] = await Promise.all([meta.campaigns(acc.id), meta.adsets(acc.id), meta.ads(acc.id)]);
  const ents: EntityMap = new Map();
  const rows: Record<string, unknown>[] = [];
  const push = (level: "campaign" | "adset" | "ad", e: Record<string, unknown> & { id: string; name: string }, parent?: string, campaignId?: string) => {
    ents.set(e.id, { name: e.name, level, campaignId: campaignId ?? (level === "campaign" ? e.id : undefined) });
    const parsed = parseName(e.name);
    rows.push({ id: e.id, account_id: acc.id, level, parent_id: parent ?? null, campaign_id: campaignId ?? (level === "campaign" ? e.id : null), name: e.name,
      status: e.status ?? null, effective_status: e.effective_status ?? null, objective: e.objective ?? null,
      daily_budget: e.daily_budget ? Number(e.daily_budget) : null, lifetime_budget: e.lifetime_budget ? Number(e.lifetime_budget) : null,
      bid_strategy: e.bid_strategy ?? null, optimization_goal: e.optimization_goal ?? null,
      created_time: e.created_time ?? null, updated_time: e.updated_time ?? null,
      parsed_name: { ...parsed, issues: namingIssues(parsed, level) }, raw: e, snapshot_at: now.toISOString() });
  };
  for (const c of camps) push("campaign", c);
  for (const a of adsets) push("adset", a, a.campaign_id, a.campaign_id);
  for (const a of ads) push("ad", a, a.adset_id, a.campaign_id);
  await upsertChunks(db, "entities", rows, "id");
  const today = toZoned(now, CDMX).date;
  await upsertChunks(db, "entity_snapshots", rows.map(r => ({ entity_id: r.id, account_id: acc.id, snapshot_date: today, raw: r.raw })), "entity_id,snapshot_date");

  // 2. Activities nuevas
  const { data: last } = await db.from("change_events").select("event_time").eq("account_id", acc.id).order("event_time", { ascending: false }).limit(1).maybeSingle();
  const overlapMs = (o.overlapHours ?? 24) * 3600_000;
  const since = last ? new Date(new Date(last.event_time).getTime() - overlapMs) : new Date(now.getTime() - (o.backfillDays ?? 90) * 86400_000);
  const raw = await meta.activities(acc.id, Math.floor(since.getTime() / 1000));
  const events = raw.map(r => normalize(acc.id, r));
  const evRows = events.map(e => ({
    account_id: acc.id, event_time: e.eventTime.toISOString(), event_type: e.eventType,
    actor_id: e.actorId, actor_name: e.actorName, actor_kind: e.actorKind,
    object_id: e.objectId, object_name: e.objectName, object_type: e.objectType, application_name: e.applicationName ?? null,
    extra_data: e.extra, old_value: e.oldValue ?? null, new_value: e.newValue ?? null, fingerprint: e.fingerprint,
  }));
  const { count: before } = await db.from("change_events").select("*", { count: "exact", head: true }).eq("account_id", acc.id);
  await upsertChunks(db, "change_events", evRows, "fingerprint", { ignoreDuplicates: true });
  const { count: after } = await db.from("change_events").select("*", { count: "exact", head: true }).eq("account_id", acc.id);
  const inserted = (after ?? 0) - (before ?? 0);

  // 3. Reagrupar desde el corte (evento nuevo más antiguo − 6 h). Si no hubo nuevos, solo si nunca se agrupó.
  let groups = 0, sessions = 0;
  const { count: grouped } = await db.from("change_sessions").select("*", { count: "exact", head: true }).eq("account_id", acc.id);
  if (inserted > 0 || !grouped) {
    const cutoff = inserted > 0 ? new Date(Math.min(...events.map(e => e.eventTime.getTime())) - 6 * 3600_000) : new Date(0);
    ({ groups, sessions } = await regroup(db, acc.id, cutoff, ents));
  }

  // 4. Insights diarios (Fase 2). Falla por separado para no perder la bitácora.
  let insights: Record<string, number> = {};
  if (!o.skipInsights) {
    try { insights = await ingestInsights(db, meta, { id: acc.id, timezone_name: info.timezone_name }, { days: o.insightsDays ?? 14 }); }
    catch (e) { const msg = e instanceof Error ? e.message : String(e); await db.from("alerts").insert({ account_id: acc.id, kind: "insights_failed", severity: "warning", message: `Falló la ingesta de métricas: ${msg}` }); insights = { error: 1 }; log(`⚠ insights ${acc.name}: ${msg}`); }
  }

  // 5. Día sin cambios humanos → se registra explícitamente
  const cdmxToday = toZoned(now, CDMX).date;
  const humanToday = events.filter(e => e.actorKind === "person" && toZoned(e.eventTime, CDMX).date === cdmxToday).length;
  return { campaigns: camps.length, adsets: adsets.length, ads: ads.length, fetched: raw.length, inserted, groups, sessions, since: since.toISOString(), humanEventsTodayCdmx: humanToday, insights };
}

/** Rehace grupos y sesiones para eventos con event_time ≥ cutoff. */
export async function regroup(db: Db, accountId: string, cutoff: Date, ents: EntityMap): Promise<{ groups: number; sessions: number }> {
  const iso = cutoff.toISOString();
  // limpiar rango
  let e1 = (await db.from("change_events").update({ group_id: null }).eq("account_id", accountId).gte("event_time", iso)).error; if (e1) throw new Error(e1.message);
  e1 = (await db.from("change_groups").delete().eq("account_id", accountId).gte("started_at", iso)).error; if (e1) throw new Error(e1.message);
  e1 = (await db.from("change_sessions").delete().eq("account_id", accountId).gte("started_at", iso)).error; if (e1) throw new Error(e1.message);

  // leer eventos del rango (paginado)
  const all: (NormalizedEvent & { dbId: number })[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("change_events").select("id,event_time,event_type,actor_id,actor_name,object_id,object_name,object_type,application_name,extra_data").eq("account_id", accountId).gte("event_time", iso).order("event_time").range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) {
      const raw: RawActivity = { event_time: r.event_time, event_type: r.event_type, actor_id: r.actor_id, actor_name: r.actor_name, object_id: r.object_id, object_name: r.object_name, object_type: r.object_type, application_name: r.application_name ?? undefined, extra_data: r.extra_data ? JSON.stringify(r.extra_data) : undefined };
      all.push({ ...normalize(accountId, raw), dbId: r.id as number });
    }
    if (!data || data.length < 1000) break;
  }
  if (!all.length) return { groups: 0, sessions: 0 };

  const groups = groupEvents(all);
  const sessions = groupSessions(groups, undefined, ents);
  const sessRows = sessions.map(s => ({ account_id: accountId, actor_id: s.actorId, actor_name: s.actorName, actor_kind: s.actorKind, started_at: s.startedAt.toISOString(), ended_at: s.endedAt.toISOString(), kind: s.kind, significance: s.significance, resets_learning: s.resetsLearning, summary: s.summary, campaign_ids: s.campaignIds, group_count: s.counts.groups, event_count: s.counts.events, counts: s.counts }));
  const sessIds = await insertReturning<{ id: string }>(db, "change_sessions", sessRows);
  const groupRows: Record<string, unknown>[] = []; const groupRefs: typeof groups = [];
  sessions.forEach((s, i) => { for (const g of s.groups) {
    const cid = g.level === "campaign" ? g.objectId : (ents.get(g.objectId)?.campaignId ?? (g.parentId ? ents.get(g.parentId)?.campaignId : undefined) ?? null);
    groupRows.push({ account_id: accountId, session_id: sessIds[i]!.id, actor_id: g.actorId, actor_name: g.actorName, actor_kind: g.actorKind, object_id: g.objectId, object_name: g.objectName, object_type: g.objectType, campaign_id: cid, started_at: g.startedAt.toISOString(), ended_at: g.endedAt.toISOString(), kind: g.kind, significance: g.significance, resets_learning: g.resetsLearning, summary: g.summary, details: g.details, event_count: g.events.length });
    groupRefs.push(g);
  } });
  const groupIds = await insertReturning<{ id: string }>(db, "change_groups", groupRows);
  // enlazar eventos → grupo (en paralelo por lotes)
  const links = groupRefs.map((g, i) => ({ gid: groupIds[i]!.id, ids: g.events.map(e => (e as NormalizedEvent & { dbId: number }).dbId) }));
  for (let i = 0; i < links.length; i += 25) {
    await Promise.all(links.slice(i, i + 25).map(async l => { const { error } = await db.from("change_events").update({ group_id: l.gid }).in("id", l.ids); if (error) throw new Error(error.message); }));
  }
  return { groups: groups.length, sessions: sessions.length };
}
