import { useState } from "react";
import { AppShell } from "../components/AppShell";
import { NavMenu } from "../components/NavMenu";
import { Button } from "../components/Button";
import { DataState } from "../components/DataState";
import { DialogPanel } from "../components/DialogPanel";
import { HoyDashboard } from "../components/hoy/HoyDashboard";
import { previewApprovalBlock, type HoySnapshot } from "../lib/hoy-view";
import { HoyReview, type LocalDecision } from "./HoyReview";
import { HOY_ACCOUNTS, HOY_SCENARIOS, makeHoyFixture, type HoyScenario } from "./hoy-fixtures";

export function HoyDemo() {
  const p = new URLSearchParams(window.location.search);
  const accountId = p.get("account") ?? "100";
  const initialScenario = p.get("scenario");
  const [scenario, setScenario] = useState<HoyScenario>(initialScenario && Object.hasOwn(HOY_SCENARIOS, initialScenario) ? initialScenario as HoyScenario : "simulation");
  const [role, setRole] = useState<"buyer" | "admin">("buyer");
  const [longContent, setLongContent] = useState(false);
  const [failSave, setFailSave] = useState(false);
  if (!HOY_ACCOUNTS.some(a => a.id === accountId)) return <main id="contenido" tabIndex={-1} className="m-6"><DataState kind="empty" title="Cuenta de demostración no disponible" action={<a href="/hoy?account=100" className="ui-button ui-button-secondary">Volver al piloto</a>} /></main>;
  return <><a href="#contenido" className="skip-link">Saltar al contenido</a><AppShell demo pathname="/hoy" brandHref={`/hoy?account=${accountId}`} email="operador@ejemplo.invalid" role={role} navigation={<NavMenu pathname="/hoy" search={`account=${accountId}`} role={role} />}>
    <HoyScene key={`${accountId}:${scenario}:${longContent}:${role}`} accountId={accountId} scenario={scenario} role={role} longContent={longContent} failSave={failSave} />
    <details className="hoy-demo-tools mt-8"><summary>Escenarios de prueba · solo datos ficticios</summary><p>El reloj de la demo está fijado al 6 de septiembre de 2026, 10:30 CDMX. Los cambios se pierden al recargar o cambiar de escenario.</p><div className="hoy-demo-tool-fields">
      <div><label htmlFor="hoy-demo-scenario" className="mb-2 block">Estado de ejemplo</label><select id="hoy-demo-scenario" value={scenario} onChange={e => setScenario(e.target.value as HoyScenario)}>{Object.entries(HOY_SCENARIOS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
      <label className="flex items-center gap-2"><input type="checkbox" checked={role === "admin"} onChange={e => setRole(e.target.checked ? "admin" : "buyer")} />Vista de administrador</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={longContent} onChange={e => setLongContent(e.target.checked)} />Nombres e importes largos</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={failSave} onChange={e => setFailSave(e.target.checked)} />Fallo de guardado local</label>
    </div><a href="/" className="inline-flex min-h-11 items-center underline">Volver al catálogo de componentes</a></details>
  </AppShell></>;
}
function HoyScene({ accountId, scenario, role, longContent, failSave }: { accountId: string; scenario: HoyScenario; role: "buyer" | "admin"; longContent: boolean; failSave: boolean }) {
  const [snapshot, setSnapshot] = useState(() => makeHoyFixture(scenario, accountId, longContent));
  const [selected, setSelected] = useState<string | null>(null);
  const [controlOpen, setControlOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const proposal = snapshot.proposals.state === "ready" ? snapshot.proposals.data.find(p => p.id === selected) : undefined;
  async function decide(decision: LocalDecision) {
    if (!proposal || snapshot.proposals.state !== "ready") throw new Error("Propuesta no disponible");
    if (decision.decision === "simulated" && previewApprovalBlock(snapshot, proposal)) throw new Error("Ensayo no disponible");
    // Pausa de UI para probar pendiente. No es una llamada de red ni una Server Action.
    await new Promise(resolve => setTimeout(resolve, 250));
    if (failSave) throw new Error("Fallo sintético del guardado en memoria");
    setSnapshot(current => ({ ...current, proposals: { state: "ready", data: current.proposals.state === "ready" ? current.proposals.data.filter(p => p.id !== proposal.id) : [] },
      decisions: { state: "ready", data: [{ id: `${proposal.id}-local`, entity: proposal.entity, action: proposal.title, status: decision.decision, at: current.asOf,
        detail: `${decision.afterMinor !== undefined && proposal.change.kind === "budget" && decision.afterMinor !== proposal.change.afterMinor ? "Importe corregido en el ensayo. " : ""}${decision.reason || "Revisión de ejemplo."} Guardado únicamente en memoria.` }, ...(current.decisions.state === "ready" ? current.decisions.data : [])] } }));
    setSelected(null); setNotice(decision.decision === "simulated" ? "Aprobación simulada solo en esta vista. No se enviaron cambios a Meta." : "Rechazo registrado solo en esta vista. No se modificó ninguna propuesta real.");
  }
  function brakeChange(reason: string) {
    const release = snapshot.agent.brake === "engaged";
    if (snapshot.access !== "allowed" || snapshot.agent.execution !== "simulation" || snapshot.agent.brake === "unknown" || (release && (role !== "admin" || !reason.trim()))) return;
    setSnapshot(current => ({ ...current, agent: { ...current.agent, brake: release ? "released" : "engaged", mode: "off", brakeReason: reason || "Detención manual de ejemplo" } }));
    setControlOpen(false); setNotice(release ? "Freno liberado solo en la demo. El agente permanece detenido; no se reanudó ninguna ejecución." : "Detención simulada del agente. No se pausaron anuncios ni se escribió en la base.");
  }
  return <>
    {notice && <div className="mb-5"><DataState kind="partial" title="Resultado del ensayo local" description={notice} /></div>}
    <HoyDashboard snapshot={snapshot} onReview={setSelected} onControl={() => setControlOpen(true)} accountControl={<form method="get" action="/hoy" className="flex flex-wrap items-end gap-2"><div><label htmlFor="hoy-account" className="mb-1 block text-xs text-muted">Cuenta de demostración</label><select id="hoy-account" name="account" defaultValue={accountId} className="max-w-full border px-3 text-sm">{HOY_ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div><Button type="submit">Cambiar</Button></form>} />
    <DialogPanel open={!!proposal} title={proposal?.title ?? "Revisar propuesta"} description="La evidencia primero. La consecuencia de la decisión, siempre explícita." onClose={() => setSelected(null)}>
      {proposal && <HoyReview key={proposal.id} snapshot={snapshot} proposal={proposal} onDecision={decide} />}
    </DialogPanel>
    <DialogPanel open={controlOpen} title="Control del agente" description="Este ensayo no afecta cuentas, anuncios ni procesos reales." onClose={() => setControlOpen(false)}>
      <BrakePreview key={`${snapshot.agent.brake}:${controlOpen}`} snapshot={snapshot} role={role} onChange={brakeChange} />
    </DialogPanel>
  </>;
}
function BrakePreview({ snapshot, role, onChange }: { snapshot: HoySnapshot; role: "buyer" | "admin"; onChange: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const release = snapshot.agent.brake === "engaged";
  const allowed = snapshot.access === "allowed" && snapshot.agent.execution === "simulation" && snapshot.agent.brake !== "unknown" && (!release || role === "admin");
  return <><DataState kind="partial" title={release ? "Freno activo en este ejemplo" : "Detener nuevas acciones del agente"} description="El freno no pausa los anuncios que ya se entregan en Meta. Liberarlo tampoco reanuda automáticamente el agente." />
    {snapshot.agent.brakeReason && <p className="mt-4 text-sm text-muted hoy-wrap">Motivo registrado: {snapshot.agent.brakeReason}</p>}
    {!allowed && <p role="status" className="mt-5 text-sm text-amber">{release && role !== "admin" ? "Solo un administrador puede liberar el freno, con una razón." : "El estado no está verificado o el modo no permite ensayar este control."}</p>}
    <form className="hoy-local-form" onSubmit={e => { e.preventDefault(); if (allowed && (!release || reason.trim())) onChange(reason); }}><div><label htmlFor="hoy-brake-reason" className="mb-2 block text-sm font-semibold">Razón {release ? "(obligatoria)" : "(opcional)"}</label><textarea id="hoy-brake-reason" required={release} disabled={!allowed} value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} /></div><Button type="submit" variant={release ? "secondary" : "danger"} disabled={!allowed || (release && !reason.trim())}>{release ? "Simular liberación del freno" : "Simular detención del agente"}</Button><p className="text-xs text-muted">Solo cambia el ejemplo en memoria. Se pierde al recargar.</p></form>
  </>;
}
