/**
 * Fase 4b · Tubería de ejecución, parte pura. Solo existen TRES operaciones de escritura: pausar anuncio, cambiar
 * presupuesto diario de campaña o ad set, y mover presupuesto entre dos campañas como par atado. Cualquier otra cosa
 * (borrar, activar, creativo, segmentación, puja, objetivo) no es una orden válida y se rechaza aquí, antes de tocar Meta.
 * Write-ahead log en cuatro estados: registrada → enviada → confirmada (se relee la entidad y coincide) | fallida (con
 * rollback). Si no se puede registrar, no se envía.
 */
export const ALLOWED_OPS = ["pausar_anuncio", "cambiar_presupuesto", "mover_presupuesto"] as const;
export type AllowedOp = typeof ALLOWED_OPS[number];
export type WriteOrder =
  | { op: "pausar_anuncio"; ad_id: string; previous_status: string | null }
  | { op: "cambiar_presupuesto"; entity_id: string; level: "campaign" | "adset"; daily_budget_cents: number; previous_cents: number; pair_key?: string; step?: 1 | 2 }
  | { op: "mover_presupuesto"; from_id: string; to_id: string; amount_cents: number; from_previous_cents: number; to_previous_cents: number };

/** Acepta solo las tres operaciones con sus campos completos; todo lo demás lanza. */
export function validateOrder(o: unknown): WriteOrder {
  if (!o || typeof o !== "object") throw new Error("Orden inválida: no es un objeto");
  const x = o as Record<string, unknown>;
  const op = String(x.op ?? "");
  if (!(ALLOWED_OPS as readonly string[]).includes(op)) throw new Error(`Operación no permitida: "${op}". Solo existen: ${ALLOWED_OPS.join(", ")}.`);
  const str = (k: string) => { const v = x[k]; if (typeof v !== "string" || !v) throw new Error(`Orden ${op}: falta ${k}`); return v; };
  const cents = (k: string) => { const v = x[k]; if (typeof v !== "number" || !Number.isInteger(v) || v < 0) throw new Error(`Orden ${op}: ${k} debe ser un entero en centavos ≥ 0`); return v; };
  if (op === "pausar_anuncio") return { op, ad_id: str("ad_id"), previous_status: typeof x.previous_status === "string" ? x.previous_status : null };
  if (op === "cambiar_presupuesto") {
    const level = str("level"); if (level !== "campaign" && level !== "adset") throw new Error("Orden cambiar_presupuesto: level debe ser campaign o adset");
    const v = cents("daily_budget_cents"); if (v <= 0) throw new Error("Orden cambiar_presupuesto: el presupuesto debe ser mayor que cero");
    return { op, entity_id: str("entity_id"), level, daily_budget_cents: v, previous_cents: cents("previous_cents"), pair_key: typeof x.pair_key === "string" ? x.pair_key : undefined, step: x.step === 1 || x.step === 2 ? x.step : undefined };
  }
  const amount = cents("amount_cents"); if (amount <= 0) throw new Error("Orden mover_presupuesto: el monto debe ser mayor que cero");
  const from_prev = cents("from_previous_cents"); if (amount > from_prev) throw new Error("Orden mover_presupuesto: el monto supera el presupuesto de origen");
  return { op: "mover_presupuesto", from_id: str("from_id"), to_id: str("to_id"), amount_cents: amount, from_previous_cents: from_prev, to_previous_cents: cents("to_previous_cents") };
}

export type ExecState = "registrada" | "enviada" | "confirmada" | "fallida";
export const TRANSITIONS: Record<ExecState, ExecState[]> = { registrada: ["enviada", "fallida"], enviada: ["confirmada", "fallida"], confirmada: [], fallida: [] };
export function transition(from: ExecState, to: ExecState): ExecState {
  if (!TRANSITIONS[from].includes(to)) throw new Error(`Transición no permitida: ${from} → ${to}`);
  return to;
}

/** Un movimiento entre campañas se ejecuta como dos órdenes atadas (mismo pair_key): primero se baja el origen, luego se sube el destino. */
export function expandOrders(order: WriteOrder, pairKey: string): WriteOrder[] {
  if (order.op !== "mover_presupuesto") return [order];
  return [
    { op: "cambiar_presupuesto", entity_id: order.from_id, level: "campaign", daily_budget_cents: order.from_previous_cents - order.amount_cents, previous_cents: order.from_previous_cents, pair_key: pairKey, step: 1 },
    { op: "cambiar_presupuesto", entity_id: order.to_id, level: "campaign", daily_budget_cents: order.to_previous_cents + order.amount_cents, previous_cents: order.to_previous_cents, pair_key: pairKey, step: 2 },
  ];
}

/** Orden de una propuesta aprobada. Presupuestos de la propuesta en MXN (after/before); Meta los quiere en centavos. */
export function orderForProposal(p: { action: string; entity_id: string; entity_level: string; before_value: unknown; after_value: unknown; move_to?: { entity_id: string; before_value: number } | null }): WriteOrder {
  const cents = (v: unknown) => Math.round(Number(v) * 100);
  if (p.action === "pausar_anuncio") { if (p.entity_level !== "ad") throw new Error("pausar_anuncio solo aplica a anuncios"); return validateOrder({ op: "pausar_anuncio", ad_id: p.entity_id, previous_status: typeof p.before_value === "string" ? p.before_value : null }); }
  if (p.action === "subir_presupuesto" || p.action === "bajar_presupuesto") {
    if (p.entity_level !== "campaign" && p.entity_level !== "adset") throw new Error(`${p.action} solo aplica a campañas o ad sets`);
    return validateOrder({ op: "cambiar_presupuesto", entity_id: p.entity_id, level: p.entity_level, daily_budget_cents: cents(p.after_value), previous_cents: cents(p.before_value) });
  }
  if (p.action === "mover_presupuesto") {
    if (!p.move_to) throw new Error("mover_presupuesto necesita la campaña destino");
    const amount = cents(p.before_value) - cents(p.after_value);
    return validateOrder({ op: "mover_presupuesto", from_id: p.entity_id, to_id: p.move_to.entity_id, amount_cents: amount, from_previous_cents: cents(p.before_value), to_previous_cents: cents(p.move_to.before_value) });
  }
  throw new Error(`La acción "${p.action}" no tiene orden de escritura (bloquear_subidas es un candado, no una acción).`);
}

/** Orden inversa para el rollback. Pausar no tiene inversa: reactivar está prohibido al agente; lo hace una persona. */
export function inverseOrder(o: WriteOrder): WriteOrder | null {
  if (o.op === "cambiar_presupuesto") return { op: "cambiar_presupuesto", entity_id: o.entity_id, level: o.level, daily_budget_cents: o.previous_cents, previous_cents: o.daily_budget_cents, pair_key: o.pair_key, step: o.step };
  if (o.op === "mover_presupuesto") return { op: "mover_presupuesto", from_id: o.to_id, to_id: o.from_id, amount_cents: o.amount_cents, from_previous_cents: o.to_previous_cents + o.amount_cents, to_previous_cents: o.from_previous_cents - o.amount_cents };
  return null;
}

/** Confirmación: la entidad releída en Meta coincide con lo ordenado. */
export function confirmMatches(o: WriteOrder, reread: { daily_budget?: string | number | null; status?: string | null; effective_status?: string | null }): boolean {
  if (o.op === "cambiar_presupuesto") return Number(reread.daily_budget ?? -1) === o.daily_budget_cents;
  if (o.op === "pausar_anuncio") return reread.status === "PAUSED" || reread.effective_status === "PAUSED";
  return false;   // un movimiento se confirma por sus dos órdenes expandidas
}

export const FREEZE_HOURS = 72;
/** Plan cuando falla el paso `failedStep` de un par atado: revertir lo que ya se envió y congelar ambas entidades 72 h. */
export function pairFailurePlan(orders: WriteOrder[], failedStep: number, now: string): { rollback: WriteOrder[]; freeze: string[]; until: string } {
  const sent = orders.filter(o => (o.op === "cambiar_presupuesto" ? (o.step ?? 1) : 1) < failedStep);
  const rollback = sent.map(inverseOrder).filter((x): x is WriteOrder => !!x).reverse();
  const ids = orders.flatMap(o => (o.op === "cambiar_presupuesto" ? [o.entity_id] : o.op === "pausar_anuncio" ? [o.ad_id] : [o.from_id, o.to_id]));
  return { rollback, freeze: [...new Set(ids)], until: new Date(new Date(now).getTime() + FREEZE_HOURS * 3600_000).toISOString() };
}

/** Descripción para la bitácora cuando la orden se ejecuta de verdad (actor Estratega, valor anterior y nuevo). */
export function describeOrder(o: WriteOrder, name: string): { kind: "budget" | "status"; summary: string } {
  const mxn = (c: number) => `$${Math.round(c / 100).toLocaleString("es-MX")}`;
  if (o.op === "pausar_anuncio") return { kind: "status", summary: `Pausó «${name}» (estratega, propuesta aprobada)` };
  if (o.op === "cambiar_presupuesto") { const pct = o.previous_cents > 0 ? Math.round(((o.daily_budget_cents - o.previous_cents) / o.previous_cents) * 100) : 0; return { kind: "budget", summary: `Presupuesto diario ${mxn(o.previous_cents)} → ${mxn(o.daily_budget_cents)} (${pct >= 0 ? "+" : ""}${pct}%) en «${name}» (estratega, propuesta aprobada)` }; }
  return { kind: "budget", summary: `Movió ${mxn(o.amount_cents)} de presupuesto diario entre campañas (estratega, propuesta aprobada)` };
}

/**
 * El collector reconoce como propias las órdenes que Meta devuelve en activities: mismo objeto, valor nuevo igual al
 * ordenado y hora dentro de la ventana de envío. Así no se duplican ni se atribuyen a la persona dueña del token.
 */
export interface SentExecution { entity_id: string; sent_at: string; new_value: string | number; kind: "budget" | "status" }
export function isOwnOrder(ev: { objectId: string; eventTime: Date; kind: string; newValue?: unknown }, sent: SentExecution[], windowMinutes = 15): boolean {
  return sent.some(s => s.entity_id === ev.objectId && s.kind === ev.kind && String(s.new_value) === String(ev.newValue ?? "") && Math.abs(ev.eventTime.getTime() - new Date(s.sent_at).getTime()) <= windowMinutes * 60_000);
}
