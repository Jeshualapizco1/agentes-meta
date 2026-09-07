import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, IconButton } from "@/components/Button";
import { Field } from "@/components/Field";
import { StatusBadge, type DisplayStatus } from "@/components/StatusBadge";
import { DataState, type DataStateKind } from "@/components/DataState";
import { Kpi } from "@/components/Kpi";
import { MetricCard } from "@/components/MetricCard";
const format = (value: number) => value.toFixed(2);
describe("contratos de componentes visuales", () => {
  it("un botón no envía formularios si no se pide y pending bloquea el envío", () => {
    expect(renderToStaticMarkup(<Button>Revisar</Button>)).toContain('type="button"');
    const pending = renderToStaticMarkup(<Button pending type="submit" pendingLabel="Guardando…">Guardar</Button>);
    expect(pending).toContain('disabled=""'); expect(pending).toContain('aria-busy="true"'); expect(pending).toContain("Guardando…");
  });
  it("un botón de icono tiene nombre accesible obligatorio", () => {
    expect(renderToStaticMarkup(<IconButton label="Cerrar detalle" icon="×" />)).toContain('aria-label="Cerrar detalle"');
  });
  it("un campo enlaza etiqueta, ayuda y error", () => {
    const html = renderToStaticMarkup(<Field id="amount" label="Importe" help="En MXN" error="Revisa el valor" />);
    expect(html).toContain('for="amount"'); expect(html).toContain('aria-describedby="amount-help amount-error"'); expect(html).toContain('aria-invalid="true"');
  });
  it.each(["simulation", "simulated", "pending", "unconfirmed", "off"] as DisplayStatus[])("%s no se representa como éxito confirmado", status => {
    const html = renderToStaticMarkup(<StatusBadge status={status} />);
    expect(html).not.toContain("text-ok"); expect(html).not.toContain("Ejecución confirmada");
  });
  it.each(["empty", "error", "partial", "stale", "forbidden", "loading"] as DataStateKind[])("explica el estado %s sin inventar un éxito", kind => {
    const html = renderToStaticMarkup(<DataState kind={kind} />);
    expect(html).toContain(kind === "error" ? 'role="alert"' : 'role="status"'); expect(html).not.toContain("todo en orden");
  });
  it.each([null, Number.NaN, Number.POSITIVE_INFINITY])("un valor no disponible no se formatea como importe: %s", value => {
    const html = renderToStaticMarkup(<Kpi label="ROAS" value={value} format={format} target={{ value: 3 }} />);
    expect(html).toContain("—"); expect(html).not.toContain("no cumplido"); expect(html).not.toContain("NaN");
  });
  it("cero es un valor y una comparación sin cambio es neutral", () => {
    expect(renderToStaticMarkup(<Kpi label="Gasto" value={0} format={format} />)).toContain("0.00");
    const html = renderToStaticMarkup(<Kpi label="ROAS" value={3} prev={3} format={format} />);
    expect(html).toContain("sin cambio"); expect(html).not.toContain("text-crit"); expect(html).not.toContain("text-ok");
  });
  it.each(["partial", "stale", "loading", "forbidden", "missing", "error"] as const)("una lectura %s no se compara como completa", dataState => {
    const html = renderToStaticMarkup(<MetricCard label="ROAS" value={3} previous={{ value: 2, label: "Referencia completa" }} format={format} period="Periodo de ejemplo" dataState={dataState} />);
    expect(html).not.toContain("Referencia completa"); expect(html).not.toContain("+50%");
  });
  it("una comparación fuera de rango no imprime infinito", () => {
    expect(renderToStaticMarkup(<Kpi label="ROAS" value={Number.MAX_VALUE} prev={Number.MIN_VALUE} format={() => "valor"} />)).not.toContain("Infinity");
  });
});
