import { db, fetchAll } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/app/configuracion/ProfileForm";
import { profileCampaignChoices, type ProfileCampaign } from "@/lib/profile-campaigns";
import { Chip } from "@/components/Chip";
import { fmtDay, fmtTime } from "@/lib/format";
import { Card } from "@/components/Card";
import { Field as InputField } from "@/components/Field";
export const dynamic = "force-dynamic";
export const metadata = { title: "Configuración" };

function Field({ name, label, help, value, unit, step = "any" }: { name: string; label: string; help: string; value: number | null | undefined; unit?: string; step?: string }) {
  return <InputField id={`profile-${name}`} name={name} type="number" min="0" step={step} defaultValue={value ?? ""} label={label} unit={unit} help={help} className="tnum" />;
}

export default async function Configuracion({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams; const member = await requireUser("/configuracion"); const sb = db();
  const canEdit = member.appRole === "admin";
  const { data: accounts, error: accountsError } = await sb.from("accounts").select("id,name").eq("enabled", true).order("name");
  if (accountsError) return <p role="alert">No se pudieron cargar las cuentas. No es seguro editar la configuración.</p>;
  if (!accounts?.length) return <p role="status">No hay cuentas habilitadas para configurar.</p>;
  const accountId = p.account ?? accounts[0].id;
  if (!accounts.some(a => a.id === accountId)) return <p role="alert">La cuenta no está disponible. <a href="/configuracion" className="underline">Volver a las cuentas habilitadas</a>.</p>;
  const [profileResult, camps, historyResult] = await Promise.all([
    sb.from("account_profiles").select("*").eq("account_id", accountId).maybeSingle(),
    fetchAll<ProfileCampaign>(() => sb.from("entities").select("id,name,effective_status,daily_budget").eq("account_id", accountId).eq("level", "campaign").order("name").order("id")).catch(() => null),
    sb.from("profile_changes").select("id,changed_by,created_at,patch,from_version,to_version").eq("account_id", accountId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(5),
  ]);
  if (profileResult.error || historyResult.error || camps === null) return <p role="alert">No se pudo cargar la configuración completa y su historial. No se habilitó el formulario para evitar sobrescribir datos desconocidos. Si falta la migración de configuración segura, contacta al administrador.</p>;
  const prof = profileResult.data;
  const history = historyResult.data;
  if (prof && (!Number.isInteger(prof.version) || prof.version < 1)) return <p role="alert">La base necesita la actualización de configuración segura antes de permitir ediciones.</p>;
  const wl = new Set<string>(prof?.whitelist_campaign_ids ?? []);
  const choices = profileCampaignChoices(camps, [...wl]);
  const be = prof?.breakeven_roas ?? (prof?.gross_margin_pct ? 100 / prof.gross_margin_pct : null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div><p className="font-mono text-[11px] uppercase tracking-wider text-muted">Configuración por cuenta</p><h1 className="text-3xl font-bold tracking-tight">Con qué números decide el agente</h1></div>
        <form key={JSON.stringify(p)} method="get" className="ml-auto flex gap-2"><label className="flex min-w-0 flex-col gap-1 text-xs text-muted">Cuenta<select aria-label="Cuenta" name="account" defaultValue={accountId} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm">{(accounts ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><button className="btn-accent px-3 py-1 text-sm font-semibold text-on-accent">Cambiar</button></form>
      </div>
      {p.revision && canEdit && history?.some(h => String(h.to_version) === p.revision) && <p role="status" className="rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">La revisión {p.revision} está registrada en el historial. Revisa abajo la configuración vigente.</p>}
      {!canEdit && <p role="status" className="rounded-xl border border-line px-3 py-2 text-sm text-muted">Vista de consulta. Solo un administrador puede modificar la configuración de la cuenta.</p>}
      <p className="max-w-3xl text-sm text-muted">Sin margen y límites, el agente no sabe cuánto puede pagar por una venta. Estos valores son la base de "escalar", "recortar" y de cada veredicto semanal. Se guarda quién cambió qué.</p>

      <ProfileForm key={`${accountId}:${prof?.version ?? 0}`} canEdit={canEdit}>
        <input type="hidden" name="account_id" value={accountId} />
        <input type="hidden" name="expected_version" value={prof?.version ?? 0} />
        <Card>
          <h2 className="mb-1 text-xl font-semibold">Economía</h2>
          <p className="mb-4 text-xs text-muted">ROAS de equilibrio = 1 ÷ margen bruto. Si lo dejas vacío se calcula del margen. {be && <Chip tone="ok">equilibrio actual {Number(be).toFixed(2)}</Chip>}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field name="gross_margin_pct" label="Margen bruto" unit="%" help="Después de producto, envío y comisiones de pago. Antes de publicidad." value={prof?.gross_margin_pct} />
            <Field name="breakeven_roas" label="ROAS de equilibrio" unit="x" help="Abajo de esto cada venta pierde dinero." value={prof?.breakeven_roas} />
            <Field name="target_roas" label="ROAS objetivo" unit="x" help="El ROAS al que quieres operar. Escalar solo por arriba de aquí." value={prof?.target_roas} />
            <Field name="target_cpa" label="CPA objetivo" unit="MXN por compra" help="Costo máximo aceptable por compra." value={prof?.target_cpa} />
          </div>
        </Card>
        <Card>
          <h2 className="mb-1 text-xl font-semibold">Límites de gasto y candados</h2>
          <p className="mb-4 text-xs text-muted">Los candados aplican también a las recomendaciones: el agente no sugiere lo que la regla prohíbe. Basta uno cerrado para que nada salga.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field name="daily_spend_ceiling" label="Techo de gasto diario" unit="MXN" help="Referencia para alertas y restricciones del agente; no es un límite de facturación impuesto a Meta." value={prof?.daily_spend_ceiling} />
            <Field name="daily_spend_floor" label="Piso de gasto diario" unit="MXN" help="Por debajo, el agente avisa que la cuenta se está apagando." value={prof?.daily_spend_floor} />
            <Field name="exploration_budget_pct" label="Presupuesto de exploración" unit="% del techo" help="Reservado a experimentos. La suma de presupuestos de experimentos activos no puede rebasarlo." value={prof?.exploration_budget_pct ?? 10} />
            <Field name="max_committed_budget_factor" label="Factor de presupuesto comprometido" unit="× techo" help="Si la suma de presupuestos diarios activos rebasa techo × este factor, el estratega no propone subidas y avisa (alerta info)." value={prof?.max_committed_budget_factor ?? 1.3} />
            <Field name="max_budget_change_pct" label="Cambio máximo por movimiento" unit="%" help="Límite operativo por cambio. No garantiza evitar cambios en el aprendizaje de Meta." value={prof?.max_budget_change_pct ?? 20} />
            <Field name="max_cumulative_change_pct" label="Cambio acumulado máximo" unit="%" help="Suma de movimientos de presupuesto sobre la misma campaña dentro de la ventana de abajo. Frena el goteo de +17% cada 3 días." value={prof?.max_cumulative_change_pct ?? 35} />
            <Field name="cumulative_window_days" label="Ventana del acumulado" unit="días" help="Días sobre los que se suma el cambio acumulado." value={prof?.cumulative_window_days ?? 7} step="1" />
            <Field name="cooldown_hours" label="Espera tras un cambio" unit="horas" help="No se vuelve a tocar la misma campaña antes de este tiempo." value={prof?.cooldown_hours ?? 72} step="1" />
            <Field name="max_actions_per_day" label="Tope de acciones por pasada" unit="propuestas" help="Máximo de propuestas que el estratega deja pendientes en una pasada (una al día, con el día anterior cerrado). Más del doble de esto en una pasada activa el freno." value={prof?.max_actions_per_day ?? 5} step="1" />
          </div>
        </Card>
        <Card>
          <h2 className="mb-1 text-xl font-semibold">Modo y campañas permitidas</h2>
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            {[["off", "Apagado", "el agente solo observa y registra"], ["semi", "Semiautomático", "propone con razones; una persona aprueba o rechaza"], ["auto", "Automático", "no habilitado"]].map(([v, l, h]) => (
              <label key={v} className={`flex items-start gap-2 rounded border border-line px-3 py-2 ${v === "auto" ? "opacity-50" : ""}`}><input type="radio" name="mode" value={v} defaultChecked={(prof?.mode ?? "off") === v} disabled={v === "auto"} className="mt-1" /><span><b>{l}</b><br /><span className="text-xs text-muted">{h}</span></span></label>
            ))}
          </div>
          <label className="mb-4 flex items-start gap-2 rounded border border-line px-3 py-2 text-sm"><input type="checkbox" name="dry_run" defaultChecked={prof?.dry_run !== false} className="mt-1" /><span><b>Modo simulado (dry run)</b><br /><span className="text-xs text-muted">Activado: las propuestas se simulan, sin enviar cambios a Meta. Desactivado: una aprobación puede permitir cambios reales si el ejecutor tiene acceso. La simulación no demuestra que una orden real vaya a confirmarse. Mantener activado hasta completar las comprobaciones de seguridad y autorizar el piloto.</span></span></label>
          <p className="mb-2 text-xs text-muted">Lista blanca: solo estas campañas pueden recibir propuestas de presupuesto. Se muestran {choices.activeCount} activas y las inactivas ya seleccionadas. Pausar una campaña no elimina tu selección; desmárcala si quieres retirarla.</p>
          <div className="grid gap-1 sm:grid-cols-2">
            {choices.visible.map(c => <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-paper"><input type="checkbox" name="whitelist" value={c.id} defaultChecked={wl.has(c.id)} /><span className="truncate">{c.name}{c.effective_status !== "ACTIVE" && <span className="ml-2 text-xs text-muted">inactiva · seleccionada</span>}</span>{c.daily_budget && <span className="tnum ml-auto font-mono text-[11px] text-muted">${(Number(c.daily_budget) / 100).toLocaleString("es-MX")}/día</span>}</label>)}
            {choices.missing.map(id => <label key={id} className="flex items-center gap-2 rounded border border-line px-2 py-2 text-sm"><input type="checkbox" name="whitelist" value={id} defaultChecked /><span>Campaña {id}: no disponible. Desmárcala para retirarla o revisa la sincronización antes de guardar.</span></label>)}
          </div>
        </Card>
        <Card>
          <h2 className="mb-1 text-xl font-semibold">Notas de operación</h2>
          <p className="mb-2 text-xs text-muted">Notas informativas para el equipo. Escribir aquí una restricción no la convierte en una regla automática: debe implementarse y comprobarse antes de confiar en ella para limitar acciones.</p>
          <textarea name="hard_noes" aria-label="Notas de operación" maxLength={10000} rows={4} defaultValue={prof?.hard_noes ?? ""} className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
        </Card>
        {prof?.updated_at && <span className="font-mono text-[11px] text-muted">revisión {prof.version} · última actualización {fmtDay(prof.updated_at)} {fmtTime(prof.updated_at)}</span>}
      </ProfileForm>

      {history?.length ? <Card><h2 className="mb-2 font-semibold">Últimos cambios de configuración</h2><ul className="text-sm">{history.map(h => <li key={h.id} className="border-t border-line py-2 first:border-t-0"><span className="font-mono text-[11px] text-muted">{fmtDay(h.created_at)} {fmtTime(h.created_at)}</span> · <b>{String(h.changed_by).split("@")[0]}</b> · {h.to_version ? `revisión ${h.from_version} → ${h.to_version}` : "registro anterior al versionado"}<details className="mt-1"><summary className="cursor-pointer text-xs">Ver campos registrados ({Object.keys(h.patch ?? {}).length})</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(h.patch, null, 2)}</pre></details></li>)}</ul></Card> : null}
    </div>
  );
}
