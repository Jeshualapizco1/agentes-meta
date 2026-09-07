import type { Candidate, Rule } from "./strategist.js";

/** Criterios explícitos del operador; no se extraen umbrales financieros de texto libre. */
export interface DecisionPolicy {
  version: 1; level: "campaign" | "adset" | "ad"; metric: "roas" | "cpa" | "spend_without_purchases";
  operator: "gt" | "lt"; threshold: number; days: number; minPurchases: number; minSpend: number;
  changePct: number; consecutive: boolean;
}
export interface DecisionEntity {
  id: string; name: string; level: "campaign" | "adset" | "ad"; campaign_id: string | null;
  effective_status: string | null; daily_budget: number | null; snapshot_at: string;
}
export interface DecisionInsight {
  entity_id: string; date: string; spend: number | null; purchases: number | null; purchase_value: number | null;
  is_closed_day: boolean; fetched_at: string;
}
export interface DecisionSource { today: string; now: string; entities: DecisionEntity[]; insights: DecisionInsight[] }
export interface EntityReading {
  from: string; to: string; days: number; available: number; complete: boolean; spend: number; purchases: number;
  value: number; roas: number | null; cpa: number | null; fetchedAt: string | null; rows: DecisionInsight[];
}
const nonnegative = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0;
export function calendarOffset(date: string, offset: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(offset)) throw new Error("Fecha inválida");
  const instant = Date.parse(`${date}T12:00:00Z`);
  if (!Number.isFinite(instant) || new Date(instant).toISOString().slice(0, 10) !== date) throw new Error("Fecha inválida");
  return new Date(instant + offset * 86400000).toISOString().slice(0, 10);
}
export function parseDecisionPolicy(raw: unknown, action: string): DecisionPolicy {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Define los criterios de la regla.");
  const p = raw as DecisionPolicy;
  if (p.version !== 1 || !["campaign", "adset", "ad"].includes(p.level) || !["roas", "cpa", "spend_without_purchases"].includes(p.metric) || !["gt", "lt"].includes(p.operator)) throw new Error("Criterio no compatible.");
  if (!Number.isInteger(p.days) || p.days < 1 || p.days > 14 || !Number.isInteger(p.minPurchases) || p.minPurchases < 0 || !nonnegative(p.minSpend) || !nonnegative(p.threshold) || p.threshold <= 0 || typeof p.consecutive !== "boolean") throw new Error("Revisa ventana, umbral y muestra mínima.");
  if (!nonnegative(p.changePct) || p.changePct > 100) throw new Error("Porcentaje de cambio inválido.");
  if (!["subir_presupuesto", "bajar_presupuesto", "pausar_anuncio"].includes(action)) throw new Error("Esta acción aún no tiene generador.");
  if (action === "pausar_anuncio" ? p.level !== "ad" || p.changePct !== 0 : p.level === "ad" || p.changePct <= 0 || p.changePct >= 100) throw new Error("Acción, nivel y porcentaje incompatibles.");
  if (p.metric === "spend_without_purchases" && (p.minPurchases !== 0 || p.operator !== "gt" || p.consecutive)) throw new Error("Gasto sin compras se evalúa sobre la ventana completa, con cero compras.");
  if (p.metric !== "spend_without_purchases" && p.minPurchases < 1) throw new Error("Indica al menos una compra como muestra mínima.");
  return { version: 1, level: p.level, metric: p.metric, operator: p.operator, threshold: p.threshold, days: p.days, minPurchases: p.minPurchases, minSpend: p.minSpend, changePct: p.changePct, consecutive: p.consecutive };
}
export function readEntityWindow(source: DecisionSource, entityId: string, days: number, offset = 0): EntityReading {
  const from = calendarOffset(source.today, -days - offset), to = calendarOffset(source.today, -1 - offset);
  const map = new Map<string, DecisionInsight | null>();
  for (const row of source.insights) if (row.entity_id === entityId && row.date >= from && row.date <= to) map.set(row.date, map.has(row.date) ? null : row);
  const rows = [...map.values()].filter((r): r is DecisionInsight => !!r && r.is_closed_day && nonnegative(r.spend) && nonnegative(r.purchases) && nonnegative(r.purchase_value));
  const spend = rows.reduce((a, r) => a + r.spend!, 0), purchases = rows.reduce((a, r) => a + r.purchases!, 0), value = rows.reduce((a, r) => a + r.purchase_value!, 0);
  const complete = rows.length === days && [spend, purchases, value].every(Number.isFinite);
  const timestamps = rows.map(r => Date.parse(r.fetched_at));
  const fetchedAt = timestamps.length && timestamps.every(Number.isFinite) ? new Date(Math.min(...timestamps)).toISOString() : null;
  return { from, to, days, available: rows.length, complete, spend, purchases, value, roas: spend > 0 && Number.isFinite(value / spend) ? value / spend : null, cpa: purchases > 0 && Number.isFinite(spend / purchases) ? spend / purchases : null, fetchedAt, rows };
}
export interface RuleEvaluation { candidates: Candidate[]; exclusions: { ruleId: string; entityId: string | null; reason: string }[] }
export function evaluateDecisionRules(rules: Rule[], source: DecisionSource): RuleEvaluation {
  const result: RuleEvaluation = { candidates: [], exclusions: [] };
  for (const rule of rules) {
    if (rule.status !== "activa" || (rule.valid_from && rule.valid_from > source.today) || (rule.valid_to && rule.valid_to < source.today) || rule.action === "bloquear_subidas") continue;
    let p: DecisionPolicy;
    try { p = parseDecisionPolicy(rule.condition, rule.action); } catch (e) { result.exclusions.push({ ruleId: rule.id, entityId: null, reason: (e as Error).message }); continue; }
    for (const entity of source.entities.filter(e => e.level === p.level && e.effective_status === "ACTIVE")) {
      const exclude = (reason: string) => result.exclusions.push({ ruleId: rule.id, entityId: entity.id, reason });
      const w = readEntityWindow(source, entity.id, p.days);
      if (!w.complete) { exclude(`Cobertura ${w.available}/${p.days} días; falta una ventana completa.`); continue; }
      // Límite técnico de frescura para proponer, independiente de la política financiera.
      const fresh = (at: string | null) => !!at && Date.parse(at) <= Date.parse(source.now) && Date.parse(source.now) - Date.parse(at) <= 30 * 3600000;
      if (!w.rows.every(r => fresh(r.fetched_at)) || !fresh(entity.snapshot_at)) { exclude("Métricas o estado de la entidad sin actualización verificable en 30 h."); continue; }
      if (w.purchases < p.minPurchases || w.spend < p.minSpend) { exclude("Todavía no reúne la muestra o el gasto mínimo de la regla."); continue; }
      const value = p.metric === "roas" ? w.roas : p.metric === "cpa" ? w.cpa : w.purchases === 0 ? w.spend : null;
      const matches = (v: number | null) => v !== null && (p.operator === "gt" ? v > p.threshold : v < p.threshold);
      if (!matches(value)) { exclude("La métrica no cumple el criterio configurado."); continue; }
      if (p.consecutive && !w.rows.every(r => matches(p.metric === "roas" ? r.spend! > 0 ? r.purchase_value! / r.spend! : null : r.purchases! > 0 ? r.spend! / r.purchases! : null))) { exclude("El criterio no se cumple en cada día cerrado de la ventana."); continue; }
      if (entity.level === "adset" && source.entities.some(e => e.id === entity.campaign_id && (e.daily_budget ?? 0) > 0)) { exclude("El presupuesto pertenece a la campaña CBO, no a este conjunto."); continue; }
      const before = rule.action === "pausar_anuncio" ? "ACTIVE" : entity.daily_budget !== null && Number.isSafeInteger(entity.daily_budget) && entity.daily_budget > 0 ? entity.daily_budget / 100 : null;
      if (before === null) { exclude("La entidad no tiene un presupuesto diario editable."); continue; }
      const after = typeof before === "number" ? Math.round(before * (1 + (rule.action === "subir_presupuesto" ? 1 : -1) * p.changePct / 100) * 100) / 100 : "PAUSED";
      if (typeof after === "number" && (!Number.isSafeInteger(Math.round(after * 100)) || after <= 0 || after === before)) { exclude("El cambio no produce un presupuesto válido y distinto."); continue; }
      result.candidates.push({ rule_id: rule.id, rule_name: rule.name, action: rule.action, entity_id: entity.id, entity_level: entity.level, entity_name: entity.name, campaign_id: entity.level === "campaign" ? entity.id : entity.campaign_id, before, after,
        evidence: [{ ref: "W", label: "Ventana cerrada", value: `${w.from} — ${w.to} · ${w.available}/${p.days} días` }, { ref: "S", label: "Gasto de la entidad", value: w.spend }, { ref: "P", label: "Compras atribuidas", value: w.purchases }, { ref: "M", label: `${p.metric} ${p.operator === "gt" ? ">" : "<"} ${p.threshold}`, value }, { ref: "F", label: "Lectura más antigua de la ventana", value: w.fetchedAt }] });
    }
  }
  result.candidates.sort((a, b) => a.rule_id.localeCompare(b.rule_id) || a.entity_id.localeCompare(b.entity_id));
  return result;
}
export interface DecisionOpportunity { id: string; entityId: string; entityName: string; level: string; title: string; explanation: string; nextStep: string; kind: "protect" | "scale" | "observe"; reading: Omit<EntityReading, "rows"> }
export function decisionOpportunities(source: DecisionSource, profile: { target_roas: number | null; breakeven_roas: number | null; target_cpa: number | null }): DecisionOpportunity[] {
  const out: DecisionOpportunity[] = [];
  for (const entity of source.entities.filter(e => e.effective_status === "ACTIVE" && e.level === "campaign")) {
    const { rows: _rows, ...w } = readEntityWindow(source, entity.id, 7);
    if (!(w.spend > 0)) continue;
    let title = "Revisar la campaña", explanation = "Hay inversión registrada para evaluar.", nextStep = "Comparar anuncios y registrar una hipótesis antes de intervenir.", kind: DecisionOpportunity["kind"] = "observe";
    if (!w.complete) { title = "Completar evidencia"; explanation = `Hay lecturas válidas en ${w.available} de 7 días. El rendimiento observado es parcial.`; nextStep = "Revisar cobertura y cambios recientes antes de ajustar presupuesto."; }
    else if (w.purchases === 0) { title = "Investigar gasto sin compras"; explanation = "La ventana cerrada registra inversión y ninguna compra atribuida."; nextStep = "Revisar anuncios y medición; definir el gasto máximo tolerado antes de proponer una pausa."; kind = "protect"; }
    else if (profile.breakeven_roas && w.roas !== null && w.roas < profile.breakeven_roas) { title = "Revisar inversión bajo equilibrio"; explanation = `El ROAS observado está por debajo del equilibrio configurado (${profile.breakeven_roas}×).`; nextStep = "Identificar anuncios responsables y evaluar una regla de recorte con límites explícitos."; kind = "protect"; }
    else if (profile.target_cpa && w.cpa !== null && w.cpa > profile.target_cpa) { title = "Revisar costo por compra"; explanation = `El CPA observado supera el objetivo configurado (${profile.target_cpa}).`; nextStep = "Comparar anuncios y revisar la muestra antes de recortar."; kind = "protect"; }
    else if (profile.target_roas && w.roas !== null && w.roas > profile.target_roas) { title = "Evaluar capacidad de escalar"; explanation = `El ROAS observado supera el objetivo configurado (${profile.target_roas}×).`; nextStep = "Comprobar techo, muestra, espera y campañas autorizadas antes de proponer una subida."; kind = "scale"; }
    out.push({ id: `${entity.id}:${w.to}:${kind}`, entityId: entity.id, entityName: entity.name, level: entity.level, title, explanation, nextStep, kind, reading: w });
  }
  return out.sort((a, b) => ({ protect: 0, scale: 1, observe: 2 }[a.kind] - { protect: 0, scale: 1, observe: 2 }[b.kind]) || b.reading.spend - a.reading.spend || a.entityId.localeCompare(b.entityId));
}
