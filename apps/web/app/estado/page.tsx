import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDay, fmtTime } from "@/lib/format";
import { Chip } from "@/components/Chip";
export const dynamic = "force-dynamic";
export default async function Estado() {
  await requireUser("/estado"); const sb = db();
  const [{ data: runs }, { data: alerts }, { data: accounts }] = await Promise.all([
    sb.from("agent_runs").select("*").order("started_at", { ascending: false }).limit(30),
    sb.from("alerts").select("*").is("acknowledged_at", null).order("created_at", { ascending: false }).limit(30),
    sb.from("accounts").select("id,name,timezone_name,account_status,enabled").order("name"),
  ]);
  const accName = new Map((accounts ?? []).map(a => [a.id, a.name]));
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl font-medium">Estado del sistema</h1>
      <section className="rounded-md border border-line bg-surface p-4">
        <h2 className="mb-2 font-semibold">Cuentas</h2>
        <table className="w-full text-sm"><thead><tr className="text-left font-mono text-[11px] uppercase text-muted"><th>Cuenta</th><th>Zona horaria</th><th>Estado</th><th>Última corrida</th></tr></thead><tbody>
          {(accounts ?? []).map(a => { const r = (runs ?? []).find(x => x.account_id === a.id); return <tr key={a.id} className="border-t border-line"><td className="py-2">{a.name}</td><td className="font-mono text-[12px]">{a.timezone_name}{a.timezone_name !== "America/Mexico_City" && <Chip tone="amber" title="Se convierte a CDMX en todas las vistas"> ≠ CDMX</Chip>}</td><td>{a.account_status === 1 ? <Chip tone="ok">activa</Chip> : <Chip tone="crit">status {a.account_status}</Chip>}</td><td className="font-mono text-[12px]">{r ? `${fmtDay(r.started_at)} ${fmtTime(r.started_at)} · ${r.status}` : "nunca"}</td></tr>; })}
        </tbody></table>
      </section>
      <section className="rounded-md border border-line bg-surface p-4">
        <h2 className="mb-2 font-semibold">Alertas sin atender</h2>
        {alerts?.length ? <ul className="flex flex-col gap-2">{alerts.map(a => <li key={a.id} className="flex items-start gap-2 text-sm"><Chip tone={a.severity === "critical" ? "crit" : "amber"}>{a.kind}</Chip><span>{a.message}</span><span className="ml-auto font-mono text-[11px] text-muted">{accName.get(a.account_id) ?? ""} · {fmtTime(a.created_at)}</span></li>)}</ul> : <p className="text-sm text-muted">Ninguna.</p>}
      </section>
      <section className="rounded-md border border-line bg-surface p-4">
        <h2 className="mb-2 font-semibold">Corridas recientes</h2>
        <table className="w-full text-sm"><thead><tr className="text-left font-mono text-[11px] uppercase text-muted"><th>Inicio (CDMX)</th><th>Agente</th><th>Cuenta</th><th>Disparo</th><th>Estado</th><th>Resultado</th></tr></thead><tbody>
          {(runs ?? []).map(r => <tr key={r.id} className="border-t border-line align-top"><td className="py-1 font-mono text-[12px]">{fmtDay(r.started_at).split(",")[0]} {fmtTime(r.started_at)}</td><td>{r.agent}</td><td>{accName.get(r.account_id) ?? "—"}</td><td>{r.triggered_by}</td><td><Chip tone={r.status === "ok" ? "ok" : r.status === "failed" ? "crit" : "amber"}>{r.status}</Chip></td><td className="font-mono text-[11px] text-muted">{r.error ?? (r.stats ? `${r.stats.fetched ?? 0} bajados · ${r.stats.inserted ?? 0} nuevos · ${r.stats.sessions ?? 0} sesiones` : "")}</td></tr>)}
        </tbody></table>
      </section>
    </div>
  );
}
