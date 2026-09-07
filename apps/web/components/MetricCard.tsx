import { Card } from "./Card";
import { Kpi } from "./Kpi";
import { StatusBadge } from "./StatusBadge";
export function MetricCard({ label, value, format, period, previous, higherIsBetter = true, dataState = "ready", hero = false, span }: {
  label: string; value: number | null; format: (value: number) => string; period: string;
  previous?: { value: number | null; label: string }; higherIsBetter?: boolean;
  dataState?: "ready" | "partial" | "stale" | "loading" | "forbidden" | "missing" | "error"; hero?: boolean; span?: 3 | 4 | 6 | 8 | 12;
}) {
  const canCompare = dataState === "ready";
  const canDisplay = canCompare || dataState === "partial" || dataState === "stale";
  return <Card hero={hero} span={span}>
    <Kpi label={label} value={canDisplay ? value : null} format={format} hero={hero}
      prev={canCompare ? previous?.value : undefined} prevLabel={previous?.label} higherIsBetter={higherIsBetter} />
    <p className="mt-4 text-xs text-muted">{period}</p>
    {(dataState === "partial" || dataState === "stale") && <div className="mt-3"><StatusBadge status={dataState} /></div>}
    {!canDisplay && <p className={`mt-3 text-xs ${dataState === "error" ? "text-crit" : "text-muted"}`}>{dataState === "error" ? "No se pudo verificar" : dataState === "loading" ? "Cargando datos…" : dataState === "forbidden" ? "Sin permiso de lectura" : "Sin datos disponibles"}</p>}
  </Card>;
}
