export type SparkPoint = { date: string; value: number | null; closed: boolean };
export type SparkMarker = { date: string; resets?: boolean };

/** Serie pequeña: área con gradiente, línea con glow (decorativo), marcadores de cambios y franja ámbar del día en curso. Sin ejes. */
export function Sparkline({ points, markers = [], height = 64, id }: { points: SparkPoint[]; markers?: SparkMarker[]; height?: number; id: string }) {
  const W = 320, H = height, pad = 6;
  const n = points.length;
  const xs = points.map((_, i) => pad + (n > 1 ? (i / (n - 1)) * (W - 2 * pad) : (W - 2 * pad) / 2));
  const vals = points.map(p => p.value).filter((v): v is number => v != null);
  const max = Math.max(1e-9, ...vals) * 1.1, min = 0;
  const y = (v: number) => pad + (H - 2 * pad) - ((v - min) / (max - min)) * (H - 2 * pad);
  let line = "", area = "", open = false, startX = 0;
  points.forEach((p, i) => {
    if (p.value == null) { if (open) { area += ` L${xs[i - 1]!.toFixed(1)},${H - pad} Z`; open = false; } return; }
    const px = xs[i]!.toFixed(1), py = y(p.value).toFixed(1);
    if (!open) { line += ` M${px},${py}`; area += ` M${px},${H - pad} L${px},${py}`; open = true; startX = xs[i]!; }
    else { line += ` L${px},${py}`; area += ` L${px},${py}`; }
  });
  if (open) area += ` L${xs[n - 1]!.toFixed(1)},${H - pad} Z`;
  void startX;
  const firstOpen = points.findIndex(p => !p.closed);
  const idx = new Map(points.map((p, i) => [p.date, i]));
  const last = [...points].reverse().find(p => p.value != null);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="Tendencia">
      <defs>
        <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity="0.45" /><stop offset="100%" stopColor="#7c3aed" stopOpacity="0" /></linearGradient>
        <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient>
      </defs>
      {firstOpen >= 0 && firstOpen > 0 && <rect x={xs[firstOpen - 1]} y={0} width={W - pad - xs[firstOpen - 1]!} height={H} fill="var(--color-amber-soft)" />}
      <path d={area.trim()} fill={`url(#${id}-area)`} />
      <path d={line.trim()} fill="none" stroke={`url(#${id}-line)`} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="glow-line" vectorEffect="non-scaling-stroke" />
      {markers.map((m, k) => { const i = idx.get(m.date); if (i == null) return null; const p = points[i]!; const cy = p.value != null ? y(p.value) : H - pad; return <circle key={k} cx={xs[i]} cy={cy} r="3.5" fill={m.resets ? "var(--color-amber)" : "var(--color-ink)"} stroke="var(--color-surface-solid)" strokeWidth="1.5" />; })}
      {last && <circle cx={xs[idx.get(last.date)!]} cy={y(last.value!)} r="3" fill="#a78bfa" />}
    </svg>
  );
}
