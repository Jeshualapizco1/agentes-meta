import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { presentAlert, type AlertRow } from "@/lib/alerts";
import { momentLabel } from "@/lib/hoy-view";
import { Chip } from "@/components/Chip";
import { Card } from "@/components/Card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Estado de los datos" };

type Run = { id: string; account_id: string | null; agent: string; triggered_by: string; status: string; started_at: string; finished_at: string | null; error: string | null; stats: Record<string, unknown> | null };
const processLabel: Record<string, string> = { collector: "Sincronización con Meta", analyst: "Evaluación de resultados", strategist: "Revisión del agente" };
const triggerLabel: Record<string, string> = { schedule: "Programada", manual: "Manual", backfill: "Carga inicial", collector: "Automática" };
const statusLabel: Record<string, string> = { ok: "Completa", failed: "Falló", running: "En curso" };
const tone = (status: string): "ok" | "crit" | "amber" => status === "ok" ? "ok" : status === "failed" ? "crit" : "amber";
const last = (runs: Run[], accountId: string, agent: string, status?: string) => runs.find(run => run.account_id === accountId && run.agent === agent && (!status || run.status === status));
const when = (run: Run | undefined) => run ? momentLabel(run.finished_at ?? run.started_at) : "Todavía no hay";
const runDetail = (run: Run) => {
  if (run.error) return run.error;
  const stats = run.stats ?? {};
  const parts = [["Leídos", stats.fetched], ["Nuevos", stats.inserted], ["Cambios", stats.sessions], ["Propuestas", stats.proposals]]
    .filter((entry): entry is [string, string | number] => typeof entry[1] === "string" || typeof entry[1] === "number");
  return parts.map(([label, value]) => `${label}: ${value}`).join(" · ") || "Sin detalle registrado";
};

export default async function Estado() {
  const member = await requireUser("/estado");
  const sb = db();
  const { data: accounts } = await sb.from("accounts").select("id,name,account_status,enabled").eq("enabled", true).order("name");
  const [{ data: runs }, { data: alertRows }] = await Promise.all([
    sb.from("agent_runs").select("id,account_id,agent,triggered_by,status,started_at,finished_at,error,stats").order("started_at", { ascending: false }).limit(300),
    sb.from("alerts").select("id,kind,severity,message,created_at,payload,account_id").is("acknowledged_at", null).order("created_at", { ascending: false }).limit(30),
  ]);
  const allRuns = (runs ?? []) as Run[];
  const alerts = ((alertRows ?? []) as AlertRow[]).map(row => ({ ...presentAlert(row, { accountId: row.account_id ?? undefined }), accountId: row.account_id }));
  const accName = new Map((accounts ?? []).map(account => [account.id, account.name]));

  return <div className="flex flex-col gap-6">
    <h1 className="text-3xl font-bold tracking-tight">Estado de los datos</h1>
    <section className="grid gap-4 lg:grid-cols-2">
      {(accounts ?? []).map(account => {
        const sync = last(allRuns, account.id, "collector");
        const updated = last(allRuns, account.id, "collector", "ok");
        const evaluation = last(allRuns, account.id, "analyst");
        const review = last(allRuns, account.id, "strategist");
        return <Card key={account.id}>
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">{account.name}</h2><Chip tone={account.account_status === 1 ? "ok" : "crit"}>{account.account_status === 1 ? "Activa" : "Inactiva en Meta"}</Chip></div>
          <p className="mt-3 text-sm font-semibold">Datos actualizados hasta {updated ? momentLabel(updated.finished_at ?? updated.started_at) : "una fecha todavía no disponible"}</p>
          <dl className="mt-3 grid gap-2 text-sm">
            <div><dt className="text-muted">Última sincronización</dt><dd>{sync ? <><Chip tone={tone(sync.status)}>{statusLabel[sync.status] ?? "Sin verificar"}</Chip> · {when(sync)}</> : "Todavía no hay"}</dd></div>
            <div><dt className="text-muted">Última evaluación de resultados</dt><dd>{when(evaluation)}</dd></div>
            <div><dt className="text-muted">Última revisión del agente</dt><dd>{when(review)}</dd></div>
          </dl>
        </Card>;
      })}
    </section>
    <p className="text-xs text-muted">Todas las horas se muestran en hora de la Ciudad de México.</p>

    <Card>
      <h2 className="mb-3 font-semibold">Avisos abiertos</h2>
      {alerts.length ? <ul className="flex flex-col divide-y divide-line">{alerts.map(alert => <li key={alert.id} className="py-3 text-sm">
        <div className="flex flex-wrap items-start gap-2"><Chip tone={alert.severity === "critical" ? "crit" : alert.severity === "warning" ? "amber" : "neutral"}>{alert.severity === "critical" ? "Crítico" : alert.severity === "warning" ? "Aviso" : "Información"}</Chip><div className="min-w-0 flex-1"><p className="font-semibold">{alert.title}</p><p className="mt-1 text-muted">{alert.description}</p>{alert.action && <a className="mt-2 inline-block text-meta underline" href={alert.action.href}>{alert.action.label}</a>}</div><span className="text-xs text-muted">{accName.get(alert.accountId ?? "") ?? "Todas las cuentas"} · {momentLabel(alert.at)}</span></div>
      </li>)}</ul> : <p className="text-sm text-muted">Ninguno.</p>}
    </Card>

    {member.appRole === "admin" && <details className="card p-5">
      <summary className="cursor-pointer font-semibold">Detalle técnico (administradores)</summary>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs uppercase text-muted"><th>Inicio</th><th>Proceso</th><th>Cuenta</th><th>Disparo</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>
        {allRuns.slice(0, 30).map(run => <tr key={run.id} className="border-t border-line align-top"><td className="py-2">{momentLabel(run.started_at)}</td><td>{processLabel[run.agent] ?? run.agent}</td><td>{accName.get(run.account_id ?? "") ?? "—"}</td><td>{triggerLabel[run.triggered_by] ?? run.triggered_by}</td><td><Chip tone={tone(run.status)}>{statusLabel[run.status] ?? run.status}</Chip></td><td className="max-w-lg break-words text-xs text-muted">{runDetail(run)}</td></tr>)}
      </tbody></table></div>
      {alerts.some(alert => alert.technical) && <div className="mt-5"><h3 className="font-semibold">Avisos</h3><ul className="mt-2 space-y-2 text-xs text-muted">{alerts.filter(alert => alert.technical).map(alert => <li key={alert.id}><b>{alert.title}:</b> {alert.technical}</li>)}</ul></div>}
    </details>}
  </div>;
}
