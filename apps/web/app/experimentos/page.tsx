import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDay, fmtTime } from "@/lib/format";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { explorationBudget, EXPERIMENT_STATUS_LABEL, type ExperimentStatus } from "@agentes-meta/core";
import { saveExperiment, activateExperiment, cancelExperiment, decideExperiment } from "./actions";
export const dynamic = "force-dynamic";

const mxn0 = (v: number | null | undefined) => (v == null ? "—" : "$" + Math.round(Number(v)).toLocaleString("es-MX"));
const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const PROPOSAL: Record<string, { label: string; tone: "ok" | "crit" | "amber" | "neutral" }> = { graduar: { label: "propone graduar", tone: "ok" }, descartar: { label: "propone descartar", tone: "crit" }, revisar: { label: "revisar: lecturas contradictorias", tone: "amber" }, sin_evidencia: { label: "sin evidencia suficiente", tone: "amber" }, esperar: { label: "esperando ventana", tone: "neutral" } };
type Exp = { id: string; name: string; hypothesis: string; metric: string | null; threshold: number | null; min_purchases: number; window_days: number; budget: number | null; entity_ids: string[]; campaign_ids: string[]; start_date: string | null; status: ExperimentStatus; proposed_verdict: string | null; evaluation: { verdict?: string; value?: number | null; purchases?: number; closed_days?: number } | null; verdict_reason: string | null; decided_by: string | null; decided_at: string | null; created_by: string | null; created_at: string; session_id: string | null };

export default async function Experimentos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams; await requireUser("/experimentos"); const sb = db();
  const accountId = p.account ?? "1703313583465547";
  const [{ data: accounts }, { data: prof }, { data: exps }, { data: camps }, { data: session }] = await Promise.all([
    sb.from("accounts").select("id,name,timezone_name").eq("enabled", true).order("name"),
    sb.from("account_profiles").select("daily_spend_ceiling,exploration_budget_pct").eq("account_id", accountId).maybeSingle(),
    sb.from("experiments").select("*").eq("account_id", accountId).order("created_at", { ascending: false }),
    sb.from("entities").select("id,name,effective_status,daily_budget").eq("account_id", accountId).eq("level", "campaign").order("name"),
    p.session ? sb.from("change_sessions").select("id,summary,actor_name,started_at,campaign_ids").eq("id", p.session).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const { data: sessionNotes } = p.session ? await sb.from("annotations").select("hypothesis,success_criterion,reason").eq("session_id", p.session).order("created_at", { ascending: false }).limit(1) : { data: [] };
  const acc = (accounts ?? []).find(a => a.id === accountId);
  const all = (exps ?? []) as Exp[];
  const active = all.filter(x => x.status === "activo"), evaluating = all.filter(x => x.status === "evaluando"), drafts = all.filter(x => x.status === "borrador"), history = all.filter(x => ["graduado", "descartado", "cancelado"].includes(x.status));
  const budget = explorationBudget({ ceiling: prof?.daily_spend_ceiling != null ? Number(prof.daily_spend_ceiling) : null, pct: prof?.exploration_budget_pct != null ? Number(prof.exploration_budget_pct) : null, activeBudgets: [...active, ...evaluating].map(x => Number(x.budget ?? 0)), newBudget: 0 });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: acc?.timezone_name ?? "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const endOf = (x: Exp) => (x.start_date ? addDays(x.start_date, x.window_days) : null);
  const daysLeft = (x: Exp) => { const e = endOf(x); return e ? Math.round((new Date(`${e}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 86400_000) : null; };
  const nameOf = new Map((camps ?? []).map(c => [c.id as string, c.name as string]));
  const preIds = new Set<string>((session?.campaign_ids as string[] | undefined) ?? []);
  const note = sessionNotes?.[0];
  const activeCamps = (camps ?? []).filter(c => c.effective_status === "ACTIVE" || preIds.has(c.id as string));

  const ExpCard = ({ x, children }: { x: Exp; children?: React.ReactNode }) => {
    const left = daysLeft(x); const pr = PROPOSAL[x.proposed_verdict ?? "esperar"] ?? PROPOSAL.esperar!;
    return (
      <li className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={x.status === "activo" ? "ok" : x.status === "evaluando" ? "amber" : x.status === "graduado" ? "ok" : x.status === "descartado" ? "crit" : "neutral"}>{EXPERIMENT_STATUS_LABEL[x.status]}</Chip>
          <b>{x.name}</b>
          {x.status === "activo" && left != null && left <= 3 && <Chip tone="amber">{left <= 0 ? "ventana cerrada, evaluando en la próxima corrida" : `vence en ${left} día(s)`}</Chip>}
          {(x.status === "activo" || x.status === "evaluando") && <Chip tone={pr.tone}>{pr.label}</Chip>}
          <span className="ml-auto font-mono text-[11px] text-muted">{x.start_date ?? "sin inicio"} → {endOf(x) ?? "—"} · {x.window_days} d · {mxn0(x.budget)}/día</span>
        </div>
        <p className="text-sm"><span className="text-muted">Hipótesis:</span> {x.hypothesis || "—"} · <span className="text-muted">Criterio:</span> {x.metric ? `${x.metric.toUpperCase()} ${x.metric === "roas" ? "≥" : "≤"} ${x.threshold} con ≥ ${x.min_purchases} compras` : "sin criterio"}</p>
        <p className="font-mono text-[11px] text-muted">{(x.campaign_ids ?? []).map(id => nameOf.get(id) ?? id).join(" · ") || "sin campañas"}{x.session_id && <> · <a href={`/sesion/${x.session_id}`} className="text-meta">sesión de origen →</a></>}</p>
        {x.evaluation?.verdict && <p className="rounded-xl bg-paper px-3 py-2 text-[13px] leading-snug">{x.evaluation.verdict}</p>}
        {x.verdict_reason && <p className="text-[13px]"><span className="text-muted">Veredicto de {x.decided_by?.split("@")[0]} ({x.decided_at ? fmtDay(x.decided_at).split(",")[0] : ""}):</span> {x.verdict_reason}</p>}
        {children}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div><p className="font-mono text-[11px] uppercase tracking-wider text-muted">Experimentos · hipótesis y criterio antes, veredicto después</p><h1 className="text-3xl font-bold tracking-tight">{acc?.name ?? accountId}: <span className="text-gradient">presupuesto de exploración</span></h1></div>
        <form className="ml-auto flex gap-2" method="get"><select name="account" defaultValue={accountId} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm">{(accounts ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select><button className="btn-accent px-3 py-1 text-sm">Ver</button></form>
      </div>
      {p.error && <p className="rounded-xl bg-crit-soft px-3 py-2 text-sm text-crit">{p.error}</p>}
      {p.saved && <p className="rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">Guardado: {p.saved}.</p>}

      <div className="grid gap-4 lg:grid-cols-12">
        <Card span={4} eyebrow="Presupuesto de exploración" title={budget.limit != null ? `${mxn0(budget.limit)} / día` : "sin configurar"}>
          <p className="text-sm text-muted">{prof?.exploration_budget_pct ?? 10}% del techo de {mxn0(prof?.daily_spend_ceiling)}. Comprometido por {active.length + evaluating.length} experimento(s): <b className="text-ink">{mxn0(budget.committed)}</b>{budget.remaining != null && <> · quedan <b className="text-ink">{mxn0(Math.max(0, budget.remaining))}</b></>}. <a href={`/configuracion?account=${accountId}`} className="text-meta">cambiar →</a></p>
        </Card>
        <Card span={8} eyebrow={session ? `Desde la sesión de ${session.actor_name} · ${fmtDay(session.started_at).split(",")[0]} ${fmtTime(session.started_at)}` : "Nuevo experimento"} title={session ? session.summary : "Declara la hipótesis, el criterio de éxito y el presupuesto antes de tocar nada"}>
          <form action={saveExperiment} className="grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="account_id" value={accountId} /><input type="hidden" name="session_id" value={session?.id ?? ""} />
            <input name="name" placeholder="Nombre corto (opcional)" className="rounded-lg border border-line bg-paper px-2 py-1 text-sm" />
            <input name="start_date" type="date" defaultValue={session?.started_at ? new Intl.DateTimeFormat("en-CA", { timeZone: acc?.timezone_name ?? "America/Mexico_City" }).format(new Date(session.started_at)) : today} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm" />
            <input name="hypothesis" required defaultValue={note?.hypothesis ?? ""} placeholder="Hipótesis: qué esperas que pase y por qué" className="rounded-lg border border-line bg-paper px-2 py-1 text-sm sm:col-span-2" />
            <div className="flex gap-2"><select name="metric" defaultValue="roas" className="rounded-lg border border-line bg-paper px-2 py-1 text-sm"><option value="roas">ROAS ≥</option><option value="cpa">CPA ≤</option></select><input name="threshold" placeholder="umbral" className="w-full rounded-lg border border-line bg-paper px-2 py-1 text-sm" /></div>
            <div className="flex gap-2"><input name="min_purchases" defaultValue={10} placeholder="compras mín." title="Compras mínimas en la ventana" className="w-full rounded-lg border border-line bg-paper px-2 py-1 text-sm" /><input name="window_days" defaultValue={7} placeholder="días cerrados" title="Ventana de evaluación en días cerrados" className="w-full rounded-lg border border-line bg-paper px-2 py-1 text-sm" /><input name="budget" placeholder="$ / día" title="Presupuesto asignado por día" className="w-full rounded-lg border border-line bg-paper px-2 py-1 text-sm" /></div>
            <div className="sm:col-span-2"><p className="mb-1 font-mono text-[11px] uppercase text-muted">Campañas vinculadas {session ? "(precargadas de la sesión)" : ""}</p><div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2">{activeCamps.map(c => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="entity" value={c.id} defaultChecked={preIds.has(c.id as string)} /><span className="truncate">{c.name}</span></label>)}</div></div>
            <div className="flex gap-2 sm:col-span-2"><button name="intent" value="activar" className="btn-accent px-3 py-1.5 text-sm font-semibold text-white">Activar</button><button name="intent" value="borrador" className="rounded-xl border border-line px-3 py-1.5 text-sm">Guardar borrador</button><span className="self-center text-[12px] text-muted">Activar exige hipótesis, criterio y presupuesto, y cabida en el presupuesto de exploración.</span></div>
          </form>
        </Card>
      </div>

      <Card eyebrow="Por confirmar" title={`En evaluación (${evaluating.length})`}>
        {evaluating.length ? <ul className="flex flex-col">{evaluating.map(x => <ExpCard key={x.id} x={x}>
          <form action={decideExperiment} className="flex flex-wrap gap-2"><input type="hidden" name="id" value={x.id} /><input name="reason" required placeholder="Razón del veredicto (obligatoria)" className="min-w-64 flex-1 rounded-lg border border-line bg-paper px-2 py-1 text-sm" /><button name="decision" value="graduado" className="rounded-xl bg-ok-soft px-3 py-1 text-sm text-ok">Graduar</button><button name="decision" value="descartado" className="rounded-xl bg-crit-soft px-3 py-1 text-sm text-crit">Descartar</button></form>
        </ExpCard>)}</ul> : <p className="text-sm text-muted">Ninguno cerró su ventana todavía. El analista los evalúa en cada corrida (cada 6 h) contra su propio criterio y propone veredicto; aquí se confirma.</p>}
      </Card>
      <Card eyebrow="Corriendo" title={`Activos (${active.length})`}>
        {active.length ? <ul className="flex flex-col">{active.map(x => <ExpCard key={x.id} x={x}><form action={cancelExperiment} className="flex gap-2"><input type="hidden" name="id" value={x.id} /><input name="reason" placeholder="Razón para cancelar" className="rounded-lg border border-line bg-paper px-2 py-1 text-sm" /><button className="rounded-xl border border-line px-3 py-1 text-sm">Cancelar</button></form></ExpCard>)}</ul> : <p className="text-sm text-muted">Sin experimentos activos.</p>}
      </Card>
      {drafts.length > 0 && <Card eyebrow="Sin activar" title={`Borradores (${drafts.length})`}><ul className="flex flex-col">{drafts.map(x => <ExpCard key={x.id} x={x}><div className="flex gap-2"><form action={activateExperiment}><input type="hidden" name="id" value={x.id} /><button className="btn-accent px-3 py-1 text-sm text-white">Activar</button></form><form action={cancelExperiment}><input type="hidden" name="id" value={x.id} /><button className="rounded-xl border border-line px-3 py-1 text-sm">Descartar borrador</button></form></div></ExpCard>)}</ul></Card>}
      <Card eyebrow="Historial" title={`Con veredicto (${history.length})`}>
        {history.length ? <ul className="flex flex-col">{history.map(x => <ExpCard key={x.id} x={x} />)}</ul> : <p className="text-sm text-muted">Todavía no hay experimentos cerrados.</p>}
      </Card>
    </div>
  );
}
