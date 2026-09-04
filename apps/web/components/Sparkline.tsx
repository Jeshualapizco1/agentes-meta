"use client";
import { useState } from "react";
import { Tip } from "./TimeSeries";

export type SparkPoint = { date: string; value: number | null; closed: boolean };
export type SparkMarker = { date: string; resets?: boolean };
export type SparkFmt = "mxn0" | "fixed1" | "fixed2" | "int";
const FMT: Record<SparkFmt, (v: number) => string> = { mxn0: v => "$" + Math.round(v).toLocaleString("es-MX"), fixed1: v => v.toFixed(1), fixed2: v => v.toFixed(2), int: v => v.toFixed(0) };

/** Serie pequeña: área con gradiente, línea con glow (decorativo), marcadores de cambios, franja ámbar del día en curso y lectura al pasar el cursor. Sin ejes. */
export function Sparkline({ points, markers = [], height = 64, id, fmt = "fixed2", unit }: { points: SparkPoint[]; markers?: SparkMarker[]; height?: number; id: string; fmt?: SparkFmt; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const format = FMT[fmt];
  const W = 320, H = height, pad = 6;
  const n = points.length;
  const xs = points.map((_, i) => pad + (n > 1 ? (i / (n - 1)) * (W - 2 * pad) : (W - 2 * pad) / 2));
  const vals = points.map(p => p.value).filter((v): v is number => v != null);
  const max = Math.max(1e-9, ...vals) * 1.1, min = 0;
  const y = (v: number) => pad + (H - 2 * pad) - ((v - min) / (max - min)) * (H - 2 * pad);
  let line = "", area = "", open = false;
  points.forEach((p, i) => {
    if (p.value == null) { if (open) { area += ` L${xs[i - 1]!.toFixed(1)},${H - pad} Z`; open = false; } return; }
    const px = xs[i]!.toFixed(1), py = y(p.value).toFixed(1);
    if (!open) { line += ` M${px},${py}`; area += ` M${px},${H - pad} L${px},${py}`; open = true; }
    else { line += ` L${px},${py}`; area += ` L${px},${py}`; }
  });
  if (open) area += ` L${xs[n - 1]!.toFixed(1)},${H - pad} Z`;
  const firstOpen = points.findIndex(p => !p.closed);
  const idx = new Map(points.map((p, i) => [p.date, i]));
  const changesByDay = new Map<string, number>(); for (const m of markers) changesByDay.set(m.date, (changesByDay.get(m.date) ?? 0) + 1);
  const last = [...points].reverse().find(p => p.value != null);
  const h = hover != null ? points[hover] : null;
  return (
    <div className="relative">
      <p className="mb-1 h-4 font-mono text-[11px] text-muted">pasa el cursor para ver cada día</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="Tendencia"
        onMouseLeave={() => setHover(null)}
        onMouseMove={e => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * W; let best = 0; for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i]! - x) < Math.abs(xs[best]! - x)) best = i; setHover(best); }}>
        <defs>
          <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity="0.45" /><stop offset="100%" stopColor="#7c3aed" stopOpacity="0" /></linearGradient>
          <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient>
        </defs>
        {firstOpen > 0 && <rect x={xs[firstOpen - 1]} y={0} width={W - pad - xs[firstOpen - 1]!} height={H} fill="var(--color-amber-soft)" />}
        <path d={area.trim()} fill={`url(#${id}-area)`} />
        <path d={line.trim()} fill="none" stroke={`url(#${id}-line)`} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="glow-line" vectorEffect="non-scaling-stroke" />
        {markers.map((m, k) => { const i = idx.get(m.date); if (i == null) return null; const p = points[i]!; const cy = p.value != null ? y(p.value) : H - pad; return <circle key={k} cx={xs[i]} cy={cy} r="3.5" fill={m.resets ? "var(--color-amber)" : "var(--color-ink)"} stroke="var(--color-surface-solid)" strokeWidth="1.5" />; })}
        {last && <circle cx={xs[idx.get(last.date)!]} cy={y(last.value!)} r="3" fill="#a78bfa" />}
        {h && <g><line x1={xs[hover!]} x2={xs[hover!]} y1={0} y2={H} stroke="var(--color-muted)" strokeWidth="1" vectorEffect="non-scaling-stroke" />{h.value != null && <circle cx={xs[hover!]} cy={y(h.value)} r="4" fill="#a78bfa" stroke="var(--color-surface-solid)" strokeWidth="2" />}</g>}
      </svg>
      {h && <Tip x={(xs[hover!]! / W) * 100} y={20 + ((h.value != null ? y(h.value) : H - pad) / H) * 80} date={h.date} value={`${h.value != null ? format(h.value) : "sin dato"}${unit && h.value != null ? ` ${unit}` : ""}`} extra={[...(h.closed ? [] : ["día en curso"]), ...(changesByDay.get(h.date) ? [`${changesByDay.get(h.date)} cambio(s)`] : [])]} />}
    </div>
  );
}
