import { presentResult } from "@/lib/results";
import { loadSessionResults } from "@/lib/session-results";
import { db, fetchAll } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { pageHref, sessionHref } from "@/lib/navigation";
import { fmtDay } from "@/lib/format";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { explorationBudget, type ExperimentStatus } from "@agentes-meta/core";
import { saveGuidedExperiment, cancelExperiment, decideExperiment } from "@/app/experimentos/actions";
import { ExperimentWizard } from "@/components/experimentos/ExperimentWizard";
import { DataState } from "@/components/DataState";
export const dynamic = "force-dynamic";
export const metadata = { title: "Pruebas" };

const mxn0 = (v: number | null | undefined) => (v == null ? "—" : "$" + Math.round(Number(v)).toLocaleString("es-MX"));
const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const shortCalendarDate = (date: string | null) => date ? new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)).replaceAll(".", "") : "Fecha pendiente";
const PROPOSAL: Record<string, { label: string; tone: "ok" | "crit" | "amber" | "neutral" }> = { graduar: { label: "Cumple el criterio", tone: "ok" }, descartar: { label: "No cumple el criterio", tone: "crit" }, revisar: { label: "Revisar referencias", tone: "amber" }, sin_evidencia: { label: "Faltan datos", tone: "amber" }, esperar: { label: "Recopilando resultados", tone: "neutral" } };
type Exp = { id: string; name: string; hypothesis: string; metric: string | null; threshold: number | null; min_purchases: number; window_days: number; budget: number | null; entity_ids: string[]; campaign_ids: string[]; start_date: string | null; status: ExperimentStatus; proposed_verdict: string | null; evaluation: { verdict?: string; value?: number | null; purchases?: number; closed_days?: number } | null; verdict_reason: string | null; decided_by: string | null; decided_at: string | null; created_by: string | null; created_at: string; session_id: string | null };

export default async function Experimentos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams; await requireUser("/experimentos"); const sb = db();
  const accountId = p.account ?? "1703313583465547";
  const [{ data: accounts, error: accountsError }, { data: prof, error: profileError }, { data: exps }, { data: camps }, { data: session }] = await Promise.all([
    sb.from("accounts").select("id,name,timezone_name").eq("enabled", true).order("name"),
    sb.from("account_profiles").select("daily_spend_ceiling,exploration_budget_pct").eq("account_id", accountId).maybeSingle(),
    fetchAll<Exp>(() => sb.from("experiments").select("*").eq("account_id", accountId).order("created_at", { ascending: false }).order("id")).then(data => ({ data })),
    fetchAll<{ id: string; name: string; effective_status: string }>(() => sb.from("entities").select("id,name,effective_status").eq("account_id", accountId).eq("level", "campaign").order("name").order("id")).then(data => ({ data })),
    p.session ? sb.from("change_sessions").select("id,summary,actor_name,started_at,campaign_ids").eq("id", p.session).eq("account_id", accountId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (accountsError || profileError) return <DataState kind="error" title="No pudimos cargar los límites de pruebas" description="Actualiza la página para intentarlo de nuevo." />;
  const { data: sessionNotes } = session ? await sb.from("annotations").select("hypothesis,success_criterion,reason").eq("session_id", p.session).order("created_at", { ascending: false }).limit(1) : { data: [] };
  const acc = (accounts ?? []).find(a => a.id === accountId);
  if (!acc) return <DataState kind="forbidden" title="Cuenta no disponible" action={<a className="ui-button ui-button-secondary" href="/hoy">Volver a Hoy</a>} />;
  const all = (exps ?? []) as Exp[];
  const windows = await loadSessionResults(sb, all.flatMap(x => x.session_id ? [x.session_id] : []));
  const active = all.filter(x => x.status === "activo"), evaluating = all.filter(x => x.status === "evaluando"), drafts = all.filter(x => x.status === "borrador"), history = all.filter(x => ["graduado", "descartado", "cancelado"].includes(x.status));
  const budget = explorationBudget({ ceiling: prof?.daily_spend_ceiling != null ? Number(prof.daily_spend_ceiling) : null, pct: prof?.exploration_budget_pct != null ? Number(prof.exploration_budget_pct) : null, activeBudgets: [...active, ...evaluating].map(x => Number(x.budget ?? 0)), newBudget: 0 });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: acc?.timezone_name ?? "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  // El analista excluye el día del cambio; la ventana se puede leer al día siguiente del último día medido.
  const endOf = (x: Exp) => (x.start_date ? addDays(x.start_date, x.window_days + 1) : null);
  const daysLeft = (x: Exp) => { const e = endOf(x); return e ? Math.round((new Date(`${e}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 86400_000) : null; };
  const nameOf = new Map((camps ?? []).map(c => [c.id as string, c.name as string]));
  const editing = drafts.find(x => x.id === p.editar);
  const preIds = new Set<string>(editing?.campaign_ids ?? (session?.campaign_ids as string[] | undefined) ?? []);
  if (p.campaign && nameOf.has(p.campaign)) preIds.add(p.campaign);
  const note = sessionNotes?.[0];
  const sourceAd = p.ad ? await sb.from("entities").select("name").eq("id", p.ad).eq("account_id", accountId).eq("campaign_id", p.campaign ?? "").eq("level", "ad").maybeSingle() : null;
  const activeCamps = (camps ?? []).filter(c => c.effective_status === "ACTIVE" || preIds.has(c.id as string));

  const ExpCard = ({ x, children }: { x: Exp; children?: React.ReactNode }) => {
    const wins = x.session_id ? windows.get(x.session_id) : undefined;
    const result = wins?.length ? presentResult(wins) : null;
    const left = daysLeft(x); const pr = PROPOSAL[x.proposed_verdict ?? "esperar"] ?? PROPOSAL.esperar!;
    return (
      <li id={`prueba-${x.id}`} className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={x.status === "activo" ? "ok" : x.status === "evaluando" ? "amber" : x.status === "graduado" ? "ok" : x.status === "descartado" ? "crit" : "neutral"}>{({ activo: "En seguimiento", evaluando: "Por decidir", graduado: "Conservar", descartado: "No repetir", cancelado: "Cancelada", borrador: "Borrador" })[x.status]}</Chip>
          <b>{x.name}</b>
          {result && <Chip tone={result.tone}>{result.label}</Chip>}
          {x.status === "activo" && left != null && left <= 3 && <Chip tone="amber">{left <= 0 ? "Esperando resultados" : `Faltan ${left} día(s)`}</Chip>}
          {(x.status === "activo" || x.status === "evaluando") && <Chip tone={pr.tone}>{pr.label}</Chip>}
          <span className="ml-auto font-mono text-[11px] text-muted">{shortCalendarDate(x.start_date)} – {shortCalendarDate(endOf(x))} · {x.window_days} d · {mxn0(x.budget)}/día</span>
        </div>
        {result && <p className="text-xs text-muted">{result.detail}</p>}
        <p className="text-sm">{x.hypothesis || "Sin cambio descrito"}</p>
        <div className="my-2 grid grid-cols-3 gap-3 rounded-xl border bg-paper p-3 text-sm"><div><p className="text-xs text-muted">Resultado {x.metric?.toUpperCase()}</p><p className="font-semibold">{x.evaluation?.value == null ? "Pendiente" : Number(x.evaluation.value).toFixed(2)}</p></div><div><p className="text-xs text-muted">Meta</p><p className="font-semibold">{x.metric === "cpa" ? "≤" : "≥"} {x.threshold ?? "—"}</p></div><div><p className="text-xs text-muted">Compras / mínimo</p><p>{x.evaluation?.purchases ?? "—"} / {x.min_purchases}</p></div></div>
        <p className="font-mono text-[11px] text-muted">{(x.campaign_ids ?? []).map(id => nameOf.get(id) ?? id).join(" · ") || "Sin campaña vinculada"}{x.session_id && <> · <a href={sessionHref(x.session_id, accountId, pageHref("/experimentos", p))} className="text-meta">sesión de origen →</a></>}</p>
        {x.evaluation?.verdict && <details open={["graduado", "descartado", "cancelado"].includes(x.status)} className="text-sm"><summary className="cursor-pointer text-muted">Ver evidencia y comparación</summary><p className="mt-2 rounded-xl bg-paper p-3">{x.evaluation.verdict}</p></details>}
        {x.verdict_reason && <p className="text-[13px]"><span className="text-muted">Veredicto de {x.decided_by?.split("@")[0]} ({x.decided_at ? fmtDay(x.decided_at).split(",")[0] : ""}):</span> {x.verdict_reason}</p>}
        {children}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div><p className="font-mono text-[11px] uppercase tracking-wider text-muted">PRUEBAS Y APRENDIZAJES</p><h1 className="text-3xl font-bold tracking-tight">Prueba, mide, decide.</h1></div>
        <form key={JSON.stringify(p)} className="ml-auto flex gap-2" method="get"><label className="flex min-w-0 flex-col gap-1 text-xs text-muted">Cuenta<select aria-label="Cuenta" name="account" defaultValue={accountId} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm">{(accounts ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><button className="btn-accent px-3 py-1 text-sm">Ver</button></form>
      </div>
      {p.error && <p className="rounded-xl bg-crit-soft px-3 py-2 text-sm text-crit">{p.error}</p>}
      {p.saved && <p className="rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">{p.saved === "activado" ? "Prueba iniciada. Se medirá con los días completos posteriores al cambio." : p.saved === "borrador" ? "Borrador guardado." : "Cambio guardado."}</p>}


      <div className="grid gap-3 sm:grid-cols-3">
        <Card title={String(active.length)} eyebrow="Pruebas en seguimiento">{null}</Card>
        <Card title={String(evaluating.length)} eyebrow="Resultados por decidir">{null}</Card>
        <Card title={budget.remaining === null ? "Sin límite definido" : `${mxn0(Math.max(0, budget.remaining))} / día`} eyebrow="Disponible para pruebas"><a className="text-xs text-muted underline" href={`/configuracion?account=${accountId}`}>Ajustar límite</a></Card>
      </div>
      <details key={`${accountId}:${p.campaign ?? ""}:${p.ad ?? ""}:${p.session ?? ""}:${p.nuevo ?? ""}`} id="nueva-prueba" open={p.nuevo === "1" || !!session || !!p.campaign || !!editing || !all.length} className="rounded-2xl border bg-surface p-5">
        <summary className="cursor-pointer text-lg font-semibold">+ Nueva prueba</summary>
        <div className="mx-auto mt-6 max-w-3xl">
          {sourceAd?.data && <p className="mb-4 rounded-xl border p-3 text-sm">Anuncio de origen: <b>{sourceAd.data.name}</b>. La medición será a nivel de campaña.</p>}
          <ExperimentWizard key={editing?.id ?? "nuevo"} draft={editing} account={accountId} today={today} campaigns={activeCamps.map(c => ({ id: c.id, name: c.name }))} selected={[...preIds]} hypothesis={editing?.hypothesis ?? note?.hypothesis ?? (sourceAd?.data ? `Probar un cambio en el anuncio «${sourceAd.data.name}»: ` : "")} session={editing?.session_id ?? session?.id ?? ""} remaining={budget.remaining} action={saveGuidedExperiment} />
        </div>
      </details>
      {evaluating.length > 0 && <Card eyebrow="SIGUIENTE DECISIÓN" title={`Revisa estos resultados (${evaluating.length})`}>
        {evaluating.length ? <ul className="flex flex-col">{evaluating.map(x => <ExpCard key={x.id} x={x}>
          <form action={decideExperiment} className="flex flex-wrap gap-2"><input type="hidden" name="id" value={x.id} /><input name="reason" required placeholder="Razón del veredicto (obligatoria)" className="min-w-64 flex-1 rounded-lg border border-line bg-paper px-2 py-1 text-sm" /><button name="decision" value="graduado" className="rounded-xl bg-ok-soft px-3 py-1 text-sm text-ok">Conservar aprendizaje</button><button name="decision" value="descartado" className="rounded-xl bg-crit-soft px-3 py-1 text-sm text-crit">No repetir</button></form>
        </ExpCard>)}</ul> : <p className="text-sm text-muted">Cuando una prueba cierra su ventana, aparece aquí con un veredicto propuesto para que lo confirmes.</p>}
      </Card>}
      <Card eyebrow="Corriendo" title={`En seguimiento (${active.length})`}>
        {active.length ? <ul className="flex flex-col">{active.map(x => <ExpCard key={x.id} x={x}><details className="text-sm"><summary className="cursor-pointer text-muted">Detener seguimiento</summary><form action={cancelExperiment} className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="id" value={x.id} /><input name="reason" placeholder="Razón para cancelar" className="rounded-lg border border-line bg-paper px-2 py-1 text-sm" /><button className="rounded-xl border border-line px-3 py-1 text-sm">Cancelar</button></form></details></ExpCard>)}</ul> : <p className="text-sm text-muted">No hay pruebas en marcha. Prepara una arriba para empezar a medir.</p>}
      </Card>
      {drafts.length > 0 && <Card eyebrow="Sin activar" title={`Borradores (${drafts.length})`}><ul className="flex flex-col">{drafts.map(x => <ExpCard key={x.id} x={x}><div className="flex flex-wrap gap-2"><a className="ui-button ui-button-secondary" href={`/experimentos?${new URLSearchParams({ account: accountId, editar: x.id })}#nueva-prueba`}>Completar e iniciar</a><form action={cancelExperiment}><input type="hidden" name="id" value={x.id} /><button className="rounded-xl border border-line px-3 py-1 text-sm">Descartar borrador</button></form></div></ExpCard>)}</ul></Card>}
      <details open={history.length > 0} className="rounded-2xl border bg-surface p-5"><summary className="cursor-pointer font-semibold">Aprendizajes anteriores ({history.length})</summary><div className="mt-4">
        {history.length ? <ul className="flex flex-col">{history.map(x => <ExpCard key={x.id} x={x} />)}</ul> : <p className="text-sm text-muted">Tus decisiones aparecerán aquí al cerrar una prueba.</p>}
      </div></details>
    </div>
  );
}
