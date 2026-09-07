"use client";
import { useActionState } from "react";
import { reviewDecisionProposal } from "@/app/decisiones/actions";
import { emptyDecisionResult } from "@/lib/decision-contract";
import { Button } from "../Button";

export function ProposalReview({ id, account, budget }: { id: string; account: string; budget?: number }) {
  const [result, action, pending] = useActionState(reviewDecisionProposal, emptyDecisionResult);
  return <form action={action} className="mt-6 space-y-4 border-t pt-5">
    <h3 className="font-semibold">Tu decisión · solo simulación</h3><p className="text-sm text-muted">Se revalidan evidencia, versión de regla, presupuesto y límites al confirmar. No se enviarán cambios a Meta ni se habilitará el modo automático.</p>
    <input type="hidden" name="id" value={id} /><input type="hidden" name="account" value={account} />
    {budget !== undefined && <label className="block text-sm">Presupuesto diario a simular (moneda de la cuenta)<input type="number" name="after" defaultValue={budget.toFixed(2)} min="0.01" step="0.01" required className="mt-1 w-full border p-2" /></label>}
    <label className="block text-sm">Razón (obligatoria si corriges o rechazas)<textarea name="reason" maxLength={1000} className="mt-1 w-full border p-2" /></label>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="acknowledge" required />Revisé la evidencia y las restricciones de esta cuenta. Entiendo que se registra una simulación.</label>
    <div className="flex flex-wrap gap-2"><Button type="submit" name="decision" value="simulada" disabled={pending || result.ok}>Aprobar simulación</Button><Button type="submit" name="decision" value="rechazada" formNoValidate disabled={pending || result.ok}>Rechazar con razón</Button></div>
    {result.message && <p role="status" className="rounded-lg border p-3 text-sm">{result.message}</p>}
  </form>;
}
