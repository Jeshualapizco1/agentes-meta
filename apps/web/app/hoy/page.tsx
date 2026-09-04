import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtTime, fmtDay, initials } from "@/lib/format";
import { toZoned } from "@agentes-meta/core";
import { Card } from "@/components/Card";
import { Kpi } from "@/components/Kpi";
import { Sparkline, type SparkPoint } from "@/components/Sparkline";
import { Chip } from "@/components/Chip";
export const dynamic = "force-dynamic";

const mxn0 = (v: number) => "$" + Math.round(v).toLocaleString("es-MX");
const CDMX_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" });
type Day = { spend: number; purchases: number; value: number; closed: boolean };

export default async function Hoy({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams; await requireUser("/hoy"); const sb = db();
  const { data: accounts } = await sb.from("accounts").select("id,name,timezone_name").eq("enabled", true).order("name");
  const accountId = p.account ?? "1703313583465547";
  const acc = (accounts ?? []).find(a => a.id === accountId);
  const tz = acc?.timezone_name ?? "America/Mexico_City";
  const sinceDate = new Date(Date.now() - 21 * 86400_000).toISOString().slice(0, 10);
  const since14 = new Date(Date.now() - 14 * 86400_000).toISOString();
  const [{ data: prof }, { data: rows }, { data: sessions }, { data: alerts }] = await Promise.all([
    sb.from("account_profiles").select("target_roas,breakeven_roas,target_cpa,daily_spend_ceiling").eq("account_id", accountId).maybeSingle(),
    sb.from("insights_daily").select("date,spend,purchases,purchase_value,is_closed_day").eq("account_id", accountId).eq("level", "campaign").gte("date", sinceDate).order("date"),
    sb.from("change_sessions").select("id,started_at,actor_name,summary,resets_learning,kind").eq("account_id", accountId).eq("significance", "major").eq("actor_kind", "person").gte("started_at", since14).order("started_at", { ascending: false }).limit(60),
    sb.from("alerts").select("id,kind,severity,message,created_at,account_id").is("acknowledged_at", null).or(`account_id.eq.${accountId},account_id.is.null`).order("created_at", { ascending: false }).limit(6),
  ]);

  // Agregado diario (misma regla que Cuenta): días cerrados en la zona de la cuenta
  const byDate = new Map<string, Day>();
  for (const r of rows ?? []) { const d = byDate.get(r.date) ?? { spend: 0, purchases: 0, value: 0, closed: r.is_closed_day }; d.spend += Number(r.spend ?? 0); d.purchases += Number(r.purchases ?? 0); d.value += Number(r.purchase_value ?? 0); d.closed = d.closed && r.is_closed_day; byDate.set(r.date, d); }
  const dates = [...byDate.keys()].sort();
  const closed = dates.filter(d => byDate.get(d)!.closed);
  const last7 = closed.slice(-7), prev7 = closed.slice(-14, -7);
  const sum = (ds: string[], k: keyof Day) => ds.reduce((n, d) => n + (byDate.get(d)![k] as number), 0);
  const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
  const s7 = sum(last7, "spend"), sp7 = sum(prev7, "spend"), v7 = sum(last7, "value"), vp7 = sum(prev7, "value"), c7 = sum(last7, "purchases"), cp7 = sum(prev7, "purchases");
  const roas7 = ratio(v7, s7), roasP = ratio(vp7, sp7), cpa7 = ratio(s7, c7), cpaP = ratio(sp7, cp7);

  // Sparkline de ROAS, 14 días (incluye el día en curso como franja ámbar)
  const spark: SparkPoint[] = dates.slice(-14).map(d => { const x = byDate.get(d)!; return { date: d, value: x.spend > 0 ? x.value / x.spend : null, closed: x.closed }; });
  const markers = (sessions ?? []).map(s => ({ date: CDMX_DAY.format(new Date(s.started_at)), resets: s.resets_learning }));

  // Gasto de ayer vs techo (ayer en la zona de la cuenta; ámbar si ese día aún no está cerrado)
  const yesterday = toZoned(new Date(Date.now() - 86400_000), tz).date;
  const y = byDate.get(yesterday);
  const ceiling = prof?.daily_spend_ceiling ? Number(prof.daily_spend_ceiling) : null;
  const ySpend = y?.spend ?? null;
  const yTone = !y || !y.closed ? "amber" : ceiling == null ? "neutral" : ySpend! <= ceiling ? "ok" : "crit";
  const barPct = ceiling && ySpend != null ? Math.min(100, (ySpend / ceiling) * 100) : 0;
  const barColor = { ok: "var(--color-ok)", crit: "var(--color-crit)", amber: "var(--color-amber)", neutral: "var(--color-muted)" }[yTone];
  const last3 = (sessions ?? []).slice(0, 3);
  const today = toZoned(new Date(), "America/Mexico_City").date;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div><p className="font-mono text-[11px] uppercase tracking-wider text-muted">Hoy · {fmtDay(today + "T12:00:00-06:00")} · días cerrados en zona {tz}</p><h1 className="text-3xl font-bold tracking-tight">{acc?.name ?? accountId}: <span className="text-gradient">cómo va la cuenta</span></h1></div>
        <form className="ml-auto flex gap-2" method="get">
          <select name="account" defaultValue={accountId} className="border border-line px-3 py-1.5 text-sm">{(accounts ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <button className="btn-accent px-4 py-1.5 text-sm">Ver</button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:auto-rows-min">
        <Card hero span={8} rows={2} eyebrow="ROAS · últimos 7 días cerrados (Meta)" action={<a href={`/cuenta?account=${accountId}`} className="text-sm text-meta hover:underline">ver Cuenta →</a>}>
          <Kpi hero label="" value={roas7} prev={roasP} format={v => v.toFixed(2)} target={prof?.target_roas ? { value: Number(prof.target_roas), label: `ROAS ${Number(prof.target_roas).toFixed(2)}` } : undefined} hint={prof?.breakeven_roas ? `equilibrio ${Number(prof.breakeven_roas).toFixed(2)}` : undefined}>
            <Sparkline id="hoy-roas" points={spark} markers={markers} height={96} fmt="fixed2" unit="ROAS" />
            <p className="mt-1 font-mono text-[11px] text-muted">14 días · cada punto es una sesión de cambios de una persona · <span className="text-amber">ámbar ↻</span> reinicia aprendizaje · la franja ámbar es el día en curso: se muestra, no se juzga</p>
          </Kpi>
        </Card>

        <Card span={4} eyebrow="Ingresos atribuidos por Meta · últimos 7 días">
          <div className="flex flex-col gap-5">
            <Kpi label="" value={v7} prev={vp7} format={mxn0} hint="valor de las compras que Meta atribuye" />
            <div className="grid grid-cols-2 gap-4">
              <Kpi label="Gasto" value={s7} prev={sp7} format={mxn0} higherIsBetter={false} />
              <Kpi label="Compras" value={c7} prev={cp7} format={v => v.toFixed(0)} />
            </div>
          </div>
        </Card>

        <Card span={4} eyebrow={`Gasto de ayer (${yesterday}) vs techo diario`}>
          <p className="tnum text-3xl font-bold leading-none">{ySpend == null ? "—" : mxn0(ySpend)}</p>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full" style={{ width: `${barPct}%`, background: barColor, transition: "width .4s ease" }} /></div>
          <p className="mt-2 font-mono text-[11px] text-muted">
            {ceiling == null ? <>sin techo configurado · <a href={`/configuracion?account=${accountId}`} className="text-meta">capturar →</a></> : <>techo {mxn0(ceiling)} · {ySpend != null ? `${Math.round((ySpend / ceiling) * 100)}% usado` : "sin dato"}</>}
            {y && !y.closed && <span className="text-amber"> · ayer aún no cierra</span>}
            {!y && <span className="text-amber"> · sin métricas de ayer todavía</span>}
          </p>
        </Card>

        <Card span={4} eyebrow="CPA · últimos 7 días cerrados (Meta)">
          <Kpi label="" value={cpa7} prev={cpaP} format={mxn0} higherIsBetter={false} target={prof?.target_cpa ? { value: Number(prof.target_cpa), label: mxn0(Number(prof.target_cpa)) } : undefined} hint={`${c7.toFixed(0)} compras`} />
        </Card>

        <Card span={4} eyebrow="Últimos cambios" title="Decisiones recientes" action={<a href={`/bitacora?account=${accountId}&sig=major`} className="text-sm text-meta hover:underline">bitácora →</a>}>
          {last3.length ? <ul className="flex flex-col gap-3">{last3.map(s => (
            <li key={s.id} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold text-white" style={{ background: "var(--gradient-accent)" }} title={s.actor_name}>{initials(s.actor_name)}</span>
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-muted">{CDMX_DAY.format(new Date(s.started_at)) === today ? "hoy" : fmtDay(s.started_at).split(",")[0]} · {fmtTime(s.started_at)} · <b className="text-ink">{s.actor_name}</b>{s.resets_learning && <span className="text-amber"> ↻</span>}</p>
                <p className="text-[13px] leading-snug">{s.summary.length > 120 ? s.summary.slice(0, 117) + "…" : s.summary}</p>
                <a href={`/sesion/${s.id}`} className="text-[12px] text-meta hover:underline">ver sesión →</a>
              </div>
            </li>))}</ul> : <p className="text-sm text-muted">Sin decisiones mayores de personas en 14 días.</p>}
        </Card>

        <Card span={4} eyebrow="Alertas sin atender" action={<a href="/estado" className="text-sm text-meta hover:underline">estado →</a>}>
          {alerts?.length ? <ul className="flex flex-col gap-2">{alerts.map(a => <li key={a.id} className="flex items-start gap-2 text-[13px]"><Chip tone={a.severity === "critical" ? "crit" : "amber"}>{a.kind}</Chip><span className="min-w-0">{a.message}<span className="block font-mono text-[11px] text-muted">{fmtTime(a.created_at)}</span></span></li>)}</ul> : <p className="flex items-center gap-2 text-sm text-muted"><Chip tone="ok">todo en orden</Chip> ninguna alerta abierta</p>}
        </Card>

        <Card span={4} eyebrow="Propuestas pendientes">
          <p className="text-sm text-muted">El estratega llega en Fase 4. Aquí aparecerán las propuestas de escalar, recortar y dayparting para aprobar o rechazar con razón.</p>
        </Card>
      </div>
    </div>
  );
}
