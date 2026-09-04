/**
 * Cliente de ESCRITURA de Meta. Solo tres operaciones: pausar anuncio, cambiar presupuesto diario de campaña o ad set, y
 * mover presupuesto entre dos campañas como par atado. No existe ninguna otra: ni borrar, ni activar, ni editar creativos,
 * segmentación, puja u objetivo. Cualquier orden que no pase por `validateOrder` (core) no llega aquí.
 */
import { validateOrder, type WriteOrder } from "@agentes-meta/core";
import type { MetaClient } from "./index.js";

export interface WriteResult { ok: boolean; response: unknown }
export class MetaWriter {
  constructor(private readonly client: MetaClient) {}

  /** ¿El token tiene permiso de escritura? (debug_token → scopes). */
  async hasAdsManagement(): Promise<{ ok: boolean; scopes: string[] }> {
    const t = await this.client.debugToken();
    const scopes = t.scopes ?? [];
    return { ok: scopes.includes("ads_management"), scopes };
  }

  /** Relee lo mínimo para confirmar. */
  reread(id: string) { return this.client.node(id, "id,name,status,effective_status,daily_budget"); }

  pauseAd(adId: string) { return this.client.post<{ success: boolean }>(adId, { status: "PAUSED" }); }
  setDailyBudget(entityId: string, cents: number) { return this.client.post<{ success: boolean }>(entityId, { daily_budget: cents }); }

  /**
   * Par atado: baja el origen y sube el destino. Si el segundo paso falla, revierte el primero antes de lanzar.
   * `onStep` corre antes de cada envío (para el write-ahead log); si lanza, no se envía ese paso.
   */
  async moveBudget(o: Extract<WriteOrder, { op: "mover_presupuesto" }>, onStep: (step: 1 | 2) => Promise<void>): Promise<{ first: unknown; second: unknown }> {
    await onStep(1);
    const first = await this.setDailyBudget(o.from_id, o.from_previous_cents - o.amount_cents);
    try { await onStep(2); const second = await this.setDailyBudget(o.to_id, o.to_previous_cents + o.amount_cents); return { first, second }; }
    catch (e) { await this.setDailyBudget(o.from_id, o.from_previous_cents); throw new Error(`Segundo paso del movimiento falló; origen revertido. ${e instanceof Error ? e.message : String(e)}`); }
  }

  /** Única entrada: valida y despacha. Una orden fuera de las tres no existe. */
  async execute(raw: unknown): Promise<WriteResult> {
    const o = validateOrder(raw);
    if (o.op === "pausar_anuncio") return { ok: true, response: await this.pauseAd(o.ad_id) };
    if (o.op === "cambiar_presupuesto") return { ok: true, response: await this.setDailyBudget(o.entity_id, o.daily_budget_cents) };
    return { ok: true, response: await this.moveBudget(o, async () => {}) };
  }
}
