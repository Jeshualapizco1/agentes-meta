/**
 * Fase 4b · Ejecutor. Corre toda la tubería para una propuesta aprobada: orden (core) → write-ahead log (registrada →
 * enviada → confirmada | fallida) → rollback y congelamiento si falla un par → huella en la bitácora.
 * En dry_run (por cuenta, activado por defecto) hace todo menos llamar a Meta: guarda la orden que habría mandado y verifica
 * con debug_token que el token tenga ads_management. El resultado se ve en la propuesta como "simulada".
 * Si no se puede registrar, no se envía; y un fallo de registro activa el freno.
 */
import { orderForProposal, expandOrders, confirmMatches, pairFailurePlan, describeOrder, transition, uuidV5, type WriteOrder, type ExecState } from "@agentes-meta/core";
import { MetaClient, MetaWriter } from "@agentes-meta/meta";
import { fetchAll, type Db } from "@agentes-meta/db";
import { engageBrake } from "./strategist.js";

type Proposal = { id: string; account_id: string; status: string; action: string; entity_id: string; entity_level: "campaign" | "adset" | "ad"; entity_name: string | null; before_value: unknown; after_value: unknown; move_to_entity_id: string | null; move_to_before: number | null };
export interface ExecOutcome { status: "simulada" | "ejecutada" | "fallida" | "aprobada"; note: string }

export const metaFromEnv = (env = process.env): MetaClient | null => (env.META_TOKEN_AROMANTE ? new MetaClient({ token: env.META_TOKEN_AROMANTE, version: env.META_API_VERSION }) : null);

export async function executeProposal(db: Db, meta: MetaClient | null, proposalId: string, log: (m: string) => void = () => {}): Promise<ExecOutcome> {
  const { data: p } = await db.from("proposals").select("id,account_id,status,action,entity_id,entity_level,entity_name,before_value,after_value,move_to_entity_id,move_to_before").eq("id", proposalId).single();
  if (!p) return { status: "fallida", note: "propuesta inexistente" };
  const prop = p as Proposal;
  if (prop.status !== "aprobada") return { status: prop.status as ExecOutcome["status"], note: `la propuesta está ${prop.status}; solo se ejecutan aprobadas` };
  const finish = async (status: ExecOutcome["status"], note: string): Promise<ExecOutcome> => { await db.from("proposals").update({ status, execution_note: note }).eq("id", prop.id); log(`  ⚙ propuesta ${prop.id.slice(0, 8)}: ${status} · ${note}`); return { status, note }; };
  const [{ data: prof }, { data: brake }] = await Promise.all([
    db.from("account_profiles").select("dry_run").eq("account_id", prop.account_id).maybeSingle(),
    db.from("emergency_brakes").select("active").eq("account_id", prop.account_id).maybeSingle(),
  ]);
  if (brake?.active) return finish("fallida", "freno de emergencia activo: no se ejecuta nada hasta liberarlo");
  if (!meta) return { status: "aprobada", note: "sin token de Meta en este entorno; el collector la ejecuta en su siguiente pasada" };
  const dryRun = prof?.dry_run !== false;
  // 1. orden (solo tres operaciones; lo demás lanza aquí)
  let orders: WriteOrder[];
  try { orders = expandOrders(orderForProposal({ ...prop, move_to: prop.move_to_entity_id ? { entity_id: prop.move_to_entity_id, before_value: Number(prop.move_to_before ?? 0) } : null }), `move:${prop.id}`); }
  catch (e) { return finish("fallida", `orden rechazada: ${e instanceof Error ? e.message : String(e)}`); }
  const writer = new MetaWriter(meta);
  const perm = await writer.hasAdsManagement().catch(e => ({ ok: false, scopes: [] as string[], error: e instanceof Error ? e.message : String(e) }));
  const now = () => new Date().toISOString();
  const setState = async (id: string, from: ExecState, to: ExecState, patch: Record<string, unknown>) => { transition(from, to); const { error } = await db.from("executions").update({ state: to, ...patch }).eq("id", id); if (error) throw new Error(error.message); return to; };
  const execIds: string[] = [];
  for (const [i, order] of orders.entries()) {
    // 2. registrar antes de enviar; si no se puede registrar, no se envía y se frena
    const { data: ex, error } = await db.from("executions").insert({ proposal_id: prop.id, account_id: prop.account_id, step: i + 1, pair_key: orders.length > 1 ? `move:${prop.id}` : null, order_payload: order, state: "registrada", dry_run: dryRun, token_scopes: perm.scopes }).select("id").single();
    if (error || !ex) { await engageBrake(db, prop.account_id, "sistema", `fallo al registrar una ejecución (write-ahead log): ${error?.message ?? "sin fila"}`); return finish("fallida", `no se pudo registrar la orden ${i + 1}; nada se envió; freno activado`); }
    execIds.push(ex.id);
    let state: ExecState = "registrada";
    if (dryRun) {
      // 3a. simulado: guardar lo que se habría mandado y verificar el permiso del token
      state = await setState(ex.id, state, "enviada", { sent_at: now(), response: { dry_run: true, would_send: order, has_ads_management: perm.ok } });
      if (!perm.ok) { await setState(ex.id, state, "fallida", { failed_at: now(), error: `el token no tiene ads_management (scopes: ${perm.scopes.join(", ") || "ninguno"})` }); return finish("fallida", `simulación: el token no tiene permiso ads_management; no se habría podido enviar`); }
      await setState(ex.id, state, "confirmada", { confirmed_at: now(), reread: { simulated: true } });
      continue;
    }
    // 3b. real: enviar, releer, confirmar
    try {
      state = await setState(ex.id, state, "enviada", { sent_at: now() });
      const res = await writer.execute(order);
      const reread = await writer.reread(order.op === "pausar_anuncio" ? order.ad_id : order.op === "cambiar_presupuesto" ? order.entity_id : order.from_id);
      if (!confirmMatches(order, reread)) throw new Error(`la entidad releída no coincide con lo ordenado (${JSON.stringify(reread)})`);
      await setState(ex.id, state, "confirmada", { confirmed_at: now(), response: res.response, reread });
      const entityId = order.op === "pausar_anuncio" ? order.ad_id : order.op === "cambiar_presupuesto" ? order.entity_id : order.from_id;
      await db.from("entity_freezes").upsert({ entity_id: entityId, account_id: prop.account_id, until: new Date(Date.now() + 72 * 3600_000).toISOString(), reason: "ejecutada por el estratega: 72 h sin volver a tocar", execution_id: ex.id }, { onConflict: "entity_id" });
      // huella en la bitácora: actor Estratega, valor anterior y nuevo
      const d = describeOrder(order, prop.entity_name ?? entityId);
      const sid = uuidV5(`session|${prop.account_id}|strategist|${now()}|${ex.id}`);
      await db.from("change_sessions").upsert({ id: sid, account_id: prop.account_id, actor_id: "strategist", actor_name: "Estratega", actor_kind: "agent", started_at: now(), ended_at: now(), kind: d.kind, significance: "major", resets_learning: false, summary: d.summary, campaign_ids: prop.entity_level === "campaign" ? [prop.entity_id] : [], group_count: 1, event_count: 1, counts: { groups: 1, events: 1, byLevel: { [prop.entity_level]: 1 } } }, { onConflict: "id" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await db.from("executions").update({ state: "fallida", failed_at: now(), error: msg }).eq("id", ex.id);
      // 4. par atado: revertir lo enviado y congelar ambas 72 h
      const plan = pairFailurePlan(orders, i + 1, now());
      for (const rb of plan.rollback) {
        const { data: rbx } = await db.from("executions").insert({ proposal_id: prop.id, account_id: prop.account_id, step: 0, pair_key: `move:${prop.id}`, order_payload: rb, state: "registrada", dry_run: false, rollback_of: execIds[0] }).select("id").single();
        try { await db.from("executions").update({ state: "enviada", sent_at: now() }).eq("id", rbx!.id); const r = await writer.execute(rb); await db.from("executions").update({ state: "confirmada", confirmed_at: now(), response: r.response }).eq("id", rbx!.id); }
        catch (e2) { await db.from("executions").update({ state: "fallida", failed_at: now(), error: e2 instanceof Error ? e2.message : String(e2) }).eq("id", rbx!.id); await engageBrake(db, prop.account_id, "sistema", `rollback fallido de la propuesta ${prop.id}`); }
      }
      for (const id of plan.freeze) await db.from("entity_freezes").upsert({ entity_id: id, account_id: prop.account_id, until: plan.until, reason: "fallo de ejecución: congelada 72 h", execution_id: ex.id }, { onConflict: "entity_id" });
      return finish("fallida", `orden ${i + 1} falló: ${msg}${plan.rollback.length ? `; ${plan.rollback.length} orden(es) revertida(s)` : ""}; ${plan.freeze.length} entidad(es) congelada(s) 72 h`);
    }
  }
  return finish(dryRun ? "simulada" : "ejecutada", dryRun ? `simulación completa: ${orders.length} orden(es) registradas, no enviadas; token con ads_management: sí` : `${orders.length} orden(es) enviadas y confirmadas`);
}

/** Propuestas aprobadas que quedaron sin ejecutar (p. ej. aprobadas desde la web sin token): las ejecuta el collector. */
export async function executeApproved(db: Db, meta: MetaClient, accountId: string, log: (m: string) => void): Promise<number> {
  const rows = await fetchAll<{ id: string }>(() => db.from("proposals").select("id").eq("account_id", accountId).eq("status", "aprobada"));
  for (const r of rows) await executeProposal(db, meta, r.id, log);
  return rows.length;
}
