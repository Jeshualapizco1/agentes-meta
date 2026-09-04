/**
 * Agente 2 · Analista semanal.
 *  1. Ventanas de evaluación (72h/7d/14d) por cada sesión mayor de una persona en los últimos N días: campañas tocadas
 *     vs. resto de la cuenta, antes vs. después, solo días completos. Se recalculan en cada corrida (las pendientes maduran).
 *  2. Reporte semanal: paquete de evidencia determinista (core) + narrativa con Claude si hay ANTHROPIC_API_KEY.
 *     Se genera los lunes (cierre del domingo) o a petición; nunca se duplica para el mismo periodo.
 */
import { evaluateChange, evaluateExperiment, buildWeeklyEvidence, toZoned, CDMX, HORIZON_DAYS, BASELINE_DAYS, type DailyRow, type Horizon, type Evaluation, type WeeklySession, type WeeklyEvidence, type ExperimentMetric } from "@agentes-meta/core";
import { upsertChunks, fetchAll, type Db } from "@agentes-meta/db";
import { writeWeeklyNarrative } from "./narrative.js";

const HORIZONS: Horizon[] = ["72h", "7d", "14d"];
export interface AnalystOptions { db: Db; accountIds?: string[]; days?: number; weekly?: "auto" | "force" | "off"; anthropicKey?: string; triggeredBy?: string; log?: (m: string) => void }
type Acc = { id: string; name: string; timezone_name: string };
type SessionRow = { id: string; started_at: string; actor_name: string; summary: string; resets_learning: boolean; kind: string; campaign_ids: string[] };

/** Filas diarias por campaña (solo días completos) desde `since`. */
async function loadRows(db: Db, accountId: string, since: string): Promise<DailyRow[]> {
  const data = await fetchAll<{ entity_id: string; date: string; spend: number | null; purchases: number | null; purchase_value: number | null }>(() => db.from("insights_daily").select("entity_id,date,spend,purchases,purchase_value").eq("account_id", accountId).eq("level", "campaign").eq("is_closed_day", true).gte("date", since).order("date"));
  return data.map(r => ({ entity_id: r.entity_id, date: r.date, spend: Number(r.spend ?? 0), purchases: Number(r.purchases ?? 0), value: Number(r.purchase_value ?? 0) }));
}

/** Calcula y guarda las ventanas de una lista de sesiones. Devuelve las evaluaciones por sesión. Cada veredicto que cambia queda en verdict_changes. */
export async function evaluateSessions(db: Db, acc: Acc, sessions: SessionRow[], rows: DailyRow[], today: string): Promise<Map<string, Evaluation[]>> {
  const out = new Map<string, Evaluation[]>(); const upserts: Record<string, unknown>[] = [];
  type Prev = { session_id: string; horizon: string; status: string; reading: string | null; confidence: string | null; verdict: string | null };
  const prev = new Map<string, Prev>();
  const ids = sessions.map(s => s.id);
  for (let i = 0; i < ids.length; i += 200) for (const w of await fetchAll<Prev>(() => db.from("evaluation_windows").select("session_id,horizon,status,reading,confidence,verdict").in("session_id", ids.slice(i, i + 200)))) prev.set(`${w.session_id}|${w.horizon}`, w);
  const changes: Record<string, unknown>[] = [];
  for (const s of sessions) {
    const changeDate = toZoned(new Date(s.started_at), acc.timezone_name).date;
    const evs = HORIZONS.map(h => evaluateChange({ changeDate, campaignIds: s.campaign_ids ?? [], rows, horizon: h, today, kind: s.kind }));
    out.set(s.id, evs);
    for (const e of evs) {
      const p = prev.get(`${s.id}|${e.horizon}`);
      // cambio de veredicto: distinta lectura, confianza, estado o texto (el texto cambia con los números)
      if (p && (p.reading !== e.reading || p.confidence !== e.confidence || p.status !== e.status || p.verdict !== e.verdict))
        changes.push({ account_id: acc.id, session_id: s.id, horizon: e.horizon, from_status: p.status, to_status: e.status, from_reading: p.reading, to_reading: e.reading, from_confidence: p.confidence, to_confidence: e.confidence, from_verdict: p.verdict, to_verdict: e.verdict, matured: p.status !== "mature" && e.status === "mature" });
    }
    for (const e of evs) upserts.push({ session_id: s.id, account_id: acc.id, horizon: e.horizon, starts_at: `${e.starts_at}T00:00:00Z`, ends_at: `${e.ends_at}T23:59:59Z`, status: e.status, metrics_before: e.treatment.before, metrics_after: e.treatment.after, control: e.control, delta: e.delta, confidence: e.confidence, verdict: e.verdict, caveats: e.caveats, baseline: e.baseline, agreement: e.agreement, reading: e.reading, missing_refs: e.missing_refs, computed_at: new Date().toISOString() });
  }
  if (upserts.length) await upsertChunks(db, "evaluation_windows", upserts, "session_id,horizon");
  for (let i = 0; i < changes.length; i += 200) { const { error } = await db.from("verdict_changes").insert(changes.slice(i, i + 200)); if (error) throw new Error(error.message); }
  return out;
}

/**
 * Experimentos activos o en evaluación: se evalúan contra su propio criterio (core). Al cerrar la ventana pasan a
 * `evaluando` con veredicto propuesto y se alerta; el veredicto final lo confirma una persona en /experimentos.
 */
type ExpRow = { id: string; name: string; metric: ExperimentMetric | null; threshold: number | null; min_purchases: number; window_days: number; campaign_ids: string[]; start_date: string | null; status: string };
export async function evaluateExperiments(db: Db, acc: Acc, today: string, log: (m: string) => void): Promise<{ experiments: number; evaluating: number }> {
  const { data, error } = await db.from("experiments").select("id,name,metric,threshold,min_purchases,window_days,campaign_ids,start_date,status").eq("account_id", acc.id).in("status", ["activo", "evaluando"]);
  if (error) throw new Error(error.message);
  const exps = ((data ?? []) as ExpRow[]).filter(x => x.metric && x.threshold != null && x.start_date);
  if (!exps.length) return { experiments: 0, evaluating: 0 };
  const rows = await loadRows(db, acc.id, addDays(exps.map(x => x.start_date!).sort()[0]!, -BASELINE_DAYS - 1));
  let evaluating = 0;
  for (const x of exps) {
    const ev = evaluateExperiment({ exp: { metric: x.metric!, threshold: Number(x.threshold), min_purchases: x.min_purchases, window_days: x.window_days, campaign_ids: x.campaign_ids ?? [], start_date: x.start_date! }, rows, today });
    const status = x.status === "activo" && ev.status === "mature" ? "evaluando" : x.status;
    if (status === "evaluando") evaluating++;
    const { error: ue } = await db.from("experiments").update({ evaluation: ev, proposed_verdict: ev.proposed, status, updated_at: new Date().toISOString() }).eq("id", x.id);
    if (ue) throw new Error(ue.message);
    if (status !== x.status) {
      await db.from("alerts").insert({ account_id: acc.id, kind: "experiment_ready", severity: "info", message: `El experimento «${x.name}» cerró su ventana de ${x.window_days} días. Veredicto propuesto: ${ev.proposed}. Confirmar en /experimentos.`, payload: { experiment_id: x.id, proposed: ev.proposed } });
      log(`  ⚗ ${x.name}: ${ev.proposed}`);
    }
  }
  return { experiments: exps.length, evaluating };
}

/** Paquete de evidencia semanal de una cuenta con periodo que termina en `periodEnd` (fecha en zona de la cuenta). */
export async function buildWeekly(db: Db, acc: Acc, periodEnd: string): Promise<WeeklyEvidence> {
  const since = addDays(periodEnd, -HORIZON_DAYS["14d"] - 14);
  const [rows, sessions, camps, { data: prof }] = await Promise.all([
    loadRows(db, acc.id, since),
    fetchAll<SessionRow>(() => db.from("change_sessions").select("id,started_at,actor_name,summary,resets_learning,kind,campaign_ids").eq("account_id", acc.id).eq("significance", "major").eq("actor_kind", "person").gte("started_at", `${addDays(periodEnd, -6)}T00:00:00-06:00`).lte("started_at", `${periodEnd}T23:59:59-06:00`).order("started_at")),
    fetchAll<{ id: string; name: string }>(() => db.from("entities").select("id,name").eq("account_id", acc.id).eq("level", "campaign")),
    db.from("account_profiles").select("target_roas,breakeven_roas,target_cpa,daily_spend_ceiling").eq("account_id", acc.id).maybeSingle(),
  ]);
  const evals = await evaluateSessions(db, acc, sessions, rows, addDays(periodEnd, 1));
  const weeklySessions: WeeklySession[] = sessions.map(s => ({ id: s.id, started_at: s.started_at, actor_name: s.actor_name, summary: s.summary, resets_learning: s.resets_learning, kind: s.kind, evaluations: (evals.get(s.id) ?? []).map(e => ({ horizon: e.horizon, status: e.status, confidence: e.confidence, verdict: e.verdict, delta: e.delta, caveats: e.caveats, agreement: e.agreement, reading: e.reading, missing_refs: e.missing_refs })) }));
  return buildWeeklyEvidence({ periodEnd, rows, campaignNames: new Map(camps.map(c => [c.id, c.name])), sessions: weeklySessions, targets: { target_roas: num(prof?.target_roas), breakeven_roas: num(prof?.breakeven_roas), target_cpa: num(prof?.target_cpa), daily_spend_ceiling: num(prof?.daily_spend_ceiling) } });
}

/** Guarda (o completa) el análisis semanal de un periodo. Con llave de Claude añade la narrativa; sin llave deja `narrative` en null. */
export async function saveWeekly(db: Db, acc: Acc, periodEnd: string, o: { anthropicKey?: string; triggeredBy: string; log: (m: string) => void }): Promise<{ id: string; narrated: boolean }> {
  const evidence = await buildWeekly(db, acc, periodEnd);
  const { data: existing } = await db.from("analyses").select("id,narrative").eq("account_id", acc.id).eq("kind", "weekly").eq("period_end", periodEnd).maybeSingle();
  let narrative: string | null = existing?.narrative ?? null, model: string | null = null;
  if (!narrative && o.anthropicKey) {
    try { const n = await writeWeeklyNarrative(evidence, acc.name, o.anthropicKey); narrative = n.text; model = n.model; }
    catch (e) { o.log(`⚠ narrativa ${acc.name}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  const row = { account_id: acc.id, kind: "weekly", period_start: evidence.period.start, period_end: periodEnd, evidence, narrative, model: model ?? (existing ? undefined : null), triggered_by: o.triggeredBy };
  if (existing) { const { error } = await db.from("analyses").update(row).eq("id", existing.id); if (error) throw new Error(error.message); return { id: existing.id, narrated: !!narrative }; }
  const { data, error } = await db.from("analyses").insert(row).select("id").single(); if (error) throw new Error(error.message);
  return { id: data.id, narrated: !!narrative };
}

export async function runAnalyst(o: AnalystOptions): Promise<void> {
  const log = o.log ?? console.log;
  const { data: accounts, error } = await o.db.from("accounts").select("id,name,timezone_name").eq("enabled", true);
  if (error) throw new Error(error.message);
  for (const acc of (accounts ?? []).filter(a => !o.accountIds || o.accountIds.includes(a.id)) as Acc[]) {
    const { data: run } = await o.db.from("agent_runs").insert({ agent: "analyst", account_id: acc.id, triggered_by: o.triggeredBy ?? "manual" }).select("id").single();
    const t0 = Date.now();
    try {
      const today = toZoned(new Date(), acc.timezone_name).date;
      const days = o.days ?? 30;
      const sessions = await fetchAll<SessionRow>(() => o.db.from("change_sessions").select("id,started_at,actor_name,summary,resets_learning,kind,campaign_ids").eq("account_id", acc.id).eq("significance", "major").eq("actor_kind", "person").gte("started_at", new Date(Date.now() - days * 86400_000).toISOString()).order("started_at"));
      const rows = await loadRows(o.db, acc.id, addDays(today, -(days + HORIZON_DAYS["14d"] + 1)));
      const evals = await evaluateSessions(o.db, acc, sessions, rows, today);
      const stats: Record<string, number | string> = { sessions: evals.size, windows: evals.size * HORIZONS.length, mature: [...evals.values()].flat().filter(e => e.status === "mature").length };
      Object.assign(stats, await evaluateExperiments(o.db, acc, today, log));
      // semanal: lunes (cierre del domingo) en modo auto, o forzado
      const cdmx = toZoned(new Date(), CDMX); const isMonday = new Date(`${cdmx.date}T12:00:00Z`).getUTCDay() === 1;
      if (o.weekly === "force" || (o.weekly === "auto" && isMonday)) {
        const periodEnd = addDays(today, -1);
        const r = await saveWeekly(o.db, acc, periodEnd, { anthropicKey: o.anthropicKey, triggeredBy: o.triggeredBy ?? "manual", log });
        stats.weekly = periodEnd; stats.narrated = r.narrated ? 1 : 0;
      }
      // completar narrativas pendientes de reportes previos (p. ej. forzados desde la app sin llave)
      if (o.anthropicKey) {
        const { data: pending } = await o.db.from("analyses").select("id,period_end").eq("account_id", acc.id).eq("kind", "weekly").is("narrative", null).order("period_end", { ascending: false }).limit(3);
        for (const p of pending ?? []) { const r = await saveWeekly(o.db, acc, p.period_end, { anthropicKey: o.anthropicKey, triggeredBy: "backfill", log }); stats[`narrated_${p.period_end}`] = r.narrated ? 1 : 0; }
      } else if (o.weekly !== "off") stats.narrative = "sin ANTHROPIC_API_KEY";
      await o.db.from("agent_runs").update({ status: "ok", finished_at: new Date().toISOString(), stats: { ...stats, ms: Date.now() - t0 } }).eq("id", run!.id);
      log(`✔ analista ${acc.name}: ${JSON.stringify(stats)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await o.db.from("agent_runs").update({ status: "failed", finished_at: new Date().toISOString(), error: msg }).eq("id", run!.id);
      await o.db.from("alerts").insert({ account_id: acc.id, kind: "analyst_failed", severity: "warning", message: `Falló el analista: ${msg}` });
      log(`✖ analista ${acc.name}: ${msg}`);
    }
  }
}

const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const num = (v: unknown) => (v == null ? null : Number(v));
