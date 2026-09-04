import { createElement, type ReactNode } from "react";

const SPAN: Record<number, string> = { 3: "lg:col-span-3", 4: "lg:col-span-4", 6: "lg:col-span-6", 8: "lg:col-span-8", 12: "lg:col-span-12" };

/** Tarjeta Bento. `hero` añade glow y sombra exterior (decorativo). `span`/`rows` posicionan en la rejilla de 12 columnas (solo desde lg). */
export function Card({ hero, span, rows, as = "section", className = "", eyebrow, title, action, children }: {
  hero?: boolean; span?: 3 | 4 | 6 | 8 | 12; rows?: 1 | 2; as?: "section" | "div" | "figure" | "article" | "li"; className?: string;
  eyebrow?: ReactNode; title?: ReactNode; action?: ReactNode; children: ReactNode;
}) {
  const cls = ["card", hero ? "card-hero" : "", span ? SPAN[span] : "", rows === 2 ? "lg:row-span-2" : "", "p-5", className].filter(Boolean).join(" ");
  return createElement(as, { className: cls },
    (eyebrow || title || action) ? (
      <header className="mb-3 flex items-start gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{eyebrow}</p>}
          {title && <h2 className="font-semibold leading-tight">{title}</h2>}
        </div>
        {action && <div className="ml-auto shrink-0">{action}</div>}
      </header>
    ) : null,
    children);
}
