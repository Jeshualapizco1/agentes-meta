/**
 * Agente 1 · Collector. Idempotente y reejecutable.
 *  1. Refresca entidades (campañas, ad sets, anuncios) + snapshot del día.
 *  2. Baja activities nuevas (con traslape) y las inserta por huella (fingerprint).
 *  3. Reagrupa eventos → grupos → sesiones desde un corte con margen. IDs deterministas + upsert: una sesión conserva su ID
 *     si no cambió su inicio; si cambió, las anotaciones se re-enlazan a la nueva antes de borrar la vieja.
 *  4. Insights diarios y por hora de Meta.
 *  5. Registra la corrida en agent_runs y alertas si algo falla.
 */
import { normalize, groupEvents, groupSessions, parseName, namingIssues, toZoned, CDMX, sessionId, groupId, relinkByEvents, relinkByWindow, planRelink, type RelinkRow, type RelinkWindowRow, type RawActivity, type NormalizedEvent, type EntityMap } from "@agentes-meta/core";
import { MetaClient, MetaApiError } from "@agentes-meta/meta";
import { upsertChunks, insertReturning, type Db } from "@agentes-meta/db";
import { ingestInsights } from "./insights.js";
import { ingestHourly } from "./hourly.js";

export interface CollectorOptions { db: Db; meta: MetaClient; accountIds?: string[]; backfillDays?: number; overlapHours?: number; insightsDays?: number; hourlyDays?: number; skipInsights?: boolean; triggeredBy?: string; log?: (m: string) => void }

export async function runCollector(o: CollectorOptions): Promise<void> {
  const log = o.log ?? console.log;
  await checkTokenExpiry(o, log);
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

/** Consulta debug_token y alerta (meta_token_expiring, warning) cuando faltan menos de 10 días; una alerta por día mientras no se atienda. */
async function checkTokenExpiry(o: CollectorOptions, log: (m: string) => void): Promise<void> {
  try {
    const t = await o.meta.debugToken();
    const exp = t.expires_at ? new Date(t.expires_at * 1000) : null;
    const daysLeft = exp ? (exp.getTime() - Date.now()) / 86400_000 : null;
    log(`token de Meta: ${t.is_valid ? "válido" : "INVÁLIDO"} · vence ${exp ? toZoned(exp, CDMX).date : "nunca"}${daysLeft != null ? ` (${daysLeft.toFixed(1)} días)` : ""}`);
    if (exp && daysLeft != null && daysLeft < 10) {
      const { count } = await o.db.from("alerts").select("*", { count: "exact", head: true }).eq("kind", "meta_token_expiring").is("acknowledged_at", null).gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString());
      if (!count) await o.db.from("alerts").insert({ account_id: null, kind: "meta_token_expiring", severity: "warning", message: `El token de Meta vence el ${toZoned(exp, CDMX).date} (faltan ${Math.max(0, Math.floor(daysLeft))} días). Generar uno nuevo y actualizar el secreto META_TOKEN_AROMANTE en GitHub y .env (docs/02-accesos.md).`, payload: { expires_at: exp.toISOString(), scopes: t.scopes ?? null, type: t.type ?? null } });
    }
  } catch (e) { log(`⚠ no se pudo consultar debug_token: ${e instanceof Error ? e.message : String(e)}`); }
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
  let groups = 0, sessions = 0, relinked = 0;
  const { count: grouped } = await db.from("change_sessions").select("*", { count: "exact", head: true }).eq("account_id", acc.id);
  if (inserted > 0 || !grouped) {
    const cutoff = inserted > 0 ? new Date(Math.min(...events.map(e => e.eventTime.getTime())) - 6 * 3600_000) : new Date(0);
    ({ groups, sessions, relinked } = await regroup(db, acc.id, cutoff, ents));
  }

  // 4. Insights diarios (Fase 2). Falla por separado para no perder la bitácora.
  let insights: Record<string, number> = {};
  if (!o.skipInsights) {
    try {
      insights = await ingestInsights(db, meta, { id: acc.id, timezone_name: info.timezone_name }, { days: o.insightsDays ?? 14 });
      Object.assign(insights, await ingestHourly(db, meta, { id: acc.id, timezone_name: info.timezone_name }, { days: o.hourlyDays ?? 7 }));
    }
    catch (e) { const msg = e instanceof Error ? e.message : String(e); await db.from("alerts").insert({ account_id: acc.id, kind: "insights_failed", severity: "warning", message: `Falló la ingesta de métricas: ${msg}` }); insights = { error: 1 }; log(`⚠ insights ${acc.name}: ${msg}`); }
  }

  // 5. Día sin cambios humanos → se registra explícitamente
  const cdmxToday = toZoned(now, CDMX).date;
  const humanToday = events.filter(e => e.actorKind === "person" && toZoned(e.eventTime, CDMX).date === cdmxToday).length;
  return { campaigns: camps.length, adsets: adsets.length, ads: ads.length, fetched: raw.length, inserted, groups, sessions, relinked, since: since.toISOString(), humanEventsTodayCdmx: humanToday, insights };
}

/**
 * Rehace grupos y sesiones para eventos con event_time ≥ cutoff, sin perder anotaciones:
 *  1. lee eventos del rango y calcula grupos/sesiones con IDs deterministas (core);
 *  2. lee la membresía vieja (qué huellas tenía cada sesión/grupo del rango);
 *  3. upsert de sesiones y grupos por id;
 *  4. re-enlaza annotations y evaluation_windows (por sesión y por grupo) cuyo id viejo desapareció al nuevo que contiene
 *     los mismos eventos (respaldo: mismo actor y ventana traslapada, por si una corrida anterior quedó a medias). El plan
 *     lo arma `planRelink` (core, con pruebas): anotación sin sucesora = error y no se borra nada; ventana que chocaría con
 *     el índice único o sin sucesor = se suelta (el analista la recalcula en la misma corrida);
 *  5. reasigna change_events.group_id (después del re-enlace: si esto falla, la siguiente corrida aún ve la membresía vieja);
 *  6. borra las sesiones/grupos del rango que ya no existen (a estas alturas nadie los referencia).
 */
export async function regroup(db: Db, accountId: string, cutoff: Date, ents: EntityMap): Promise<{ groups: number; sessions: number; relinked: number }> {
  const iso = cutoff.toISOString();
  const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };
  // select ... where col in (ids) por lotes de 200: PostgREST manda el filtro en la URL y con cientos de UUIDs falla
  // lectura completa paginada (PostgREST corta en 1000 filas)
  const selectAll = async <T>(build: () => { range: (a: number, b: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> }): Promise<T[]> => { const out: T[] = []; for (let from = 0; ; from += 1000) { const { data, error } = await build().range(from, from + 999); fail(error); out.push(...((data ?? []) as T[])); if (!data || data.length < 1000) break; } return out; };
  const selectIn = async <T>(table: string, cols: string, col: string, ids: string[]): Promise<T[]> => { const out: T[] = []; for (let i = 0; i < ids.length; i += 200) { const { data, error } = await db.from(table).select(cols).in(col, ids.slice(i, i + 200)); fail(error); out.push(...((data ?? []) as T[])); } return out; };

  // 1. eventos del rango (paginado)
  const all: (NormalizedEvent & { dbId: number; oldGroupId: string | null })[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("change_events").select("id,group_id,event_time,event_type,actor_id,actor_name,object_id,object_name,object_type,application_name,extra_data").eq("account_id", accountId).gte("event_time", iso).order("event_time").range(from, from + 999);
    fail(error);
    for (const r of data ?? []) {
      const raw: RawActivity = { event_time: r.event_time, event_type: r.event_type, actor_id: r.actor_id, actor_name: r.actor_name, object_id: r.object_id, object_name: r.object_name, object_type: r.object_type, application_name: r.application_name ?? undefined, extra_data: r.extra_data ? JSON.stringify(r.extra_data) : undefined };
      all.push({ ...normalize(accountId, raw), dbId: r.id as number, oldGroupId: (r.group_id as string | null) ?? null });
    }
    if (!data || data.length < 1000) break;
  }
  const groups = all.length ? groupEvents(all) : [];
  const sessions = all.length ? groupSessions(groups, undefined, ents) : [];
  const sessIds = sessions.map(s => sessionId(s));
  const gIds = groups.map(g => groupId(g));
  const newSessMembers = new Map(sessions.map((s, i) => [sessIds[i]!, s.groups.flatMap(g => g.events.map(e => e.fingerprint))]));
  const newGroupMembers = new Map(groups.map((g, i) => [gIds[i]!, g.events.map(e => e.fingerprint)]));

  // 2. membresía vieja del rango
  const oldSess = await selectAll<{ id: string; actor_id: string | null; started_at: string; ended_at: string }>(() => db.from("change_sessions").select("id,actor_id,started_at,ended_at").eq("account_id", accountId).gte("started_at", iso).order("started_at"));
  const oldGroups = await selectAll<{ id: string; session_id: string | null; actor_id: string | null; started_at: string; ended_at: string }>(() => db.from("change_groups").select("id,session_id,actor_id,started_at,ended_at").eq("account_id", accountId).gte("started_at", iso).order("started_at"));
  const oldSessIds = oldSess.map(s => s.id), oldGroupIds = oldGroups.map(g => g.id);
  const groupToSession = new Map(oldGroups.map(g => [g.id, g.session_id]));
  const oldGroupMembers = new Map<string, string[]>(); const oldSessMembers = new Map<string, string[]>();
  for (const id of oldGroupIds) oldGroupMembers.set(id, []);
  for (const id of oldSessIds) oldSessMembers.set(id, []);
  for (const e of all) {
    if (!e.oldGroupId) continue;
    oldGroupMembers.get(e.oldGroupId)?.push(e.fingerprint);
    const sid = groupToSession.get(e.oldGroupId); if (sid) oldSessMembers.get(sid)?.push(e.fingerprint);
  }

  // 3. upsert sesiones y grupos; reasignar eventos
  const sessRows = sessions.map((s, i) => ({ id: sessIds[i], account_id: accountId, actor_id: s.actorId, actor_name: s.actorName, actor_kind: s.actorKind, started_at: s.startedAt.toISOString(), ended_at: s.endedAt.toISOString(), kind: s.kind, significance: s.significance, resets_learning: s.resetsLearning, summary: s.summary, campaign_ids: s.campaignIds, group_count: s.counts.groups, event_count: s.counts.events, counts: s.counts }));
  if (sessRows.length) await upsertChunks(db, "change_sessions", sessRows, "id");
  const sessionOfGroup = new Map<ChangeGroupRef, string>();
  sessions.forEach((s, i) => { for (const g of s.groups) sessionOfGroup.set(g, sessIds[i]!); });
  const groupRows = groups.map((g, i) => {
    const cid = g.level === "campaign" ? g.objectId : (ents.get(g.objectId)?.campaignId ?? (g.parentId ? ents.get(g.parentId)?.campaignId : undefined) ?? null);
    return { id: gIds[i], account_id: accountId, session_id: sessionOfGroup.get(g) ?? null, actor_id: g.actorId, actor_name: g.actorName, actor_kind: g.actorKind, object_id: g.objectId, object_name: g.objectName, object_type: g.objectType, campaign_id: cid, started_at: g.startedAt.toISOString(), ended_at: g.endedAt.toISOString(), kind: g.kind, significance: g.significance, resets_learning: g.resetsLearning, summary: g.summary, details: g.details, event_count: g.events.length };
  });
  if (groupRows.length) await upsertChunks(db, "change_groups", groupRows, "id");

  // 4. re-enlazar anotaciones y ventanas de evaluación (por huellas; respaldo por actor + ventana)
  let relinked = 0;
  const win = (rows: { id: string; actor_id: string | null; started_at: string; ended_at: string }[]) => rows.map(r => ({ id: r.id, actorId: r.actor_id ?? "", start: new Date(r.started_at), end: new Date(r.ended_at) }));
  const mapS = relinkByEvents(oldSessMembers, newSessMembers), mapG = relinkByEvents(oldGroupMembers, newGroupMembers);
  for (const [k, v] of relinkByWindow(win(oldSess), sessions.map((s, i) => ({ id: sessIds[i]!, actorId: s.actorId, start: s.startedAt, end: s.endedAt })))) if (!mapS.has(k)) mapS.set(k, v);
  for (const [k, v] of relinkByWindow(win(oldGroups), groups.map((g, i) => ({ id: gIds[i]!, actorId: g.actorId, start: g.startedAt, end: g.endedAt })))) if (!mapG.has(k)) mapG.set(k, v);
  const staleSess = oldSessIds.filter(id => !newSessMembers.has(id)), staleGroups = oldGroupIds.filter(id => !newGroupMembers.has(id));
  if (staleSess.length || staleGroups.length) {
    // todo lo que apunta a una sesión o grupo que va a desaparecer (por sesión Y por grupo: evaluation_windows tiene ambas FK desde la 0009)
    const byId = <T extends { id: string }>(rows: T[]) => [...new Map(rows.map(r => [r.id, r])).values()];
    const notes = byId([
      ...(staleSess.length ? await selectIn<RelinkRow>("annotations", "id,session_id,group_id", "session_id", staleSess) : []),
      ...(staleGroups.length ? await selectIn<RelinkRow>("annotations", "id,session_id,group_id", "group_id", staleGroups) : []),
    ]);
    const staleWins = byId([
      ...(staleSess.length ? await selectIn<RelinkWindowRow>("evaluation_windows", "id,session_id,group_id,horizon", "session_id", staleSess) : []),
      ...(staleGroups.length ? await selectIn<RelinkWindowRow>("evaluation_windows", "id,session_id,group_id,horizon", "group_id", staleGroups) : []),
    ]);
    // ventanas ya existentes en las sesiones/grupos sucesores (para respetar los índices únicos sesión|horizonte y grupo|horizonte)
    const targets = [...new Set([...mapS.values(), ...mapG.values()])];
    const targetWins = byId([
      ...(targets.length ? await selectIn<RelinkWindowRow>("evaluation_windows", "id,session_id,group_id,horizon", "session_id", targets) : []),
      ...(targets.length ? await selectIn<RelinkWindowRow>("evaluation_windows", "id,session_id,group_id,horizon", "group_id", targets) : []),
    ]);
    const plan = planRelink({ mapSession: mapS, mapGroup: mapG, staleSessions: staleSess, staleGroups, annotations: notes, windows: byId([...staleWins, ...targetWins]) });
    if (plan.errors.length) throw new Error(plan.errors.join(" "));
    // primero soltar las ventanas que chocarían, luego mover las demás, al final las anotaciones
    for (let i = 0; i < plan.dropWindows.length; i += 200) fail((await db.from("evaluation_windows").delete().in("id", plan.dropWindows.slice(i, i + 200).map(d => d.id))).error);
    for (const w of plan.windows) { const { error: ue } = await db.from("evaluation_windows").update(w.patch).eq("id", w.id); fail(ue); relinked++; }
    for (const n of plan.annotations) { const { error: ue } = await db.from("annotations").update(n.patch).eq("id", n.id); fail(ue); relinked++; }
    if (plan.dropWindows.length) console.log(`  ↻ ${plan.dropWindows.length} ventana(s) de evaluación soltadas (el analista las recalcula): ${plan.dropWindows.map(d => d.reason).slice(0, 3).join("; ")}`);
  }

  // 5. reasignar eventos a sus grupos nuevos
  const links = groups.map((g, i) => ({ gid: gIds[i]!, ids: g.events.filter(e => (e as typeof all[number]).oldGroupId !== gIds[i]).map(e => (e as typeof all[number]).dbId) })).filter(l => l.ids.length);
  for (let i = 0; i < links.length; i += 25) {
    await Promise.all(links.slice(i, i + 25).map(async l => { const { error } = await db.from("change_events").update({ group_id: l.gid }).in("id", l.ids); fail(error); }));
  }

  // 6. borrar lo viejo que ya no existe (grupos antes que sesiones por la FK)
  for (let i = 0; i < staleGroups.length; i += 200) { const ids = staleGroups.slice(i, i + 200); fail((await db.from("change_events").update({ group_id: null }).in("group_id", ids)).error); fail((await db.from("change_groups").delete().in("id", ids)).error); }
  for (let i = 0; i < staleSess.length; i += 200) fail((await db.from("change_sessions").delete().in("id", staleSess.slice(i, i + 200))).error);
  return { groups: groups.length, sessions: sessions.length, relinked };
}
type ChangeGroupRef = ReturnType<typeof groupEvents>[number];
