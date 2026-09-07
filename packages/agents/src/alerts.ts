import type { Db } from "@agentes-meta/db";

type Log = (message: string) => void;

export type InsightsStatus = "ok" | "failed" | "skipped";

export interface AlertResolutionContext {
  agent?: "collector" | "analyst" | "strategist";
  status?: "ok" | "failed";
  insightsStatus?: InsightsStatus;
  ceiling?: { over_spend: boolean; over_committed: boolean } | null;
  token?: { is_valid: boolean; days_left: number | null } | null;
  accountStatus?: number | null;
}

/** Decide qué condiciones ya no existen; nunca incluye alertas que exigen intervención humana. */
export function resolvedAlertKinds(context: AlertResolutionContext): string[] {
  const kinds = new Set<string>();
  if (context.status === "ok") {
    if (context.agent === "collector") {
      kinds.add("collector_failed");
      if (context.insightsStatus !== "failed" && context.insightsStatus !== "skipped") kinds.add("insights_failed");
    }
    if (context.agent === "analyst") kinds.add("analyst_failed");
    if (context.agent === "strategist") kinds.add("strategist_failed");
  }
  if (context.ceiling) {
    if (!context.ceiling.over_spend) kinds.add("spend_over_ceiling");
    if (!context.ceiling.over_committed) kinds.add("budget_committed");
    kinds.add("budget_over_ceiling"); // nombre histórico que ya no se crea
  }
  if (context.token?.is_valid && (context.token.days_left == null || context.token.days_left >= 10)) kinds.add("meta_token_expiring");
  if (context.accountStatus === 1) kinds.add("account_status");
  return [...kinds];
}

/** Cierra alertas sin convertir un fallo auxiliar de DB en fallo del agente. */
export async function closeOpenAlerts(
  db: Db,
  accountId: string | null,
  kinds: string[],
  log: Log,
  options: { keepOrphanAnnotations?: boolean; acknowledgedAt?: string } = {},
): Promise<boolean> {
  if (!kinds.length) return true;
  try {
    const acknowledgedAt = options.acknowledgedAt ?? new Date().toISOString();
    let query = db.from("alerts")
      .update({ acknowledged_at: acknowledgedAt, acknowledged_by: "sistema:recuperado" })
      .in("kind", kinds)
      .is("acknowledged_at", null);
    query = accountId == null ? query.is("account_id", null) : query.eq("account_id", accountId);
    if (options.keepOrphanAnnotations && kinds.includes("collector_failed")) {
      query = query.or("payload->>reason.is.null,payload->>reason.neq.annotation_orphan");
    }
    const { error } = await query;
    if (!error) return true;
    log(`⚠ no se pudieron cerrar alertas ${kinds.join(", ")}: ${error.message}`);
    return false;
  } catch (error) {
    log(`⚠ no se pudieron cerrar alertas ${kinds.join(", ")}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Sustituye las alertas abiertas de una condición por una sola con el dato vigente.
 * Si el cierre falla no inserta, para no empeorar una posible duplicación.
 */
export async function refreshOpenAlert(
  db: Db,
  alert: { account_id: string | null; kind: string; severity: "info" | "warning" | "critical"; message: string; payload?: unknown },
  log: Log,
): Promise<boolean> {
  if (!(await closeOpenAlerts(db, alert.account_id, [alert.kind], log))) return false;
  return recordAlert(db, alert, log);
}

/** Registra una alerta y deja el fallo en el log sin ocultarlo ni tirar al agente. */
export async function recordAlert(
  db: Db,
  alert: { account_id: string | null; kind: string; severity: "info" | "warning" | "critical"; message: string; payload?: unknown },
  log: Log,
): Promise<boolean> {
  try {
    const { error } = await db.from("alerts").insert(alert);
    if (!error) return true;
    log(`⚠ no se pudo registrar alerta ${alert.kind}: ${error.message}`);
    return false;
  } catch (error) {
    log(`⚠ no se pudo registrar alerta ${alert.kind}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}
