import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { middleware } from "../middleware";
import { fakeUser } from "./fixtures";

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));

describe("middleware sin bucles por membresía revocada", () => {
  beforeEach(() => vi.clearAllMocks());

  function session(user: ReturnType<typeof fakeUser> | null) {
    vi.mocked(createServerClient).mockReturnValue({ auth: { getUser: vi.fn(async () => ({ data: { user }, error: null })) } } as unknown as ReturnType<typeof createServerClient>);
  }

  it("permite llegar a login con sesión; la sesión no demuestra membresía", async () => {
    session(fakeUser());
    const response = await middleware(new NextRequest("https://app.example.invalid/login?error=revocado"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("sobrescribe el encabezado de retorno enviado por el cliente", async () => {
    session(fakeUser());
    const response = await middleware(new NextRequest("https://app.example.invalid/cuenta?account=100&days=30", { headers: { "x-agentes-return-path": "//outside.invalid" } }));
    expect(response.headers.get("x-middleware-request-x-agentes-return-path")).toBe("/cuenta?account=100&days=30");
  });
  it("refrescar cookies conserva el encabezado de retorno y la cookie de respuesta", async () => {
    vi.mocked(createServerClient).mockReturnValue({ auth: { getUser: vi.fn(async () => {
      const options = vi.mocked(createServerClient).mock.calls[0]![2]!;
      const cookies = options.cookies as { setAll: (all: { name: string; value: string; options: { path: string } }[]) => void };
      cookies.setAll([{ name: "fixture-session", value: "refreshed", options: { path: "/" } }]);
      return { data: { user: fakeUser() }, error: null };
    }) } } as unknown as ReturnType<typeof createServerClient>);
    const response = await middleware(new NextRequest("https://app.example.invalid/sesion/123?account=100"));
    expect(response.headers.get("x-middleware-request-x-agentes-return-path")).toBe("/sesion/123?account=100");
    expect(response.headers.get("x-middleware-request-cookie")).toContain("fixture-session=refreshed");
    expect(response.cookies.get("fixture-session")?.value).toBe("refreshed");
  });

  it("preserva el destino completo al pedir login y no arrastra filtros al formulario", async () => {
    session(null);
    const response = await middleware(new NextRequest("https://app.example.invalid/anuncios?account=100&days=30"));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect([...location.searchParams.keys()]).toEqual(["next"]);
    expect(location.searchParams.get("next")).toBe("/anuncios?account=100&days=30");
  });

  it.each(["/login-extra", "/auth/signout-extra"])("un prefijo no crea otra ruta pública: %s", async path => {
    session(null);
    const response = await middleware(new NextRequest(`https://app.example.invalid${path}`));
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });

  it.each(["/login", "/auth/signout"])("conserva el acceso público necesario: %s", async path => {
    session(null);
    const response = await middleware(new NextRequest(`https://app.example.invalid${path}`));
    expect(response.headers.get("location")).toBeNull();
  });
});
