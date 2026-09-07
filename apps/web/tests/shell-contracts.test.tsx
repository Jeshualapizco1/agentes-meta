import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NavMenu } from "@/components/NavMenu";
import { AuthShell } from "@/components/AuthShell";
import { RouteError } from "@/components/RouteError";
import PrivateLayout from "@/app/(private)/layout";
import { requireMember } from "@/lib/auth";
import { fakeUser, RedirectSignal } from "./fixtures";
vi.mock("@/lib/auth", () => ({ requireMember: vi.fn() }));
vi.mock("@/components/Nav", () => ({ PrivateShell: () => <div>Shell privado verificado</div> }));
describe("fronteras del shell", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(["buyer", "admin"] as const)("menú %s refleja rol y marca solo un destino", role => {
    const html = renderToStaticMarkup(<NavMenu pathname="/horarios" search="account=100&days=28" role={role} />);
    expect((html.match(/aria-current="page"/g) ?? []).length).toBe(1);
    expect(html.includes('href="/usuarios"')).toBe(role === "admin");
    expect(html).toContain("Operación"); expect(html).toContain("Análisis"); expect(html).toContain("Administración");
  });
  it("login no necesita identidad ni navegación privada", () => {
    const html = renderToStaticMarkup(<AuthShell><h1>Acceso</h1></AuthShell>);
    expect(html).not.toContain("<nav"); expect(html).not.toContain("Cerrar sesión"); expect(html).toContain('id="contenido"');
    expect(requireMember).not.toHaveBeenCalled();
  });
  it("layout propaga la denegación; no renderiza shell ni contenido protegido", async () => {
    vi.mocked(requireMember).mockRejectedValue(new RedirectSignal("/login"));
    await expect(PrivateLayout({ children: <p>Contenido sensible</p> })).rejects.toBeInstanceOf(RedirectSignal);
  });
  it("layout falla cerrado si no se verifican permisos", async () => {
    vi.mocked(requireMember).mockRejectedValue(new Error("No se pudo verificar el acceso"));
    await expect(PrivateLayout({ children: null })).rejects.toThrow("No se pudo verificar el acceso");
  });
  it("layout entrega al cliente solamente email y rol necesarios para presentar sesión", async () => {
    vi.mocked(requireMember).mockResolvedValue({ ...fakeUser(), email: "buyer@example.invalid", appRole: "buyer" });
    const element = await PrivateLayout({ children: <p>Contenido</p> });
    expect(element.props.children.props).toMatchObject({ email: "buyer@example.invalid", role: "buyer" });
    expect(element.props.children.props).not.toHaveProperty("user_metadata");
  });
  it("la vista de error ofrece reintento de carga, no aprobación ni ejecución", () => {
    const html = renderToStaticMarkup(<RouteError reset={() => {}} />);
    expect(html).toContain("Reintentar carga"); expect(html).toContain("no se enviará ninguna acción de negocio");
  });
});
