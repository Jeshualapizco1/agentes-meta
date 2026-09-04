import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDay, dayKey } from "@/lib/format";
import { resolveRange, listDays } from "@/lib/range";
import { Filters } from "@/components/Filters";
import { SessionRow, type Session } from "@/components/SessionRow";
import { Card } from "@/components/Card";
export const dynamic = "force-dynamic";

export default async function Bitacora({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  await requireUser("/bitacora");
  const sb = db();
  const range = resolveRange(params, 14);
  const [{ data: accounts }, { data: actorsRaw }] = await Promise.all([
    sb.from("accounts").select("id,name").eq("enabled", true).order("name"),
    sb.from("change_sessions").select("actor_name,actor_kind").in("actor_kind", ["person", "agent", "meta"]),
  ]);
  // personas primero; el Estratega (agente) y Meta (sistema) al final para poder filtrar por ellos
  const people = [...new Set((actorsRaw ?? []).filter(a => a.actor_kind === "person").map(a => a.actor_name as string))].sort();
  const systems = [...new Set((actorsRaw ?? []).filter(a => a.actor_kind !== "person").map(a => a.actor_name as string))].sort();
  const actors = [...people, ...systems];
  let q = sb.from("change_sessions").select("*").gte("started_at", range.sinceIso).lte("started_at", range.untilIso).order("started_at", { ascending: false }).limit(800);
  if (params.account) q = q.eq("account_id", params.account);
  if (params.actor) q = q.eq("actor_name", params.actor);
  // al filtrar por el Estratega o por Meta, sus sesiones son menores o de sistema: sin filtro de significancia por defecto
  const sig = params.sig ?? (params.actor && systems.includes(params.actor) ? "all" : "decisions");
  if (sig === "major") q = q.eq("significance", "major"); else if (sig !== "all") q = q.neq("significance", "system");
  const { data: sessions, error } = await q;
  if (error) throw new Error(error.message);
  const accName = new Map((accounts ?? []).map(a => [a.id, a.name]));
  const byDay = new Map<string, Session[]>();
  for (const s of (sessions ?? []) as Session[]) { const k = dayKey(s.started_at); byDay.set(k, [...(byDay.get(k) ?? []), s]); }
  // días sin cambios dentro del periodo se muestran explícitamente
  const dayKeys = listDays(range);
  const majors = (sessions ?? []).filter(s => s.significance === "major").length;
  const resets = (sessions ?? []).filter(s => s.resets_learning).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted">Bitácora · {range.label}</p>
        <h1 className="text-3xl font-bold tracking-tight">Qué cambió en Meta, quién y cuándo</h1>
      </div>
      <Filters accounts={accounts ?? []} actors={actors} params={params} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Sesiones", sessions?.length ?? 0], ["Decisiones mayores", majors], ["Reinicios de aprendizaje", resets], ["Responsables", new Set((sessions ?? []).map(s => s.actor_name)).size]].map(([l, v]) => (
          <Card as="div" key={String(l)} className="!p-4"><p className="font-mono text-[11px] uppercase tracking-wider text-muted">{l}</p><p className="tnum text-2xl font-bold">{v}</p></Card>
        ))}
      </div>
      {dayKeys.map(k => {
        const list = byDay.get(k) ?? [];
        return (
          <Card key={k} className="!p-0">
            <h2 className="flex items-baseline gap-3 border-b border-line px-4 py-2 text-lg font-semibold">{fmtDay(k + "T12:00:00-06:00")}<span className="font-mono text-[11px] text-muted">{list.length ? `${list.length} sesión(es)` : "sin cambios registrados"}</span></h2>
            {list.length ? <ul className="px-4">{list.map(s => <SessionRow key={s.id} s={s} accountName={!params.account ? accName.get(s.account_id) : undefined} />)}</ul> : null}
          </Card>
        );
      })}
    </div>
  );
}
