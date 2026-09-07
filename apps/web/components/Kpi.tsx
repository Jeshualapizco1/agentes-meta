import type { ReactNode } from "react";

/**
 * KPI: etiqueta, valor, comparación contra los 7 días previos (delta con color semántico) y objetivo opcional con anillo de progreso.
 * `value` null → "—" (dato incompleto; no se estima). El anillo usa ok/crit según se cumpla el objetivo; el resto es decorativo.
 */
export function Kpi({ label, value, prev, format, higherIsBetter = true, target, hint, hero, prevLabel = "7 días previos", children }: {
  label: ReactNode; value: number | null; prev?: number | null; format: (v: number) => string; higherIsBetter?: boolean;
  target?: { value: number; label?: string }; hint?: ReactNode; hero?: boolean; prevLabel?: string; children?: ReactNode;
}) {
  value = value != null && Number.isFinite(value) ? value : null;
  prev = prev != null && !Number.isFinite(prev) ? null : prev;
  target = target && Number.isFinite(target.value) && target.value > 0 ? target : undefined;
  const rawDelta = value != null && prev != null && prev > 0 ? ((value - prev) / prev) * 100 : null;
  const delta = rawDelta != null && Number.isFinite(rawDelta) ? rawDelta : null;
  const good = delta == null || delta === 0 ? null : (delta > 0) === higherIsBetter;
  const met = target && value != null ? (higherIsBetter ? value >= target.value : value <= target.value) : null;
  const ratio = target && value != null && value >= 0 ? Math.max(0, Math.min(1, higherIsBetter ? value / target.value : value === 0 ? 1 : target.value / value)) : 0;
  const R = 20, C = 2 * Math.PI * R;
  return (
    <div className="flex min-w-0 flex-col">
      {label && <p className="text-sm font-medium text-muted">{label}</p>}
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-4">
        <p className={hero ? "kpi-hero" : "tnum max-w-full break-words text-3xl font-bold leading-tight tracking-tight [overflow-wrap:anywhere]"}>{value == null ? "—" : format(value)}</p>
        {target && (
          <div className="flex items-center gap-2" title={`Objetivo ${target.label ?? format(target.value)}`}>
            <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0" aria-hidden="true">
              <circle cx="24" cy="24" r={R} fill="none" stroke="var(--color-line)" strokeWidth="5" />
              <circle cx="24" cy="24" r={R} fill="none" stroke={met == null ? "var(--color-muted)" : met ? "var(--color-ok)" : "var(--color-crit)"} strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - ratio)} transform="rotate(-90 24 24)" />
            </svg>
            <div className="text-[12px] leading-tight"><p className="text-muted">objetivo</p><p className="tnum font-semibold">{target.label ?? format(target.value)}</p>{met != null && <p className={met ? "text-ok" : "text-crit"}>{met ? "cumplido" : "no cumplido"}</p>}</div>
          </div>
        )}
      </div>
      {(prev !== undefined || hint) && (
        <p className="tnum mt-2 text-xs leading-relaxed text-muted">
          {prev !== undefined && <>{prevLabel} {prev == null ? "—" : format(prev)}{delta != null && <span className={good == null ? "text-muted" : good ? "text-ok" : "text-crit"}> · {delta === 0 ? "sin cambio" : `${delta > 0 ? "+" : ""}${delta.toFixed(0)}%`}</span>}</>}
          {hint && <span>{prev !== undefined ? " · " : ""}{hint}</span>}
        </p>
      )}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
