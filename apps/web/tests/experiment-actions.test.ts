import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, fetchAll } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { saveGuidedExperiment, activateExperiment, decideExperiment } from "@/app/experimentos/actions";
import { fakeQuery, RedirectSignal } from "./fixtures";
vi.mock("@/lib/db", () => ({ db: vi.fn(), fetchAll: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireMember: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new RedirectSignal(path); } }));
const form = (extra: Record<string, string | undefined> = {}) => {
  const f = new FormData();
  Object.entries({ account_id: "100", entity: "200", hypothesis: "Probar otro gancho", metric: "roas", threshold: "6", budget: "200", min_purchases: "10", window_days: "7", start_date: "2026-09-07", intent: "borrador", ...extra }).forEach(([k, v]) => { if (v !== undefined) f.set(k, v); });
  return f;
};
describe("pruebas guiadas: guardado y transiciones", () => {
  let tables: Record<string, ReturnType<typeof fakeQuery>>;
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireMember).mockResolvedValue({ email: "buyer@example.invalid" } as Awaited<ReturnType<typeof requireMember>>);
    tables = { accounts: fakeQuery({ id: "100" }), entities: fakeQuery([{ id: "200", campaign_id: null }]), experiments: fakeQuery({ id: "exp" }), account_profiles: fakeQuery({ daily_spend_ceiling: 1000, exploration_budget_pct: 10 }), change_sessions: fakeQuery(null) };
    vi.mocked(db).mockReturnValue({ from: vi.fn((name: string) => tables[name]) } as unknown as ReturnType<typeof db>);
    vi.mocked(fetchAll).mockResolvedValue([]);
  });
  it("exige membresía antes de acceder a datos", async () => {
    vi.mocked(requireMember).mockRejectedValue(new Error("revocado"));
    await expect(saveGuidedExperiment({ error: "" }, form())).rejects.toThrow("revocado");
    expect(db).not.toHaveBeenCalled();
  });
  it("guarda criterio y autor del servidor, sin órdenes a Meta", async () => {
    await expect(saveGuidedExperiment({ error: "" }, form())).rejects.toThrow("saved=borrador");
    expect(tables.experiments!.insert).toHaveBeenCalledWith(expect.objectContaining({ account_id: "100", campaign_ids: ["200"], threshold: 6, budget: 200, status: "borrador", created_by: "buyer@example.invalid" }));
    expect(tables.entities!.eq).toHaveBeenCalledWith("account_id", "100");
    expect(tables.entities!.eq).toHaveBeenCalledWith("level", "campaign");
  });
  it("rechaza una campaña que no pertenece a la cuenta", async () => {
    tables.entities = fakeQuery([]);
    expect((await saveGuidedExperiment({ error: "" }, form())).error).toContain("esta cuenta");
    expect(tables.experiments!.insert).not.toHaveBeenCalled();
  });
  it("rechaza sesión de otra cuenta", async () => {
    expect((await saveGuidedExperiment({ error: "" }, form({ session_id: "ajena" }))).error).toContain("sesión");
    expect(tables.change_sessions!.eq).toHaveBeenCalledWith("account_id", "100");
    expect(tables.experiments!.insert).not.toHaveBeenCalled();
  });
  it.each([{ threshold: "0" }, { window_days: "1.5" }, { start_date: "2026-02-30" }, { intent: "desconocido" }])("rechaza entrada inválida %j", async fields => {
    expect((await saveGuidedExperiment({ error: "" }, form(fields))).error).not.toBe("");
    expect(tables.experiments!.insert).not.toHaveBeenCalled();
  });
  it("devuelve error recuperable sin redirección si falla guardar", async () => {
    tables.experiments = fakeQuery(null, { message: "detalle interno" });
    const result = await saveGuidedExperiment({ error: "" }, form());
    expect(result.error).toContain("Tu plan sigue aquí"); expect(result.error).not.toContain("detalle interno");
  });
  it("impide iniciar por encima del presupuesto disponible", async () => {
    expect((await saveGuidedExperiment({ error: "" }, form({ intent: "activar" }))).error).toContain("excedido");
    expect(tables.experiments!.insert).not.toHaveBeenCalled();
  });
  it("un error de cobertura del presupuesto conserva el plan", async () => {
    vi.mocked(fetchAll).mockRejectedValue(new Error("red"));
    expect((await saveGuidedExperiment({ error: "" }, form({ intent: "activar" }))).error).toContain("Conservamos tu plan");
    expect(tables.experiments!.insert).not.toHaveBeenCalled();
  });
  it("editar solo puede modificar un borrador de la misma cuenta", async () => {
    await expect(saveGuidedExperiment({ error: "" }, form({ draft_id: "exp" }))).rejects.toThrow("saved=borrador");
    expect(tables.experiments!.update).toHaveBeenCalled();
    expect(tables.experiments!.eq).toHaveBeenCalledWith("account_id", "100");
    expect(tables.experiments!.eq).toHaveBeenCalledWith("status", "borrador");
    expect(tables.experiments!.insert).not.toHaveBeenCalled();
  });
  it("no confirma éxito si un borrador cambió de estado", async () => {
    tables.experiments = fakeQuery(null);
    expect((await saveGuidedExperiment({ error: "" }, form({ draft_id: "exp" }))).error).toContain("No se pudo guardar");
  });
  it("no reactiva una prueba cerrada", async () => {
    tables.experiments = fakeQuery({ account_id: "100", status: "graduado" });
    await expect(activateExperiment(form({ id: "exp" }))).rejects.toThrow("error=");
    expect(tables.experiments!.update).not.toHaveBeenCalled();
  });
  it("no acepta un veredicto antes del análisis", async () => {
    tables.experiments = fakeQuery({ account_id: "100", status: "activo" });
    await expect(decideExperiment(form({ id: "exp", decision: "graduado", reason: "Cumple" }))).rejects.toThrow("error=");
    expect(tables.experiments!.update).not.toHaveBeenCalled();
  });
});
