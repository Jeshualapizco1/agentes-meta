import { db, fetchAll } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { shiftCalendarDay } from "@/lib/hoy-view";
import { buildRealHoySnapshot, type ReadResult, type RealBrake, type RealDecision, type RealInsight, type RealProfile, type RealProposal, type RealRun } from "@/lib/hoy-real";
import { HoyLive } from "@/components/hoy/HoyLive";
import { DataState } from "@/components/DataState";
import { toZoned } from "@agentes-meta/core";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hoy" };

type Failure = { message: string } | null;
const result = <T,>(data: T | null, error: Failure): ReadResult<T | null> => error ? { data: null, error: true } : { data, error: null };
async function safePaged<T>(build: () => { range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: Failure }> }): Promise<ReadResult<T[]>> {
  try { return { data: await fetchAll<T>(build), error: null }; } catch { return { data: null, error: true }; }
}
async function safe<T>(request: PromiseLike<{ data: T | null; error: Failure }>): Promise<ReadResult<T | null>> {
  try { const read = await request; return result(read.data, read.error); } catch { return { data: null, error: true }; }
}
const arrayResult = <T,>(read: ReadResult<T[] | null>): ReadResult<T[]> => read.error ? read : { data: read.data ?? [], error: null };

export default async function Hoy({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser("/hoy");
  const params = await searchParams;
  const sb = db();
  const accountRead = await sb.from("accounts").select("id,name,currency,timezone_name").eq("enabled", true).order("name");
  if (accountRead.error) return <DataState kind="error" title="No pudimos cargar las cuentas" description="La conexión respondió con error. No se muestran datos de otra cuenta como sustituto." />;
  const accounts = accountRead.data ?? [];
  if (!accounts.length) return <DataState kind="empty" title="No hay cuentas habilitadas" description="Revisa el estado de las cuentas antes de consultar Hoy." />;
  const account = params.account ? accounts.find(item => item.id === params.account) : accounts[0];
  if (!account) return <DataState kind="forbidden" title="La cuenta solicitada no está disponible" description="Elige una cuenta habilitada desde Hoy; no se seleccionó otra silenciosamente." action={<a className="ui-button ui-button-secondary" href={`/hoy?account=${accounts[0]!.id}`}>Ver una cuenta disponible</a>} />;

  const now = new Date();
  const reportingDate = toZoned(now, account.timezone_name).date;
  const from = shiftCalendarDay(reportingDate, -14);
  const to = shiftCalendarDay(reportingDate, -1);
  const activitySince = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const [insights, profile, proposals, decisions, alerts, activity, brake, collector, strategist] = await Promise.all([
    safePaged<RealInsight>(() => sb.from("insights_daily").select("date,spend,purchases,purchase_value,is_closed_day,fetched_at").eq("account_id", account.id).eq("level", "campaign").gte("date", from).lte("date", to).order("date")),
    safe<RealProfile>(sb.from("account_profiles").select("mode,dry_run").eq("account_id", account.id).maybeSingle()),
    safePaged<RealProposal>(() => sb.from("proposals").select("id,account_id,rule_name,action,entity_name,entity_level,entity_id,before_value,after_value,move_to_entity_id,move_to_before,evidence,locks,created_at,expires_at").eq("account_id", account.id).eq("status", "pendiente").order("created_at", { ascending: false })),
    safe<RealDecision[]>(sb.from("proposals").select("id,status,action,entity_name,before_value,after_value,decided_at,decision_reason,execution_note").eq("account_id", account.id).in("status", ["aprobada", "simulada", "ejecutada", "fallida", "rechazada"]).order("decided_at", { ascending: false }).limit(8)),
    safe<{ id: string; kind: string; severity: string; message: string; created_at: string }[]>(sb.from("alerts").select("id,kind,severity,message,created_at").is("acknowledged_at", null).or(`account_id.eq.${account.id},account_id.is.null`).order("created_at", { ascending: false }).limit(8)),
    safe<{ id: string; actor_name: string | null; summary: string; started_at: string }[]>(sb.from("change_sessions").select("id,actor_name,summary,started_at").eq("account_id", account.id).eq("actor_kind", "person").gte("started_at", activitySince).order("started_at", { ascending: false }).limit(6)),
    safe<RealBrake>(sb.from("emergency_brakes").select("active,engage_reason").eq("account_id", account.id).maybeSingle()),
    safe<RealRun>(sb.from("agent_runs").select("started_at,finished_at,status,stats").eq("agent", "collector").eq("account_id", account.id).order("started_at", { ascending: false }).limit(1).maybeSingle()),
    safe<RealRun>(sb.from("agent_runs").select("started_at,finished_at,status,stats").eq("agent", "strategist").eq("account_id", account.id).order("started_at", { ascending: false }).limit(1).maybeSingle()),
  ]);
  const snapshot = buildRealHoySnapshot({
    account, reportingDate, asOf: now.toISOString(), insights, profile,
    proposals, decisions: arrayResult(decisions), alerts: arrayResult(alerts), activity: arrayResult(activity), brake, collector, strategist,
  });
  return <HoyLive snapshot={snapshot} accounts={accounts.map(item => ({ id: item.id, name: item.name }))} />;
}
