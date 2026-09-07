import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Cuenta from "@/app/(private)/cuenta/page";
import Anuncios from "@/app/(private)/anuncios/page";
import Horarios from "@/app/(private)/horarios/page";
import Bitacora from "@/app/(private)/bitacora/page";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fakeUser } from "./fixtures";
vi.mock("@/lib/db", () => ({ db: vi.fn(), fetchAll: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/app/anuncios/actions", () => ({ markReviewed: vi.fn() }));
describe("fechas manipuladas no disparan consultas de datos", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(requireUser).mockResolvedValue({ ...fakeUser(), email: "buyer@example.invalid", appRole: "buyer" }); });
  it.each([{ path: "/cuenta", page: Cuenta }, { path: "/anuncios", page: Anuncios }, { path: "/horarios", page: Horarios }, { path: "/bitacora", page: Bitacora }])("$path ofrece recuperación sin consultar el periodo", async ({ path, page }) => {
    const from = vi.fn(() => { throw new Error("No debe consultar tablas con un rango inválido"); });
    vi.mocked(db).mockReturnValue({ from } as unknown as ReturnType<typeof db>);
    const html = renderToStaticMarkup(await page({ searchParams: Promise.resolve({ account: "100", days: "Infinity" }) }));
    expect(html).toContain("Revisa el periodo"); expect(html).toContain(`href="${path}?account=100"`);
    expect(from).not.toHaveBeenCalled(); expect(requireUser).toHaveBeenCalledWith(path);
  });
});
