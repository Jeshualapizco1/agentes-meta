"use client";
import type { ReactNode } from "react";
import { Button } from "../Button";
import { Card } from "../Card";
import { Chip } from "../Chip";
import { MetricCard } from "../MetricCard";
import { DataState } from "../DataState";
import { HoyTrend } from "./HoyTrend";
import { summarizeHoy, money, momentLabel, shortDate, orderedAlerts, decisionPresentation, type HoySnapshot, type HoyProposal } from "@/lib/hoy-view";
import "./hoy.css";

export function ChangeSummary({ proposal, currency }: { proposal: HoyProposal; currency: string }) {
  const change = proposal.change;
  if (change.kind === "pause") return <span>Activo <span aria-hidden="true">→</span> Pausado <span className="text-muted">· un anuncio</span></span>;
  if (change.kind === "move") return <span>Entre dos campañas <span className="text-muted">· ver ambos importes</span></span>;
  const delta = change.afterMinor - change.beforeMinor;
  return <span>{money(change.beforeMinor / 100, currency)} <span aria-hidden="true">→</span> <b>{money(change.afterMinor / 100, currency)}</b><span className="hoy-change-delta">{delta > 0 ? "+" : ""}{money(delta / 100, currency)} / día</span></span>;
}

/** Vista de presentación. Los callbacks no llevan una capacidad de ejecución real incorporada. */
export function HoyDashboard({ snapshot, accountControl, onReview, onControl, targetRoas }: {
  snapshot: HoySnapshot; targetRoas?: number | null; accountControl?: ReactNode; onReview: (id: string) => void; onControl: () => void;
}) {
  const model = summarizeHoy(snapshot);
  const { agent, account } = snapshot;
  if (snapshot.access === "forbidden") return <div className="hoy-page"><h1 className="text-3xl font-bold">Hoy</h1><DataState kind="forbidden" description="Pide a un administrador que revise tu acceso a esta cuenta. No se muestran sus datos ni propuestas." /></div>;
  const canRead = model.state !== "error" && model.state !== "loading";
  const proposals = snapshot.proposals.state === "ready" ? snapshot.proposals.data : [];
  const alerts = snapshot.alerts.state === "ready" ? orderedAlerts(snapshot.alerts.data) : [];
  const decisions = snapshot.decisions.state === "ready" ? snapshot.decisions.data : [];
  const uncertain = decisions.filter(d => d.status === "unconfirmed" || d.status === "approved" || d.status === "failed");
  const proposalRow = (p: HoyProposal) => <li key={p.id} className="hoy-proposal"><div className="hoy-proposal-top"><span className="hoy-proposal-icon" aria-hidden="true">{p.change.kind === "pause" ? "Ⅱ" : p.change.kind === "move" ? "⇄" : p.change.afterMinor > p.change.beforeMinor ? "↗" : "↘"}</span><div className="min-w-0"><p className="hoy-proposal-title">{p.title}</p><p className="mt-1 text-sm text-muted hoy-wrap">{p.entity}</p></div></div><p className="hoy-change tnum"><ChangeSummary proposal={p} currency={account.currency} /></p><div className="hoy-proposal-footer"><span className="text-xs text-muted">{p.expiresAt && Date.parse(p.expiresAt) > Date.parse(snapshot.asOf) ? `Vigente hasta ${momentLabel(p.expiresAt)}` : "Vigencia no disponible o vencida"}</span><Button onClick={() => onReview(p.id)} variant="primary" aria-label={`Revisar propuesta: ${p.title}`}>Revisar <span aria-hidden="true">↗</span></Button></div></li>;
  return <div className="hoy-page">
    <header className="hoy-header"><div><p className="hoy-eyebrow">HOY · {shortDate(snapshot.reportingDate)}</p><h1>Haz que cada prueba cuente.</h1></div>{accountControl}</header>
    <div className="hoy-context"><div className="hoy-context-account"><span className="hoy-account-mark" aria-hidden="true">{account.name.slice(0, 1)}</span><div><p className="font-semibold hoy-wrap">{account.name}</p><p className="text-xs text-muted">{account.currency} · {account.timeZone}</p></div></div>
      <div className="hoy-mode-controls"><Chip tone={agent.execution === "simulation" ? "meta" : "amber"}>{agent.execution === "simulation" ? "Modo simulado" : agent.execution === "live" ? "Configuración real · solo lectura" : "Modo sin verificar"}</Chip><Button variant={agent.brake === "engaged" ? "danger" : "secondary"} onClick={onControl}>{agent.brake === "engaged" ? "Ver freno activo" : "Control del agente"}</Button></div>
    </div>
    {agent.brake === "engaged" && <DataState kind="partial" title="El agente está detenido por el freno" description="El freno bloquea nuevas acciones del agente. Los anuncios que ya se entregan en Meta no se pausan por este control." />}
    {model.state !== "ready" && <DataState kind={model.state === "missing" ? "empty" : model.state === "forbidden" ? "forbidden" : model.state} title={model.state === "partial" ? `Lectura parcial · ${model.current.available} de 7 días cerrados` : undefined} description={model.state === "missing" ? "No hay lecturas cerradas para esta ventana. No se sustituyen por ceros." : undefined} />}
    {uncertain.length > 0 && <DataState kind="partial" title="Hay resultados por verificar" description="Una aprobación o un fallo no confirman qué cambió en Meta. Verifica el registro antes de repetir una acción." action={<a href="#hoy-decisions" className="ui-button ui-button-secondary">Ver resultados registrados</a>} />}
    <div className="hoy-period"><span>Ventana de 7 días cerrados · {model.period}</span><span>Atribución de Meta</span></div>
    <div className="hoy-kpis">
      <MetricCard label="Inversión publicitaria" value={model.current.spend} format={v => money(v, account.currency)} period={`${account.currency} · ${model.current.available}/7 días disponibles`} dataState={model.state} />
      <MetricCard label="Retorno publicitario · ROAS" value={model.current.roas} format={v => `${v.toFixed(2)}×`} period="Valor atribuido por cada peso invertido" dataState={model.state} previous={model.canCompare ? { value: model.previous.roas, label: "7 días previos:" } : undefined} />
      <MetricCard label="Compras atribuidas" value={model.current.purchases} format={v => v.toLocaleString("es-MX")} period="Compras atribuidas por Meta" dataState={model.state} previous={model.canCompare ? { value: model.previous.purchases, label: "7 días previos:" } : undefined} />
      <MetricCard label="Costo por compra · CPA" value={model.current.cpa} format={v => money(v, account.currency)} period={`${account.currency} · inversión / compras`} dataState={model.state} higherIsBetter={false} previous={model.canCompare ? { value: model.previous.cpa, label: "7 días previos:" } : undefined} />
    </div>
    <section className="rounded-2xl border bg-surface p-5" aria-label="Tu plan de mejora"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-muted">TU PLAN DE MEJORA</p><h2 className="mt-2 text-xl font-semibold">{targetRoas != null && targetRoas > 0 ? `Meta de ROAS: ${targetRoas.toFixed(2)}×` : "Mejora el ROAS, prueba a prueba."}</h2><p className="mt-1 text-sm text-muted">{targetRoas != null && targetRoas > 0 && model.state === "ready" && model.current.roas !== null ? model.current.roas >= targetRoas ? "La lectura actual alcanza la meta configurada." : `Faltan ${(targetRoas - model.current.roas).toFixed(2)} puntos para la meta configurada.` : "Elige una oportunidad, mide el cambio y conserva lo que funciona."}</p></div><a className="ui-button ui-button-primary" href={`/decisiones?account=${account.id}`}>Elegir qué probar →</a></div><div className="mt-4 flex flex-wrap gap-4 border-t pt-4 text-sm"><a className="underline" href={`/experimentos?account=${account.id}`}>Mis pruebas y resultados</a><a className="text-muted underline" href={`/configuracion?account=${account.id}`}>Meta y límites</a></div></section>
    <div className="hoy-bento">
      <Card hero className="hoy-attention" eyebrow="TU SIGUIENTE DECISIÓN" title="Necesita tu atención" action={<Chip tone="neutral">{snapshot.proposals.state === "ready" ? `${proposals.length} propuestas` : "Cola sin verificar"}</Chip>}>
        <section className="hoy-alerts" aria-label="Alertas prioritarias">
          {snapshot.alerts.state !== "ready" ? <DataState kind={snapshot.alerts.state} title={snapshot.alerts.state === "loading" ? "Cargando alertas" : "No pudimos verificar las alertas"} /> : alerts.length ? <>
            {alerts.slice(0, 2).map(a => <div key={a.id} className={`hoy-alert hoy-alert-${a.severity}`}><span className="hoy-alert-symbol" aria-hidden="true">{a.severity === "critical" ? "!" : "◐"}</span><div className="min-w-0"><p className="text-sm font-semibold">{a.title}</p><p className="mt-1 text-xs text-muted hoy-wrap">{a.description}</p><p className="mt-2 text-xs text-muted">{momentLabel(a.at)}</p></div></div>)}
            {alerts.length > 2 && <details className="hoy-more"><summary>Ver {alerts.length - 2} avisos más</summary>{alerts.slice(2).map(a => <p key={a.id} className="my-3 text-sm hoy-wrap"><b>{a.title}</b> · {a.description}</p>)}</details>}
          </> : <p className="hoy-quiet-note">Sin alertas abiertas.</p>}
        </section>
        {snapshot.proposals.state !== "ready" ? <DataState kind={snapshot.proposals.state} title={snapshot.proposals.state === "loading" ? "Cargando propuestas" : "No pudimos cargar las propuestas"} /> : proposals.length ? <><ul className="hoy-proposals">{proposals.slice(0, 2).map(proposalRow)}</ul>{proposals.length > 2 && <details className="hoy-more"><summary>Ver {proposals.length - 2} propuestas más</summary><ul className="hoy-proposals">{proposals.slice(2).map(proposalRow)}</ul></details>}</> : <DataState kind="empty" title="No hay propuestas pendientes" action={<a href={`/decisiones?account=${account.id}`} className="ui-button ui-button-secondary">Buscar una oportunidad</a>} />}
      </Card>
      {canRead ? <HoyTrend points={model.series} /> : <Card title="Tendencia de ROAS"><DataState kind={model.state === "loading" ? "loading" : "error"} description="La serie no está disponible. No se dibuja una tendencia de ejemplo como si fuera un resultado." /></Card>}
      <Card className="hoy-agent"><details id="hoy-agent"><summary className="cursor-pointer font-semibold">Actividad del agente</summary>
        <div className="hoy-agent-mode"><span className="hoy-orbit" aria-hidden="true">✳</span><div><p className="font-semibold">{agent.mode === "off" ? "Agente detenido" : agent.mode === "semi" ? "Revisión humana" : agent.mode === "auto" ? "Autonomía configurada" : "Estado sin verificar"}</p><p className="text-xs text-muted">{agent.execution === "simulation" ? "Las decisiones se ensayan, no se envían a Meta." : "Esta vista no tiene capacidad de operar Meta."}</p></div></div>
        <dl className="hoy-facts"><div><dt>Última recolección</dt><dd>{momentLabel(agent.collectedAt)}<span className="block text-muted">{agent.collection === "ok" ? "Recolección completada" : agent.collection === "error" ? "La recolección reportó un error" : agent.collection === "running" ? "Recolección en curso" : "Resultado no verificado"}</span></dd></div><div><dt>Última revisión del agente</dt><dd>{momentLabel(agent.strategyAt)}</dd></div><div><dt>Freno</dt><dd>{agent.brake === "engaged" ? "Activo · no pausa anuncios en Meta" : agent.brake === "released" ? "Liberado" : "Sin verificar"}</dd></div></dl>
      </details></Card>
    </div>
    <div className="hoy-secondary">
      <Card title="Resultados registrados" eyebrow="DECISIONES"><div id="hoy-decisions" tabIndex={-1}>
        {snapshot.decisions.state !== "ready" ? <DataState kind={snapshot.decisions.state} title="Resultados sin verificar" /> : decisions.length ? <ul className="hoy-history">{decisions.map(d => { const status = decisionPresentation[d.status]; return <li key={d.id}><div className="hoy-history-top"><p className="font-semibold hoy-wrap">{d.entity}</p><Chip tone={status.tone}>{status.label}</Chip></div><p className="mt-2 text-sm text-muted">{d.action} · {momentLabel(d.at)}</p><p className="mt-2 text-xs text-muted hoy-wrap">{d.detail}</p><p className="mt-1 text-xs text-muted">{status.explanation}</p></li>; })}</ul> : <p className="text-sm text-muted">No hay decisiones registradas en esta lectura.</p>}
      </div></Card>
      <Card title="Cambios de tu equipo" eyebrow="BITÁCORA">
        {snapshot.activity.state !== "ready" ? <DataState kind={snapshot.activity.state} title="Actividad no disponible" /> : snapshot.activity.data.length ? <ul className="hoy-history">{snapshot.activity.data.slice(0, 3).map(item => <li key={item.id}><div className="hoy-history-top"><p className="font-semibold">{item.actor}</p><span className="text-xs text-muted">{momentLabel(item.at)}</span></div><p className="mt-2 text-sm text-muted hoy-wrap">{item.summary}</p></li>)}</ul> : <p className="text-sm text-muted">No hay cambios de personas registrados en esta lectura.</p>}
      </Card>
    </div>
  </div>;
}
