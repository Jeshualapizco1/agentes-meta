"use client";
import { useActionState, useState } from "react";
import type { DecisionOpportunity } from "@agentes-meta/core";
import type { WorkspaceProfile, WorkspaceRule } from "@/lib/decision-workspace";
import type { DecisionFormResult } from "@/lib/decision-contract";
import { emptyDecisionResult } from "@/lib/decision-contract";
import { generateDecisionProposals, previewDecisionPolicy, recordOpportunityDecision, saveDecisionPolicy } from "@/app/decisiones/actions";
import { Button } from "../Button";
import { Chip } from "../Chip";

const money = (n: number, currency: string) => new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
function Feedback({ result }: { result: DecisionFormResult }) { return result.message ? <p role="status" className={`rounded-lg border p-3 text-sm ${result.ok ? "text-foreground" : "text-warning"}`}>{result.message}</p> : null; }
function Evaluation({ preview }: { preview: DecisionFormResult["preview"] }) {
  if (!preview) return null;
  return <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm">Ver evaluación · {preview.proposals.filter(p => !p.blocked).length} aptos · {preview.proposals.filter(p => p.blocked).length} bloqueados · {preview.exclusions.length} exclusiones</summary>
    <p className="my-3 text-xs text-muted">Lectura: {preview.evaluatedAt}. Evaluar no guarda propuestas ni cambia Meta.</p>
    <ul className="space-y-3 text-sm">{preview.proposals.map((p, i) => <li key={`${p.rule_id}-${p.entity_id}-${i}`} className="border-t pt-3"><strong>{p.entity_name}</strong> · {p.rule_name}<p>{String(p.before)} → {String(p.after)} · {p.blocked ? "Bloqueado" : "Apto para revisión"}</p>{p.reasons.map((r, j) => <p className="text-muted" key={j}>{r}</p>)}</li>)}</ul>
    {preview.exclusions.length > 0 && <details className="mt-4"><summary>Por qué otras entidades no generan propuestas</summary><ul className="mt-2 space-y-2 text-xs text-muted">{preview.exclusions.map((e, i) => <li key={i}>{e.entityId ? `Entidad ${e.entityId}: ` : "Regla: "}{e.reason}</li>)}</ul></details>}
  </details>;
}
function Opportunity({ opportunity: o, account, currency }: { opportunity: DecisionOpportunity; account: string; currency: string }) {
  const [result, action, pending] = useActionState(recordOpportunityDecision, emptyDecisionResult);
  return <article className="rounded-2xl border bg-surface p-5">
    <Chip tone={o.kind === "protect" ? "amber" : o.kind === "scale" ? "meta" : "neutral"}>{o.kind === "protect" ? "Proteger inversión" : o.kind === "scale" ? "Potencial de crecimiento" : "Observar"}</Chip>
    <h3 className="mt-3 text-lg font-semibold">{o.title}</h3><p className="mt-1 break-words text-sm">{o.entityName}</p><p className="mt-3 text-sm text-muted">{o.explanation}</p>
    <dl className="my-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted">Gasto observado</dt><dd>{money(o.reading.spend, currency)}</dd></div><div><dt className="text-xs text-muted">Compras atribuidas</dt><dd>{o.reading.purchases}</dd></div><div><dt className="text-xs text-muted">ROAS</dt><dd>{o.reading.roas?.toFixed(2) ?? "No calculable"} {o.reading.roas !== null && "×"}</dd></div><div><dt className="text-xs text-muted">CPA</dt><dd>{o.reading.cpa === null ? "No calculable" : money(o.reading.cpa, currency)}</dd></div></dl>
    <p className="text-xs text-muted">{o.reading.from} a {o.reading.to} · {o.reading.available}/7 días cerrados. Lectura más antigua: {o.reading.fetchedAt ?? "No verificable"}.</p>
    <p className="mt-4 text-sm"><strong>Siguiente paso:</strong> {o.nextStep}</p>
    <a className="ui-button ui-button-secondary my-3" href={`/anuncios?account=${account}&from=${o.reading.from}&to=${o.reading.to}&campaign=${o.entityId}`}>Examinar anuncios</a>
    <details className="border-t pt-3"><summary className="cursor-pointer text-sm">Registrar mi decisión</summary><form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="account" value={account} /><input type="hidden" name="entity" value={o.entityId} />
      <label className="block text-sm">Razón y siguiente paso<textarea name="reason" required maxLength={1000} className="mt-1 w-full border p-2" placeholder="Qué voy a revisar y por qué…" /></label>
      <div className="flex flex-wrap gap-2"><Button name="decision" value="approved" type="submit" disabled={pending}>Investigar</Button><Button name="decision" value="rejected" type="submit" disabled={pending}>No intervenir</Button></div><Feedback result={result} /><p className="text-xs text-muted">Guarda la evidencia y tu decisión; no modifica anuncios ni presupuestos.</p>
    </form></details>
  </article>;
}
function PolicyEditor({ account, rule, admin, maxPct }: { account: string; rule?: WorkspaceRule; admin: boolean; maxPct: number }) {
  // Un único action conserva name/value del botón pulsado. React sobrescribe name
  // cuando el propio botón lleva una función en formAction.
  const [result, submitPolicy, pending] = useActionState(async (previous: DecisionFormResult, form: FormData) =>
    form.get("intent") === "preview" ? previewDecisionPolicy(previous, form) : saveDecisionPolicy(previous, form), emptyDecisionResult);
  const condition = rule?.condition ?? {};
  const [action, setAction] = useState(rule?.action ?? "bajar_presupuesto");
  const [metric, setMetric] = useState(String(condition.metric ?? "roas"));
  const [fields, setFields] = useState<Record<string, string>>({ name: rule?.name ?? "", level: String(condition.level ?? "campaign"), operator: String(condition.operator ?? "lt"), threshold: String(condition.threshold ?? ""), days: String(condition.days ?? 7), minPurchases: String(condition.minPurchases ?? ""), minSpend: String(condition.minSpend ?? ""), changePct: String(condition.changePct ?? "") });
  const [consecutive, setConsecutive] = useState(condition.consecutive === true);
  const field = (key: string, label: string, max?: number) => <label className="block text-sm">{label}<input name={key} value={fields[key]} onChange={e => setFields({ ...fields, [key]: e.target.value })} type={key === "name" ? "text" : "number"} min={key === "days" ? 1 : 0} max={max} step={["days", "minPurchases"].includes(key) ? "1" : "any"} required className="mt-1 w-full border p-2" /></label>;
  return <form action={submitPolicy} className="mt-4 space-y-4">
    <input type="hidden" name="account" value={account} /><input type="hidden" name="ruleId" value={rule?.id ?? ""} /><input type="hidden" name="version" value={rule?.version ?? ""} />
    <p className="text-sm text-muted">Los campos son una política que tú debes revisar, no una recomendación financiera automática. El agente aplicará exactamente estos criterios.</p>
    <div className="grid gap-4 sm:grid-cols-2">{field("name", "Nombre de la regla")}
      <label className="text-sm">Proponer<select name="action" value={action} onChange={e => { setAction(e.target.value as typeof action); setFields({ ...fields, level: e.target.value === "pausar_anuncio" ? "ad" : "campaign" }); }} className="mt-1 w-full border p-2"><option value="bajar_presupuesto">Reducir presupuesto</option><option value="subir_presupuesto">Aumentar presupuesto</option><option value="pausar_anuncio">Pausar anuncio</option></select></label>
      <label className="text-sm">Nivel<select name="level" value={fields.level} onChange={e => setFields({ ...fields, level: e.target.value })} className="mt-1 w-full border p-2">{action === "pausar_anuncio" ? <option value="ad">Anuncio</option> : <><option value="campaign">Campaña (presupuesto CBO)</option><option value="adset">Conjunto (presupuesto ABO)</option></>}</select></label>
      <label className="text-sm">Métrica<select name="metric" value={metric} onChange={e => { setMetric(e.target.value); if (e.target.value === "spend_without_purchases") { setFields({ ...fields, operator: "gt", minPurchases: "0" }); setConsecutive(false); } }} className="mt-1 w-full border p-2"><option value="roas">ROAS</option><option value="cpa">Costo por compra</option><option value="spend_without_purchases">Gasto sin compras</option></select></label>
      <label className="text-sm">Condición<select name="operator" value={fields.operator} onChange={e => setFields({ ...fields, operator: e.target.value })} className="mt-1 w-full border p-2"><option value="gt">Mayor que el umbral</option>{metric !== "spend_without_purchases" && <option value="lt">Menor que el umbral</option>}</select></label>
      {field("threshold", metric === "roas" ? "Umbral ROAS (×)" : "Umbral (moneda de la cuenta)")}{field("days", "Días cerrados de evaluación", 14)}{field("minPurchases", "Compras mínimas en la ventana")}{field("minSpend", "Gasto mínimo en la ventana")}{action !== "pausar_anuncio" && field("changePct", `Cambio propuesto (%) · máximo ${maxPct}`, maxPct)}
    </div>
    {metric !== "spend_without_purchases" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="consecutive" checked={consecutive} onChange={e => setConsecutive(e.target.checked)} />Exigir el umbral en cada día, además del total</label>}
    {admin && <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="acknowledge" />Revisé estos criterios y las restricciones de mi cuenta; autorizo usarlos solo para propuestas en simulación.</label>}
    <div className="flex flex-wrap gap-2"><Button type="submit" name="intent" value="preview" disabled={pending}>Evaluar con datos reales</Button>{admin && <><Button type="submit" name="intent" value="draft" disabled={pending}>Guardar borrador</Button><Button type="submit" name="intent" value="activate" disabled={pending}>Usar en simulación</Button></>}</div>
    <Feedback result={result} /><Evaluation preview={result.preview} />
  </form>;
}
type Props = { account: { id: string; name: string; currency: string; timezone_name: string }; accounts: { id: string; name: string }[]; admin: boolean; profile: WorkspaceProfile; opportunities: DecisionOpportunity[]; rules: WorkspaceRule[]; reviews: { id: string; entity_id: string; rationale: string | null; status: string; decided_by: string | null; decided_at: string | null }[]; evaluation: NonNullable<DecisionFormResult["preview"]>; today: string };
export function DecisionDesk({ account, accounts, admin, profile, opportunities, rules, reviews, evaluation, today }: Props) {
  const [result, generate, pending] = useActionState(generateDecisionProposals, emptyDecisionResult);
  const protect = opportunities.filter(o => o.kind === "protect").length, scale = opportunities.filter(o => o.kind === "scale").length;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-muted">Mesa de decisiones · datos reales</p><h1 className="mt-2 text-3xl font-semibold">Qué merece tu atención</h1><p className="mt-2 text-sm text-muted">{account.name} · días cerrados anteriores al {today} · {account.timezone_name}</p></div><form action="/decisiones" method="get" className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="decision-account">Cuenta</label><select id="decision-account" name="account" defaultValue={account.id} className="max-w-full border p-2">{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select><Button type="submit">Cambiar</Button></form></header>
    <section className="rounded-2xl border bg-surface p-5"><div className="flex flex-wrap gap-2"><Chip tone="meta">Revisión humana</Chip><Chip tone="neutral">Sin envíos a Meta desde esta mesa</Chip></div><h2 className="mt-4 text-xl font-semibold">{protect} para proteger inversión · {scale} para evaluar crecimiento</h2><p className="mt-2 text-sm text-muted">Estas señales describen rendimiento, no causalidad ni garantías de rentabilidad. Revisa la evidencia, decide qué investigar y configura cuándo el agente debe proponer un cambio concreto.</p><p className="mt-3 text-sm">Cuenta: {profile.mode} · simulación {profile.dry_run ? "activa" : "desactivada"}. <a className="underline" href={`/configuracion?account=${account.id}`}>Revisar límites y campañas autorizadas</a></p>{profile.hard_noes && <p className="mt-3 text-sm">Restricciones adicionales: {profile.hard_noes}</p>}</section>
    <section aria-labelledby="opportunity-title"><h2 id="opportunity-title" className="mb-4 text-xl font-semibold">1. Prioriza con evidencia</h2>{opportunities.length ? <div className="grid gap-4 xl:grid-cols-2">{opportunities.map(o => <Opportunity key={o.id} opportunity={o} account={account.id} currency={account.currency} />)}</div> : <p className="rounded-xl border p-5 text-muted">No hay inversión observada en campañas activas para esta ventana. Revisa cobertura y estado en Rendimiento; no se inventaron oportunidades.</p>}</section>
    <section className="rounded-2xl border bg-surface p-5" aria-labelledby="rules-title"><h2 id="rules-title" className="text-xl font-semibold">2. Define cuándo debe proponerte actuar</h2><p className="my-3 text-sm text-muted">{rules.filter(r => r.status === "activa" && r.condition?.version === 1).length} reglas estructuradas activas. Evaluar es de solo lectura; guardar requiere administrador.</p>
      {rules.map(r => <details key={`${r.id}:${r.version}`} className="my-3 rounded-xl border p-4"><summary className="cursor-pointer">{r.name} · {r.status} · v{r.version}</summary>{r.condition?.version === 1 ? <PolicyEditor account={account.id} rule={r} admin={admin} maxPct={profile.max_budget_change_pct} /> : <p className="mt-3 text-sm text-muted">Regla heredada sin criterios estructurados. No produce candidatos con este motor. Crea una regla revisada abajo.</p>}</details>)}
      <details className="mt-4 rounded-xl border p-4" open={!rules.some(r => r.condition?.version === 1)}><summary className="cursor-pointer">Preparar una regla nueva</summary><PolicyEditor account={account.id} admin={admin} maxPct={profile.max_budget_change_pct} /></details>
    </section>
    <section className="space-y-4 rounded-2xl border bg-surface p-5"><h2 className="text-xl font-semibold">3. Genera y revisa propuestas</h2><p className="text-sm text-muted">El agente evalúa reglas activas, evidencia reciente y límites. Crear la cola no equivale a aprobarla.</p><form action={generate}><input type="hidden" name="account" value={account.id} /><Button type="submit" disabled={pending}>{pending ? "Evaluando…" : "Generar propuestas ahora"}</Button></form><Feedback result={result} /><Evaluation preview={result.preview ?? evaluation} /><a href={`/hoy?account=${account.id}`} className="ui-button ui-button-secondary">Revisar propuestas en Hoy</a></section>
    <section className="rounded-2xl border bg-surface p-5"><h2 className="text-xl font-semibold">Decisiones registradas</h2>{reviews.length ? <ul className="mt-4 space-y-4">{reviews.map(r => <li key={r.id} className="border-t pt-3 text-sm"><p>{opportunities.find(o => o.entityId === r.entity_id)?.entityName ?? r.entity_id} · {r.status === "approved" ? "Investigar" : "No intervenir"}</p><p className="my-1">{r.rationale}</p><p className="text-xs text-muted">{r.decided_by} · {r.decided_at} · sin acción en Meta</p></li>)}</ul> : <p className="mt-3 text-sm text-muted">Aún no has registrado decisiones para estas oportunidades.</p>}</section>
  </div>;
}
