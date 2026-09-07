import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { navigationHref, isNavActive } from "./nav-context";
describe("contexto de navegación explícito y compatible", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-06T18:00:00Z")); });
  afterEach(() => vi.useRealTimers());
  it("mantiene cuenta y periodo pero no filtros propios de anuncios", () => {
    expect(navigationHref("/cuenta", "/anuncios", "account=100&days=30&campaign=200&sort=cpa&page=3")).toBe("/cuenta?account=100&days=30");
  });
  it("detalle → origen recupera todos los filtros; otro destino recibe solo el contexto compatible", () => {
    const search = new URLSearchParams({ account: "100", returnTo: "/bitacora?days=30&actor=Estratega&sig=all" }).toString();
    expect(navigationHref("/bitacora", "/sesion/123", search)).toBe("/bitacora?days=30&actor=Estratega&sig=all");
    expect(navigationHref("/cuenta", "/sesion/123", search)).toBe("/cuenta?account=100&days=30");
  });
  it("mantiene todos los filtros al volver a la misma sección", () => expect(navigationHref("/anuncios", "/anuncios", "account=100&sort=cpa&page=3")).toBe("/anuncios?account=100&sort=cpa&page=3"));
  it("lleva el periodo por defecto de la fuente, no el del destino", () => expect(navigationHref("/cuenta", "/anuncios", "account=100")).toBe("/cuenta?account=100&days=7"));
  it("lleva un rango personalizado y descarta days simultáneo", () => expect(navigationHref("/bitacora", "/cuenta", "account=200&from=2026-09-01&to=2026-09-05&days=7")).toBe("/bitacora?account=200&from=2026-09-01&to=2026-09-05"));
  it("normaliza el enlace antiguo weeks de Horarios", () => expect(navigationHref("/cuenta", "/horarios", "weeks=4")).toBe("/cuenta?days=28"));
  it.each(["/hoy", "/analisis", "/experimentos", "/configuracion"])("no aparenta cambiar la ventana propia de %s", route => expect(navigationHref(route, "/cuenta", "account=100&days=90")).toBe(`${route}?account=100`));
  it.each(["/usuarios", "/estado"])("no filtra contexto de cuenta a %s", route => expect(navigationHref(route, "/cuenta", "account=100&days=90")).toBe(route));
  it("no copia una cuenta sintácticamente inválida ni fechas imposibles", () => expect(navigationHref("/cuenta", "/anuncios", "account=100,enabled.eq.true&from=2026-02-30&to=2026-03-01")).toBe("/cuenta"));
  it("marca el detalle como Bitácora, pero no prefijos parecidos", () => {
    expect(isNavActive("/bitacora", "/sesion/123")).toBe(true);
    expect(isNavActive("/bitacora", "/sesion-extra")).toBe(false);
    expect(isNavActive("/cuenta", "/horarios")).toBe(false);
  });
});
