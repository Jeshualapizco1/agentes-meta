import { useRef, useState, type FormEvent } from "react";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { DataState } from "../components/DataState";
import { ProposalDetails } from "../components/hoy/ProposalDetails";
import { money, parseBudgetDraft, previewApprovalBlock, type HoySnapshot, type HoyProposal } from "../lib/hoy-view";

export type LocalDecision = { decision: "simulated" | "rejected"; reason: string; afterMinor?: number };
/** Formulario SOLO del laboratorio. No se exporta desde la aplicación ni importa Server Actions. */
export function HoyReview({ snapshot, proposal, onDecision }: { snapshot: HoySnapshot; proposal: HoyProposal; onDecision: (decision: LocalDecision) => Promise<void> }) {
  const [amount, setAmount] = useState(proposal.change.kind === "budget" ? (proposal.change.afterMinor / 100).toFixed(2) : "");
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const block = previewApprovalBlock(snapshot, proposal);
  const afterMinor = proposal.change.kind === "budget" ? parseBudgetDraft(amount) : undefined;
  const corrected = proposal.change.kind === "budget" && afterMinor !== proposal.change.afterMinor;
  const canReject = snapshot.access === "allowed" && proposal.accountId === snapshot.account.id && snapshot.proposals.state === "ready" && snapshot.proposals.data.some(p => p.id === proposal.id);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy.current) return;
    const decision = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "rejected" ? "rejected" : "simulated";
    setError("");
    if (decision === "simulated" && block) { setError(block); return; }
    if (decision === "rejected" && !canReject) { setError("Esta propuesta no está disponible para revisión."); return; }
    if (decision === "simulated" && proposal.change.kind === "budget" && afterMinor === null) { setError("Usa un importe positivo con hasta dos decimales, sin comas ni notación exponencial."); return; }
    if ((decision === "rejected" || corrected) && !reason.trim()) { setError("Escribe una razón para rechazar o corregir el importe."); return; }
    if (!acknowledged) { setError("Confirma que entiendes el alcance de esta simulación."); return; }
    busy.current = true; setPending(true);
    try { await onDecision({ decision, reason: reason.trim(), ...(decision === "simulated" && afterMinor !== undefined && afterMinor !== null ? { afterMinor } : {}) }); }
    catch { setError("No se pudo guardar el ensayo local. Conservamos tu borrador; no se envió ninguna solicitud a Meta."); }
    finally { busy.current = false; setPending(false); }
  }
  return <>
    <DataState kind="partial" title="Revisión de demostración" description="Este formulario solo modifica el ejemplo en memoria. No aprueba propuestas reales, no guarda en la base y no envía cambios a Meta." />
    <div className="mt-6"><ProposalDetails proposal={proposal} currency={snapshot.account.currency} /></div>
    <section className="hoy-detail-section"><h3>Tu decisión de ejemplo</h3>
      {block && <DataState kind="partial" title="Aprobación de ensayo no disponible" description={block} />}
      <form onSubmit={submit} className="hoy-local-form">
        <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5">
          {proposal.change.kind === "budget" && <><Field id="hoy-new-budget" label="Nuevo presupuesto diario" unit={snapshot.account.currency} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} help="Un importe distinto queda como corrección humana. Solo se ensaya en esta vista." />{corrected && afterMinor !== null && <p className="text-sm text-amber">Importe corregido: {money(afterMinor! / 100, snapshot.account.currency)}. La razón es obligatoria.</p>}</>}
          <div><label htmlFor="hoy-review-reason" className="mb-2 block text-sm font-semibold">Razón de la decisión</label><textarea id="hoy-review-reason" value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} aria-describedby="hoy-reason-help" /><p id="hoy-reason-help" className="mt-2 text-xs text-muted">Obligatoria al rechazar o corregir. Máximo 1,000 caracteres.</p></div>
          <label className="hoy-confirmation"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} /><span>Entiendo que esta revisión solo cambia el ejemplo y no opera Meta.</span></label>
        </fieldset>
        {error && <DataState kind="error" title="Revisa tu decisión" description={error} />}
        <div className="hoy-local-actions"><Button type="submit" name="decision" value="simulated" variant="primary" disabled={!!block} pending={pending} pendingLabel="Guardando ensayo…">Simular aprobación</Button><Button type="submit" name="decision" value="rejected" disabled={!canReject || pending}>Rechazar en demo</Button></div>
      </form>
    </section>
  </>;
}
