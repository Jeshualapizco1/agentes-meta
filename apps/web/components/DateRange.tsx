"use client";
import { useId, useState } from "react";
import { dayKey } from "@/lib/format";
import { MAX_RANGE_DAYS, validDayCount } from "@/lib/range";

type Props = { days: number; from?: string; to?: string; presets?: number[]; label?: string; today?: string };
/** La clave reinicia el borrador cuando cambia el rango de la URL, también con Atrás/Adelante. */
export function DateRange(props: Props) {
  return <RangeFields key={`${props.days}:${props.from ?? ""}:${props.to ?? ""}`} {...props} />;
}
function RangeFields({ days, from, to, presets = [7, 14, 30, 90], label = "Periodo", today = dayKey(new Date()) }: Props) {
  const id = useId();
  const [selection, setSelection] = useState(from ? "custom" : String(days));
  const [start, setStart] = useState(from ?? "");
  const [end, setEnd] = useState(to ?? "");
  const custom = selection === "custom";
  const choices = [...new Set([...presets, days])].filter(d => validDayCount(String(d))).sort((a, b) => a - b);
  return <div className="date-range flex flex-wrap items-end gap-2">
    <div className="flex min-w-0 flex-col gap-1 text-xs text-muted"><label htmlFor={id}>{label || "Periodo"}</label>
      <select id={id} name={custom ? undefined : "days"} value={selection} onChange={e => setSelection(e.target.value)} className="border px-3 text-base text-ink">
        {choices.map(d => <option key={d} value={d}>Últimos {d} días</option>)}
        <option value="custom">Personalizado…</option>
      </select>
    </div>
    {custom && <>
      <label className="flex min-w-0 flex-col gap-1 text-xs text-muted">Desde<input type="date" name="from" required value={start} max={end && end < today ? end : today} onChange={e => setStart(e.target.value)} className="border px-3 text-base text-ink" /></label>
      <label className="flex min-w-0 flex-col gap-1 text-xs text-muted">Hasta<input type="date" name="to" required value={end} min={start || undefined} max={today} onChange={e => setEnd(e.target.value)} className="border px-3 text-base text-ink" /></label>
    </>}
    <span className="basis-full text-xs text-muted">Fechas en CDMX · hasta {MAX_RANGE_DAYS} días</span>
  </div>;
}
