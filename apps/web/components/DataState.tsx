import type { ReactNode } from "react";
const defaults = {
  empty: { title: "No hay registros en este periodo", description: "Prueba otro periodo o revisa los filtros.", icon: "—", tone: "text-muted" },
  error: { title: "No pudimos cargar los datos", description: "No podemos confirmar el estado de la cuenta. Intenta de nuevo.", icon: "!", tone: "text-crit" },
  partial: { title: "La lectura está incompleta", description: "Faltan datos. No uses esta lectura para decidir cambios de presupuesto.", icon: "◐", tone: "text-amber" },
  stale: { title: "Los datos necesitan actualizarse", description: "Revisa la sincronización antes de tomar una decisión.", icon: "◷", tone: "text-amber" },
  forbidden: { title: "No tienes acceso a esta información", description: "Pide a un administrador que revise tus permisos.", icon: "⊘", tone: "text-muted" },
  loading: { title: "Cargando datos…", description: "Estamos preparando la lectura. Todavía no hay un resultado confirmado.", icon: "", tone: "text-muted" },
} as const;
export type DataStateKind = keyof typeof defaults;
export function DataState({ kind, title, description, action }: { kind: DataStateKind; title?: string; description?: string; action?: ReactNode }) {
  const state = defaults[kind];
  return <div className="ui-data-state" role={kind === "error" ? "alert" : "status"} aria-busy={kind === "loading" || undefined}>
    <span aria-hidden="true" className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-current font-mono ${state.tone}`}>
      {kind === "loading" ? <span className="ui-spinner" /> : state.icon}
    </span>
    <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title ?? state.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{description ?? state.description}</p>
      {kind === "loading" && <div aria-hidden="true" className="mt-4 flex flex-col gap-2"><div className="ui-skeleton w-3/4" /><div className="ui-skeleton w-1/2" /></div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  </div>;
}
