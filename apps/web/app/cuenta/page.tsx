import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtTime } from "@/lib/format";
import { TimeSeries, type Marker, type Point } from "@/components/TimeSeries";
import { Chip } from "@/components/Chip";
export const dynamic = "force-dynamic";

const mxn0 = (v: number) => "$" + Math.round(v).toLocaleString("es-MX");
const CDMX_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" });

type Day = { spend: number; purchases: number; value: number; closed: boolean; spendAll: number };
type Shop = { net: number; gross: number; refunds: number; orders: number; newc: number; newcRev: number; closed: boolean };

export default async function Cuenta({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams; await requireUser("/cuenta"); const sb = db();
  const days = Number(p.days ?? 30);
  const { data: accounts } = await sb.from("accounts").select("id,name,timezone_name,shopify_domain").eq("enabled", true).order("name");
  const accountId = p.account ?? "1703313583465547";
  const acc = (accounts ?? []).find(a => a.id === accountId);
  // cuentas que venden en la misma tienda: su gasto entra al MER
  const siblings = acc?.shopify_domain ? (accounts ?? []).filter(a => a.shopify_domain === acc.shopify_domain).map(a => a.id) : [accountId];
  const sinceDate = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const { data: prof } = await sb.from("account_profiles").select("*").eq("account_id", accountId).maybeSingle();
  const [{ data: rows }, { data: sessions }, { data: shopRows }] = await Promise.all([
    sb.from("insights_daily").select("account_id,date,spend,purchases,purchase_value,is_closed_day").in("account_id", siblings).eq("level", "campaign").gte("date", sinceDate).order("date"),
    sb.from("change_sessions").select("id,started_at,actor_name,summary,resets_learning,significance").eq("account_id", accountId).eq("significance", "major").eq("actor_kind", "person").gte("started_at", sinceDate).order("started_at"),
    acc?.shopify_domain ? sb.from("shopify_daily").select("date,net_sales,gross_sales,refunds,orders,new_customers,new_customer_revenue,is_closed_day").eq("account_id", accountId).gte("date", sinceDate).order("date") : Promise.resolve({ data: [] as { date: string; net_sales: number; gross_sales: number; refunds: number; orders: number; new_customers: number; new_customer_revenue: number; is_closed_day: boolean }[] }),
  ]);
  const byDate = new Map<string, Day>();
  for (const r of rows ?? []) {
    const d = byDate.get(r.date) ?? { spend: 0, purchases: 0, value: 0, closed: r.is_closed_day, spendAll: 0 };
    d.spendAll += Number(r.spend ?? 0);
    if (r.account_id === accountId) { d.spend += Number(r.spend ?? 0); d.purchases += Number(r.purchases ?? 0); d.value += Number(r.purchase_value ?? 0); d.closed = d.closed && r.is_closed_day; }
    byDate.set(r.date, d);
  }
  const shop = new Map<string, Shop>();
  for (const s of shopRows ?? []) shop.set(s.date, { net: Number(s.net_sales ?? 0), gross: Number(s.gross_sales ?? 0), refunds: Number(s.refunds ?? 0), orders: s.orders ?? 0, newc: s.new_customers ?? 0, newcRev: Number(s.new_customer_revenue ?? 0), closed: s.is_closed_day });
  const hasShop = shop.size > 0;
  const dates = [...new Set([...byDate.keys(), ...shop.keys()])].sort();
  const meta = (d: string): Day => byDate.get(d) ?? { spend: 0, purchases: 0, value: 0, closed: false, spendAll: 0 };
  const spend: Point[] = dates.map(d => ({ date: d, value: byDate.has(d) ? meta(d).spend : null, closed: meta(d).closed }));
  const roas: Point[] = dates.map(d => { const x = meta(d); return { date: d, value: x.spend > 0 ? x.value / x.spend : null, closed: x.closed }; });
  const cpa: Point[] = dates.map(d => { const x = meta(d); return { date: d, value: x.purchases > 0 ? x.spend / x.purchases : null, closed: x.closed }; });
  const netSales: Point[] = dates.map(d => { const s = shop.get(d); return { date: d, value: s ? s.net : null, closed: s?.closed ?? false }; });
  const merPts: Point[] = dates.map(d => { const s = shop.get(d), x = meta(d); return { date: d, value: s && x.spendAll > 0 ? s.net / x.spendAll : null, closed: (s?.closed ?? false) && x.closed }; });
  const markers: Marker[] = (sessions ?? []).map(s => ({ id: s.id, date: CDMX_DAY.format(new Date(s.started_at)), time: fmtTime(s.started_at), actor: s.actor_name, summary: s.summary, resets: s.resets_learning, href: `/sesion/${s.id}` }));

  // KPIs: últimos 7 días cerrados en Meta (y en Shopify cuando aplica) contra los 7 anteriores
  const closed = dates.filter(d => byDate.has(d) && meta(d).closed && (!hasShop || shop.get(d)?.closed));
  const last7 = closed.slice(-7), prev7 = closed.slice(-14, -7);
  const sum = (ds: string[], k: keyof Day) => ds.reduce((n, d) => n + (meta(d)[k] as number), 0);
  const sumS = (ds: string[], k: keyof Shop) => ds.reduce((n, d) => n + ((shop.get(d)?.[k] as number | undefined) ?? 0), 0);
  const kpi = (label: string, cur: number | null, prev: number | null, fmt: (v: number) => string, higherIsBetter = true, hint?: string) => { const delta = cur != null && prev != null && prev > 0 ? ((cur - prev) / prev) * 100 : null; const good = delta == null ? null : (delta >= 0) === higherIsBetter; return (
    <div className="rounded-md border border-line bg-surface px-4 py-3"><p className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</p><p className="tnum font-serif text-2xl">{cur == null ? "—" : fmt(cur)}</p><p className="tnum font-mono text-[11px] text-muted">7 días previos {prev == null ? "—" : fmt(prev)}{delta != null && <span className={good ? "text-accent" : "text-crit"}> · {delta >= 0 ? "+" : ""}{delta.toFixed(0)}%</span>}{hint && <span> · {hint}</span>}</p></div>); };
  const s7 = sum(last7, "spend"), sp7 = sum(prev7, "spend"), v7 = sum(last7, "value"), vp7 = sum(prev7, "value"), c7 = sum(last7, "purchases"), cp7 = sum(prev7, "purchases");
  const sa7 = sum(last7, "spendAll"), sap7 = sum(prev7, "spendAll");
  const n7 = sumS(last7, "net"), np7 = sumS(prev7, "net"), o7 = sumS(last7, "orders"), op7 = sumS(prev7, "orders"), nc7 = sumS(last7, "newc"), ncp7 = sumS(prev7, "newc"), nr7 = sumS(last7, "newcRev");
  const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
  const sharedSpend = siblings.length > 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div><p className="font-mono text-[11px] uppercase tracking-wider text-muted">Cuenta · últimos {days} días · días cerrados en zona {acc?.timezone_name}</p><h1 className="font-serif text-3xl font-medium">{acc?.name ?? accountId}: números y cambios en la misma línea</h1></div>
        <form className="ml-auto flex gap-2" method="get">
          <select name="account" defaultValue={accountId} className="rounded border border-line bg-surface px-2 py-1 text-sm">{(accounts ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <select name="days" defaultValue={String(days)} className="rounded border border-line bg-surface px-2 py-1 text-sm">{["14", "30", "60", "90"].map(d => <option key={d} value={d}>{d} días</option>)}</select>
          <button className="rounded bg-accent px-3 py-1 text-sm font-semibold text-white">Ver</button>
        </form>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpi("Gasto · últimos 7 días cerrados", s7, sp7, mxn0, false)}
        {kpi("Compras (Meta)", c7, cp7, v => v.toFixed(0))}
        {kpi("ROAS (Meta)", ratio(v7, s7), ratio(vp7, sp7), v => v.toFixed(2))}
        {kpi("CPA (Meta)", ratio(s7, c7), ratio(sp7, cp7), mxn0, false)}
      </div>
      {hasShop ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kpi("Ventas netas (Shopify)", n7, np7, mxn0)}
            {kpi("MER · ventas netas ÷ gasto Meta", ratio(n7, sa7), ratio(np7, sap7), v => v.toFixed(2), true, sharedSpend ? "gasto de las cuentas que venden en la tienda" : undefined)}
            {kpi("Clientes nuevos (Shopify)", nc7, ncp7, v => v.toFixed(0))}
            {kpi("CAC · gasto ÷ clientes nuevos", ratio(sa7, nc7), ratio(sap7, ncp7), mxn0, false)}
          </div>
          <div className="flex flex-wrap gap-2 text-sm"><span className="text-muted">Shopify, últimos 7 días cerrados:</span>
            <Chip tone="neutral">{o7} pedidos</Chip>
            <Chip tone="neutral">ticket promedio {o7 > 0 ? mxn0(n7 / o7) : "—"}</Chip>
            <Chip tone="neutral">{o7 > 0 ? Math.round((nc7 / o7) * 100) : 0}% de pedidos de clientes nuevos</Chip>
            <Chip tone="neutral">ventas a clientes nuevos {mxn0(nr7)}</Chip>
            {c7 > 0 && o7 > 0 && <Chip tone={c7 / o7 > 1.15 ? "amber" : "neutral"} title="Compras atribuidas por Meta entre pedidos reales de Shopify. Muy por arriba de 1 = Meta se atribuye de más.">Meta atribuye {Math.round((c7 / o7) * 100)}% de los pedidos</Chip>}
          </div>
        </>
      ) : acc?.shopify_domain ? (
        <div className="rounded-md border border-amber/40 bg-amber-soft px-4 py-3 text-sm"><b>Shopify todavía sin datos.</b> La cuenta está ligada a {acc.shopify_domain}; falta el token de la app personalizada (SHOPIFY_ADMIN_TOKEN) en .env y en los secretos de GitHub. Pasos en docs/02-accesos.md. Con el token, el collector llena ventas netas, MER, clientes nuevos y CAC.</div>
      ) : <p className="text-sm text-muted">Esta cuenta no tiene tienda Shopify ligada (columna shopify_domain en accounts).</p>}
      {prof?.target_roas || prof?.target_cpa || prof?.daily_spend_ceiling ? (
        <div className="flex flex-wrap gap-2 text-sm"><span className="text-muted">Objetivos configurados:</span>
          {prof.breakeven_roas && <Chip tone="neutral">ROAS equilibrio {Number(prof.breakeven_roas).toFixed(2)}</Chip>}
          {prof.target_roas && <Chip tone={s7 > 0 && v7 / s7 >= Number(prof.target_roas) ? "ok" : "crit"}>ROAS objetivo {Number(prof.target_roas).toFixed(2)} · actual {(s7 > 0 ? v7 / s7 : 0).toFixed(2)}</Chip>}
          {prof.target_cpa && <Chip tone={c7 > 0 && s7 / c7 <= Number(prof.target_cpa) ? "ok" : "crit"}>CPA objetivo {mxn0(Number(prof.target_cpa))} · actual {mxn0(c7 > 0 ? s7 / c7 : 0)}</Chip>}
          {prof.daily_spend_ceiling && <Chip tone={s7 / Math.max(1, last7.length) <= Number(prof.daily_spend_ceiling) ? "ok" : "crit"}>techo {mxn0(Number(prof.daily_spend_ceiling))}/día · promedio {mxn0(s7 / Math.max(1, last7.length))}</Chip>}
          <a href={`/configuracion?account=${accountId}`} className="text-accent">editar →</a></div>
      ) : <p className="text-sm text-muted">Sin objetivos configurados todavía. <a href={`/configuracion?account=${accountId}`} className="text-accent">Captúralos en Configuración →</a></p>}
      <p className="text-sm text-muted">Cada punto sobre la línea es una sesión de cambios de una persona. <span className="text-amber">Ámbar ↻</span> = reinició la fase de aprendizaje. La franja ámbar es el día en curso: se muestra, no se juzga. ROAS, CPA y compras son los que reporta Meta; ventas netas, pedidos y clientes nuevos vienen de Shopify (sin envío, reembolsos restados en la fecha del pedido). <Chip tone="amber">preliminar hasta 7 días</Chip></p>
      <TimeSeries title="Gasto diario" unit="MXN" points={spend} markers={markers} format={mxn0} />
      {hasShop && <TimeSeries title="Ventas netas diarias (Shopify)" unit="MXN" points={netSales} markers={markers} format={mxn0} />}
      {hasShop && <TimeSeries title="MER diario" unit={sharedSpend ? "ventas netas ÷ gasto Meta de todas las cuentas de la tienda" : "ventas netas ÷ gasto Meta"} points={merPts} markers={markers} format={v => v.toFixed(1)} />}
      <TimeSeries title="ROAS diario (Meta)" points={roas} markers={markers} format={v => v.toFixed(1)} />
      <TimeSeries title="CPA diario (Meta)" unit="MXN por compra" points={cpa} markers={markers} format={mxn0} />
      <details className="rounded-md border border-line bg-surface"><summary className="px-4 py-2 text-sm font-semibold">Tabla de datos</summary>
        <div className="overflow-x-auto px-4 pb-3"><table className="w-full text-[13px]"><thead><tr className="text-left font-mono text-[11px] uppercase text-muted"><th>Fecha</th><th>Gasto</th><th>Compras</th><th>Valor</th><th>ROAS</th><th>CPA</th>{hasShop && <><th>Ventas netas</th><th>Pedidos</th><th>Nuevos</th><th>MER</th></>}<th>Cambios</th></tr></thead><tbody>
          {dates.slice().reverse().map(d => { const x = meta(d); const s = shop.get(d); const n = markers.filter(m => m.date === d).length; const isClosed = x.closed && (!s || s.closed); return <tr key={d} className={`tnum border-t border-line ${isClosed ? "" : "text-muted"}`}><td className="py-1 font-mono">{d}{isClosed ? "" : " ·"}</td><td>{mxn0(x.spend)}</td><td>{x.purchases}</td><td>{mxn0(x.value)}</td><td>{x.spend ? (x.value / x.spend).toFixed(2) : "—"}</td><td>{x.purchases ? mxn0(x.spend / x.purchases) : "—"}</td>{hasShop && <><td>{s ? mxn0(s.net) : "—"}</td><td>{s?.orders ?? "—"}</td><td>{s?.newc ?? "—"}</td><td>{s && x.spendAll > 0 ? (s.net / x.spendAll).toFixed(2) : "—"}</td></>}<td>{n || ""}</td></tr>; })}
        </tbody></table></div></details>
    </div>
  );
}
