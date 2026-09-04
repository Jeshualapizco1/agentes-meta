import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { saveProfile } from "./actions";
import { Chip } from "@/components/Chip";
import { fmtDay, fmtTime } from "@/lib/format";
import { Card } from "@/components/Card";
export const dynamic = "force-dynamic";

function Field({ name, label, help, value, unit, step = "any" }: { name: string; label: string; help: string; value: number | null | undefined; unit?: string; step?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold">{label}{unit && <span className="ml-1 font-mono text-[11px] font-normal text-muted">{unit}</span>}</span>
      <input name={name} type="number" step={step} defaultValue={value ?? ""} className="tnum rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
      <span className="text-xs text-muted">{help}</span>
    </label>
  );
}

export default async function Configuracion({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams; await requireUser("/configuracion"); const sb = db();
  const { data: accounts } = await sb.from("accounts").select("id,name").eq("enabled", true).order("name");
  const accountId = p.account ?? "1703313583465547";
  const [{ data: prof }, { data: camps }, { data: history }] = await Promise.all([
    sb.from("account_profiles").select("*").eq("account_id", accountId).maybeSingle(),
    sb.from("entities").select("id,name,effective_status,daily_budget").eq("account_id", accountId).eq("level", "campaign").order("name"),
    sb.from("profile_changes").select("changed_by,created_at,patch").eq("account_id", accountId).order("created_at", { ascending: false }).limit(5),
  ]);
  const active = (camps ?? []).filter(c => c.effective_status === "ACTIVE");
  const wl = new Set<string>(prof?.whitelist_campaign_ids ?? []);
  const be = prof?.breakeven_roas ?? (prof?.gross_margin_pct ? 100 / prof.gross_margin_pct : null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div><p className="font-mono text-[11px] uppercase tracking-wider text-muted">Configuración por cuenta</p><h1 className="text-3xl font-bold tracking-tight">Con qué números decide el agente</h1></div>
        <form method="get" className="ml-auto flex gap-2"><select name="account" defaultValue={accountId} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm">{(accounts ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select><button className="btn-accent px-3 py-1 text-sm font-semibold text-white">Cambiar</button></form>
      </div>
      {p.saved && <p className="rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">Guardado. Los agentes usan estos valores desde la próxima corrida.</p>}
      <p className="max-w-3xl text-sm text-muted">Sin margen y límites, el agente no sabe cuánto puede pagar por una venta. Estos valores son la base de "escalar", "recortar" y de cada veredicto semanal. Se guarda quién cambió qué.</p>

      <form action={saveProfile} className="flex flex-col gap-6">
        <input type="hidden" name="account_id" value={accountId} />
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
            <Field name="daily_spend_ceiling" label="Techo de gasto diario" unit="MXN" help="Suma de todas las campañas activas. Nunca se rebasa." value={prof?.daily_spend_ceiling} />
            <Field name="daily_spend_floor" label="Piso de gasto diario" unit="MXN" help="Por debajo, el agente avisa que la cuenta se está apagando." value={prof?.daily_spend_floor} />
            <Field name="exploration_budget_pct" label="Presupuesto de exploración" unit="% del techo" help="Reservado a experimentos. La suma de presupuestos de experimentos activos no puede rebasarlo." value={prof?.exploration_budget_pct ?? 10} />
            <Field name="max_committed_budget_factor" label="Factor de presupuesto comprometido" unit="× techo" help="Si la suma de presupuestos diarios activos rebasa techo × este factor, el estratega no propone subidas y avisa (alerta info)." value={prof?.max_committed_budget_factor ?? 1.3} />
            <Field name="max_budget_change_pct" label="Cambio máximo por movimiento" unit="%" help="Más del 20% reinicia la fase de aprendizaje de Meta." value={prof?.max_budget_change_pct ?? 20} />
            <Field name="max_cumulative_change_pct" label="Cambio acumulado máximo" unit="%" help="Suma de movimientos de presupuesto sobre la misma campaña dentro de la ventana de abajo. Frena el goteo de +17% cada 3 días." value={prof?.max_cumulative_change_pct ?? 35} />
            <Field name="cumulative_window_days" label="Ventana del acumulado" unit="días" help="Días sobre los que se suma el cambio acumulado." value={prof?.cumulative_window_days ?? 7} step="1" />
            <Field name="cooldown_hours" label="Espera tras un cambio" unit="horas" help="No se vuelve a tocar la misma campaña antes de este tiempo." value={prof?.cooldown_hours ?? 72} step="1" />
            <Field name="max_actions_per_day" label="Tope de acciones por pasada" unit="propuestas" help="Máximo de propuestas que el estratega deja pendientes en una pasada (una al día, con el día anterior cerrado). Más del doble de esto en una pasada activa el freno." value={prof?.max_actions_per_day ?? 5} step="1" />
          </div>
        </Card>
        <Card>
          <h2 className="mb-1 text-xl font-semibold">Modo y campañas permitidas</h2>
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            {[["off", "Apagado", "el agente solo observa y registra"], ["semi", "Semiautomático", "propone con razones; una persona aprueba o rechaza"], ["auto", "Automático", "disponible en Fase 4b"]].map(([v, l, h]) => (
              <label key={v} className={`flex items-start gap-2 rounded border border-line px-3 py-2 ${v === "auto" ? "opacity-50" : ""}`}><input type="radio" name="mode" value={v} defaultChecked={(prof?.mode ?? "off") === v} disabled={v === "auto"} className="mt-1" /><span><b>{l}</b><br /><span className="text-xs text-muted">{h}</span></span></label>
            ))}
          </div>
          <label className="mb-4 flex items-start gap-2 rounded border border-line px-3 py-2 text-sm"><input type="checkbox" name="dry_run" defaultChecked={prof?.dry_run !== false} className="mt-1" /><span><b>Modo simulado (dry run)</b><br /><span className="text-xs text-muted">Al aprobar una propuesta, el ejecutor corre toda la tubería (registro, orden, permiso del token) pero no llama a Meta; la propuesta queda como "simulada". Desmarcar solo cuando la Fase 4b esté aprobada para escribir de verdad.</span></span></label>
          <p className="mb-2 text-xs text-muted">Lista blanca: solo estas campañas pueden recibir propuestas de presupuesto. Se muestran las {active.length} activas; las demás campañas ({(camps?.length ?? 0) - active.length}) están pausadas o archivadas.</p>
          <div className="grid gap-1 sm:grid-cols-2">
            {active.map(c => <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-paper"><input type="checkbox" name="whitelist" value={c.id} defaultChecked={wl.has(c.id)} /><span className="truncate">{c.name}</span>{c.daily_budget && <span className="tnum ml-auto font-mono text-[11px] text-muted">${(Number(c.daily_budget) / 100).toLocaleString("es-MX")}/día</span>}</label>)}
          </div>
        </Card>
        <Card>
          <h2 className="mb-1 text-xl font-semibold">Noes duros</h2>
          <p className="mb-2 text-xs text-muted">Reglas que el agente nunca debe proponer romper. Una por línea. Ej.: "No pausar campañas de retargeting", "No escalar los domingos", "No tocar campañas con menos de 3 días".</p>
          <textarea name="hard_noes" rows={4} defaultValue={prof?.hard_noes ?? ""} className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
        </Card>
        <div className="flex items-center gap-4"><button className="btn-accent px-4 py-2 text-sm font-semibold text-white">Guardar configuración</button>{prof?.updated_at && <span className="font-mono text-[11px] text-muted">última actualización {fmtDay(prof.updated_at)} {fmtTime(prof.updated_at)}</span>}</div>
      </form>

      {history?.length ? <Card><h2 className="mb-2 font-semibold">Últimos cambios de configuración</h2><ul className="text-sm">{history.map((h, i) => <li key={i} className="border-t border-line py-1 first:border-t-0"><span className="font-mono text-[11px] text-muted">{fmtDay(h.created_at)} {fmtTime(h.created_at)}</span> · <b>{String(h.changed_by).split("@")[0]}</b> · ROAS obj. {h.patch?.target_roas ?? "—"} · CPA obj. {h.patch?.target_cpa ?? "—"} · techo {h.patch?.daily_spend_ceiling ?? "—"} · modo {h.patch?.mode}</li>)}</ul></Card> : null}
    </div>
  );
}
