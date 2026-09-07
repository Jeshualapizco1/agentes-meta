"use client";
import { useActionState, useState } from "react";
import { Button } from "../Button";
import { validateExperiment } from "@agentes-meta/core/src/experiments";

export type ExperimentFormState = { error: string };
export type ExperimentWizardProps = {
  account: string; today: string; campaigns: { id: string; name: string }[];
  selected?: string[]; hypothesis?: string; session?: string; remaining: number | null;
  draft?: { id: string; name: string; metric: string | null; threshold: number | null; budget: number | null; window_days: number; min_purchases: number; start_date: string | null };
  action: (previous: ExperimentFormState, form: FormData) => Promise<ExperimentFormState>;
};
const inputClass = "mt-2 w-full rounded-xl border bg-paper p-3 text-sm";

/** Tres pasos; el borrador permanece en pantalla si el servidor rechaza el guardado. */
export function ExperimentWizard({ account, today, campaigns, selected = [], hypothesis = "", session = "", remaining, action, draft }: ExperimentWizardProps) {
  const [step, setStep] = useState(0);
  const [ids, setIds] = useState(selected.filter(id => campaigns.some(c => c.id === id)));
  const [values, setValues] = useState({ name: draft?.name ?? "", hypothesis, metric: draft?.metric ?? "roas", threshold: String(draft?.threshold ?? ""), budget: String(draft?.budget ?? ""), window_days: String(draft?.window_days ?? 7), min_purchases: String(draft?.min_purchases ?? 10), start_date: draft?.start_date ?? today });
  const [localError, setLocalError] = useState("");
  const [result, submit, pending] = useActionState(action, { error: "" });
  const [ack, setAck] = useState(false);
  const set = (key: keyof typeof values, value: string) => { setValues(v => ({ ...v, [key]: value })); setLocalError(""); };
  const number = (key: keyof typeof values) => values[key].trim() ? Number(values[key]) : null;
  const issues = validateExperiment({ hypothesis: values.hypothesis, metric: values.metric as "roas" | "cpa", threshold: number("threshold"), budget: number("budget"), window_days: number("window_days"), min_purchases: number("min_purchases"), start_date: values.start_date, campaign_ids: ids });
  const next = () => {
    const error = step === 0 ? !ids.length ? "Elige la campaña que vas a probar." : !values.hypothesis.trim() ? "Describe el cambio que quieres probar." : "" : issues.join(" ");
    if (error) { setLocalError(error); return; }
    setLocalError(""); setStep(s => s + 1);
  };
  const field = (key: keyof typeof values, label: string, type = "number", min?: number, max?: number) => <label className="block text-sm font-medium">{label}<input className={inputClass} type={type} min={min} max={max} step={key === "window_days" || key === "min_purchases" ? 1 : "any"} value={values[key]} onChange={e => set(key, e.target.value)} /></label>;
  const overBudget = remaining !== null && Number(values.budget) > remaining;
  return <form action={submit} className="space-y-6" onSubmit={e => {
    const intent = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
    if (step !== 2 || (intent === "activar" && (!ack || issues.length || overBudget || remaining === null))) { e.preventDefault(); setLocalError("Revisa el criterio, el presupuesto y la confirmación antes de iniciar."); }
  }}>
    <input type="hidden" name="account_id" value={account} /><input type="hidden" name="session_id" value={session} />
    <input type="hidden" name="draft_id" value={draft?.id ?? ""} />
    {Object.entries(values).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
    {ids.map(id => <input key={id} type="hidden" name="entity" value={id} />)}
    <ol aria-label="Pasos de la prueba" className="grid grid-cols-3 gap-2 text-sm">{["Qué probar", "Cómo medir", "Confirmar"].map((label, i) => <li key={label} aria-current={step === i ? "step" : undefined} className={`rounded-xl border p-3 ${step === i ? "border-accent bg-paper font-semibold" : "text-muted"}`}>{i + 1}. {label}</li>)}</ol>
    {step === 0 && <section aria-label="Qué probar" className="space-y-5">
      <div><h3 className="text-xl font-semibold">Una prueba. Un cambio concreto.</h3><p className="mt-1 text-sm text-muted">Elige dónde y escribe qué vas a cambiar en Meta.</p></div>
      <fieldset><legend className="mb-2 text-sm font-medium">Campañas de la prueba</legend><div className="grid max-h-64 gap-2 overflow-y-auto">{campaigns.map(c => <label key={c.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${ids.includes(c.id) ? "border-accent bg-paper" : ""}`}><input type="checkbox" checked={ids.includes(c.id)} onChange={e => setIds(old => e.target.checked ? [...old, c.id] : old.filter(id => id !== c.id))} /><span className="min-w-0 break-words">{c.name}</span></label>)}</div>{!campaigns.length && <p className="text-sm text-muted">No hay campañas disponibles en esta cuenta.</p>}</fieldset>
      <label className="block text-sm font-medium">¿Qué cambiarás y qué esperas mejorar?<textarea className={inputClass} rows={3} maxLength={2000} value={values.hypothesis} onChange={e => set("hypothesis", e.target.value)} placeholder="Ej.: probar un nuevo gancho del anuncio para conseguir más compras con el mismo gasto." /></label>
      <details className="text-sm"><summary className="cursor-pointer text-muted">Añadir nombre corto (opcional)</summary><div className="mt-3">{field("name", "Nombre corto", "text")}</div></details>
      <p className="text-xs text-muted">Mediremos el resultado de las campañas elegidas. No es una prueba A/B con reparto aleatorio.</p>
    </section>}
    {step === 1 && <section aria-label="Cómo medir" className="space-y-5">
      <div><h3 className="text-xl font-semibold">Define cuándo vale la pena repetirlo.</h3><p className="mt-1 text-sm text-muted">Fija la meta antes de comenzar.</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Quiero mejorar<select className={inputClass} value={values.metric} onChange={e => { set("metric", e.target.value); set("threshold", ""); }}><option value="roas">ROAS · retorno por peso invertido</option><option value="cpa">CPA · costo por compra</option></select></label>{field("threshold", values.metric === "roas" ? "ROAS mínimo para considerar éxito (×)" : "Costo máximo por compra ($)", "number", 0.01)}{field("budget", "Presupuesto de la prueba por día ($)", "number", 0.01)}{field("window_days", "Duración (días completos)", "number", 1, 90)}{field("min_purchases", "Compras mínimas para decidir", "number", 1)}{field("start_date", "Inicio del cambio en Meta", "date")}</div>
      <p className={`text-sm ${overBudget || remaining === null ? "text-warning" : "text-muted"}`}>{remaining === null ? "Configura el límite de pruebas para poder iniciar. Puedes guardar un borrador." : `Disponible para pruebas: $${Math.max(0, remaining).toLocaleString("es-MX")}/día.`}{overBudget && " El importe supera lo disponible."}</p>
    </section>}
    {step === 2 && <section aria-label="Confirmar prueba" className="space-y-5">
      <h3 className="text-xl font-semibold">Tu plan, listo para revisar.</h3>
      <div className="rounded-xl border bg-paper p-4"><p className="font-semibold">{values.name || "Nueva prueba"}</p><p className="mt-2 text-sm">{values.hypothesis}</p><p className="mt-3 text-sm text-muted">{campaigns.filter(c => ids.includes(c.id)).map(c => c.name).join(" · ")}</p>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-muted">Éxito</dt><dd className="font-semibold">{values.metric.toUpperCase()} {values.metric === "roas" ? "≥" : "≤"} {values.threshold}</dd></div><div><dt className="text-muted">Evidencia mínima</dt><dd>{values.min_purchases} compras</dd></div><div><dt className="text-muted">Presupuesto declarado</dt><dd>${Number(values.budget).toLocaleString("es-MX")}/día</dd></div><div><dt className="text-muted">Ventana</dt><dd>{values.window_days} días desde {values.start_date}</dd></div></dl>
      </div>
      <p className="text-sm text-muted">Mediremos los días completos posteriores al cambio. Iniciar seguimiento no publica anuncios ni modifica presupuestos en Meta.</p>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />Confirmo el cambio, la fecha y el presupuesto que aplicaré en Meta.</label>
    </section>}
    {(localError || result.error) && <p role="alert" className="rounded-xl border p-3 text-sm text-warning">{localError || result.error}</p>}
    <div className="flex flex-wrap items-center gap-3 border-t pt-4">{step > 0 && <Button type="button" disabled={pending} onClick={() => { setLocalError(""); setStep(s => s - 1); }}>Atrás</Button>}{step < 2 ? <Button variant="primary" type="button" onClick={next}>Continuar</Button> : <><Button variant="primary" type="submit" name="intent" value="activar" disabled={pending || !ack || overBudget || remaining === null}>{pending ? "Guardando…" : "Iniciar seguimiento"}</Button><Button type="submit" name="intent" value="borrador" disabled={pending}>Guardar borrador</Button></>}</div>
  </form>;
}
