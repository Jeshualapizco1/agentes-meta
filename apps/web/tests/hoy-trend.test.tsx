import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HoyTrend } from "@/components/hoy/HoyTrend";
import type { HoyTrendPoint } from "@/lib/hoy-view";

describe("representación de la tendencia de Hoy", () => {
  it("distingue cero, dato ausente y ROAS no calculable en la tabla", () => {
    const html = renderToStaticMarkup(<HoyTrend points={[
      { date: "2026-09-01", value: 0, unavailable: null },
      { date: "2026-09-02", value: null, unavailable: "missing" },
      { date: "2026-09-03", value: null, unavailable: "not-calculable" },
    ]} />);
    expect(html).toContain("0.00"); expect(html).toContain("Sin lectura cerrada"); expect(html).toContain("ROAS no calculable");
    expect(html.match(/<circle /g)).toHaveLength(1);
  });
  it("un hueco corta la línea en segmentos separados", () => {
    const points: HoyTrendPoint[] = [1, 2, null, 3, 4].map((value, i) => ({ date: `2026-09-0${i + 1}`, value, unavailable: value === null ? "missing" : null }));
    const html = renderToStaticMarkup(<HoyTrend points={points} />);
    expect(html.match(/stroke-linecap="round"/g)).toHaveLength(2);
    expect(html.match(/<circle /g)).toHaveLength(4);
  });
  it("una serie vacía se explica y no lanza una excepción", () => {
    const html = renderToStaticMarkup(<HoyTrend points={[]} />);
    expect(html).toContain("Sin periodo disponible"); expect(html).toContain("No hay una serie disponible"); expect(html).not.toContain("<circle ");
  });
  it("los límites numéricos nunca producen coordenadas no finitas", () => {
    const points: HoyTrendPoint[] = [Number.MAX_VALUE, NaN, Infinity].map((value, i) => ({ date: `2026-09-0${i + 1}`, value, unavailable: null }));
    const html = renderToStaticMarkup(<HoyTrend points={points} />);
    expect(html).not.toContain("NaN"); expect(html).not.toContain("Infinity"); expect(html.match(/<circle /g)).toHaveLength(1);
  });
});
