import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, fetchAll } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { registerSessionAsExperiment } from "@/app/sesion/[id]/actions";
import { fakeQuery, fakeUser, RedirectSignal } from "./fixtures";
vi.mock("@/lib/db", () => ({ db: vi.fn(), fetchAll: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireMember: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new RedirectSignal(path); } }));
const query = (data: unknown = null, error: { message: string; code?: string } | null = null) => {
  const q = Object.assign(fakeQuery(data, error), { order: vi.fn(), limit: vi.fn() }); q.order.mockReturnValue(q); q.limit.mockReturnValue(q); return q;
};
const form = () => { const f = new FormData(); f.set("session_id", "sesion"); f.set("account_id", "otra"); f.set("created_by", "falso"); return f; };
const session = { id: "sesion", account_id: "100", summary: "Subió presupuesto", actor_name: "Eduardo", campaign_ids: ["200"], started_at: "2026-09-07T05:00:00Z" };
describe("registrar una sesión como prueba", () => {
  let tables: Record<string, ReturnType<typeof query>>;
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireMember).mockResolvedValue({ ...fakeUser(), email: "buyer@example.invalid", appRole: "buyer" });
    tables = { accounts: query({ id: "100", timezone_name: "America/Mazatlan" }), change_sessions: query(session), experiments: query(), annotations: query(), account_profiles: query({ target_roas: 6, breakeven_roas: 2 }), entities: query() };
    vi.mocked(db).mockReturnValue({ from: vi.fn((name: string) => tables[name]) } as unknown as ReturnType<typeof db>);
    vi.mocked(fetchAll).mockResolvedValue([{ id: "200", daily_budget: 12345 }]);
  });
  it("crea activa con umbral del perfil, fecha local y autor autenticado sin consultar exploración", async () => {
    await expect(registerSessionAsExperiment(form())).rejects.toThrow("#prueba-");
    expect(tables.experiments!.insert).toHaveBeenCalledWith(expect.objectContaining({ account_id: "100", status: "activo", name: "Subió presupuesto", hypothesis: "Eduardo cambió: Subió presupuesto", threshold: 6, metric: "roas", min_purchases: 10, window_days: 7, start_date: "2026-09-06", budget: 123.45, campaign_ids: ["200"], entity_ids: ["200"], created_by: "buyer@example.invalid", session_id: "sesion" }));
    expect(tables.accounts!.eq).toHaveBeenCalledWith("enabled", true);
    expect(tables.account_profiles!.select).toHaveBeenCalledWith("target_roas,breakeven_roas");
  });
  it("guarda borrador y abre el asistente cuando falta campaña", async () => {
    tables.change_sessions = query({ ...session, campaign_ids: [] });
    await expect(registerSessionAsExperiment(form())).rejects.toThrow("editar=");
    expect(tables.experiments!.insert).toHaveBeenCalledWith(expect.objectContaining({ status: "borrador", budget: null, campaign_ids: [] }));
  });
  it("guarda borrador cuando falta fecha", async () => {
    tables.change_sessions = query({ ...session, started_at: null });
    await expect(registerSessionAsExperiment(form())).rejects.toThrow("editar=");
    expect(tables.experiments!.insert).toHaveBeenCalledWith(expect.objectContaining({ status: "borrador", start_date: null }));
  });
  it("enlaza la prueba existente sin duplicarla", async () => {
    tables.experiments = query({ id: "existente", status: "activo" });
    await expect(registerSessionAsExperiment(form())).rejects.toThrow("#prueba-existente");
    expect(tables.experiments!.insert).not.toHaveBeenCalled();
  });
  it.each([[{ breakeven_roas: 2 }, 2], [null, 1]])("usa los umbrales de respaldo %j", async (profile, threshold) => {
    tables.account_profiles = query(profile);
    await expect(registerSessionAsExperiment(form())).rejects.toThrow("#prueba-");
    expect(tables.experiments!.insert).toHaveBeenCalledWith(expect.objectContaining({ threshold }));
  });
  it("prefiere la anotación y limita el nombre", async () => {
    tables.annotations = query({ hypothesis: "Conservar eficiencia", reason: "Razón" });
    tables.change_sessions = query({ ...session, summary: "a".repeat(90) });
    await expect(registerSessionAsExperiment(form())).rejects.toThrow("#prueba-");
    expect(tables.experiments!.insert).toHaveBeenCalledWith(expect.objectContaining({ hypothesis: "Conservar eficiencia", name: "a".repeat(60) }));
  });
  it("exige membresía antes de leer", async () => { vi.mocked(requireMember).mockRejectedValue(new Error("revocado")); await expect(registerSessionAsExperiment(form())).rejects.toThrow("revocado"); expect(db).not.toHaveBeenCalled(); });
  it("rechaza cuenta deshabilitada", async () => { tables.accounts = query(); await expect(registerSessionAsExperiment(form())).rejects.toThrow("cuenta no está disponible"); expect(tables.experiments!.insert).not.toHaveBeenCalled(); });
  it("rechaza campañas ausentes o de otra cuenta", async () => { vi.mocked(fetchAll).mockResolvedValue([]); await expect(registerSessionAsExperiment(form())).rejects.toThrow("campañas del cambio"); expect(tables.experiments!.insert).not.toHaveBeenCalled(); });
  it("propaga fallo de lectura sin insertar", async () => { tables.account_profiles = query(null, { message: "fallo" }); await expect(registerSessionAsExperiment(form())).rejects.toThrow("criterio"); expect(tables.experiments!.insert).not.toHaveBeenCalled(); });
  it("usa la misma clave para reintentos concurrentes", async () => {
    await expect(registerSessionAsExperiment(form())).rejects.toThrow("#prueba-"); await expect(registerSessionAsExperiment(form())).rejects.toThrow("#prueba-");
    const calls = tables.experiments!.insert.mock.calls; expect(calls[0]![0].id).toBe(calls[1]![0].id);
  });
});
