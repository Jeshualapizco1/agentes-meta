import Link from "next/link";
import { Chip } from "./Chip";
import { fmtTime, actorColor, initials, KIND_LABEL } from "@/lib/format";
export type Session = { id: string; account_id: string; actor_name: string; actor_kind: string; started_at: string; ended_at: string; kind: string; significance: string; resets_learning: boolean; summary: string; campaign_ids: string[]; group_count: number; event_count: number; annotation_count?: number };
export function SessionRow({ s, accountName }: { s: Session; accountName?: string }) {
  const isMeta = s.actor_kind === "meta";
  const color = isMeta ? "#4B5BA6" : actorColor(s.actor_name);
  return (
    <li className={`grid grid-cols-[56px_36px_1fr] items-start gap-3 border-b border-line py-3 last:border-b-0 ${s.significance === "system" ? "opacity-70" : ""}`}>
      <span className="tnum pt-0.5 font-mono text-[13px] text-muted">{fmtTime(s.started_at)}</span>
      <span title={s.actor_name} className="flex h-8 w-8 items-center justify-center rounded-full font-mono text-[11px] font-semibold text-white" style={{ background: color }}>{isMeta ? "M" : initials(s.actor_name)}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{s.actor_name}</span>
          {accountName && <Chip>{accountName}</Chip>}
          <Chip tone={s.significance === "major" ? "ok" : s.significance === "minor" ? "neutral" : "meta"}>{KIND_LABEL[s.kind] ?? s.kind}</Chip>
          {s.resets_learning && <Chip tone="amber" title="Este cambio reinicia la fase de aprendizaje">↻ reinicia aprendizaje</Chip>}
          {s.annotation_count ? <Chip tone="ok">razón anotada</Chip> : null}
        </div>
        <p className="mt-1 text-[15px] leading-snug">{s.summary}</p>
        <div className="mt-1 flex gap-3 font-mono text-[11px] text-muted">
          <span>{s.group_count} objeto(s) · {s.event_count} evento(s)</span>
          <Link href={`/sesion/${s.id}`} className="text-accent hover:underline">ver detalle →</Link>
        </div>
      </div>
    </li>
  );
}
