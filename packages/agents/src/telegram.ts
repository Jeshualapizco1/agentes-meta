/**
 * Canal de alertas por Telegram (bot en un grupo del equipo). Token y chat id vienen de secretos (TELEGRAM_BOT_TOKEN,
 * TELEGRAM_CHAT_ID); sin ellos no se envía nada y se dice en el log. Cada envío queda en `notifications` con una clave
 * única: no se duplica y se sabe qué se avisó. El formato lo arma core (notifications.ts, con pruebas).
 */
import { formatCriticalAlert, formatDailySummary, formatProposalPending, formatProposalExpired, type Notification } from "@agentes-meta/core";
import { fetchAll, type Db } from "@agentes-meta/db";

export interface TelegramConfig { token?: string; chatId?: string; appUrl?: string }
export const telegramFromEnv = (env = process.env): TelegramConfig => ({ token: env.TELEGRAM_BOT_TOKEN || undefined, chatId: env.TELEGRAM_CHAT_ID || undefined, appUrl: env.APP_URL_PROD || "https://bitacora-aromante.netlify.app" });

export async function sendTelegram(cfg: { token: string; chatId: string }, text: string): Promise<{ ok: boolean; body: unknown }> {
  const res = await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: cfg.chatId, text, parse_mode: "HTML", disable_web_page_preview: true }), signal: AbortSignal.timeout(20_000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok && (body as { ok?: boolean }).ok !== false, body };
}

/** Recolecta lo pendiente de avisar (últimos 3 días), lo registra con clave única y lo envía. Devuelve cuántos mandó. */
export async function notifyPending(db: Db, cfg: TelegramConfig, log: (m: string) => void): Promise<{ sent: number; failed: number; skipped: number }> {
  const appUrl = cfg.appUrl ?? "https://bitacora-aromante.netlify.app";
  const since = new Date(Date.now() - 3 * 86400_000).toISOString();
  const accounts = await fetchAll<{ id: string; name: string }>(() => db.from("accounts").select("id,name"));
  const nameOf = new Map(accounts.map(a => [a.id, a.name]));
  const msgs: (Notification & { account_id: string | null })[] = [];
  // 1. alertas críticas
  for (const a of await fetchAll<{ id: string; kind: string; message: string; account_id: string | null }>(() => db.from("alerts").select("id,kind,message,account_id").eq("severity", "critical").gte("created_at", since)))
    msgs.push({ ...formatCriticalAlert({ ...a, account_name: a.account_id ? nameOf.get(a.account_id) : null }, appUrl), account_id: a.account_id });
  // 2. resumen diario por pasada del estratega
  const today = new Date().toISOString().slice(0, 10);
  for (const r of await fetchAll<{ account_id: string; stats: Record<string, number | string> | null }>(() => db.from("agent_runs").select("account_id,stats").eq("agent", "strategist").eq("status", "ok").gte("started_at", since))) {
    const s = r.stats ?? {}; const day = String(s.day ?? "");
    if (!day) continue;
    const [{ count: matured }, exps] = await Promise.all([
      db.from("evaluation_windows").select("*", { count: "exact", head: true }).eq("account_id", r.account_id).eq("status", "mature").gte("ends_at", `${day}T00:00:00Z`).lte("ends_at", `${day}T23:59:59Z`),
      fetchAll<{ start_date: string | null; window_days: number }>(() => db.from("experiments").select("start_date,window_days").eq("account_id", r.account_id).eq("status", "activo")),
    ]);
    const expiring = exps.filter(x => { if (!x.start_date) return false; const end = new Date(`${x.start_date}T12:00:00Z`); end.setUTCDate(end.getUTCDate() + x.window_days); return (end.getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 86400_000 <= 3; }).length;
    msgs.push({ ...formatDailySummary({ account_id: r.account_id, account_name: nameOf.get(r.account_id) ?? r.account_id, day, reviewed: Number(s.reviewed ?? 0), proposed: Number(s.accepted ?? 0), blocked: Number(s.blocked ?? 0), brake: Number(s.brake ?? 0) > 0, matured_windows: matured ?? 0, experiments_expiring: expiring, mode: String(s.mode ?? "off") }, appUrl), account_id: r.account_id });
  }
  // 3. propuestas pendientes y expiradas
  type P = { id: string; account_id: string; rule_name: string | null; action: string; entity_name: string | null; before_value: unknown; after_value: unknown; expires_at: string | null; status: string };
  for (const p of await fetchAll<P>(() => db.from("proposals").select("id,account_id,rule_name,action,entity_name,before_value,after_value,expires_at,status").in("status", ["pendiente", "expirada"]).gte("created_at", since))) {
    const withName = { ...p, account_name: nameOf.get(p.account_id) };
    msgs.push({ ...(p.status === "pendiente" ? formatProposalPending(withName, appUrl) : formatProposalExpired(withName, appUrl)), account_id: p.account_id });
  }
  if (!msgs.length) return { sent: 0, failed: 0, skipped: 0 };
  // ya avisadas
  const keys = msgs.map(m => m.key);
  const done = new Set<string>();
  for (let i = 0; i < keys.length; i += 200) for (const n of await fetchAll<{ key: string }>(() => db.from("notifications").select("key").in("key", keys.slice(i, i + 200)))) done.add(n.key);
  const todo = msgs.filter(m => !done.has(m.key));
  if (!todo.length) return { sent: 0, failed: 0, skipped: msgs.length };
  if (!cfg.token || !cfg.chatId) { log(`  ✉ ${todo.length} aviso(s) sin enviar: faltan TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID`); return { sent: 0, failed: 0, skipped: todo.length }; }
  let sent = 0, failed = 0;
  for (const m of todo) {
    // primero la fila (clave única: si otra corrida la registró, se salta), luego el envío
    const { error } = await db.from("notifications").insert({ key: m.key, channel: "telegram", kind: m.kind, account_id: m.account_id, message: m.text, status: "sending" });
    if (error) { if (error.code === "23505") continue; log(`  ✖ notifications: ${error.message}`); failed++; continue; }
    try {
      const r = await sendTelegram({ token: cfg.token, chatId: cfg.chatId }, m.text);
      await db.from("notifications").update({ status: r.ok ? "sent" : "failed", response: r.body, sent_at: r.ok ? new Date().toISOString() : null }).eq("key", m.key);
      if (r.ok) sent++; else { failed++; log(`  ✖ telegram ${m.key}: ${JSON.stringify(r.body).slice(0, 200)}`); }
    } catch (e) { failed++; await db.from("notifications").update({ status: "failed", response: { error: e instanceof Error ? e.message : String(e) } }).eq("key", m.key); }
  }
  log(`  ✉ telegram: ${sent} enviado(s)${failed ? `, ${failed} fallido(s)` : ""}`);
  return { sent, failed, skipped: msgs.length - todo.length };
}
