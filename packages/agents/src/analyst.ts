/**
 * Agente 2 · Analista semanal.
 *  1. Ventanas de evaluación (72h/7d/14d) por cada sesión mayor de una persona en los últimos N días: campañas tocadas
 *     vs. resto de la cuenta, antes vs. después, solo días completos. Se recalculan en cada corrida (las pendientes maduran).
 *  2. Reporte semanal: paquete de evidencia determinista (core) + narrativa con Claude si hay ANTHROPIC_API_KEY.
 *     Se genera los lunes (cierre del domingo) o a petición; nunca se duplica para el mismo periodo.
 */
import { evaluateChange, buildWeeklyEvidence, toZoned, CDMX, HORIZON_DAYS, type DailyRow, type Horizon, type Evaluation, type WeeklySession, type WeeklyEvidence } from "@agentes-meta/core";
import { upsertChunks, type Db } from "@agentes-meta/db";
import { writeWeeklyNarrative } from "./narrative.js";

const HORIZONS: Horizon[] = ["72h", "7d", "14d"];
export interface AnalystOptions { db: Db; accountIds?: string[]; days?: number; weekly?: "auto" | "force" | "off"; anthropicKey?: string; triggeredBy?: string; log?: (m: string) => void }
type Acc = { id: string; name: string; timezone_name: string };
type SessionRow = { id: string; started_at: string; actor_name: string; summary: string; resets_learning: boolean; kind: string; campaign_ids: string[] };

/** Filas diarias por campaña (solo días completos) desde `since`. */
async function loadRows(db: Db, accountId: string, since: string): Promise<DailyRow[]> {
  const out: DailyRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("insights_daily").select("entity_id,date,spend,purchases,purchase_value").eq("account_id", accountId).eq("level", "campaign").eq("is_closed_day", true).gte("date", since).order("date").range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) out.push({ entity_id: r.entity_id, date: r.date, spend: Number(r.spend ?? 0), purchases: Number(r.purchases ?? 0), value: Number(r.purchase_value ?? 0) });
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Calcula y guarda las ventanas de una lista de sesiones. Devuelve las evaluaciones por sesión. */
export async function evaluateSessions(db: Db, acc: Acc, sessions: SessionRow[], rows: DailyRow[], today: string): Promise<Map<string, Evaluation[]>> {
  const out = new Map<string, Evaluation[]>(); const upserts: Record<string, unknown>[] = [];
  for (const s of sessions) {
    const changeDate = toZoned(new Date(s.started_at), acc.timezone_name).date;
    const evs = HORIZONS.map(h => evaluateChange({ changeDate, campaignIds: s.campaign_ids ?? [], rows, horizon: h, today }));
    out.set(s.id, evs);
    for (const e of evs) upserts.push({ session_id: s.id, account_id: acc.id, horizon: e.horizon, starts_at: `${e.starts_at}T00:00:00Z`, ends_at: `${e.ends_at}T23:59:59Z`, status: e.status, metrics_before: e.treatment.before, metrics_after: e.treatment.after, control: e.control, delta: e.delta, confidence: e.confidence, verdict: e.verdict, computed_at: new Date().toISOString() });
  }
  if (upserts.length) await upsertChunks(db, "evaluation_windows", upserts, "session_id,horizon");
  return out;
}

/** Paquete de evidencia semanal de una cuenta con periodo que termina en `periodEnd` (fecha en zona de la cuenta). */
export async function buildWeekly(db: Db, acc: Acc, periodEnd: string): Promise<WeeklyEvidence> {
  const since = addDays(periodEnd, -HORIZON_DAYS["14d"] - 14);
  const [rows, { data: sessions }, { data: camps }, { data: prof }] = await Promise.all([
    loadRows(db, acc.id, since),
    db.from("change_sessions").select("id,started_at,actor_name,summary,resets_learning,kind,campaign_ids").eq("account_id", acc.id).eq("significance", "major").eq("actor_kind", "person").gte("started_at", `${addDays(periodEnd, -6)}T00:00:00-06:00`).lte("started_at", `${periodEnd}T23:59:59-06:00`).order("started_at"),
    db.from("entities").select("id,name").eq("account_id", acc.id).eq("level", "campaign"),
    db.from("account_profiles").select("target_roas,breakeven_roas,target_cpa,daily_spend_ceiling").eq("account_id", acc.id).maybeSingle(),
  ]);
  const evals = await evaluateSessions(db, acc, (sessions ?? []) as SessionRow[], rows, addDays(periodEnd, 1));
  const weeklySessions: WeeklySession[] = ((sessions ?? []) as SessionRow[]).map(s => ({ id: s.id, started_at: s.started_at, actor_name: s.actor_name, summary: s.summary, resets_learning: s.resets_learning, kind: s.kind, evaluations: (evals.get(s.id) ?? []).map(e => ({ horizon: e.horizon, status: e.status, confidence: e.confidence, verdict: e.verdict, delta: e.delta })) }));
  return buildWeeklyEvidence({ periodEnd, rows, campaignNames: new Map((camps ?? []).map(c => [c.id as string, c.name as string])), sessions: weeklySessions, targets: { target_roas: num(prof?.target_roas), breakeven_roas: num(prof?.breakeven_roas), target_cpa: num(prof?.target_cpa), daily_spend_ceiling: num(prof?.daily_spend_ceiling) } });
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
      const { data: sessions } = await o.db.from("change_sessions").select("id,started_at,actor_name,summary,resets_learning,kind,campaign_ids").eq("account_id", acc.id).eq("significance", "major").eq("actor_kind", "person").gte("started_at", new Date(Date.now() - days * 86400_000).toISOString()).order("started_at");
      const rows = await loadRows(o.db, acc.id, addDays(today, -(days + HORIZON_DAYS["14d"] + 1)));
      const evals = await evaluateSessions(o.db, acc, (sessions ?? []) as SessionRow[], rows, today);
      const stats: Record<string, number | string> = { sessions: evals.size, windows: evals.size * HORIZONS.length, mature: [...evals.values()].flat().filter(e => e.status === "mature").length };
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
