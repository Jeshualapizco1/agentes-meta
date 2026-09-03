export function Chip({ tone = "neutral", children, title }: { tone?: "ok" | "amber" | "crit" | "meta" | "neutral"; children: React.ReactNode; title?: string }) {
  const cls = { ok: "bg-accent-soft text-accent", amber: "bg-amber-soft text-amber", crit: "bg-crit-soft text-crit", meta: "bg-meta-soft text-meta", neutral: "bg-paper text-muted border border-line" }[tone];
  return <span title={title} className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[11px] ${cls}`}>{children}</span>;
}
