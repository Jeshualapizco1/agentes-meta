import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { requireAdmin, requireMember } from "@/lib/auth";
import { evaluateWorkspace, loadDecisionWorkspace, type DecisionWorkspace } from "@/lib/decision-workspace";
import { emptyDecisionResult } from "@/lib/decision-contract";
import { generateDecisionProposals, previewDecisionPolicy, recordOpportunityDecision, reviewDecisionProposal, saveDecisionPolicy } from "@/app/decisiones/actions";
import { fakeQuery } from "./fixtures";

vi.mock("@/lib/db", () => ({ db: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn(), requireMember: vi.fn() }));
vi.mock("@/lib/decision-workspace", () => ({ loadDecisionWorkspace: vi.fn(), evaluateWorkspace: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const id = "00000000-0000-4000-8000-000000000001";
const ruleId = "00000000-0000-4000-8000-000000000002";
const now = "2026-09-07T02:00:00.000Z";
const policy = { version: 1, level: "campaign", metric: "roas", operator: "gt", threshold: 3, days: 3, minPurchases: 3, minSpend: 100, changePct: 10, consecutive: false };
const rule = { id: ruleId, name: "Criterio revisado", action: "subir_presupuesto", version: 2, condition: policy, status: "activa", mode: "semi", params: { review_only: true } };
const candidate: ReturnType<typeof evaluateWorkspace>["proposals"][number] = { rule_id: ruleId, rule_name: rule.name, action: "subir_presupuesto", entity_id: "101", entity_name: "Campaña", entity_level: "campaign", campaign_id: "101", before: 100, after: 110, evidence: [], locks: [], blocked: false, blocked_by: [], reasons: [] };
const proposal = { id, account_id: "100", status: "pendiente", rule_id: ruleId, before_value: 100, after_value: 110, action: "subir_presupuesto", entity_id: "101", evidence: [{ ref: "RULE_VERSION", value: 2 }] };
const form = (fields: Record<string, string | undefined> = {}) => {
  const data = new FormData();
  for (const [key, value] of Object.entries({ account: "100", id, decision: "simulada", after: "110.00", acknowledge: "on", ...fields })) if (value !== undefined) data.set(key, value);
  return data;
};
const policyForm = (fields: Record<string, string> = {}) => form({ name: rule.name, action: rule.action, level: "campaign", metric: "roas", operator: "gt", threshold: "3", days: "3", minPurchases: "3", minSpend: "100", changePct: "10", intent: "activate", ...fields });

describe("decisiones: autorización, evidencia y persistencia", () => {
  let query: ReturnType<typeof fakeQuery>, rpc: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireMember).mockResolvedValue({ email: "buyer@example.invalid", appRole: "buyer" } as Awaited<ReturnType<typeof requireMember>>);
    vi.mocked(requireAdmin).mockResolvedValue({ email: "admin@example.invalid", appRole: "admin" } as Awaited<ReturnType<typeof requireAdmin>>);
    vi.mocked(loadDecisionWorkspace).mockResolvedValue({ account: { id: "100" }, profile: { dry_run: true, mode: "semi", updated_at: now, max_budget_change_pct: 20 }, source: { today: "2026-09-06", now }, rules: [rule], opportunities: [] } as unknown as DecisionWorkspace);
    vi.mocked(evaluateWorkspace).mockReturnValue({ proposals: [candidate], exclusions: [], evaluatedAt: now } as ReturnType<typeof evaluateWorkspace>);
    query = fakeQuery(proposal);
    rpc = vi.fn().mockResolvedValue({ data: "simulada", error: null });
    vi.mocked(db).mockReturnValue({ from: vi.fn(() => query), rpc } as unknown as ReturnType<typeof db>);
  });

  it.each([previewDecisionPolicy, generateDecisionProposals, recordOpportunityDecision, reviewDecisionProposal])("verifica membresía antes de leer datos de negocio", async action => {
    vi.mocked(requireMember).mockRejectedValue(new Error("revocado"));
    await expect(action(emptyDecisionResult, form())).rejects.toThrow("revocado");
    expect(loadDecisionWorkspace).not.toHaveBeenCalled(); expect(db).not.toHaveBeenCalled();
  });
  it("solo un administrador puede guardar reglas", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("sin permiso"));
    await expect(saveDecisionPolicy(emptyDecisionResult, policyForm())).rejects.toThrow("sin permiso");
    expect(loadDecisionWorkspace).not.toHaveBeenCalled(); expect(db).not.toHaveBeenCalled();
  });
  it("la evaluación no escribe propuestas ni reglas", async () => {
    expect((await previewDecisionPolicy(emptyDecisionResult, policyForm())).ok).toBe(true);
    expect(db).not.toHaveBeenCalled(); expect(rpc).not.toHaveBeenCalled();
  });
  it("guarda el actor del servidor y exige la versión original al editar", async () => {
    const result = await saveDecisionPolicy(emptyDecisionResult, policyForm({ ruleId, version: "2", actor: "intruso@example.invalid" }));
    expect(result.ok).toBe(true);
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ updated_by: "admin@example.invalid", mode: "semi", params: { review_only: true } }));
    expect(query.eq).toHaveBeenCalledWith("account_id", "100"); expect(query.eq).toHaveBeenCalledWith("version", 2);
  });
  it("no activa criterios sin confirmación", async () => {
    expect((await saveDecisionPolicy(emptyDecisionResult, policyForm({ acknowledge: "" }))).ok).toBe(false);
    expect(query.insert).not.toHaveBeenCalled();
  });
  it("no persiste candidatos bloqueados", async () => {
    vi.mocked(evaluateWorkspace).mockReturnValue({ proposals: [{ ...candidate, blocked: true, reasons: ["Freno activo"] }], exclusions: [], evaluatedAt: now } as ReturnType<typeof evaluateWorkspace>);
    await generateDecisionProposals(emptyDecisionResult, form());
    expect(db).not.toHaveBeenCalled();
  });
  it("una campaña tiene una propuesta por evaluación y conserva la versión de regla", async () => {
    vi.mocked(evaluateWorkspace).mockReturnValue({ proposals: [candidate, { ...candidate, entity_id: "102" }], exclusions: [], evaluatedAt: now } as ReturnType<typeof evaluateWorkspace>);
    await generateDecisionProposals(emptyDecisionResult, form());
    expect(query.upsert).toHaveBeenCalledWith([expect.objectContaining({ campaign_id: "101", status: "pendiente", evidence: [expect.objectContaining({ ref: "RULE_VERSION", value: 2 })] })], { onConflict: "id", ignoreDuplicates: true });
  });
  it("revalida y registra la simulación atómicamente con el actor autenticado", async () => {
    expect((await reviewDecisionProposal(emptyDecisionResult, form({ actor: "intruso@example.invalid" }))).ok).toBe(true);
    expect(query.eq).toHaveBeenCalledWith("account_id", "100");
    expect(evaluateWorkspace).toHaveBeenCalledWith(expect.anything(), expect.anything(), id);
    expect(rpc).toHaveBeenCalledWith("review_proposal_simulation_v1", expect.objectContaining({ p_actor: "buyer@example.invalid", p_account: "100", p_id: id, p_after: 110, p_profile_at: now, p_rule_version: 2 }));
    expect(query.update).not.toHaveBeenCalled();
  });
  it("una corrección convierte a moneda exacta y conserva la razón", async () => {
    expect((await reviewDecisionProposal(emptyDecisionResult, form({ after: "115.25", reason: "Ajuste revisado" }))).ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ p_after: 115.25, p_reason: "Ajuste revisado" }));
  });
  it.each([
    { after: "0" }, { after: "1e3" }, { after: "110.123" }, { after: "115" },
    { acknowledge: "" }, { decision: "aprobada" }, { decision: "rechazada", reason: "" },
  ])("no guarda una decisión inválida: %j", async fields => {
    expect((await reviewDecisionProposal(emptyDecisionResult, form(fields))).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("falla cerrado si un candado cambió durante la revisión", async () => {
    vi.mocked(evaluateWorkspace).mockReturnValue({ proposals: [{ ...candidate, blocked: true, reasons: ["Freno activo"] }], exclusions: [], evaluatedAt: now } as ReturnType<typeof evaluateWorkspace>);
    expect(await reviewDecisionProposal(emptyDecisionResult, form())).toMatchObject({ ok: false, message: "Freno activo" }); expect(rpc).not.toHaveBeenCalled();
  });
  it("rechaza evidencia de una versión anterior de la regla", async () => {
    query = fakeQuery({ ...proposal, evidence: [{ ref: "RULE_VERSION", value: 1 }] });
    vi.mocked(db).mockReturnValue({ from: vi.fn(() => query), rpc } as unknown as ReturnType<typeof db>);
    expect((await reviewDecisionProposal(emptyDecisionResult, form())).ok).toBe(false); expect(rpc).not.toHaveBeenCalled();
  });
  it("informa si falta la migración sin mostrar errores internos", async () => {
    rpc.mockResolvedValue({ error: { code: "PGRST202", message: "detalle privado" } });
    expect(await reviewDecisionProposal(emptyDecisionResult, form())).toEqual({ ok: false, message: "Falta instalar la actualización de decisiones en la base de datos." });
  });
  it("no permite registrar una oportunidad de otra cuenta", async () => {
    expect((await recordOpportunityDecision(emptyDecisionResult, form({ entity: "999", decision: "approved", reason: "Investigar" }))).ok).toBe(false);
    expect(query.upsert).not.toHaveBeenCalled();
  });
});
