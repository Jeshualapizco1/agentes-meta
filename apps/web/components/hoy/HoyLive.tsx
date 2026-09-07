"use client";
import { useState } from "react";
import { Button } from "../Button";
import { DataState } from "../DataState";
import { DialogPanel } from "../DialogPanel";
import { HoyDashboard } from "./HoyDashboard";
import { ProposalDetails } from "./ProposalDetails";
import type { HoySnapshot } from "@/lib/hoy-view";
import { ProposalReview } from "../decisiones/ProposalReview";

export function HoyLive({ snapshot, accounts, targetRoas }: { snapshot: HoySnapshot; targetRoas?: number | null; accounts: { id: string; name: string }[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [controlOpen, setControlOpen] = useState(false);
  const proposal = snapshot.proposals.state === "ready" ? snapshot.proposals.data.find(item => item.id === selected) : undefined;
  const accountControl = <form method="get" action="/hoy" className="flex flex-wrap items-end gap-2"><div><label htmlFor="hoy-account" className="mb-1 block text-xs text-muted">Cuenta</label><select id="hoy-account" name="account" defaultValue={snapshot.account.id} className="max-w-full border px-3 text-sm">{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div><Button type="submit">Cambiar</Button></form>;
  return <>
    <HoyDashboard snapshot={snapshot} targetRoas={targetRoas} accountControl={accountControl} onReview={setSelected} onControl={() => setControlOpen(true)} />
    <DialogPanel open={!!proposal} title={proposal?.title ?? "Revisar propuesta"} description="Revisa evidencia y restricciones antes de registrar tu decisión. No se enviarán cambios a Meta." onClose={() => setSelected(null)}>
      {proposal && <><ProposalDetails proposal={proposal} currency={snapshot.account.currency} /><ProposalReview key={proposal.id} id={proposal.id} account={snapshot.account.id} budget={proposal.change.kind === "budget" ? proposal.change.afterMinor / 100 : undefined} /></>}
    </DialogPanel>
    <DialogPanel open={controlOpen} title="Control del agente" description="Consulta el estado y los límites de esta cuenta." onClose={() => setControlOpen(false)}>
      <DataState kind={snapshot.agent.brake === "engaged" ? "partial" : "empty"} title={snapshot.agent.brake === "engaged" ? "El freno está activo" : snapshot.agent.brake === "released" ? "El freno está liberado" : "No se pudo verificar el freno"} description={snapshot.agent.brakeReason ?? "El freno detiene al agente; no pausa los anuncios activos."} />
      <a className="ui-button ui-button-secondary mt-5" href={`/configuracion?account=${snapshot.account.id}`}>Ir a meta y límites</a>
    </DialogPanel>
  </>;
}
