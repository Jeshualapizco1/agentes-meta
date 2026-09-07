import { describe, expect, it } from "vitest";
import { safeInternalPath, pageHref, sessionHref, sessionReturnPath } from "./navigation";

describe("destinos internos de navegación", () => {
  it.each([
    "/hoy", "/anuncios?account=100&days=30", "/sesion/00000000-0000-4000-8000-000000000001#notas",
    "/anuncios?busqueda=promoci%C3%B3n", "/hoy?next=https%3A%2F%2Fexample.invalid",
  ])("preserva ruta/query/hash local: %s", path => {
    expect(safeInternalPath(path)).toBe(path);
  });

  it.each([
    null, undefined, "", "https://example.invalid", "javascript:alert(1)", "//example.invalid",
    "///example.invalid", "/\\example.invalid", "/%5cexample.invalid", "/%2fexample.invalid",
    "/%2f%2fexample.invalid", "/%00hoy", "/\nhoy", "/ hoy", "/%invalid",
  ])("rechaza destinos externos o ambiguos: %j", path => {
    expect(safeInternalPath(path)).toBe("/hoy");
  });

  it("permite un retorno alternativo definido por el servidor", () => {
    expect(safeInternalPath("//example.invalid", "/anuncios")).toBe("/anuncios");
  });
});

describe("retorno seguro desde sesiones", () => {
  it("codifica filtros de origen una vez y permite volver a Todas las cuentas", () => {
    const back = pageHref("/bitacora", { days: "30", actor: "Persona de prueba", sig: "all" });
    const detail = new URL(sessionHref("session/123", "100", back), "https://app.example.invalid");
    expect(detail.pathname).toBe("/sesion/session%2F123");
    expect(detail.searchParams.get("account")).toBe("100");
    expect(sessionReturnPath(detail.searchParams.get("returnTo"), "100")).toBe(back);
  });
  it.each(["//outside.invalid", "https://outside.invalid", "/login", "/sesion/200", "/usuarios", "/cuenta?account=200"])("descarta un retorno incompatible: %s", back => {
    expect(sessionReturnPath(back, "100")).toBe("/bitacora?account=100");
  });
  it("mantiene cuenta, periodo y ancla del origen compatible", () => {
    expect(sessionReturnPath("/cuenta?account=100&days=30#tendencia", "100")).toBe("/cuenta?account=100&days=30#tendencia");
  });
});
