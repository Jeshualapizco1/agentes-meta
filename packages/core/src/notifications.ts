/**
 * Canal de alertas (Telegram): formato de cada mensaje, puro. Qué se envía:
 *  - cada alerta crítica al momento; - un resumen diario tras la pasada del estratega; - cada propuesta que queda pendiente
 *  y cada una que expira sin decisión. Warning e info se quedan en /estado. La clave (`key`) evita duplicados en la base.
 */
export type NotificationKind = "alerta_critica" | "resumen_diario" | "propuesta_pendiente" | "propuesta_expirada";
export interface Notification { key: string; kind: NotificationKind; text: string }

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const money = (v: unknown) => (typeof v === "number" ? `$${Math.round(v).toLocaleString("es-MX")}` : String(v ?? "—"));
const ALERT_TITLE: Record<string, string> = { emergency_brake: "Freno de emergencia activado", collector_failed: "Collector caído", meta_auth: "Token de Meta inválido", meta_token_expiring: "Token de Meta por vencer", spend_over_ceiling: "Gasto real sobre el techo", account_status: "Cuenta no activa" };

export function formatCriticalAlert(a: { id: string; kind: string; message: string; account_name?: string | null }, appUrl: string): Notification {
  const title = ALERT_TITLE[a.kind] ?? a.kind;
  return { key: `alert:${a.id}`, kind: "alerta_critica", text: `🔴 <b>${escapeHtml(title)}</b>${a.account_name ? ` · ${escapeHtml(a.account_name)}` : ""}\n${escapeHtml(a.message)}\n<a href="${appUrl}/estado">Ver estado</a>` };
}

export function formatDailySummary(s: { account_id: string; account_name: string; day: string; reviewed: number; proposed: number; blocked: number; brake: boolean; matured_windows: number; experiments_expiring: number; mode: string }, appUrl: string): Notification {
  return { key: `summary:${s.account_id}:${s.day}`, kind: "resumen_diario", text: `📋 <b>${escapeHtml(s.account_name)}</b> · pasada del ${s.day} (modo ${escapeHtml(s.mode)})\nRevisó ${s.reviewed} entidades, propuso ${s.proposed}${s.blocked ? ` (${s.blocked} descartadas por candados)` : ""}, freno: ${s.brake ? "SÍ" : "no"}, ventanas maduradas hoy: ${s.matured_windows}, experimentos por vencer: ${s.experiments_expiring}\n<a href="${appUrl}/hoy?account=${s.account_id}">Abrir Hoy</a>` };
}

type ProposalLike = { id: string; account_id: string; account_name?: string | null; rule_name?: string | null; action: string; entity_name?: string | null; before_value?: unknown; after_value?: unknown; expires_at?: string | null };
const ACTION: Record<string, string> = { pausar_anuncio: "Pausar anuncio", subir_presupuesto: "Subir presupuesto", bajar_presupuesto: "Bajar presupuesto", mover_presupuesto: "Mover presupuesto" };
const proposalLine = (p: ProposalLike) => `${escapeHtml(ACTION[p.action] ?? p.action)} · <b>${escapeHtml(p.entity_name ?? "—")}</b>: ${escapeHtml(money(p.before_value))} → ${escapeHtml(money(p.after_value))}${p.rule_name ? ` (regla ${escapeHtml(p.rule_name)})` : ""}`;

export function formatProposalPending(p: ProposalLike, appUrl: string): Notification {
  return { key: `proposal_pending:${p.id}`, kind: "propuesta_pendiente", text: `🟡 <b>Propuesta pendiente</b>${p.account_name ? ` · ${escapeHtml(p.account_name)}` : ""}\n${proposalLine(p)}${p.expires_at ? `\nExpira ${escapeHtml(p.expires_at.slice(0, 16).replace("T", " "))} UTC` : ""}\n<a href="${appUrl}/hoy?account=${p.account_id}">Aprobar o rechazar</a>` };
}

export function formatProposalExpired(p: ProposalLike, appUrl: string): Notification {
  return { key: `proposal_expired:${p.id}`, kind: "propuesta_expirada", text: `⚪ <b>Propuesta expirada sin decisión</b>${p.account_name ? ` · ${escapeHtml(p.account_name)}` : ""}\n${proposalLine(p)}\nSi sigue aplicando, el estratega la vuelve a proponer en la siguiente pasada.\n<a href="${appUrl}/hoy?account=${p.account_id}">Abrir Hoy</a>` };
}
