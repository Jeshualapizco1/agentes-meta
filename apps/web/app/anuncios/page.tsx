import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDay, fmtTime, initials } from "@/lib/format";
import { resolveRange } from "@/lib/range";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { DateRange } from "@/components/DateRange";
import { markReviewed } from "./actions";
export const dynamic = "force-dynamic";

const mxn0 = (v: number) => "$" + Math.round(v).toLocaleString("es-MX");
const REVIEW_DAYS = 7; // un anuncio activo con gasto cuenta como "sin revisar" si nadie lo revisó en estos días
type Agg = { spend: number; purchases: number; value: number; impressions: number; clicks: number };

export default async function Anuncios({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams; await requireUser("/anuncios"); const sb = db();
  const accountId = p.account ?? "1703313583465547";
  const range = resolveRange(p, 7);
  const estado = p.estado ?? "activos", orden = p.orden ?? "gasto";
  const por = [10, 25, 50].includes(Number(p.por)) ? Number(p.por) : 25;
  const { data: accounts } = await sb.from("accounts").select("id,name").eq("enabled", true).order("name");
  const [{ data: ads }, { data: parents }, { data: rows }, { data: reviews }] = await Promise.all([
    sb.from("entities").select("id,name,effective_status,parent_id,campaign_id,updated_time,thumb:raw->creative->>thumbnail_url").eq("account_id", accountId).eq("level", "ad"),
    sb.from("entities").select("id,name,level").eq("account_id", accountId).in("level", ["campaign", "adset"]),
    sb.from("insights_daily").select("entity_id,spend,purchases,purchase_value,impressions,link_clicks").eq("account_id", accountId).eq("level", "ad").gte("date", range.from).lte("date", range.to).limit(50000),
    sb.from("ad_reviews").select("ad_id,reviewed_by,note,created_at").eq("account_id", accountId).order("created_at", { ascending: false }).limit(5000),
  ]);
  const nameOf = new Map((parents ?? []).map(e => [e.id as string, e.name as string]));
  const agg = new Map<string, Agg>();
  for (const r of rows ?? []) { const a = agg.get(r.entity_id) ?? { spend: 0, purchases: 0, value: 0, impressions: 0, clicks: 0 }; a.spend += Number(r.spend ?? 0); a.purchases += Number(r.purchases ?? 0); a.value += Number(r.purchase_value ?? 0); a.impressions += Number(r.impressions ?? 0); a.clicks += Number(r.link_clicks ?? 0); agg.set(r.entity_id, a); }
  const lastReview = new Map<string, { reviewed_by: string; note: string | null; created_at: string }>();
  for (const r of reviews ?? []) if (!lastReview.has(r.ad_id)) lastReview.set(r.ad_id, r);
  const cutoff = Date.now() - REVIEW_DAYS * 86400_000;
  const isUnreviewed = (id: string, active: boolean, spend: number) => active && spend > 0 && !(lastReview.get(id) && new Date(lastReview.get(id)!.created_at).getTime() >= cutoff);

  let list = (ads ?? []).map(a => { const x = agg.get(a.id) ?? { spend: 0, purchases: 0, value: 0, impressions: 0, clicks: 0 }; const active = a.effective_status === "ACTIVE"; return { ...a, ...x, active, roas: x.spend > 0 ? x.value / x.spend : null, cpa: x.purchases > 0 ? x.spend / x.purchases : null, ctr: x.impressions > 0 ? (x.clicks / x.impressions) * 100 : null, unreviewed: isUnreviewed(a.id, active, x.spend), review: lastReview.get(a.id) }; });
  list = list.filter(a => estado === "todos" ? a.spend > 0 || a.active : a.active);
  const sorters: Record<string, (a: typeof list[number], b: typeof list[number]) => number> = {
    gasto: (a, b) => b.spend - a.spend, roas: (a, b) => (b.roas ?? -1) - (a.roas ?? -1), cpa: (a, b) => (a.cpa ?? 1e12) - (b.cpa ?? 1e12), sinrevisar: (a, b) => Number(b.unreviewed) - Number(a.unreviewed) || b.spend - a.spend,
  };
  list.sort(sorters[orden] ?? sorters.gasto!);
  const unreviewed = list.filter(a => a.unreviewed).length;
  const totalSpend = list.reduce((n, a) => n + a.spend, 0), totalValue = list.reduce((n, a) => n + a.value, 0), totalPurch = list.reduce((n, a) => n + a.purchases, 0);
  const pages = Math.max(1, Math.ceil(list.length / por));
  const pagina = Math.min(pages, Math.max(1, Number(p.pagina) || 1));
  const shown = list.slice((pagina - 1) * por, pagina * por);
  const qs = (extra: Record<string, string | number>) => { const q = new URLSearchParams({ account: accountId, estado, orden, por: String(por), ...(range.custom ? { from: range.from, to: range.to } : { days: String(range.days) }) }); for (const [k, v] of Object.entries(extra)) q.set(k, String(v)); return `/anuncios?${q}`; };
  const back = qs({ pagina });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div><p className="font-mono text-[11px] uppercase tracking-wider text-muted">Anuncios · {range.label} · {estado === "todos" ? "activos y con gasto" : "solo activos"}</p><h1 className="text-3xl font-bold tracking-tight">Qué anuncio gasta y qué devuelve</h1></div>
        <form className="ml-auto flex flex-wrap items-end gap-2" method="get">
          <select name="account" defaultValue={accountId} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm">{(accounts ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <select name="estado" defaultValue={estado} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm"><option value="activos">Activos</option><option value="todos">Activos y con gasto en el periodo</option></select>
          <select name="orden" defaultValue={orden} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm"><option value="gasto">Mayor gasto</option><option value="roas">Mejor ROAS</option><option value="cpa">Menor CPA</option><option value="sinrevisar">Sin revisar primero</option></select>
          <DateRange days={range.days} from={p.from} to={p.to} presets={[7, 14, 30]} label="" />
          <select name="por" defaultValue={String(por)} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm">{[10, 25, 50].map(n => <option key={n} value={n}>{n} por página</option>)}</select>
          <button className="btn-accent px-3 py-1 text-sm">Ver</button>
        </form>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Anuncios en la lista", String(list.length)], ["Gasto", mxn0(totalSpend)], ["ROAS", totalSpend ? (totalValue / totalSpend).toFixed(2) : "—"], ["Compras", totalPurch.toFixed(0)]].map(([l, v]) => <Card as="div" key={l} className="!p-4"><p className="font-mono text-[11px] uppercase tracking-wider text-muted">{l}</p><p className="tnum text-3xl font-bold leading-none">{v}</p></Card>)}
      </div>
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
        {unreviewed > 0 ? <Chip tone="amber">{unreviewed} sin revisar</Chip> : <Chip tone="ok">todo revisado</Chip>}
        Un anuncio activo con gasto cuenta como "sin revisar" si nadie lo marcó en los últimos {REVIEW_DAYS} días. Revisar no cambia nada en Meta: es la constancia de que alguien lo vio.
      </p>
      <Card className="!p-0">
        <div className="overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="text-left font-mono text-[11px] uppercase text-muted"><th className="px-4 py-2">Anuncio</th><th className="px-2">Estado</th><th className="px-2 text-right">Gasto</th><th className="px-2 text-right">Compras</th><th className="px-2 text-right">Valor</th><th className="px-2 text-right">ROAS</th><th className="px-2 text-right">CPA</th><th className="px-2 text-right">CTR</th><th className="px-2">Revisión</th><th></th></tr></thead><tbody>
          {shown.map(a => (
            <tr key={a.id} className={`tnum border-t border-line align-middle ${a.active ? "" : "text-muted"}`}>
              <td className="px-4 py-2"><div className="flex items-center gap-3">
                {a.thumb ? <img src={a.thumb as string} alt="" width={48} height={48} referrerPolicy="no-referrer" className="h-12 w-12 shrink-0 rounded-lg bg-paper object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-paper font-mono text-[11px] text-muted">sin img</span>}
                <div className="min-w-0 max-w-[360px]"><p className="truncate font-semibold text-ink" title={a.name}>{a.name}</p><p className="truncate font-mono text-[11px] text-muted" title={`${nameOf.get(a.campaign_id ?? "") ?? ""} › ${nameOf.get(a.parent_id ?? "") ?? ""}`}>{nameOf.get(a.campaign_id ?? "") ?? "—"} › {nameOf.get(a.parent_id ?? "") ?? "—"}</p></div>
              </div></td>
              <td className="px-2"><Chip tone={a.active ? "ok" : "neutral"}>{a.active ? "activo" : (a.effective_status ?? "—").toLowerCase()}</Chip></td>
              <td className="px-2 text-right whitespace-nowrap">{mxn0(a.spend)}</td><td className="px-2 text-right">{a.purchases.toFixed(0)}</td><td className="px-2 text-right whitespace-nowrap">{mxn0(a.value)}</td>
              <td className="px-2 text-right">{a.roas != null ? a.roas.toFixed(2) : "—"}</td><td className="px-2 text-right whitespace-nowrap">{a.cpa != null ? mxn0(a.cpa) : "—"}</td><td className="px-2 text-right whitespace-nowrap">{a.ctr != null ? a.ctr.toFixed(2) + "%" : "—"}</td>
              <td className="px-2 whitespace-nowrap"><div className="flex items-center gap-2">{a.review ? <span className="flex items-center gap-2 font-mono text-[11px] text-muted"><span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: "var(--gradient-accent)" }} title={a.review.reviewed_by}>{initials(a.review.reviewed_by.split("@")[0]!.replace(".", " "))}</span>{fmtDay(a.review.created_at).split(",")[0]} {fmtTime(a.review.created_at)}{a.review.note && <span title={a.review.note}> · nota</span>}</span> : <span className="font-mono text-[11px] text-muted">nunca</span>}{a.unreviewed && <Chip tone="amber">sin revisar</Chip>}</div></td>
              <td className="pr-4 text-right"><form action={markReviewed} className="flex items-center justify-end gap-1"><input type="hidden" name="ad_id" value={a.id} /><input type="hidden" name="account_id" value={accountId} /><input type="hidden" name="back" value={back} /><input name="note" placeholder="nota" className="w-24 rounded-lg border border-line bg-paper px-2 py-1 text-[12px]" /><button className="rounded-lg border border-line px-2 py-1 text-[12px] hover:text-ink">Revisado</button></form></td>
            </tr>))}
          {!list.length && <tr><td colSpan={10} className="px-4 py-6 text-center text-muted">Sin anuncios para este filtro.</td></tr>}
        </tbody></table></div>
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-2 font-mono text-[11px] text-muted">
          <span>{list.length ? `${(pagina - 1) * por + 1}–${Math.min(pagina * por, list.length)} de ${list.length}` : "0"}</span>
          <span className="ml-auto flex items-center gap-2">
            {pagina > 1 ? <a href={qs({ pagina: pagina - 1 })} className="rounded-lg border border-line px-2 py-1 hover:text-ink">← anterior</a> : <span className="rounded-lg border border-line px-2 py-1 opacity-40">← anterior</span>}
            <span>página {pagina} de {pages}</span>
            {pagina < pages ? <a href={qs({ pagina: pagina + 1 })} className="rounded-lg border border-line px-2 py-1 hover:text-ink">siguiente →</a> : <span className="rounded-lg border border-line px-2 py-1 opacity-40">siguiente →</span>}
          </span>
        </div>
      </Card>
    </div>
  );
}
