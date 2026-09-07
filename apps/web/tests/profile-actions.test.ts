import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
import { fakeQuery, fakeUser, RedirectSignal } from "./fixtures";
import { validProfileForm } from "./profile-fixture";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/supabase/server";
import { saveProfile, saveProfileState } from "@/app/configuracion/actions";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/db", () => ({ db: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ currentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new RedirectSignal(path); } }));

describe("guardado seguro de Configuración", () => {
  beforeEach(() => vi.clearAllMocks());
  function prepare(data: unknown = 2, error: { code?: string; message: string } | null = null) {
    vi.mocked(currentUser).mockResolvedValue(fakeUser("admin@example.invalid"));
    const from = vi.fn((table: string) => {
      if (table !== "app_users") throw new Error(`Escritura fuera de la RPC: ${table}`);
      return fakeQuery({ email: "admin@example.invalid", role: "admin" });
    });
    const rpc = vi.fn().mockResolvedValue({ data, error });
    vi.mocked(db).mockReturnValue({ from, rpc } as unknown as ReturnType<typeof db>);
    return { rpc, from, form: validProfileForm() };
  }
  it.each(["off", "semi"])("un admin guarda %s mediante una única transacción", async mode => {
    const { rpc, form } = prepare(); form.set("mode", mode); form.set("changed_by", "suplantado@example.invalid");
    await expect(saveProfile(form)).rejects.toMatchObject({ location: "/configuracion?account=100&revision=2" });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("save_account_profile_v1", {
      p_account_id: "100", p_expected_version: 1, p_changed_by: "admin@example.invalid",
      p_profile: expect.objectContaining({ mode, dry_run: true, breakeven_roas: 2, daily_spend_ceiling: 1000, whitelist_campaign_ids: ["101", "102"] }),
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["auto", "otro", ""])("rechaza modo manipulado: %s", async mode => {
    const { rpc, form } = prepare(); form.set("mode", mode);
    expect(await saveProfile(form)).toMatchObject({ field: "mode", error: expect.stringContaining("Modo inválido") });
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each(["", "null", "100,enabled.eq.true", "1".repeat(33)])("rechaza ID inválido: %s", async account => {
    const { rpc, form } = prepare(); form.set("account_id", account);
    expect(await saveProfile(form)).toMatchObject({ field: "account_id", error: expect.stringContaining("Cuenta inválida") });
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([
    { code: "P0001", message: "PROFILE_ACCOUNT_UNAVAILABLE", expected: "deshabilitada" },
    { code: "P0001", message: "PROFILE_VERSION_CONFLICT", expected: "versión más reciente" },
    { code: "22023", message: "PROFILE_INVALID_WHITELIST", expected: "no pertenece" },
    { code: "42501", message: "detalle privado", expected: "permiso" },
    { code: "PGRST202", message: "detalle privado", expected: "actualización" },
    { code: "XX000", message: "detalle privado", expected: "No se pudo confirmar" },
  ])("no muestra éxito ni filtra errores: $code/$message", async ({ code, message, expected }) => {
    const { form, from } = prepare(2, { code, message }); // Error manda incluso si llegó un dato junto a él.
    const result = await saveProfileState({}, form);
    expect(result.error).toContain(expected); expect(result.error).not.toContain("detalle privado");
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(from.mock.calls.map(([table]) => table)).toEqual(["app_users"]);
  });
  it("una respuesta perdida se comunica como no confirmada y no se reintenta sola", async () => {
    const { rpc, form } = prepare(); rpc.mockRejectedValueOnce(new Error("detalle privado"));
    expect((await saveProfile(form)).error).toContain("No se pudo confirmar");
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it.each([null, "2", 1, 3, {}])("no acepta un recibo incoherente: %j", async data => {
    const { form } = prepare(data); expect((await saveProfile(form)).error).toContain("No se pudo confirmar");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("el adaptador de estado tampoco permite saltarse el rol", async () => {
    const { rpc, form } = prepare(); vi.mocked(currentUser).mockResolvedValue(null);
    await expect(saveProfileState({}, form)).rejects.toBeInstanceOf(RedirectSignal); expect(rpc).not.toHaveBeenCalled();
  });
});
