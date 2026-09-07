import { useId } from "react";
import { ChartFrame } from "../ChartFrame";
import { shortDate, type HoyTrendPoint } from "@/lib/hoy-view";

/** Calendario densificado desde el modelo: los huecos cortan la línea, nunca se interpolan. */
export function HoyTrend({ points }: { points: HoyTrendPoint[] }) {
  const id = useId().replaceAll(":", "");
  const valid = points.map(p => ({ ...p, value: p.value !== null && Number.isFinite(p.value) && p.value >= 0 ? p.value : null }));
  const maximum = Math.max(1, ...valid.map(p => p.value ?? 0));
  const padded = maximum < Number.MAX_VALUE / 1.15 ? maximum * 1.15 : maximum;
  const top = padded < 1e12 ? Math.ceil(padded * 10) / 10 : padded;
  const x = (i: number) => 8 + i * 584 / Math.max(1, points.length - 1);
  const y = (v: number) => 174 - (v / top) * 158;
  const segments: { x: number; y: number }[][] = [];
  let segment: { x: number; y: number }[] = [];
  valid.forEach((p, i) => { if (p.value === null) { if (segment.length) segments.push(segment); segment = []; } else segment.push({ x: x(i), y: y(p.value) }); });
  if (segment.length) segments.push(segment);
  return <ChartFrame title="La tendencia, sin ruido" period={points.length ? `${shortDate(points[0]!.date)} – ${shortDate(points.at(-1)!.date)}` : "Sin periodo disponible"} unit="veces" legend="ROAS"
    rows={valid.map(p => ({ label: shortDate(p.date), value: p.value === null ? p.unavailable === "missing" ? "Sin lectura cerrada" : "ROAS no calculable" : p.value.toFixed(2) }))}>
    <div className="hoy-chart" aria-hidden="true"><div className="hoy-chart-axis"><span>{top.toFixed(1)}</span><span>{(top / 2).toFixed(1)}</span><span>0</span></div>
      <svg viewBox="0 0 600 190" preserveAspectRatio="none"><defs><linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-meta)" stopOpacity=".28" /><stop offset="100%" stopColor="var(--color-meta)" stopOpacity="0" /></linearGradient></defs>
        {[16, 95, 174].map(v => <path key={v} d={`M0 ${v} H600`} stroke="var(--color-line)" strokeDasharray="3 6" vectorEffect="non-scaling-stroke" />)}
        {segments.map((s, i) => { const line = s.map((p, n) => `${n ? "L" : "M"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" "); return <g key={i}><path d={`${line} L${s.at(-1)!.x} 174 L${s[0]!.x} 174 Z`} fill={`url(#${id}-fill)`} /><path d={line} fill="none" stroke="var(--color-meta)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></g>; })}
        {valid.map((p, i) => p.value !== null && <circle key={p.date} cx={x(i)} cy={y(p.value)} r="3" fill="var(--color-meta)" />)}
      </svg>
    </div>
    <div className="hoy-chart-dates" aria-hidden="true">{[0, 6, 13].filter(i => points[i]).map(i => <span key={i}>{shortDate(points[i]!.date).replace(/ \d{4}$/, "")}</span>)}</div>
    <p className="mt-4 text-xs text-muted">Cada punto es un día cerrado. Los huecos indican datos ausentes o un ROAS no calculable, no ceros. La tabla distingue ambos casos.</p>
  </ChartFrame>;
}
