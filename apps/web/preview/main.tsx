import { createRoot } from "react-dom/client";
import { useState } from "react";
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import "../app/globals.css";
import "./preview.css";
import { Button, IconButton } from "../components/Button";
import { Field, FormSection } from "../components/Field";
import { Card } from "../components/Card";
import { Chip } from "../components/Chip";
import { DataState, type DataStateKind } from "../components/DataState";
import { PageHeader } from "../components/PageHeader";
import { MetricCard } from "../components/MetricCard";
import { StatusBadge, type DisplayStatus } from "../components/StatusBadge";
import { ChartFrame } from "../components/ChartFrame";
import { Sparkline } from "../components/Sparkline";
import { movements, period, series } from "./fixtures";
import { ShellDemo } from "./ShellDemo";
import { HoyDemo } from "./HoyDemo";
import { ExperimentDemo } from "./ExperimentDemo";

const money = (value: number) => `$${value.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
function Brand() { return <a href="#resumen" className="demo-brand"><span className="demo-brand-mark" aria-hidden="true">a<span>m</span></span><span>Agentes Meta<small>INTELIGENCIA OPERATIVA</small></span></a>; }
function Demo() {
  const [dataState, setDataState] = useState<"ready" | DataStateKind>("ready");
  const [large, setLarge] = useState(false);
  const [review, setReview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [risk, setRisk] = useState(false);
  const [note, setNote] = useState("");
  const metricState = dataState === "empty" ? "missing" : dataState;
  return <>
    <a href="#contenido" className="skip-link">Saltar al contenido</a>
    <div className="demo-layout">
      <aside className="demo-sidebar">
        <Brand />
        <nav aria-label="Laboratorio visual" className="demo-nav"><p>VISTA PREVIA</p>
          <a href="#resumen" className="ui-nav-active" aria-current="page"><span aria-hidden="true">▦</span> Resumen</a>
          <a href="#componentes"><span aria-hidden="true">◇</span> Componentes</a>
          <a href="#estados"><span aria-hidden="true">◐</span> Estados y permisos</a>
        </nav>
        <div className="demo-sidebar-note"><span className="demo-connection" aria-hidden="true" /><p>Entorno de diseño<small>Sin conexión a Meta</small></p></div>
      </aside>
      <main id="contenido" tabIndex={-1} className="demo-main">
        <div className="demo-topline"><span className="demo-breadcrumb">Laboratorio <span aria-hidden="true">/</span> Sistema visual</span><Chip>Datos ficticios · no opera cuentas</Chip></div>
        <section id="resumen" className="demo-section">
          <PageHeader eyebrow="CLARIDAD PARA CADA DECISIÓN" title="El pulso de tu cuenta." description="Resultados, contexto y próximos pasos. Lo importante a primera vista; la evidencia, siempre a mano." action={<StatusBadge status="simulation" />} />
          <div className="demo-context"><div><span className="demo-avatar" aria-hidden="true">H</span><span><b>Horizonte Studio</b><small>Cuenta de demostración · MXN</small></span></div><span>{period}</span></div>
          <div className="demo-bento">
            <Card hero span={4} eyebrow="Retorno de la inversión publicitaria">
              <div className="demo-roas"><span className="demo-roas-value">{["ready", "partial", "stale"].includes(metricState) ? "3.42" : "—"}</span><span className="text-muted">ROAS</span></div>
              <p className="mt-3 max-w-64 text-sm text-muted">Valor atribuido por cada peso invertido en publicidad.</p>
              {metricState === "ready" ? <p className="mt-5 text-sm"><span className="text-ok">↗ +12.5%</span><span className="ml-2 text-muted">vs. periodo anterior</span></p> : <div className="mt-5"><Chip tone="amber">Lectura no confirmada</Chip></div>}
              <div className="demo-hero-footer"><span className="text-xs text-muted">Lectura de ejemplo, no un resultado real</span><span aria-hidden="true" className="text-meta">↗</span></div>
            </Card>
            <ChartFrame title="La tendencia, con contexto" period="31 ago–6 sep 2026 · datos de ejemplo" unit="veces" legend="ROAS" span={8} rows={dataState === "ready" ? series.map(p => ({ label: p.date, value: p.value.toFixed(2) })) : []}>
              {dataState === "ready" ? <Sparkline id="demo-roas" points={series} height={105} /> : <DataState kind={dataState} />}
            </ChartFrame>
            <MetricCard span={4} label="Inversión publicitaria" value={large ? 123456789012 : 24860} format={money} period={period} dataState={metricState} />
            <MetricCard span={4} label="Compras atribuidas" value={large ? 987654321 : 214} format={v => v.toLocaleString("es-MX")} previous={{ value: 198, label: "Periodo anterior:" }} period={period} dataState={metricState} />
            <MetricCard span={4} label="Costo por compra" value={116} format={money} previous={{ value: 129, label: "Periodo anterior:" }} higherIsBetter={false} period={period} dataState={metricState} />
            <Card span={8} title="Cada decisión deja una huella" eyebrow="REGISTRO DE EJEMPLO">
              <ul className="demo-movements">{movements.map(item => <li key={item.campaign}><div className="min-w-0"><p className="text-sm font-semibold">{item.campaign}</p><p className="mt-1 text-xs text-muted">{item.detail}</p></div><div className="demo-movement-result"><span className="tnum text-sm">{item.value}</span><StatusBadge status={item.status} /></div></li>)}</ul>
            </Card>
            <Card span={4} title="Una propuesta por revisar" eyebrow="TU SIGUIENTE PASO">
              <p className="mt-3 text-sm text-muted">Antes de decidir, revisa el importe, la evidencia y el efecto de confirmar.</p>
              <div className="mt-6"><Button variant="primary" onClick={() => setReview(v => !v)} aria-expanded={review} aria-controls="demo-review">{review ? "Cerrar ejemplo" : "Revisar ejemplo"}<span aria-hidden="true">↗</span></Button></div>
              {review && <div id="demo-review" className="mt-4"><DataState kind="partial" title="Esto es una demostración" description="No se aprueba ni ejecuta ninguna orden. La revisión real se implementará con los candados del roadmap." /></div>}
              <p className="mt-5 text-xs text-muted">Revisar no equivale a ejecutar.</p>
            </Card>
          </div>
        </section>
        <section id="componentes" className="demo-section">
          <div className="demo-section-heading"><span>01 / FUNDAMENTOS</span><h2>Menos ruido. Más intención.</h2><p>Una acción principal, campos comprensibles y un lenguaje común.</p></div>
          <div className="demo-bento">
            <Card span={6} title="Acciones con jerarquía">
              <div className="mt-4 flex flex-wrap items-center gap-3"><Button variant="primary" onClick={() => setSaved(true)}>Guardar ejemplo</Button><Button onClick={() => setSaved(false)}>Cancelar</Button><Button variant="ghost" onClick={() => setReview(true)}>Ver detalle</Button><IconButton label="Cerrar aviso de ejemplo" icon="×" onClick={() => setSaved(false)} /></div>
              <div className="mt-4 flex flex-wrap gap-3"><Button variant="danger" onClick={() => setRisk(v => !v)}>Ver alerta de ejemplo</Button><Button pending pendingLabel="Guardando…">Guardar</Button><Button disabled>Sin permisos</Button></div>
              {risk && <div className="mt-4"><DataState kind="error" title="Alerta de demostración" description="Este aviso no representa un fallo real ni cambia el estado de una cuenta." /></div>}
              {saved && <p role="status" className="mt-4 text-sm text-ok">Ejemplo guardado solo en esta vista. No se escribió en una base de datos.</p>}
              <p className="mt-6 text-xs text-muted">Naranja identifica la acción principal, no un estado de éxito.</p>
            </Card>
            <Card span={6} title="Campos que explican qué esperan">
              <div className="mt-4 flex flex-col gap-5">
                <Field id="demo-ceiling" label="Techo de gasto diario" unit="MXN" type="number" defaultValue="1500" help="Referencia del agente; no limita la facturación de Meta." />
                <Field id="demo-margin" label="Margen bruto" unit="%" defaultValue="120" error="El margen no puede superar 100%." />
                <Field id="demo-disabled" label="Cuenta de consulta" defaultValue="Horizonte Studio" disabled />
              </div>
            </Card>
            <Card span={12}>
              <FormSection title="Notas de operación" description="El texto orienta al equipo. No se convierte en una restricción automática.">
                <Field id="demo-note" label="Nota de ejemplo" value={note} onChange={e => setNote(e.target.value)} placeholder="Escribe una nota para probar el campo" help="Este borrador desaparece al recargar la página." />
              </FormSection>
            </Card>
          </div>
        </section>
        <section id="estados" className="demo-section">
          <div className="demo-section-heading"><span>02 / ESTADOS CON SIGNIFICADO</span><h2>No saber también es un estado.</h2><p>Un dato ausente no se muestra como cero; una simulación no se anuncia como ejecución.</p></div>
          <Card>
            <div className="flex flex-wrap gap-3">{(["off", "simulation", "pending", "simulated", "confirmed", "failed", "unconfirmed", "partial", "stale"] as DisplayStatus[]).map(status => <StatusBadge key={status} status={status} />)}</div>
            <div className="mt-6 flex flex-wrap items-end gap-5">
              <label className="flex flex-col gap-2 text-sm font-semibold" htmlFor="demo-state">Estado de los datos del resumen<select id="demo-state" value={dataState} onChange={e => setDataState(e.target.value as typeof dataState)} className="ui-input"><option value="ready">Datos disponibles</option><option value="empty">Sin registros</option><option value="partial">Datos parciales</option><option value="error">Error de lectura</option><option value="loading">Cargando</option><option value="stale">Datos desactualizados</option><option value="forbidden">Sin permisos</option></select></label>
              <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={large} onChange={e => setLarge(e.target.checked)} />Probar importes largos</label>
              <a href="#resumen" className="ui-button ui-button-secondary">Ver el resumen</a>
            </div>
          </Card>
          <div className="mt-4 grid gap-4 md:grid-cols-2">{(["empty", "error", "partial", "stale", "loading", "forbidden"] as DataStateKind[]).map(kind => <DataState key={kind} kind={kind} />)}</div>
        </section>
        <footer className="demo-footer"><span>Agentes Meta · Sistema visual 01</span><span>Laboratorio local · datos ficticios · sin integraciones</span></footer>
      </main>
    </div>
  </>;
}
createRoot(document.getElementById("root")!).render(window.location.pathname === "/" ? <Demo /> : window.location.pathname === "/hoy" ? <HoyDemo /> : window.location.pathname === "/prueba-guiada" ? <ExperimentDemo /> : <ShellDemo />);
