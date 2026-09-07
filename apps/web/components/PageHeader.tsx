import type { ReactNode } from "react";
export function PageHeader({ title, eyebrow, description, action }: { title: string; eyebrow?: string; description?: string; action?: ReactNode }) {
  return <header className="flex flex-wrap items-end justify-between gap-5">
    <div className="min-w-0 max-w-3xl">
      {eyebrow && <p className="mb-2 text-xs font-medium tracking-wide text-muted">{eyebrow}</p>}
      <h1 className="text-[clamp(26px,3vw,34px)] font-bold leading-tight tracking-tight">{title}</h1>
      {description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
    </div>{action && <div className="shrink-0">{action}</div>}
  </header>;
}
