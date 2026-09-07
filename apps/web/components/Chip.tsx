/** Chip semántico: ok / amber / crit conservan significado en todas las pantallas; meta = actor sistema; neutral = etiqueta. */
export function Chip({ tone = "neutral", children, title }: { tone?: "ok" | "amber" | "crit" | "meta" | "neutral"; children: React.ReactNode; title?: string }) {
  const cls = { ok: "bg-ok-soft text-ok", amber: "bg-amber-soft text-amber", crit: "bg-crit-soft text-crit", meta: "bg-meta-soft text-meta", neutral: "bg-white/5 text-muted border border-line" }[tone];
  return <span title={title} className={`ui-badge ${cls}`}>{children}</span>;
}
