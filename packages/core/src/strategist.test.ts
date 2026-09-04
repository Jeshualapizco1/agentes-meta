import { describe, it, expect } from "vitest";
import { evaluateLocks, runPass, expirePending, brakeTriggers, activeRules, generateCandidates, type Candidate, type LockContext, type Rule } from "./index.js";

const cand = (o: Partial<Candidate> = {}): Candidate => ({ rule_id: "r1", rule_name: "subir si ROAS > objetivo", action: "subir_presupuesto", entity_id: "C1", entity_level: "campaign", entity_name: "CBO | SCALE", campaign_id: "C1", before: 1000, after: 1150, evidence: [{ ref: "W1", label: "ROAS 7d", value: 6.4 }], ...o });
const ctx = (o: Partial<LockContext> = {}): LockContext => ({ now: "2026-09-04T06:20:00Z", brakeActive: false, lastClosedAvailable: true, whitelist: ["C1"], maxChangePct: 17, maxCumulativePct: 35, cumulativeWindowDays: 7, cooldownHours: 72, maxPerPass: 5, ceiling: { ceiling: 15000, over_spend: false, over_committed: false, budget_pct: 90, spend_pct: 80 }, recentChanges: [], ...o });
const closed = (locks: ReturnType<typeof evaluateLocks>) => locks.filter(l => !l.ok).map(l => l.lock);

describe("candados en fila", () => {
  it("con todo abierto, ninguno cierra", () => { expect(closed(evaluateLocks(cand(), ctx(), 0))).toEqual([]); });
  it("freno de emergencia activo", () => { expect(closed(evaluateLocks(cand(), ctx({ brakeActive: true }), 0))).toEqual(["freno"]); });
  it("sin día cerrado disponible", () => { expect(closed(evaluateLocks(cand(), ctx({ lastClosedAvailable: false }), 0))).toEqual(["dia_cerrado"]); });
  it("lista blanca: campaña fuera, y lista vacía", () => {
    expect(closed(evaluateLocks(cand({ campaign_id: "C9" }), ctx(), 0))).toEqual(["lista_blanca"]);
    const l = evaluateLocks(cand(), ctx({ whitelist: [] }), 0); expect(closed(l)).toEqual(["lista_blanca"]); expect(l.find(x => x.lock === "lista_blanca")!.reason).toMatch(/vacía/);
  });
  it("cambio máximo por movimiento: +15 % pasa con 17 %, +25 % no", () => {
    expect(closed(evaluateLocks(cand({ before: 1000, after: 1250 }), ctx(), 0))).toEqual(["cambio_maximo"]);
    expect(closed(evaluateLocks(cand({ before: 1000, after: 800 }), ctx(), 0))).toEqual(["cambio_maximo"]);   // −20 % también
  });
  it("cambio acumulado en la ventana: +15 % hoy con +15 % y +10 % previos en 7 días = 40 % > 35 %; fuera de la ventana no cuenta", () => {
    const rc = [{ entity_id: "C1", at: "2026-08-30T10:00:00Z", pct: 15, actor_kind: "person" as const }, { entity_id: "C1", at: "2026-08-31T10:00:00Z", pct: 10, actor_kind: "agent" as const }];
    const l = evaluateLocks(cand(), ctx({ recentChanges: rc, cooldownHours: 1 }), 0);
    expect(closed(l)).toEqual(["cambio_acumulado"]); expect(l.find(x => x.lock === "cambio_acumulado")!.reason).toMatch(/40\.0% acumulado/);
    expect(closed(evaluateLocks(cand(), ctx({ recentChanges: [{ entity_id: "C1", at: "2026-08-20T10:00:00Z", pct: 30, actor_kind: "person" }], cooldownHours: 1 }), 0))).toEqual([]);
  });
  it("espera desde el último cambio a esa entidad, por persona o agente", () => {
    expect(closed(evaluateLocks(cand({ before: 1000, after: 1050 }), ctx({ recentChanges: [{ entity_id: "C1", at: "2026-09-03T10:00:00Z", pct: 5, actor_kind: "agent" }] }), 0))).toEqual(["espera"]);
    expect(closed(evaluateLocks(cand({ before: 1000, after: 1050 }), ctx({ recentChanges: [{ entity_id: "C1", at: "2026-08-25T10:00:00Z", pct: 5, actor_kind: "person" }] }), 0))).toEqual([]);
  });
  it("tope de acciones por pasada: la sexta no sale", () => { expect(closed(evaluateLocks(cand(), ctx(), 5))).toEqual(["tope_por_pasada"]); });
  it("techo por gasto real y por presupuesto comprometido cierran solo las subidas; sin techo configurado, cierran", () => {
    expect(closed(evaluateLocks(cand(), ctx({ ceiling: { ceiling: 15000, over_spend: true, over_committed: false, budget_pct: 90, spend_pct: 104 } }), 0))).toEqual(["techo_gasto_real"]);
    expect(closed(evaluateLocks(cand(), ctx({ ceiling: { ceiling: 15000, over_spend: false, over_committed: true, budget_pct: 188, spend_pct: 91 } }), 0))).toEqual(["techo_presupuesto_comprometido"]);
    expect(closed(evaluateLocks(cand({ action: "bajar_presupuesto", before: 1000, after: 850 }), ctx({ ceiling: { ceiling: 15000, over_spend: true, over_committed: true, budget_pct: 188, spend_pct: 104 } }), 0))).toEqual([]);
    expect(closed(evaluateLocks(cand(), ctx({ ceiling: null }), 0))).toEqual(["techo_gasto_real", "techo_presupuesto_comprometido"]);
  });
  it("pausar anuncio: los candados de presupuesto no aplican pero lista blanca, espera y freno sí", () => {
    const l = evaluateLocks(cand({ action: "pausar_anuncio", entity_level: "ad", entity_id: "AD1", before: "ACTIVE", after: "PAUSED" }), ctx({ brakeActive: true }), 0);
    expect(closed(l)).toEqual(["freno"]); expect(l.find(x => x.lock === "cambio_maximo")!.reason).toMatch(/no aplica/);
  });
});

describe("pasada, expiración y freno", () => {
  it("pasada sin candidatos deja registro: revisó N entidades y no propuso cambios", () => {
    const r = runPass({ candidates: [], ctx: ctx(), entitiesReviewed: 650 });
    expect(r.summary).toBe("Revisó 650 entidades y no propuso cambios"); expect(r.accepted).toBe(0); expect(r.proposals).toEqual([]);
  });
  it("basta un candado cerrado: la propuesta se descarta con la razón escrita; las que pasan cuentan para el tope", () => {
    const r = runPass({ candidates: [cand(), cand({ entity_id: "C9", campaign_id: "C9" }), cand({ entity_id: "C2", campaign_id: "C2" })], ctx: ctx({ whitelist: ["C1", "C2"] }), entitiesReviewed: 10 });
    expect(r.accepted).toBe(2); expect(r.blocked).toBe(1);
    expect(r.proposals[1]!.blocked_by).toEqual(["lista_blanca"]); expect(r.proposals[1]!.locks.find(l => l.lock === "lista_blanca")!.reason).toMatch(/no está en la lista blanca/);
    expect(r.proposals[2]!.locks.find(l => l.lock === "tope_por_pasada")!.reason).toBe("propuesta 2 de 5 permitidas por pasada");
    expect(r.summary).toBe("Revisó 10 entidades: 2 propuesta(s) pendiente(s) de aprobación, 1 descartada(s) por candados");
  });
  it("una pendiente que no se decidió antes de la siguiente pasada expira", () => {
    expect(expirePending([{ id: "a", created_at: "2026-09-03T06:20:00Z" }, { id: "b", created_at: "2026-09-04T06:21:00Z" }], "2026-09-04T06:20:00Z")).toEqual(["a"]);
  });
  it("reglas vigentes: activas y dentro de fecha; solo las de acción generan candidatos", () => {
    const rules: Rule[] = [
      { id: "1", name: "techo", action: "bloquear_subidas", condition: {}, params: {}, status: "activa", mode: "semi" },
      { id: "2", name: "vieja", action: "subir_presupuesto", condition: {}, params: {}, status: "activa", mode: "semi", valid_to: "2026-08-01" },
      { id: "3", name: "inactiva", action: "subir_presupuesto", condition: {}, params: {}, status: "inactiva", mode: "semi" },
    ];
    expect(activeRules(rules, "2026-09-04").map(r => r.id)).toEqual(["1"]); expect(generateCandidates(activeRules(rules, "2026-09-04"))).toEqual([]);
  });
  it("disparadores del freno: gasto del día > techo × 1.5, exceso de propuestas, fallo de registro, problema de pago", () => {
    expect(brakeTriggers({ spendTodayPartial: 23000, ceiling: 15000, candidates: 2, maxPerPass: 5, proposalWriteFailed: false, accountStatus: 1 })).toEqual([expect.stringMatching(/22,500/)]);
    expect(brakeTriggers({ spendTodayPartial: 22000, ceiling: 15000, candidates: 9, maxPerPass: 5, proposalWriteFailed: true, accountStatus: 3 })).toHaveLength(3);
    expect(brakeTriggers({ spendTodayPartial: null, ceiling: null, candidates: 0, maxPerPass: 5, proposalWriteFailed: false, accountStatus: 1 })).toEqual([]);
  });
});
