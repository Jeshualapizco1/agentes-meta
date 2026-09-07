/** Contrato v1. Importes en la unidad de la app (MXN), no centavos de Meta. */
const numericFields = {
  gross_margin_pct: { label: "Margen bruto", nullable: true, positive: true, max: 100 },
  breakeven_roas: { label: "ROAS de equilibrio", nullable: true, positive: true },
  target_roas: { label: "ROAS objetivo", nullable: true, positive: true },
  target_cpa: { label: "CPA objetivo", nullable: true, positive: true },
  daily_spend_ceiling: { label: "Techo de gasto diario", nullable: true },
  daily_spend_floor: { label: "Piso de gasto diario", nullable: true },
  max_budget_change_pct: { label: "Cambio máximo por movimiento" },
  cooldown_hours: { label: "Espera tras un cambio", integer: true },
  max_actions_per_day: { label: "Tope de acciones por pasada", integer: true },
  max_cumulative_change_pct: { label: "Cambio acumulado máximo" },
  cumulative_window_days: { label: "Ventana del acumulado", integer: true, positive: true },
  max_committed_budget_factor: { label: "Factor de presupuesto comprometido", positive: true },
  exploration_budget_pct: { label: "Presupuesto de exploración", max: 100 },
} satisfies Record<string, NumericRule>;
interface NumericRule { label: string; nullable?: boolean; positive?: boolean; integer?: boolean; max?: number }
type NumericField = keyof typeof numericFields;
export class ProfileInputError extends Error {
  constructor(public field: string, message: string) { super(message); }
}

function single(form: FormData, name: string): string {
  const values = form.getAll(name);
  if (values.length > 1 || (values.length === 1 && typeof values[0] !== "string")) {
    throw new ProfileInputError(name, "El campo se recibió duplicado o con un formato inválido.");
  }
  return String(values[0] ?? "").trim();
}

export function parseProfileForm(form: FormData) {
  const accountId = single(form, "account_id");
  if (!/^\d{1,32}$/.test(accountId)) throw new ProfileInputError("account_id", "Cuenta inválida.");
  const revision = single(form, "expected_version");
  const expectedVersion = Number(revision);
  if (!/^\d+$/.test(revision) || !Number.isInteger(expectedVersion) || expectedVersion > 2147483647) {
    throw new ProfileInputError("expected_version", "Falta una versión válida. Recarga la configuración antes de guardar.");
  }
  const mode = single(form, "mode");
  if (mode !== "off" && mode !== "semi") throw new ProfileInputError("mode", "Modo inválido. El modo automático no está habilitado.");
  const numbers = {} as Record<NumericField, number | null>;
  for (const [name, rule] of Object.entries(numericFields) as [NumericField, NumericRule][]) {
    const raw = single(form, name);
    if (!raw && rule.nullable) { numbers[name] = null; continue; }
    const n = Number(raw);
    // No se reinterpretan comas, porcentajes, hexadecimales o errores como valores por defecto.
    if (!raw || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw) || !Number.isFinite(n) || n < 0 ||
        (rule.positive && n <= 0) || n > (rule.max ?? (rule.integer ? 2147483647 : Number.MAX_SAFE_INTEGER)) ||
        (rule.integer && (!Number.isInteger(n) || !/^\d+$/.test(raw)))) {
      throw new ProfileInputError(name, `${rule.label}: introduce ${rule.integer ? "un entero" : "un número"} válido${rule.positive ? " mayor que cero" : " no negativo"}${rule.max ? ` (máximo ${rule.max})` : ""}.`);
    }
    numbers[name] = n;
  }
  if (numbers.breakeven_roas === null && numbers.gross_margin_pct !== null) {
    const derived = Number((100 / numbers.gross_margin_pct).toFixed(2));
    if (!Number.isFinite(derived) || derived > Number.MAX_SAFE_INTEGER) throw new ProfileInputError("gross_margin_pct", "El margen es demasiado pequeño para calcular el ROAS de equilibrio.");
    numbers.breakeven_roas = derived;
  }
  if (numbers.daily_spend_floor !== null && numbers.daily_spend_ceiling !== null && numbers.daily_spend_floor > numbers.daily_spend_ceiling) {
    throw new ProfileInputError("daily_spend_floor", "El piso no puede superar el techo de gasto diario.");
  }
  const whitelist = form.getAll("whitelist");
  if (whitelist.some(id => typeof id !== "string" || !/^\d{1,32}$/.test(id))) throw new ProfileInputError("whitelist", "La lista de campañas contiene un identificador inválido.");
  const notes = single(form, "hard_noes");
  if (notes.length > 10000) throw new ProfileInputError("hard_noes", "Las notas no pueden superar 10 000 caracteres.");
  const dryRun = single(form, "dry_run");
  if (dryRun !== "" && dryRun !== "on") throw new ProfileInputError("dry_run", "Valor de simulación inválido.");
  return { accountId, expectedVersion, profile: {
    ...numbers, mode, dry_run: dryRun === "on", whitelist_campaign_ids: [...new Set(whitelist as string[])].sort(), hard_noes: notes || null,
  } };
}

export interface ProfileSaveState { error?: string; field?: string }
export function profileRpcError(code?: string, message?: string): ProfileSaveState {
  if (message === "PROFILE_VERSION_CONFLICT") return { error: "Otra persona guardó una versión más reciente. Tus cambios siguen en el formulario; cópialos antes de recargar y comparar." };
  if (message === "PROFILE_INVALID_WHITELIST") return { field: "whitelist", error: "Una campaña seleccionada ya no existe o no pertenece a esta cuenta. Revisa la lista; no se guardó ningún cambio." };
  if (message === "PROFILE_ACCOUNT_UNAVAILABLE") return { error: "La cuenta no existe o está deshabilitada. No se guardó ningún cambio." };
  if (code === "42501") return { error: "No tienes permiso para guardar esta configuración. Verifica tu acceso." };
  if (code === "PGRST202" || code === "42883") return { error: "La base de datos necesita la actualización de configuración segura. Contacta al administrador; no se utilizó el guardado anterior." };
  if (code === "22023") return { error: "La base rechazó los valores recibidos. Revisa los campos; no se guardó ningún cambio." };
  return { error: "No se pudo confirmar el guardado. Conserva tus cambios y revisa el historial antes de reintentar." };
}
