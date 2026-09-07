import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeQuery, fakeUser, RedirectSignal } from "./fixtures";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/supabase/server";
import { saveProfile } from "@/app/configuracion/actions";
import { createUser, removeUser } from "@/app/usuarios/actions";
import { decideProposal, engageBrake, releaseBrake } from "@/app/hoy/actions";
import { saveExperiment, activateExperiment, cancelExperiment, decideExperiment } from "@/app/experimentos/actions";
import { markReviewed } from "@/app/anuncios/actions";
import { annotate } from "@/app/sesion/[id]/actions";
import { forceWeekly } from "@/app/analisis/actions";
import { engageBrake as agentBrake, executeProposal, saveWeekly } from "@agentes-meta/agents";
import { upsertAuthUser, deleteAuthUser } from "@/lib/admin";

vi.mock("@/lib/db", () => ({ db: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ currentUser: vi.fn() }));
vi.mock("@/lib/admin", () => ({ upsertAuthUser: vi.fn(), deleteAuthUser: vi.fn() }));
vi.mock("@agentes-meta/agents", () => ({
  engageBrake: vi.fn(), executeProposal: vi.fn(), metaFromEnv: vi.fn(), saveWeekly: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new RedirectSignal(path); } }));

const actions = [
  { name: "guardar perfil", run: saveProfile }, { name: "crear usuario", run: createUser },
  { name: "eliminar usuario", run: removeUser }, { name: "decidir propuesta", run: decideProposal },
  { name: "activar freno", run: engageBrake }, { name: "liberar freno", run: releaseBrake },
  { name: "guardar experimento", run: saveExperiment }, { name: "activar experimento", run: activateExperiment },
  { name: "cancelar experimento", run: cancelExperiment }, { name: "decidir experimento", run: decideExperiment },
  { name: "revisar anuncio", run: markReviewed }, { name: "anotar sesión", run: annotate },
  { name: "actualizar análisis", run: forceWeekly },
];

describe("barrera de acceso antes de cualquier efecto de una Server Action", () => {
  beforeEach(() => vi.clearAllMocks());

  function prepare(row: unknown, error: { message: string } | null = null) {
    vi.mocked(currentUser).mockResolvedValue(fakeUser());
    const from = vi.fn((table: string) => {
      if (table !== "app_users") throw new Error(`Consulta de negocio no autorizada: ${table}`);
      return fakeQuery(row, error);
    });
    vi.mocked(db).mockReturnValue({ from } as unknown as ReturnType<typeof db>);
    return from;
  }

  function noExternalEffects() {
    for (const effect of [agentBrake, executeProposal, saveWeekly, upsertAuthUser, deleteAuthUser, fetch]) {
      expect(effect).not.toHaveBeenCalled();
    }
  }

  it.each(actions)("$name: rechaza sesión de miembro revocado", async ({ run }) => {
    const from = prepare(null);
    await expect(run(new FormData())).rejects.toBeInstanceOf(RedirectSignal);
    expect(from.mock.calls.map(([table]) => table)).toEqual(["app_users"]);
    noExternalEffects();
  });

  it.each(actions)("$name: falla cerrado si no se pueden consultar permisos", async ({ run }) => {
    const from = prepare({ email: "buyer@example.invalid", role: "admin" }, { message: "error privado" });
    await expect(run(new FormData())).rejects.toThrow("No se pudo verificar el acceso");
    expect(from.mock.calls.map(([table]) => table)).toEqual(["app_users"]);
    noExternalEffects();
  });

  it.each(actions)("$name: sin sesión no consulta la DB", async ({ run }) => {
    vi.mocked(currentUser).mockResolvedValue(null);
    await expect(run(new FormData())).rejects.toBeInstanceOf(RedirectSignal);
    expect(db).not.toHaveBeenCalled();
    noExternalEffects();
  });

  it.each([
    { name: "configuración", run: saveProfile }, { name: "crear usuario", run: createUser },
    { name: "eliminar usuario", run: removeUser }, { name: "liberar freno", run: releaseBrake },
  ])("$name: un buyer no obtiene privilegios desde metadatos o formulario", async ({ run }) => {
    const from = prepare({ email: "buyer@example.invalid", role: "buyer" });
    vi.mocked(currentUser).mockResolvedValue({ ...fakeUser(), user_metadata: { role: "admin" } });
    const form = new FormData(); form.set("role", "admin");
    await expect(run(form)).rejects.toMatchObject({ location: "/hoy" });
    expect(from.mock.calls.map(([table]) => table)).toEqual(["app_users"]);
    noExternalEffects();
  });

  it("un buyer vigente sí puede registrar una revisión y vuelve a una ruta local", async () => {
    vi.mocked(currentUser).mockResolvedValue(fakeUser());
    const members = fakeQuery({ email: "buyer@example.invalid", role: "buyer" });
    const reviews = fakeQuery();
    vi.mocked(db).mockReturnValue({ from: vi.fn((table: string) => {
      if (table === "app_users") return members;
      if (table === "ad_reviews") return reviews;
      throw new Error(`Tabla no prevista: ${table}`);
    }) } as unknown as ReturnType<typeof db>);
    const form = new FormData();
    form.set("ad_id", "101"); form.set("account_id", "100"); form.set("note", "Revisión de prueba");
    form.set("back", "//example.invalid");
    await expect(markReviewed(form)).rejects.toMatchObject({ location: "/anuncios" });
    expect(reviews.insert).toHaveBeenCalledWith({ ad_id: "101", account_id: "100", note: "Revisión de prueba", reviewed_by: "buyer@example.invalid" });
    noExternalEffects();
  });

  it("el formulario heredado no puede ejecutar Meta ni aprobar propuestas", async () => {
    vi.mocked(currentUser).mockResolvedValue(fakeUser());
    const members = fakeQuery({ email: "buyer@example.invalid", role: "buyer" });
    const proposals = fakeQuery({ id: "proposal-test", status: "pendiente", rule_id: null, after_value: 10 });
    vi.mocked(db).mockReturnValue({ from: vi.fn((table: string) => {
      if (table === "app_users") return members;
      if (table === "proposals") return proposals;
      throw new Error(`Tabla no prevista: ${table}`);
    }) } as unknown as ReturnType<typeof db>);
    vi.mocked(executeProposal).mockRejectedValueOnce(new Error("respuesta privada del proveedor"));
    const form = new FormData();
    form.set("id", "proposal-test"); form.set("account", "100"); form.set("decision", "aprobada");
    const error = await decideProposal(form).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RedirectSignal);
    const location = new URL((error as RedirectSignal).location, "https://app.example.invalid");
    expect(location.searchParams.get("error")).toContain("formulario quedó deshabilitado");
    expect(location.searchParams.has("decidido")).toBe(false);
    expect(location.href).not.toContain("privada");
    expect(executeProposal).not.toHaveBeenCalled();
    expect(proposals.update).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
