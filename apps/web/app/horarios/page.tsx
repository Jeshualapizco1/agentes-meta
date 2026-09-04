import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { shiftHourCell } from "@agentes-meta/core";
import { Chip } from "@/components/Chip";
import { DateRange } from "@/components/DateRange";
import { resolveRange } from "@/lib/range";
import { Card } from "@/components/Card";
export const dynamic = "force-dynamic";

const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const BLOCKS: [string, number, number][] = [["Madrugada 0–6", 0, 6], ["Mañana 6–12", 6, 12], ["Tarde 12–18", 12, 18], ["Noche 18–24", 18, 24]];
const mxn0 = (v: number) => "$" + Math.round(v).toLocaleString("es-MX");
type Cell = { spend: number; purchases: number; value: number; days: Set<string> };
const empty = (): Cell => ({ spend: 0, purchases: 0, value: 0, days: new Set() });
/** Rampa secuencial de un solo tono: del color de la tarjeta (0) al verde --color-ok (1); magnitud, no identidad. */
function ramp(t: number) { return `color-mix(in oklab, var(--color-surface-solid), var(--color-ok) ${Math.round(Math.max(0, Math.min(1, t)) * 100)}%)`; }
function dowOf(date: string) { const d = new Date(date + "T12:00:00Z").getUTCDay(); return (d + 6) % 7; }

export default async function Horarios({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams; await requireUser("/horarios"); const sb = db();
  const accountId = p.account ?? "1703313583465547"; const metric = (p.metric ?? "roas") as "roas" | "spend" | "purchases" | "cpa"; const range = resolveRange(p.weeks ? { days: String(Number(p.weeks) * 7) } : p, 28);
  const [{ data: accounts }, { data: acc }, { data: prof }] = await Promise.all([
    sb.from("accounts").select("id,name").eq("enabled", true).order("name"),
    sb.from("accounts").select("name,timezone_name").eq("id", accountId).single(),
    sb.from("account_profiles").select("target_roas,breakeven_roas,target_cpa").eq("account_id", accountId).maybeSingle(),
  ]);
  const tz = acc?.timezone_name ?? "America/Mexico_City";
  const since = range.from, until = range.to;
  const todayCdmx = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
  const { data: rows } = await sb.from("insights_hourly").select("date,hour,spend,purchases,purchase_value").eq("account_id", accountId).gte("date", since).lte("date", until).limit(20000);
  // Rejilla día de la semana × hora, en CDMX, solo días completos
  const grid: Cell[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, empty));
  const closedDays = new Set<string>();
  for (const r of rows ?? []) {
    const c = shiftHourCell(r.date, r.hour, tz); if (c.date >= todayCdmx) continue;
    const cell = grid[dowOf(c.date)]![c.hour]!; cell.spend += Number(r.spend ?? 0); cell.purchases += Number(r.purchases ?? 0); cell.value += Number(r.purchase_value ?? 0); cell.days.add(c.date); closedDays.add(c.date);
  }
  const val = (c: Cell) => metric === "spend" ? c.spend : metric === "purchases" ? c.purchases : metric === "roas" ? (c.spend > 0 ? c.value / c.spend : 0) : (c.purchases > 0 ? c.spend / c.purchases : 0);
  const fmt = (v: number) => metric === "spend" ? mxn0(v) : metric === "purchases" ? v.toFixed(0) : metric === "roas" ? v.toFixed(2) : mxn0(v);
  const MIN_PURCHASES = 5; // por celda; debajo de esto no se juzga
  const all = grid.flat(); const vals = all.filter(c => c.spend > 0 && (metric === "spend" || metric === "purchases" || c.purchases >= MIN_PURCHASES)).map(val);
  const lo = Math.min(...vals, 0), hi = Math.max(...vals, 1);
  const t = (v: number) => metric === "cpa" ? 1 - (v - lo) / (hi - lo || 1) : (v - lo) / (hi - lo || 1);
  const totalSpend = all.reduce((n, c) => n + c.spend, 0), totalValue = all.reduce((n, c) => n + c.value, 0), totalPurch = all.reduce((n, c) => n + c.purchases, 0);
  const avgRoas = totalSpend ? totalValue / totalSpend : 0;
  // Bloques día × 4 franjas
  const blocks = DOW.map((d, di) => BLOCKS.map(([label, a, b]) => { const cs = grid[di]!.slice(a, b); const spend = cs.reduce((n, c) => n + c.spend, 0), purchases = cs.reduce((n, c) => n + c.purchases, 0), value = cs.reduce((n, c) => n + c.value, 0); return { d, label, spend, purchases, value, roas: spend ? value / spend : 0, share: totalSpend ? spend / totalSpend : 0 }; }));
  const flat = blocks.flat().filter(b => b.purchases >= MIN_PURCHASES * 2);
  const best = [...flat].sort((a, b) => b.roas - a.roas).slice(0, 3), worst = [...flat].sort((a, b) => a.roas - b.roas).slice(0, 3);
  const hourTotals = Array.from({ length: 24 }, (_, h) => { const cs = grid.map(r => r[h]!); const s = cs.reduce((n, c) => n + c.spend, 0), v = cs.reduce((n, c) => n + c.value, 0), pu = cs.reduce((n, c) => n + c.purchases, 0); return { h, spend: s, roas: s ? v / s : 0, purchases: pu }; });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div><p className="font-mono text-[11px] uppercase tracking-wider text-muted">Horarios · {closedDays.size} días con datos · hora CDMX (cuenta en {tz})</p><h1 className="text-3xl font-bold tracking-tight">Cuándo rinde la cuenta, por día y hora</h1></div>
        <form method="get" className="ml-auto flex flex-wrap items-end gap-2">
          <select name="account" defaultValue={accountId} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm">{(accounts ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <select name="metric" defaultValue={metric} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm"><option value="roas">ROAS</option><option value="cpa">CPA</option><option value="spend">Gasto</option><option value="purchases">Compras</option></select>
          <DateRange days={range.days} from={p.from} to={p.to} presets={[14, 28, 56]} label="" />
          <button className="btn-accent px-3 py-1 text-sm font-semibold text-white">Ver</button>
        </form>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Gasto", mxn0(totalSpend)], ["Compras", totalPurch.toFixed(0)], ["ROAS promedio", avgRoas.toFixed(2)], ["Celdas con ≥ " + MIN_PURCHASES + " compras", `${all.filter(c => c.purchases >= MIN_PURCHASES).length} de 168`]].map(([l, v]) => <Card as="div" key={l} className="!p-4"><p className="font-mono text-[11px] uppercase tracking-wider text-muted">{l}</p><p className="tnum text-2xl font-bold">{v}</p></Card>)}
      </div>
      <p className="max-w-3xl text-sm text-muted">Las compras por hora son pocas: una celda con menos de {MIN_PURCHASES} compras se muestra en gris y no cuenta para conclusiones. Meta atribuye la compra a la hora de la impresión. Recordatorio: la programación por horas nativa de Meta solo funciona con presupuesto total; con presupuesto diario esto es una recomendación para el media buyer. {prof?.target_roas && <Chip tone="neutral">ROAS objetivo {Number(prof.target_roas).toFixed(1)}</Chip>}</p>

      <Card as="figure">
        <figcaption className="mb-2 flex items-center gap-3 text-sm"><b>{{ roas: "ROAS", cpa: "CPA", spend: "Gasto", purchases: "Compras" }[metric]} por día de la semana y hora</b><span className="ml-auto flex items-center gap-1 font-mono text-[11px] text-muted">{metric === "cpa" ? "caro" : "bajo"}<span className="inline-block h-3 w-24 rounded" style={{ background: `linear-gradient(90deg, ${ramp(0)}, ${ramp(1)})` }} />{metric === "cpa" ? "barato" : "alto"}</span></figcaption>
        <div className="overflow-x-auto"><table className="tnum w-full border-separate text-[11px]" style={{ borderSpacing: 2 }}>
          <thead><tr><th className="w-10"></th>{Array.from({ length: 24 }, (_, h) => <th key={h} className="font-mono font-normal text-muted">{h}</th>)}</tr></thead>
          <tbody>{grid.map((row, di) => <tr key={di}><th className="text-left font-mono font-normal text-muted">{DOW[di]}</th>{row.map((c, h) => { const ok = c.spend > 0 && (metric === "spend" || metric === "purchases" || c.purchases >= MIN_PURCHASES); const v = val(c); return <td key={h} title={`${DOW[di]} ${h}:00 · gasto ${mxn0(c.spend)} · ${c.purchases.toFixed(0)} compras · ROAS ${c.spend ? (c.value / c.spend).toFixed(2) : "—"} · ${c.days.size} días`} className="h-7 rounded text-center" style={{ background: ok ? ramp(t(v)) : "var(--color-paper)", color: ok && t(v) > 0.55 ? "#0b1220" : "var(--color-muted)" }}>{ok ? (metric === "roas" ? v.toFixed(1) : metric === "purchases" ? v.toFixed(0) : Math.round(v / (metric === "spend" ? 100 : 1)) || "") : ""}</td>; })}</tr>)}</tbody>
        </table></div>
        {metric === "spend" && <p className="mt-1 font-mono text-[11px] text-muted">cifras de gasto en cientos de MXN</p>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">Por hora del día (todas las semanas)</h2>
          <svg viewBox="0 0 720 150" className="w-full" role="img" aria-label="Gasto y ROAS por hora">
            {hourTotals.map(({ h, spend, roas, purchases }) => { const maxS = Math.max(...hourTotals.map(x => x.spend), 1); const bh = (spend / maxS) * 100; const good = purchases >= MIN_PURCHASES * 2; return <g key={h}><rect x={20 + h * 29} y={120 - bh} width={22} height={bh} rx="3" fill={good ? ramp(Math.min(1, roas / Math.max(avgRoas * 2, 0.01))) : "var(--color-line)"} /><text x={31 + h * 29} y={136} textAnchor="middle" fontSize="10" fill="var(--color-muted)" fontFamily="var(--font-mono)">{h}</text>{good && <text x={31 + h * 29} y={114 - bh} textAnchor="middle" fontSize="9" fill="var(--color-muted)" fontFamily="var(--font-mono)">{roas.toFixed(1)}</text>}</g>; })}
          </svg>
          <p className="font-mono text-[11px] text-muted">altura = gasto · color = ROAS · número = ROAS de la hora · gris = pocas compras para juzgar</p>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">Bloques con evidencia suficiente (≥ {MIN_PURCHASES * 2} compras)</h2>
          {flat.length === 0 ? <p className="text-sm text-muted">Aún no hay bloques con suficientes compras. Amplía el periodo.</p> : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="mb-1 font-mono text-[11px] uppercase text-ok">Mejor ROAS</p>{best.map(b => <p key={b.d + b.label} className="tnum"><b>{b.d} · {b.label}</b><br /><span className="text-muted">ROAS {b.roas.toFixed(2)} · {b.purchases.toFixed(0)} compras · {(b.share * 100).toFixed(0)}% del gasto</span></p>)}</div>
              <div><p className="mb-1 font-mono text-[11px] uppercase text-crit">Peor ROAS</p>{worst.map(b => <p key={b.d + b.label} className="tnum"><b>{b.d} · {b.label}</b><br /><span className="text-muted">ROAS {b.roas.toFixed(2)} · {b.purchases.toFixed(0)} compras · {(b.share * 100).toFixed(0)}% del gasto</span></p>)}</div>
            </div>
          )}
          <p className="mt-2 text-xs text-muted">Un bloque es "oportunidad" solo si supera al promedio de la cuenta ({avgRoas.toFixed(2)}) con margen y evidencia. La Fase 4 convierte esto en propuestas con umbrales configurables.</p>
        </Card>
      </div>
      <Card as="details" className="!p-0"><summary className="px-4 py-2 text-sm font-semibold">Tabla día × bloque</summary>
        <div className="overflow-x-auto px-4 pb-3"><table className="tnum w-full text-[13px]"><thead><tr className="text-left font-mono text-[11px] uppercase text-muted"><th>Día</th>{BLOCKS.map(b => <th key={b[0]}>{b[0]}</th>)}</tr></thead><tbody>
          {blocks.map((r, i) => <tr key={i} className="border-t border-line"><td className="py-1 font-semibold">{DOW[i]}</td>{r.map(b => <td key={b.label}>{b.purchases >= MIN_PURCHASES * 2 ? `ROAS ${b.roas.toFixed(2)} · ${mxn0(b.spend)} · ${b.purchases.toFixed(0)}c` : <span className="text-muted">{mxn0(b.spend)} · {b.purchases.toFixed(0)}c</span>}</td>)}</tr>)}
        </tbody></table></div></Card>
    </div>
  );
}
