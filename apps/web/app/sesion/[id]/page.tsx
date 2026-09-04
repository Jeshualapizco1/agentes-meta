import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDay, fmtTime, KIND_LABEL, mxn } from "@/lib/format";
import { Chip } from "@/components/Chip";
import { notFound } from "next/navigation";
import { annotate } from "./actions";
import { Card } from "@/components/Card";
export const dynamic = "force-dynamic";

export default async function Sesion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const user = await requireUser(`/sesion/${id}`); const sb = db();
  const { data: s } = await sb.from("change_sessions").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();
  const [{ data: groups }, { data: notes }, { data: acc }] = await Promise.all([
    sb.from("change_groups").select("*").eq("session_id", id).order("started_at"),
    sb.from("annotations").select("*").eq("session_id", id).order("created_at"),
    sb.from("accounts").select("name,timezone_name").eq("id", s.account_id).single(),
  ]);
  const ids = (groups ?? []).map(g => g.id);
  const { data: events } = ids.length ? await sb.from("change_events").select("id,group_id,event_time,event_type,extra_data,old_value,new_value").in("group_id", ids).order("event_time") : { data: [] };
  const evByGroup = new Map<string, NonNullable<typeof events>>(); for (const e of events ?? []) evByGroup.set(e.group_id, [...(evByGroup.get(e.group_id) ?? []), e]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{acc?.name} · {fmtDay(s.started_at)} · {fmtTime(s.started_at)}–{fmtTime(s.ended_at)} CDMX</p>
        <h1 className="text-2xl font-bold tracking-tight">{s.actor_name}: {s.summary}</h1>
        <div className="mt-2 flex gap-2"><Chip tone={s.significance === "major" ? "ok" : "neutral"}>{KIND_LABEL[s.kind] ?? s.kind}</Chip>{s.resets_learning && <Chip tone="amber">↻ reinicia aprendizaje</Chip>}<Chip>{s.group_count} objeto(s) · {s.event_count} evento(s)</Chip></div>
      </div>

      <Card>
        <div className="flex items-start gap-3"><h2 className="font-semibold">¿Por qué se hizo este cambio?</h2><a href={`/experimentos?account=${s.account_id}&session=${id}`} className="ml-auto rounded-xl border border-line px-3 py-1 text-sm hover:text-ink" title="Precarga las campañas tocadas; declaras hipótesis, criterio de éxito y presupuesto">Convertir en experimento →</a></div>
        <p className="text-sm text-muted">La bitácora sabe qué pasó; solo quien lo hizo sabe por qué. Una línea basta. Si es una prueba, di qué esperas ver y en cuánto tiempo.</p>
        {(notes ?? []).map(n => <blockquote key={n.id} className="mt-3 border-l-2 border-meta pl-3 text-[15px]"><b>{n.author_email.split("@")[0]}</b>: {n.reason}{n.hypothesis && <><br /><span className="text-muted">Hipótesis:</span> {n.hypothesis}</>}{n.success_criterion && <><br /><span className="text-muted">Criterio de éxito:</span> {n.success_criterion}</>}</blockquote>)}
        <form action={annotate} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="session_id" value={id} />
          <input type="hidden" name="author_email" value={user?.email ?? ""} />
          <input name="reason" required placeholder="Razón (obligatoria)" className="rounded-lg border border-line bg-paper px-2 py-1 text-sm" />
          <input name="hypothesis" placeholder="Hipótesis (opcional)" className="rounded-lg border border-line bg-paper px-2 py-1 text-sm" />
          <input name="success_criterion" placeholder="Criterio de éxito, p. ej. CPA < $180 en 7 días" className="rounded-lg border border-line bg-paper px-2 py-1 text-sm" />
          <button className="w-fit btn-accent px-3 py-1.5 text-sm font-semibold text-white">Guardar razón</button>
        </form>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Objetos tocados</h2>
        {(groups ?? []).map(g => (
          <Card as="details" key={g.id} className="!p-0">
            <summary className="flex flex-wrap items-center gap-2 px-4 py-3">
              <Chip tone="neutral">{({ CAMPAIGN_GROUP: "campaña", CAMPAIGN: "ad set", ADGROUP: "anuncio", ACCOUNT: "cuenta" } as Record<string, string>)[g.object_type] ?? g.object_type}</Chip>
              <span className="font-semibold">{g.object_name}</span>
              <span className="text-muted">— {g.summary}</span>
              {g.resets_learning && <Chip tone="amber">↻</Chip>}
              <span className="ml-auto font-mono text-[11px] text-muted">{fmtTime(g.started_at)} · {g.event_count} ev.</span>
            </summary>
            <div className="border-t border-line px-4 py-3 text-sm">
              {g.details?.budget && <p className="mb-2">Presupuesto {g.details.budget.period === "lifetime" ? "total" : "diario"}: <b className="tnum">{mxn(g.details.budget.oldCents ?? 0)} → {mxn(g.details.budget.newCents ?? 0)}</b> ({g.details.budget.pct >= 0 ? "+" : ""}{g.details.budget.pct}%)</p>}
              {g.details?.targeting && Object.keys(g.details.targeting).length > 0 && (
                <table className="mb-2 w-full text-[13px]"><thead><tr className="text-left font-mono text-[11px] uppercase text-muted"><th className="py-1">Campo</th><th>Antes</th><th>Después</th></tr></thead>
                  <tbody>{Object.entries(g.details.targeting as Record<string, { old?: string; new?: string }>).map(([k, v]) => <tr key={k} className="border-t border-line align-top"><td className="py-1 pr-2 font-semibold">{k}</td><td className="pr-2 text-muted">{v.old ?? "—"}</td><td>{v.new ?? "—"}</td></tr>)}</tbody></table>
              )}
              <ul className="font-mono text-[12px] text-muted">{(evByGroup.get(g.id) ?? []).map(e => <li key={e.id}>{fmtTime(e.event_time)} {e.event_type}{e.old_value != null || e.new_value != null ? ` · ${short(e.old_value)} → ${short(e.new_value)}` : ""}</li>)}</ul>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
function short(v: unknown): string { if (v == null) return "∅"; const s = typeof v === "string" ? v : JSON.stringify(v); return s.length > 60 ? s.slice(0, 57) + "…" : s; }
