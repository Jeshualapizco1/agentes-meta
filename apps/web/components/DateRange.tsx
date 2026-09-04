"use client";
import { useState } from "react";

/**
 * Selector de periodo para formularios GET: atajos (últimos N días) o "Personalizado" con calendario de fecha inicio y fin
 * (inputs nativos de fecha, sin librerías). Envía `days` o `from`/`to`; el servidor resuelve el rango con resolveRange().
 */
export function DateRange({ days, from, to, presets = [7, 14, 30, 90], label = "Periodo" }: { days: number; from?: string; to?: string; presets?: number[]; label?: string }) {
  const [custom, setCustom] = useState(!!from);
  const [a, setA] = useState(from ?? "");
  const [b, setB] = useState(to ?? "");
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-muted">{label}
        <select name={custom ? undefined : "days"} value={custom ? "custom" : String(days)} onChange={e => setCustom(e.target.value === "custom")} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink">
          {presets.map(d => <option key={d} value={d}>Últimos {d} días</option>)}
          <option value="custom">Personalizado…</option>
        </select>
      </label>
      {custom && (
        <>
          <label className="flex flex-col gap-1 text-xs text-muted">Desde<input type="date" name="from" required value={a} max={b || today} onChange={e => setA(e.target.value)} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink" /></label>
          <label className="flex flex-col gap-1 text-xs text-muted">Hasta<input type="date" name="to" required value={b} min={a || undefined} max={today} onChange={e => setB(e.target.value)} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink" /></label>
        </>
      )}
    </div>
  );
}
