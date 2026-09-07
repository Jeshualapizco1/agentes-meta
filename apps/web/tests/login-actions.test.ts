import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeQuery, RedirectSignal } from "./fixtures";
import { db } from "@/lib/db";
import { authClient } from "@/lib/supabase/server";
import { signIn } from "@/app/login/actions";

vi.mock("@/lib/db", () => ({ db: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ authClient: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new RedirectSignal(path); } }));

describe("entrada y destino después de login", () => {
  beforeEach(() => vi.clearAllMocks());

  function prepare(row: unknown = { email: "buyer@example.invalid", role: "buyer" }, membershipError: { message: string } | null = null) {
    vi.mocked(db).mockReturnValue({ from: vi.fn(() => fakeQuery(row, membershipError)) } as unknown as ReturnType<typeof db>);
    const signInWithPassword = vi.fn(async () => ({ error: null as { message: string } | null }));
    vi.mocked(authClient).mockResolvedValue({ auth: { signInWithPassword } } as unknown as Awaited<ReturnType<typeof authClient>>);
    const form = new FormData();
    form.set("email", "Buyer@Example.Invalid"); form.set("password", "test-password-only");
    form.set("next", "/anuncios?account=100&days=30");
    return { form, signInWithPassword };
  }

  it("conserva el enlace profundo de un miembro autorizado", async () => {
    const { form, signInWithPassword } = prepare();
    await expect(signIn(form)).rejects.toMatchObject({ location: "/anuncios?account=100&days=30" });
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "buyer@example.invalid", password: "test-password-only" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("no redirige fuera de la aplicación después de autenticar", async () => {
    const { form } = prepare(); form.set("next", "//example.invalid");
    await expect(signIn(form)).rejects.toMatchObject({ location: "/hoy" });
  });

  it.each([null, { email: "buyer@example.invalid", role: "owner" }])("no inicia sesión para un acceso no autorizado: %j", async row => {
    const { form, signInWithPassword } = prepare(row);
    const result = await signIn(form).catch((error: unknown) => error);
    expect(result).toBeInstanceOf(RedirectSignal);
    const location = new URL((result as RedirectSignal).location, "https://app.example.invalid");
    expect(location.searchParams.get("next")).toBe("/anuncios?account=100&days=30");
    expect(location.searchParams.get("error")).toContain("acceso no autorizado");
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("rechaza una consulta de permisos fallida aunque traiga una fila", async () => {
    const { form, signInWithPassword } = prepare({ email: "buyer@example.invalid", role: "admin" }, { message: "error privado" });
    await expect(signIn(form)).rejects.toThrow("No+se+pudo+verificar+el+acceso");
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("conserva next al fallar la contraseña, sin incluirla ni filtrar el error interno", async () => {
    const { form, signInWithPassword } = prepare();
    signInWithPassword.mockResolvedValueOnce({ error: { message: "dato interno" } });
    const result = await signIn(form).catch((error: unknown) => error);
    expect(result).toBeInstanceOf(RedirectSignal);
    const location = new URL((result as RedirectSignal).location, "https://app.example.invalid");
    expect(location.searchParams.get("next")).toBe("/anuncios?account=100&days=30");
    expect(location.href).not.toContain("test-password-only");
    expect(location.href).not.toContain("dato+interno");
  });
});
