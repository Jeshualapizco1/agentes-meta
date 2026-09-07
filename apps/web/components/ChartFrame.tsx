import type { ReactNode } from "react";
import { Card } from "./Card";
export function ChartFrame({ title, period, unit, legend, rows, children, span }: {
  title: string; period: string; unit: string; legend: string; rows: { label: string; value: string }[]; children: ReactNode; span?: 4 | 6 | 8 | 12;
}) {
  return <Card as="figure" span={span}>
    <figcaption className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-base font-semibold">{title}</h2><p className="mt-1 text-xs text-muted">{period} · {unit}</p></div>
      <span className="flex items-center gap-2 text-xs text-muted"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-data-roas" />{legend}</span>
    </figcaption>
    {children}
    <details className="mt-4 border-t border-line pt-2 text-xs text-muted"><summary>Ver los datos de la gráfica</summary>
      <table className="mt-2 w-full text-left text-sm"><caption className="sr-only">{title}, {unit}, {period}</caption>
        <thead><tr><th scope="col" className="py-2 font-medium">Día</th><th scope="col" className="py-2 text-right font-medium">{legend} ({unit})</th></tr></thead>
        <tbody>{rows.length ? rows.map(row => <tr key={row.label} className="border-t border-line"><th scope="row" className="py-2 font-normal">{row.label}</th><td className="tnum py-2 text-right text-ink">{row.value}</td></tr>) : <tr><td colSpan={2} className="py-3">No hay una serie disponible para esta lectura.</td></tr>}</tbody>
      </table>
    </details>
  </Card>;
}
