import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Configuracion from "@/app/(private)/configuracion/page";
import { db, fetchAll } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fakeQuery, fakeUser } from "./fixtures";
vi.mock("@/lib/db", () => ({ db: vi.fn(), fetchAll: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/app/configuracion/ProfileForm", () => ({ ProfileForm: ({ children }: { children: ReactNode }) => <form>{children}</form> }));

describe("lectura de Configuración sin convertir errores en datos vacíos", () => {
  beforeEach(() => vi.clearAllMocks());
  function prepare(profile: unknown = { version: 1, whitelist_campaign_ids: ["102"] }, error: { message: string } | null = null) {
    vi.mocked(requireUser).mockResolvedValue({ ...fakeUser("admin@example.invalid"), email: "admin@example.invalid", appRole: "admin" });
    const query = (data: unknown, failure: { message: string } | null = null) => {
      const q = Object.assign(fakeQuery(data, failure), { order: vi.fn(), limit: vi.fn() });
      q.order.mockReturnValue(q); q.limit.mockReturnValue(q); return q;
    };
    const tables = {
      accounts: query([{ id: "100", name: "Cuenta sintética" }]),
      account_profiles: query(profile, error), profile_changes: query([]),
    };
    vi.mocked(db).mockReturnValue({ from: vi.fn((table: string) => tables[table as keyof typeof tables]) } as unknown as ReturnType<typeof db>);
    vi.mocked(fetchAll).mockResolvedValue([{ id: "102", name: "Pausada elegida", effective_status: "PAUSED", daily_budget: null }]);
    return tables;
  }
  const render = async (searchParams: Record<string, string> = {}) => renderToStaticMarkup(await Configuracion({ searchParams: Promise.resolve(searchParams) }));
  it("usa lectura paginada y muestra la campaña inactiva seleccionada y su revisión", async () => {
    prepare(); const html = await render();
    expect(fetchAll).toHaveBeenCalledTimes(1); expect(html).toContain("Pausada elegida");
    expect(html).toContain('name="expected_version" value="1"'); expect(html).toContain('checked=""');
  });
  it("un error del perfil bloquea la edición aunque también llegue una fila", async () => {
    prepare({ version: 1 }, { message: "error privado" }); const html = await render();
    expect(html).toContain("No se pudo cargar"); expect(html).not.toContain("expected_version"); expect(html).not.toContain("error privado");
  });
  it("un error de campañas no se transforma en una lista blanca vacía", async () => {
    prepare(); vi.mocked(fetchAll).mockRejectedValue(new Error("error privado"));
    expect(await render()).not.toContain("expected_version");
  });
  it("el esquema sin versionado no permite usar el guardado anterior", async () => {
    prepare({ whitelist_campaign_ids: ["102"] });
    expect(await render()).toContain("actualización de configuración segura");
  });
  it("una cuenta no habilitada no consulta perfiles", async () => {
    const tables = prepare(); const html = await render({ account: "200" });
    expect(html).toContain("cuenta no está disponible"); expect(tables.account_profiles.select).not.toHaveBeenCalled();
  });
  it("un parámetro de éxito inventado no se muestra como guardado", async () => {
    prepare(); const html = await render({ saved: "1", revision: "999" });
    expect(html).not.toContain("Guardado."); expect(html).not.toContain("está registrada en el historial");
  });
});
