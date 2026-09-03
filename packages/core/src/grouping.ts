import type { NormalizedEvent, ChangeGroup, ChangeKind, Significance } from "./types.js";
import { isActive, isPaused, isPending } from "./normalize.js";

export const SESSION_GAP_MS = 3 * 60 * 1000; // 98% de eventos humanos consecutivos caen dentro de 3 min (medido en Aromante 1)

const LEVEL_ES: Record<string, string> = { campaign: "campaña", adset: "ad set", ad: "anuncio", account: "cuenta", audience: "audiencia", unknown: "objeto" };
const mxn = (cents: number) => "$" + (cents / 100).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const KIND_RANK: ChangeKind[] = ["budget", "status", "targeting", "bid", "objective", "creative", "schedule", "audience", "name", "review", "delivery", "other"];
const SIG_RANK: Significance[] = ["major", "minor", "system"];

/** Agrupa eventos ya ordenados por tiempo en sesiones (mismo actor + mismo objeto, huecos ≤ 3 min). */
export function groupEvents(events: NormalizedEvent[], gapMs = SESSION_GAP_MS): ChangeGroup[] {
  const sorted = [...events].sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());
  const open = new Map<string, ChangeGroup>();
  const out: ChangeGroup[] = [];
  for (const e of sorted) {
    const key = `${e.actorId}|${e.objectId}`;
    const g = open.get(key);
    if (g && e.eventTime.getTime() - g.endedAt.getTime() <= gapMs) {
      g.events.push(e); g.endedAt = e.eventTime;
    } else {
      if (g) out.push(finalize(g));
      open.set(key, {
        accountId: e.accountId, actorId: e.actorId, actorName: e.actorName, actorKind: e.actorKind,
        objectId: e.objectId, objectName: e.objectName, objectType: e.objectType, level: e.level, campaignId: e.campaignId, parentId: e.parentId,
        startedAt: e.eventTime, endedAt: e.eventTime, kind: "other", significance: "system", resetsLearning: false,
        summary: "", details: {}, events: [e],
      });
    }
  }
  for (const g of open.values()) out.push(finalize(g));
  return out.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
}

function finalize(g: ChangeGroup): ChangeGroup {
  const ev = g.events;
  g.kind = ev.map(e => e.kind).sort((a, b) => KIND_RANK.indexOf(a) - KIND_RANK.indexOf(b))[0] ?? "other";
  g.significance = ev.map(e => e.significance).sort((a, b) => SIG_RANK.indexOf(a) - SIG_RANK.indexOf(b))[0] ?? "system";
  if (!g.campaignId) g.campaignId = ev.find(e => e.campaignId)?.campaignId;

  const parts: string[] = [];
  const details: Record<string, unknown> = {};
  const noun = LEVEL_ES[g.level] ?? "objeto";

  // Presupuesto: primer valor viejo → último valor nuevo
  const budgets = ev.filter(e => e.kind === "budget" && (e.budgetOldCents != null || e.budgetNewCents != null));
  if (budgets.length) {
    const first = budgets[0]!, last = budgets[budgets.length - 1]!;
    const o = first.budgetOldCents, n = last.budgetNewCents;
    const period = last.budgetPeriod === "lifetime" ? "total" : "diario";
    if (o != null && n != null && o > 0) {
      const pct = Math.round(((n - o) / o) * 100);
      parts.push(`Presupuesto ${period} ${mxn(o)} → ${mxn(n)} (${pct >= 0 ? "+" : ""}${pct}%)`);
      details.budget = { oldCents: o, newCents: n, pct, period };
      if (Math.abs(pct) > 20) g.resetsLearning = true;
    } else if (n != null) { parts.push(`Presupuesto ${period} fijado en ${mxn(n)}`); details.budget = { newCents: n, period }; }
  }

  // Estado: ignorar pasos por "pending process"; quedarse con transición neta
  const status = ev.filter(e => e.kind === "status" && e.eventType.includes("run_status"));
  const real = status.filter(e => !isPending(e.runStatusOld) && !isPending(e.runStatusNew));
  const from = status[0]?.runStatusOld, to = status[status.length - 1]?.runStatusNew;
  if (status.length) {
    const passedReview = status.some(e => isPending(e.runStatusOld) || isPending(e.runStatusNew));
    if (isPending(to)) parts.push(`Envió a revisión ${noun}`);
    else if (g.actorKind === "meta" && isPending(from) && isActive(to)) parts.push(`Aprobó y activó ${noun}`);
    else if (isActive(to) && !isActive(from)) parts.push(`Activó ${noun}`);
    else if (isPaused(to) && !isPaused(from)) parts.push(`Pausó ${noun}`);
    else if (real.length === 0 && passedReview && parts.length === 0 && ev.every(e => e.kind === "status")) parts.push(`Editó ${noun} (pasó por revisión)`);
    details.status = { from, to };
  }
  const creates = ev.filter(e => e.eventType.startsWith("create_"));
  if (creates.length) parts.push(`Creó ${noun}`);

  if (ev.some(e => e.kind === "targeting")) { parts.push("Cambió segmentación"); details.targeting = summarizeTargeting(ev); g.resetsLearning = true; }
  if (ev.some(e => e.kind === "bid")) { const b = ev.find(e => e.kind === "bid")!; parts.push(`Estrategia de puja → ${String(b.newValue ?? "")}`); g.resetsLearning = true; }
  if (ev.some(e => e.kind === "objective")) { const b = ev.find(e => e.kind === "objective")!; parts.push(`Objetivo de optimización → ${String(b.newValue ?? "")}`); g.resetsLearning = true; }
  if (ev.some(e => e.kind === "creative")) { parts.push(g.level === "account" ? `Subió imágenes a la cuenta (${ev.filter(e => e.kind === "creative").length})` : "Cambió creativo"); if (g.level !== "account") g.resetsLearning = true; }
  if (ev.some(e => e.kind === "schedule")) parts.push("Cambió programación/duración");
  if (ev.some(e => e.kind === "audience")) parts.push(`${ev.some(e => e.eventType.startsWith("create")) ? "Creó" : "Editó"} audiencia`);
  const names = ev.filter(e => e.kind === "name");
  if (names.length) { const n = names[names.length - 1]!; parts.push(`Renombró: "${String(n.oldValue ?? "")}" → "${String(n.newValue ?? "")}"`); }
  if (ev.some(e => e.kind === "delivery")) parts.push("Meta inició entrega");
  if (ev.some(e => e.kind === "review")) parts.push("Estado tras revisión de Meta");

  const lle = ev.map(e => e.lastLearningExit).filter(Boolean).sort().pop();
  if (lle) details.lastLearningExit = lle;

  g.summary = parts.length ? parts.join(" · ") : `${ev.length} evento(s) ${g.kind}`;
  g.details = { ...details, eventTypes: [...new Set(ev.map(e => e.eventType))] };
  return g;
}

function summarizeTargeting(ev: NormalizedEvent[]): unknown {
  const t = ev.filter(e => e.kind === "targeting").pop();
  if (!t) return undefined;
  const toMap = (v: unknown) => Object.fromEntries((Array.isArray(v) ? v : []).map((x: { content?: string; children?: unknown[] }) => [String(x.content ?? "").replace(/:$/, ""), (x.children ?? []).map(String).join(", ")]));
  const o = toMap(t.oldValue), n = toMap(t.newValue);
  const changed: Record<string, { old?: string; new?: string }> = {};
  for (const k of new Set([...Object.keys(o), ...Object.keys(n)])) if (o[k] !== n[k]) changed[k] = { old: o[k], new: n[k] };
  return changed;
}
