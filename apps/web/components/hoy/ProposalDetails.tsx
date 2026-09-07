import { Chip } from "../Chip";
import { money, momentLabel, type HoyProposal } from "@/lib/hoy-view";

/** Solo evidencia y consecuencias. El formulario local vive fuera de este componente de presentación. */
export function ProposalDetails({ proposal, currency }: { proposal: HoyProposal; currency: string }) {
  const change = proposal.change;
  const level = ({ campaign: "Campaña", adset: "Conjunto de anuncios", ad: "Anuncio" } as Record<string, string>)[proposal.entityLevel] ?? "Elemento";
  const budgetPair = (before: number, after: number) => <><dl className="hoy-detail-grid"><div className="hoy-detail-value"><dt>Presupuesto actual</dt><dd>{money(before / 100, currency)}</dd></div><div className="hoy-detail-value"><dt>Presupuesto propuesto</dt><dd>{money(after / 100, currency)}</dd></div></dl><p className="mt-3 text-sm text-muted">Diferencia: {money((after - before) / 100, currency)} por día{before > 0 && Number.isFinite((after - before) / before) ? ` (${((after - before) / before * 100).toFixed(1)}%)` : ""}. Los importes están en {currency}.</p></>;
  return <>
    <div className="flex flex-wrap items-center gap-2"><Chip tone="amber">Pendiente de revisión</Chip><span className="text-xs text-muted">{level}</span></div><p className="mt-4 text-lg font-semibold hoy-wrap">{proposal.entity}</p><p className="mt-2 text-xs text-muted">Regla: {proposal.rule}</p>
    <section className="hoy-detail-section"><h3>Qué cambiaría</h3>
      {change.kind === "budget" ? budgetPair(change.beforeMinor, change.afterMinor) : change.kind === "pause" ? <div className="hoy-detail-grid"><div className="hoy-detail-value"><p className="text-xs text-muted">Estado actual</p><p className="mt-2 text-xl font-semibold">Activo</p></div><div className="hoy-detail-value"><p className="text-xs text-muted">Estado propuesto</p><p className="mt-2 text-xl font-semibold">Pausado</p></div></div> : <><p className="mb-3 text-sm hoy-wrap">Origen: {change.origin.name}</p>{budgetPair(change.origin.beforeMinor, change.origin.afterMinor)}<p className="mt-5 mb-3 text-sm hoy-wrap">Destino: {change.destination.name}</p>{budgetPair(change.destination.beforeMinor, change.destination.afterMinor)}</>}
      <p className="mt-4 text-sm text-muted">{change.kind === "pause" ? "En una ejecución real, se solicitaría pausar este anuncio; no la campaña completa." : change.kind === "budget" ? "En una ejecución real, se solicitaría cambiar el presupuesto diario de esta entidad. No es una garantía de gasto ni de resultado." : "Un movimiento real requiere verificar las dos campañas y recuperar el par si falla una parte. No se ejecuta por ahora."}</p>
    </section>
    <dl className="hoy-facts"><div><dt>Creada</dt><dd>{momentLabel(proposal.createdAt)}</dd></div><div><dt>Vigencia</dt><dd>{momentLabel(proposal.expiresAt)}</dd></div></dl>
    <section className="hoy-detail-section"><h3>Evidencia de la propuesta</h3><p className="mb-4 text-xs text-muted">Corte: {momentLabel(proposal.evidenceAt)}. Son referencias de esta propuesta, no datos consultados en vivo.</p>
      {proposal.evidence.length ? <ul className="hoy-evidence">{proposal.evidence.map((e, i) => <li key={`${e.ref}-${i}`}><span className="hoy-ref">[{e.ref}]</span><div className="min-w-0"><p className="text-muted hoy-wrap">{e.label}</p><p className="mt-1 font-semibold hoy-wrap">{e.value}</p></div></li>)}</ul> : <p className="text-sm text-amber">No hay evidencia disponible para revisar.</p>}
    </section>
    <section className="hoy-detail-section"><h3>Límites verificados al crear la propuesta</h3><p className="mb-4 text-xs text-muted">Son una fotografía del momento de evaluación. Deben verificarse otra vez antes de una ejecución.</p>
      {proposal.locks.length ? <ul className="hoy-evidence">{proposal.locks.map((l, i) => <li key={`${l.id}-${i}`}><span className={l.ok ? "text-muted" : "text-crit"} aria-hidden="true">{l.ok ? "✓" : "!"}</span><div><p className="font-semibold hoy-wrap">{l.label} · {l.ok ? "Cumplía" : "No cumplía"}</p><p className="mt-1 text-muted hoy-wrap">{l.reason}</p></div></li>)}</ul> : <p className="text-sm text-amber">No hay evaluación de candados disponible.</p>}
    </section>
  </>;
}
