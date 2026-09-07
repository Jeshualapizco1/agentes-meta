import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { pageHref, sessionHref } from "@/lib/navigation";
import { fmtDay, fmtTime } from "@/lib/format";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { forceWeekly } from "@/app/analisis/actions";
import { MISSING_REF_LABEL, type MissingRefCause } from "@agentes-meta/core";
import { momentLabel, shortDate } from "@/lib/hoy-view";
export const dynamic = "force-dynamic";
export const metadata = { title: "Aprendizajes" };

const mxn0 = (v: number) => "$" + Math.round(v).toLocaleString("es-MX");
const H_LABEL: Record<string, string> = { "72h": "72 h", "7d": "7 días", "14d": "14 días" };
const CONF: Record<string, string> = { high: "evidencia sólida", medium: "evidencia media", low: "evidencia débil", insufficient: "sin evidencia suficiente" };
const WINDOW_STATUS: Record<string, string> = { mature: "Resultado final", preliminary: "Resultado preliminar", pending: "Esperando días completos" };
type Win = { session_id: string; horizon: string; status: string; confidence: string | null; verdict: string | null; caveats: string[] | null; agreement: string | null; reading: string | null; missing_refs: { rest: MissingRefCause | null; self: MissingRefCause | null } | null; delta: { roas_pct: number | null; control_roas_pct: number | null; cpa_pct: number | null } | null };
type Ev = { period: { start: string; end: string }; totals: { week: { spend: number; purchases: number; roas: number | null; cpa: number | null }; previous: { spend: number; purchases: number; roas: number | null; cpa: number | null }; roas_pct: number | null; cpa_pct: number | null; spend_pct: number | null }; sessions: { id: string; summary: string; actor_name: string; evaluations: { horizon: string; status: string; confidence: string; verdict: string }[] }[]; campaigns: { best: { name: string; roas: number; spend: number; purchases: number }[]; worst: { name: string; roas: number; spend: number; purchases: number }[] } };

function tone(w: Win): "ok" | "crit" | "amber" | "neutral" {
  if (w.status === "pending" || w.confidence === "insufficient") return "neutral";
  // solo se colorea como mejora o deterioro cuando las dos lecturas (resto de la cuenta y semana previa propia) coinciden
  if (w.reading === "up") return "ok"; if (w.reading === "down") return "crit";
  return "amber";
}

export default async function Analisis({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams; await requireUser("/analisis"); const sb = db();
  const accountId = p.account ?? "1703313583465547";
  const [{ data: accounts }, { data: sessions }, { data: reports }, { data: lastRun }] = await Promise.all([
    sb.from("accounts").select("id,name,timezone_name").eq("enabled", true).order("name"),
    sb.from("change_sessions").select("id,started_at,actor_name,summary,resets_learning,kind").eq("account_id", accountId).eq("significance", "major").eq("actor_kind", "person").gte("started_at", new Date(Date.now() - 30 * 86400_000).toISOString()).order("started_at", { ascending: false }),
    sb.from("analyses").select("id,period_start,period_end,narrative,model,evidence,triggered_by,created_at").eq("account_id", accountId).eq("kind", "weekly").order("period_end", { ascending: false }).limit(6),
    sb.from("agent_runs").select("started_at,status,stats").eq("agent", "analyst").eq("account_id", accountId).order("started_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const ids = (sessions ?? []).map(s => s.id);
  const { data: wins } = ids.length ? await sb.from("evaluation_windows").select("session_id,horizon,status,confidence,verdict,caveats,agreement,reading,missing_refs,delta").in("session_id", ids) : { data: [] as Win[] };
  const byS = new Map<string, Win[]>(); for (const w of (wins ?? []) as Win[]) byS.set(w.session_id, [...(byS.get(w.session_id) ?? []), w]);
  const acc = (accounts ?? []).find(a => a.id === accountId);
  const latest = reports?.[0];
  const ev = latest?.evidence as Ev | undefined;
  const pctTxt = (n: number | null | undefined) => (n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(0)}%`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div><p className="font-mono text-[11px] uppercase tracking-wider text-muted">Resultados de tus cambios · {lastRun?.status === "ok" ? `actualizado ${momentLabel(lastRun.started_at)}` : lastRun?.status === "failed" ? "última actualización falló; se reintenta sola" : "todavía sin actualización"}</p><h1 className="text-3xl font-bold tracking-tight">{acc?.name ?? accountId}: <span className="text-gradient">qué ayudó y qué no</span></h1></div>
        <form key={JSON.stringify(p)} className="ml-auto flex gap-2" method="get"><label className="flex min-w-0 flex-col gap-1 text-xs text-muted">Cuenta<select aria-label="Cuenta" name="account" defaultValue={accountId} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm">{(accounts ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><button className="btn-accent px-3 py-1 text-sm">Ver</button></form>
        <form action={forceWeekly}><input type="hidden" name="account" value={accountId} /><button className="rounded-xl border border-line px-3 py-1 text-sm hover:text-ink" title="Recalcula los resultados con los días cerrados hasta ayer">Actualizar resultados</button></form>
      </div>
      {p.forzado && <p className="rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">Resultados actualizados con los días cerrados hasta ayer. El resumen en texto se genera automáticamente más tarde.</p>}
      <p className="max-w-4xl text-sm text-muted">Cada cambio importante de una persona se evalúa a 72 h, 7 y 14 días: las campañas tocadas contra el resto de la cuenta, antes contra después, solo con días completos. Un cambio "coincidió con" una mejora; no demostramos causa. Dos lecturas por ventana: frente al resto de la cuenta y frente a la propia semana previa de la campaña. <Chip tone="ok">mejora: las dos ≥ +10 pts</Chip> <Chip tone="crit">deterioro: las dos ≤ −10 pts</Chip> <Chip tone="amber">sin cambio claro, indicio o mixto (se contradicen)</Chip> <Chip tone="neutral">pendiente o sin evidencia</Chip></p>

      <Card hero eyebrow={latest ? `Reporte semanal · ${shortDate(latest.period_start)} a ${shortDate(latest.period_end)} · ${latest.model ? "con resumen automático" : "cifras sin resumen en texto"}` : "Reporte semanal"} action={reports && reports.length > 1 ? <span className="font-mono text-[11px] text-muted">{reports.length} reportes</span> : undefined}>
        {latest && ev ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[["Gasto", mxn0(ev.totals.week.spend), pctTxt(ev.totals.spend_pct)], ["Compras", String(ev.totals.week.purchases), null], ["ROAS", ev.totals.week.roas?.toFixed(2) ?? "—", pctTxt(ev.totals.roas_pct)], ["CPA", ev.totals.week.cpa != null ? mxn0(ev.totals.week.cpa) : "—", pctTxt(ev.totals.cpa_pct)]].map(([l, v, d]) => <div key={l}><p className="font-mono text-[11px] uppercase tracking-wider text-muted">{l}</p><p className="tnum text-2xl font-bold">{v}</p>{d && <p className="font-mono text-[11px] text-muted">vs. semana previa {d}</p>}</div>)}
            </div>
            {latest.narrative ? <div className="prose-invert max-w-3xl whitespace-pre-wrap text-[14px] leading-relaxed">{latest.narrative}</div> : (
              <div className="rounded-xl bg-amber-soft px-4 py-3 text-sm">Todavía no hay resumen en texto. Abajo está el resultado de cada cambio.</div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="mb-1 font-mono text-[11px] uppercase text-ok">Mejores campañas de la semana (≥ 10 compras)</p>{ev.campaigns.best.length ? ev.campaigns.best.map(c => <p key={c.name} className="tnum text-sm"><b>{c.name}</b> · ROAS {c.roas.toFixed(2)} · {mxn0(c.spend)} · {c.purchases} compras</p>) : <p className="text-sm text-muted">sin campañas con evidencia suficiente</p>}</div>
              <div><p className="mb-1 font-mono text-[11px] uppercase text-crit">Peores campañas</p>{ev.campaigns.worst.map(c => <p key={c.name} className="tnum text-sm"><b>{c.name}</b> · ROAS {c.roas.toFixed(2)} · {mxn0(c.spend)} · {c.purchases} compras</p>)}</div>
            </div>
          </div>
        ) : <p className="text-sm text-muted">Todavía no hay reporte semanal para esta cuenta. Se genera solo cada lunes con el cierre del domingo, o al actualizar los resultados.</p>}
      </Card>

      <Card eyebrow="Sesiones de cambios · últimos 30 días" title="Veredicto por sesión (72 h · 7 días · 14 días)">
        {sessions?.length ? <ul className="flex flex-col divide-y divide-line">{sessions.map(s => { const ws = (byS.get(s.id) ?? []).sort((a, b) => ["72h", "7d", "14d"].indexOf(a.horizon) - ["72h", "7d", "14d"].indexOf(b.horizon)); return (
          <li key={s.id} className="flex flex-col gap-2 py-3">
            <p className="text-sm"><span className="font-mono text-[11px] text-muted">{fmtDay(s.started_at).split(",")[0]} · {fmtTime(s.started_at)}</span> <b>{s.actor_name}</b>{s.resets_learning && <span className="text-amber"> ↻</span>}: {s.summary} <a href={sessionHref(s.id, accountId, pageHref("/analisis", p))} className="text-meta">→</a></p>
            {ws.length ? <div className="grid gap-2 sm:grid-cols-3">{ws.map(w => <div key={w.horizon} className="rounded-xl border border-line bg-paper px-3 py-2 text-sm"><p className="mb-1 flex items-center gap-2"><Chip tone={tone(w)}>{H_LABEL[w.horizon]}</Chip><span className="font-mono text-[11px] text-muted">{WINDOW_STATUS[w.status] ?? "Esperando días completos"} · {CONF[w.confidence ?? "insufficient"]}</span></p><p className="leading-snug">{w.verdict}</p>{w.caveats?.map(c => <p key={c} className="mt-1 leading-snug text-amber">⚠ {c}</p>)}{w.missing_refs?.rest && w.missing_refs.rest !== "pendiente" && <p className="mt-1 font-mono text-[11px] leading-snug text-muted">Sin comparación con el resto de la cuenta: {MISSING_REF_LABEL[w.missing_refs.rest]}</p>}{w.missing_refs?.self && w.missing_refs.self !== "pendiente" && w.missing_refs.self !== w.missing_refs.rest && <p className="mt-1 font-mono text-[11px] leading-snug text-muted">Sin comparación con su semana previa: {MISSING_REF_LABEL[w.missing_refs.self]}</p>}</div>)}</div> : <p className="font-mono text-[11px] text-muted">Todavía sin días completos para medir</p>}
          </li>); })}</ul> : <p className="text-sm text-muted">Sin sesiones mayores de personas en 30 días.</p>}
      </Card>
    </div>
  );
}
