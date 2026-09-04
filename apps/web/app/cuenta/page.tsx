import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtTime } from "@/lib/format";
import { TimeSeries, type Marker, type Point } from "@/components/TimeSeries";
import { Chip } from "@/components/Chip";
import { Card } from "@/components/Card";
import { Kpi } from "@/components/Kpi";
import { DateRange } from "@/components/DateRange";
import { resolveRange } from "@/lib/range";
export const dynamic = "force-dynamic";

const mxn0 = (v: number) => "$" + Math.round(v).toLocaleString("es-MX");
const CDMX_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" });

type Day = { spend: number; purchases: number; value: number; closed: boolean };

export default async function Cuenta({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams; await requireUser("/cuenta"); const sb = db();
  const range = resolveRange(p, 30);
  const { data: accounts } = await sb.from("accounts").select("id,name,timezone_name").eq("enabled", true).order("name");
  const accountId = p.account ?? "1703313583465547";
  const acc = (accounts ?? []).find(a => a.id === accountId);
  const sinceDate = range.from, untilDate = range.to;
  const { data: prof } = await sb.from("account_profiles").select("*").eq("account_id", accountId).maybeSingle();
  const [{ data: rows }, { data: sessions }] = await Promise.all([
    sb.from("insights_daily").select("date,spend,purchases,purchase_value,is_closed_day").eq("account_id", accountId).eq("level", "campaign").gte("date", sinceDate).lte("date", untilDate).order("date"),
    sb.from("change_sessions").select("id,started_at,actor_name,summary,resets_learning,significance").eq("account_id", accountId).eq("significance", "major").eq("actor_kind", "person").gte("started_at", range.sinceIso).lte("started_at", range.untilIso).order("started_at"),
  ]);
  const byDate = new Map<string, Day>();
  for (const r of rows ?? []) { const d = byDate.get(r.date) ?? { spend: 0, purchases: 0, value: 0, closed: r.is_closed_day }; d.spend += Number(r.spend ?? 0); d.purchases += Number(r.purchases ?? 0); d.value += Number(r.purchase_value ?? 0); d.closed = d.closed && r.is_closed_day; byDate.set(r.date, d); }
  const dates = [...byDate.keys()].sort();
  const spend: Point[] = dates.map(d => ({ date: d, value: byDate.get(d)!.spend, closed: byDate.get(d)!.closed }));
  const roas: Point[] = dates.map(d => { const x = byDate.get(d)!; return { date: d, value: x.spend > 0 ? x.value / x.spend : null, closed: x.closed }; });
  const cpa: Point[] = dates.map(d => { const x = byDate.get(d)!; return { date: d, value: x.purchases > 0 ? x.spend / x.purchases : null, closed: x.closed }; });
  const markers: Marker[] = (sessions ?? []).map(s => ({ id: s.id, date: CDMX_DAY.format(new Date(s.started_at)), time: fmtTime(s.started_at), actor: s.actor_name, summary: s.summary, resets: s.resets_learning, href: `/sesion/${s.id}` }));

  // KPIs: últimos 7 días cerrados contra los 7 anteriores
  const closed = dates.filter(d => byDate.get(d)!.closed);
  const last7 = closed.slice(-7), prev7 = closed.slice(-14, -7);
  const sum = (ds: string[], k: "spend" | "purchases" | "value") => ds.reduce((n, d) => n + byDate.get(d)![k], 0);
  const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
  const kpi = (label: string, cur: number | null, prev: number | null, fmt: (v: number) => string, higherIsBetter = true, hint?: string) => (
    <Card as="div" className="!p-4"><Kpi label={label} value={cur} prev={prev} format={fmt} higherIsBetter={higherIsBetter} hint={hint} /></Card>);
  const s7 = sum(last7, "spend"), sp7 = sum(prev7, "spend"), v7 = sum(last7, "value"), vp7 = sum(prev7, "value"), c7 = sum(last7, "purchases"), cp7 = sum(prev7, "purchases");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div><p className="font-mono text-[11px] uppercase tracking-wider text-muted">Cuenta · {range.label} · zona {acc?.timezone_name}</p><h1 className="text-3xl font-bold tracking-tight">{acc?.name ?? accountId}: números y cambios en la misma línea</h1></div>
        <form className="ml-auto flex flex-wrap items-end gap-2" method="get">
          <select name="account" defaultValue={accountId} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm">{(accounts ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <DateRange days={range.days} from={p.from} to={p.to} presets={[14, 30, 60, 90]} label="" />
          <button className="btn-accent px-3 py-1 text-sm font-semibold text-white">Ver</button>
        </form>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpi("Gasto · últimos 7 días cerrados", s7, sp7, mxn0, false)}
        {kpi("Compras", c7, cp7, v => v.toFixed(0))}
        {kpi("ROAS", ratio(v7, s7), ratio(vp7, sp7), v => v.toFixed(2))}
        {kpi("CPA", ratio(s7, c7), ratio(sp7, cp7), mxn0, false)}
      </div>
      {prof?.target_roas || prof?.target_cpa || prof?.daily_spend_ceiling ? (
        <div className="flex flex-wrap gap-2 text-sm"><span className="text-muted">Objetivos configurados:</span>
          {prof.breakeven_roas && <Chip tone="neutral">ROAS equilibrio {Number(prof.breakeven_roas).toFixed(2)}</Chip>}
          {prof.target_roas && <Chip tone={s7 > 0 && v7 / s7 >= Number(prof.target_roas) ? "ok" : "crit"}>ROAS objetivo {Number(prof.target_roas).toFixed(2)} · actual {(s7 > 0 ? v7 / s7 : 0).toFixed(2)}</Chip>}
          {prof.target_cpa && <Chip tone={c7 > 0 && s7 / c7 <= Number(prof.target_cpa) ? "ok" : "crit"}>CPA objetivo {mxn0(Number(prof.target_cpa))} · actual {mxn0(c7 > 0 ? s7 / c7 : 0)}</Chip>}
          {prof.daily_spend_ceiling && <Chip tone={s7 / Math.max(1, last7.length) <= Number(prof.daily_spend_ceiling) ? "ok" : "crit"}>techo {mxn0(Number(prof.daily_spend_ceiling))}/día · promedio {mxn0(s7 / Math.max(1, last7.length))}</Chip>}
          <a href={`/configuracion?account=${accountId}`} className="text-meta">editar →</a></div>
      ) : <p className="text-sm text-muted">Sin objetivos configurados todavía. <a href={`/configuracion?account=${accountId}`} className="text-meta">Captúralos en Configuración →</a></p>}
      <p className="text-sm text-muted">Cada punto sobre la línea es una sesión de cambios de una persona. <span className="text-amber">Ámbar ↻</span> = reinició la fase de aprendizaje. La franja ámbar es el día en curso: se muestra, no se juzga. Los números son los que reporta Meta (con wetracked.io como fuente de atribución). <Chip tone="amber">preliminar hasta 7 días</Chip></p>
      <TimeSeries title="Gasto diario" unit="MXN" points={spend} markers={markers} fmt="mxn0" />
      <TimeSeries title="ROAS diario" points={roas} markers={markers} fmt="fixed1" />
      <TimeSeries title="CPA diario" unit="MXN por compra" points={cpa} markers={markers} fmt="mxn0" />
      <Card as="details" className="!p-0"><summary className="px-4 py-2 text-sm font-semibold">Tabla de datos</summary>
        <div className="overflow-x-auto px-4 pb-3"><table className="w-full text-[13px]"><thead><tr className="text-left font-mono text-[11px] uppercase text-muted"><th>Fecha</th><th>Gasto</th><th>Compras</th><th>Valor</th><th>ROAS</th><th>CPA</th><th>Cambios</th></tr></thead><tbody>
          {dates.slice().reverse().map(d => { const x = byDate.get(d)!; const n = markers.filter(m => m.date === d).length; return <tr key={d} className={`tnum border-t border-line ${x.closed ? "" : "text-muted"}`}><td className="py-1 font-mono">{d}{x.closed ? "" : " ·"}</td><td>{mxn0(x.spend)}</td><td>{x.purchases}</td><td>{mxn0(x.value)}</td><td>{x.spend ? (x.value / x.spend).toFixed(2) : "—"}</td><td>{x.purchases ? mxn0(x.spend / x.purchases) : "—"}</td><td>{n || ""}</td></tr>; })}
        </tbody></table></div></Card>
    </div>
  );
}
