/**
 * Reporte de "primera semana en solitario". Se manda una sola vez (clave week_report:<fin>) cuando los últimos 7 días
 * tuvieron corridas programadas del collector sin ninguna manual, y la más antigua de esas corridas tiene al menos 7 días.
 * `force` lo manda (o lo imprime, sin token) aunque no se cumpla la condición: sirve para previsualizarlo.
 */
import { formatWeekReport, type WeekReportData } from "@agentes-meta/core";
import { fetchAll, type Db } from "@agentes-meta/db";
import { sendTelegram, type TelegramConfig } from "./telegram.js";

export async function weekReport(db: Db, cfg: TelegramConfig, log: (m: string) => void, o: { force?: boolean } = {}): Promise<{ sent: boolean; reason: string; text?: string }> {
  const now = Date.now(), since = new Date(now - 7 * 86400_000).toISOString();
  const runs = await fetchAll<{ agent: string; status: string; triggered_by: string | null; started_at: string }>(() => db.from("agent_runs").select("agent,status,triggered_by,started_at").gte("started_at", since).order("started_at"));
  const collectorRuns = runs.filter(r => r.agent === "collector");
  const manual = collectorRuns.filter(r => r.triggered_by !== "schedule").length;
  const firstScheduled = collectorRuns.find(r => r.triggered_by === "schedule")?.started_at;
  const coverage = firstScheduled ? (now - new Date(firstScheduled).getTime()) / 86400_000 : 0;
  const periodEnd = new Date(now).toISOString().slice(0, 10), periodStart = since.slice(0, 10);
  if (!o.force) {
    if (manual > 0) return { sent: false, reason: `hubo ${manual} corrida(s) manual(es) en los últimos 7 días: la semana en solitario vuelve a contar` };
    if (coverage < 6.9) return { sent: false, reason: `van ${coverage.toFixed(1)} de 7 días de corridas programadas` };
    const { data: done } = await db.from("notifications").select("key").like("key", "week_report:%").gte("created_at", since).limit(1);
    if (done?.length) return { sent: false, reason: "el reporte de esta semana ya se mandó" };
  }
  const byAgent = new Map<string, { ok: number; failed: number }>();
  for (const r of runs) { const a = byAgent.get(r.agent) ?? { ok: 0, failed: 0 }; if (r.status === "ok") a.ok++; else if (r.status === "failed") a.failed++; byAgent.set(r.agent, a); }
  const alerts = await fetchAll<{ kind: string }>(() => db.from("alerts").select("kind").gte("created_at", since));
  const alerts_by_kind: Record<string, number> = {}; for (const a of alerts) alerts_by_kind[a.kind] = (alerts_by_kind[a.kind] ?? 0) + 1;
  const props = await fetchAll<{ status: string }>(() => db.from("proposals").select("status").gte("created_at", since));
  const count = (s: string) => props.filter(p => p.status === s).length;
  const proposals = { generated: props.length, blocked: count("descartada"), approved: count("aprobada") + count("simulada") + count("ejecutada"), rejected: count("rechazada"), expired: count("expirada"), simulated: count("simulada"), executed: count("ejecutada") };
  const changes = await fetchAll<{ session_id: string; horizon: string; from_reading: string | null; to_reading: string | null; changed_at: string }>(() => db.from("verdict_changes").select("session_id,horizon,from_reading,to_reading,changed_at").eq("matured", true).gte("changed_at", since).order("changed_at"));
  const sids = [...new Set(changes.map(c => c.session_id))];
  const names = new Map<string, string>();
  for (let i = 0; i < sids.length; i += 200) for (const s of await fetchAll<{ id: string; summary: string }>(() => db.from("change_sessions").select("id,summary").in("id", sids.slice(i, i + 200)))) names.set(s.id, s.summary);
  const verdicts_changed = changes.filter(c => c.from_reading !== c.to_reading).map(c => ({ when: c.changed_at.slice(5, 10), session: (names.get(c.session_id) ?? c.session_id).slice(0, 80), horizon: c.horizon, from: c.from_reading, to: c.to_reading }));
  const exps = await fetchAll<{ status: string; decided_at: string | null }>(() => db.from("experiments").select("status,decided_at"));
  const experiments = { active: exps.filter(e => e.status === "activo").length, evaluating: exps.filter(e => e.status === "evaluando").length, decided: exps.filter(e => e.decided_at && e.decided_at >= since).length };
  const data: WeekReportData = { period_start: periodStart, period_end: periodEnd, runs: [...byAgent.entries()].map(([agent, v]) => ({ agent, ...v })), alerts_by_kind, proposals, windows_matured: changes.length, verdicts_changed, experiments, manual_runs: manual };
  const msg = formatWeekReport(data, cfg.appUrl ?? "https://bitacora-aromante.netlify.app");
  if (!cfg.token || !cfg.chatId) { log(`  ✉ reporte semanal listo pero sin TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID:\n${msg.text}`); return { sent: false, reason: "sin token de Telegram", text: msg.text }; }
  const { error } = await db.from("notifications").insert({ key: o.force ? `${msg.key}:manual:${Date.now()}` : msg.key, channel: "telegram", kind: "resumen_semanal", message: msg.text, status: "sending" });
  if (error) return { sent: false, reason: error.message };
  const r = await sendTelegram({ token: cfg.token, chatId: cfg.chatId }, msg.text);
  await db.from("notifications").update({ status: r.ok ? "sent" : "failed", response: r.body, sent_at: r.ok ? new Date().toISOString() : null }).like("key", `${msg.key}%`);
  log(`  ✉ reporte de primera semana: ${r.ok ? "enviado" : "falló"}`);
  return { sent: r.ok, reason: r.ok ? "enviado" : JSON.stringify(r.body).slice(0, 200), text: msg.text };
}
