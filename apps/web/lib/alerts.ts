export type AlertRow = {
  id: string;
  kind: string;
  severity: string;
  message: string;
  created_at: string;
  payload?: Record<string, unknown> | null;
  account_id?: string | null;
};

export type PresentedAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  at: string;
  action?: { label: string; href: string };
  technical?: string;
};

const shortDate = (value: unknown): string => {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return "una fecha no disponible";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City",
  }).format(new Date(value)).replaceAll(".", "");
};

const severity = (value: string): PresentedAlert["severity"] =>
  value === "critical" ? "critical" : value === "warning" ? "warning" : "info";

const accountHref = (path: string, accountId?: string | null) =>
  accountId ? `${path}${path.includes("?") ? "&" : "?"}account=${encodeURIComponent(accountId)}` : path;

export function presentAlert(row: AlertRow, ctx: { accountId?: string }): PresentedAlert {
  const base = { id: row.id, severity: severity(row.severity), at: row.created_at };
  const payload = row.payload ?? {};
  const accountId = row.account_id ?? ctx.accountId;

  if (row.kind === "collector_failed") {
    if (payload.reason === "annotation_orphan") {
      const sessionId = typeof payload.session_id === "string" ? payload.session_id : "";
      return {
        ...base,
        title: "La sincronización con Meta no terminó",
        description: typeof payload.hint === "string" ? payload.hint : "Hay un cambio que necesita revisión antes de completar la sincronización.",
        action: sessionId ? { label: "Abrir el cambio", href: accountHref(`/sesion/${encodeURIComponent(sessionId)}`, accountId) } : undefined,
        technical: row.message,
      };
    }
    return { ...base, title: "La sincronización con Meta no terminó", description: `Los datos pueden estar incompletos desde ${shortDate(row.created_at)}. Se reintenta sola cada 6 horas.`, technical: row.message };
  }
  if (row.kind === "insights_failed") return { ...base, title: "No se pudieron actualizar las métricas de Meta", description: `Las cifras de gasto y compras pueden estar atrasadas desde ${shortDate(row.created_at)}. Se reintenta sola.`, technical: row.message };
  if (row.kind === "analyst_failed") return { ...base, title: "La evaluación de resultados no terminó", description: "Los veredictos de los cambios recientes pueden estar atrasados. Se reintenta sola.", technical: row.message };
  if (row.kind === "strategist_failed") return { ...base, title: "La revisión del agente no terminó", description: "No se generaron propuestas nuevas en esta revisión. Se reintenta sola.", technical: row.message };
  if (row.kind === "meta_token_expiring") return { ...base, title: "La conexión con Meta vence pronto", description: `Vence el ${shortDate(payload.expires_at)}. Un administrador debe renovar el acceso antes de esa fecha.`, technical: row.message };
  if (row.kind === "account_status") return { ...base, title: "La cuenta de Meta no está activa", description: "Meta reporta la cuenta como inactiva. Revisa facturación o restricciones en el administrador de anuncios.", technical: row.message };
  if (row.kind === "emergency_brake") return { ...base, title: "Freno de emergencia activado", description: row.message, action: { label: "Ver control del agente", href: accountHref("/hoy", accountId) } };
  if (row.kind === "experiment_ready") return { ...base, title: "Una prueba terminó su ventana", description: row.message.replace(/\s*Confirmar en \/experimentos\.?\s*$/i, "").trim(), action: { label: "Decidir", href: accountHref("/experimentos", accountId) } };
  if (row.kind === "budget_committed") return { ...base, title: "Presupuestos activos por encima del techo", description: row.message };
  if (row.kind === "spend_over_ceiling") return { ...base, title: "El gasto de ayer rebasó el techo", description: row.message };
  if (row.kind === "budget_over_ceiling") return { ...base, title: "El presupuesto activo rebasa el techo", description: row.message };

  const title = row.kind.replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
  const rawError = /failed|fetch|error|ECONN|TypeError/i.test(row.message);
  return {
    ...base,
    title,
    description: rawError ? "Ocurrió un problema al actualizar los datos. Se reintenta sola." : row.message,
    technical: rawError ? row.message : undefined,
  };
}
