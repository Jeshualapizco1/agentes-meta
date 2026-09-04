"use client";
import { useState } from "react";
import { Card } from "./Card";

export type Point = { date: string; value: number | null; closed: boolean };
/** Formatos serializables (un componente cliente no puede recibir funciones desde el servidor). */
export type Fmt = "mxn0" | "fixed1" | "fixed2" | "int";
const FMT: Record<Fmt, (v: number) => string> = { mxn0: v => "$" + Math.round(v).toLocaleString("es-MX"), fixed1: v => v.toFixed(1), fixed2: v => v.toFixed(2), int: v => v.toFixed(0) };
export type Marker = { id: string; date: string; time: string; actor: string; summary: string; resets: boolean; href: string };

/** Gráfica de una serie en el tiempo con marcadores de cambios. Un eje. Línea 2px. Hover con crosshair + tooltip. */
export function TimeSeries({ title, unit, points, markers, fmt = "mxn0", height = 180 }: { title: string; unit?: string; points: Point[]; markers: Marker[]; fmt?: Fmt; height?: number }) {
  const format = FMT[fmt];
  const [hover, setHover] = useState<number | null>(null);
  const W = 920, H = height, padL = 56, padR = 16, padT = 14, padB = 34;
  const iw = W - padL - padR, ih = H - padT - padB;
  const xs = points.map((_, i) => padL + (points.length > 1 ? (i / (points.length - 1)) * iw : iw / 2));
  const vals = points.map(p => p.value).filter((v): v is number => v != null);
  const max = Math.max(1, ...vals) * 1.08, min = 0;
  const y = (v: number) => padT + ih - ((v - min) / (max - min)) * ih;
  const path = points.map((p, i) => p.value == null ? null : `${i === 0 || points[i - 1]?.value == null ? "M" : "L"}${xs[i]!.toFixed(1)},${y(p.value).toFixed(1)}`).filter(Boolean).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => min + f * (max - min));
  const idxOf = (date: string) => points.findIndex(p => p.date === date);
  const byDate = new Map<number, Marker[]>(); for (const m of markers) { const i = idxOf(m.date); if (i >= 0) byDate.set(i, [...(byDate.get(i) ?? []), m]); }
  const h = hover != null ? points[hover] : null;
  const lastClosed = points.map((p, i) => (p.closed ? i : -1)).filter(i => i >= 0).pop();

  return (
    <Card as="figure">
      <figcaption className="mb-1 flex items-baseline gap-3"><span className="font-semibold">{title}</span>{unit && <span className="font-mono text-[11px] text-muted">{unit}</span>}<span className="ml-auto font-mono text-[11px] text-muted">{h ? `${h.date} · ${h.value != null ? format(h.value) : "sin dato"}${h.closed ? "" : " · día en curso"}${byDate.get(hover!) ? ` · ${byDate.get(hover!)!.length} cambio(s)` : ""}` : "pasa el cursor"}</span></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}
        onMouseLeave={() => setHover(null)}>
        <defs><linearGradient id={`ts-${title.replace(/\W+/g, "-")}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient></defs>
        <g
        onMouseMove={e => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * W; let best = 0; for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i]! - x) < Math.abs(xs[best]! - x)) best = i; setHover(best); }}>
        {ticks.map(t => <g key={t}><line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" /><text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)" fontFamily="var(--font-mono)">{format(t)}</text></g>)}
        {points.map((p, i) => (i % Math.ceil(points.length / 8) === 0 || i === points.length - 1) && <text key={p.date} x={xs[i]} y={H - padB + 16} textAnchor="middle" fontSize="11" fill="var(--color-muted)" fontFamily="var(--font-mono)">{p.date.slice(5)}</text>)}
        {lastClosed != null && lastClosed < points.length - 1 && <rect x={xs[lastClosed]} y={padT} width={(xs[points.length - 1] ?? 0) - (xs[lastClosed] ?? 0)} height={ih} fill="var(--color-amber-soft)" opacity="0.6" />}
        <path d={path} fill="none" stroke={`url(#ts-${title.replace(/\W+/g, "-")})`} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="glow-line" />
        {[...byDate.entries()].map(([i, ms]) => { const p = points[i]!; const cy = p.value != null ? y(p.value) : padT + ih; const resets = ms.some(m => m.resets); return (
          <g key={i}>
            <line x1={xs[i]} x2={xs[i]} y1={cy} y2={padT + ih} stroke={resets ? "var(--color-amber)" : "var(--color-ink)"} strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
            <circle cx={xs[i]} cy={cy} r="5" fill={resets ? "var(--color-amber)" : "var(--color-ink)"} stroke="var(--color-surface-solid)" strokeWidth="2" />
            {ms.length > 1 && <text x={xs[i]} y={cy - 9} textAnchor="middle" fontSize="10" fill="var(--color-muted)" fontFamily="var(--font-mono)">{ms.length}</text>}
          </g>); })}
        {h && <g><line x1={xs[hover!]} x2={xs[hover!]} y1={padT} y2={padT + ih} stroke="var(--color-muted)" strokeWidth="1" />{h.value != null && <circle cx={xs[hover!]} cy={y(h.value)} r="4" fill="#a78bfa" stroke="var(--color-surface-solid)" strokeWidth="2" />}</g>}
        </g>
      </svg>
    </Card>
  );
}
