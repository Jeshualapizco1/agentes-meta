import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeQuery, fakeUser, RedirectSignal } from "../tests/fixtures";
import { db } from "./db";
import { currentUser } from "./supabase/server";
import { requireUser, requireAdmin } from "./auth";
import { headers } from "next/headers";
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));

vi.mock("./db", () => ({ db: vi.fn() }));
vi.mock("./supabase/server", () => ({ currentUser: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new RedirectSignal(path); } }));

describe("acceso de miembros a páginas y acciones", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(headers).mockResolvedValue(new Headers()); });

  function membership(data: unknown, error: { message: string } | null = null) {
    const query = fakeQuery(data, error);
    const from = vi.fn(() => query);
    vi.mocked(db).mockReturnValue({ from } as unknown as ReturnType<typeof db>);
    return { query, from };
  }

  it("sin sesión no consulta tablas y conserva el destino interno", async () => {
    vi.mocked(currentUser).mockResolvedValue(null);
    await expect(requireUser("/anuncios?account=100")).rejects.toMatchObject({
      location: "/login?next=%2Fanuncios%3Faccount%3D100",
    });
    expect(db).not.toHaveBeenCalled();
  });

  it("conserva detalle y filtros del request, incluso si el layout usa /hoy como fallback", async () => {
    vi.mocked(headers).mockResolvedValue(new Headers({ "x-agentes-return-path": "/sesion/100?account=200&returnTo=%2Fbitacora%3Fdays%3D30" }));
    vi.mocked(currentUser).mockResolvedValue(null);
    await expect(requireUser("/hoy")).rejects.toMatchObject({ location: "/login?next=" + encodeURIComponent("/sesion/100?account=200&returnTo=%2Fbitacora%3Fdays%3D30") });
  });
  it("un encabezado de retorno externo no crea una redirección externa", async () => {
    vi.mocked(headers).mockResolvedValue(new Headers({ "x-agentes-return-path": "https://outside.invalid" }));
    vi.mocked(currentUser).mockResolvedValue(null);
    await expect(requireUser("/anuncios")).rejects.toMatchObject({ location: "/login?next=%2Fanuncios" });
  });

  it.each(["buyer", "admin"])("acepta un miembro %s desde la tabla de permisos", async role => {
    vi.mocked(currentUser).mockResolvedValue(fakeUser("  Buyer@Example.Invalid  "));
    const { query, from } = membership({ email: "buyer@example.invalid", role });
    const member = await requireUser("/hoy");
    expect(member).toMatchObject({ email: "buyer@example.invalid", appRole: role });
    expect(from).toHaveBeenCalledWith("app_users");
    expect(query.eq).toHaveBeenCalledWith("email", "buyer@example.invalid");
  });

  it.each([
    null,
    { email: "buyer@example.invalid", role: "owner" },
    { email: "buyer@example.invalid", role: null },
    { email: "different@example.invalid", role: "admin" },
  ])("deniega membresía ausente, rol desconocido o identidad inconsistente: %j", async row => {
    vi.mocked(currentUser).mockResolvedValue(fakeUser());
    membership(row);
    await expect(requireUser("/hoy")).rejects.toBeInstanceOf(RedirectSignal);
  });

  it("falla cerrado y no filtra el error de la DB aunque venga una fila", async () => {
    vi.mocked(currentUser).mockResolvedValue(fakeUser());
    membership({ email: "buyer@example.invalid", role: "admin" }, { message: "detalle interno sensible" });
    await expect(requireUser("/hoy")).rejects.toThrow("No se pudo verificar el acceso");
  });

  it("consulta de nuevo la membresía después de revocarla", async () => {
    vi.mocked(currentUser).mockResolvedValue(fakeUser());
    const { query } = membership({ email: "buyer@example.invalid", role: "buyer" });
    await requireUser("/hoy");
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(requireUser("/hoy")).rejects.toBeInstanceOf(RedirectSignal);
    expect(query.maybeSingle).toHaveBeenCalledTimes(2);
  });

  it("permite al admin vigente sin fiarse del rol incluido en el token", async () => {
    vi.mocked(currentUser).mockResolvedValue(fakeUser());
    membership({ email: "buyer@example.invalid", role: "admin" });
    await expect(requireAdmin("/usuarios")).resolves.toMatchObject({ appRole: "admin", role: "authenticated" });
  });

  it("convierte una excepción de la consulta en un error de acceso seguro", async () => {
    vi.mocked(currentUser).mockResolvedValue(fakeUser());
    vi.mocked(db).mockImplementation(() => { throw new Error("datos privados de conexión"); });
    await expect(requireUser("/hoy")).rejects.toThrow("No se pudo verificar el acceso");
  });
});
