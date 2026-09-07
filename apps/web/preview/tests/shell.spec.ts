import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
test.beforeEach(async ({ context, page }) => {
  await context.route("**/*", async route => {
    if (new URL(route.request().url()).origin !== "http://127.0.0.1:4174") { await route.abort(); throw new Error("Red fuera del laboratorio"); }
    await route.continue();
  });
  await page.goto("/anuncios?account=100&days=7");
  await page.evaluate(() => document.fonts.ready);
});
for (const width of [320, 390, 768, 1440]) test(`shell sin desbordamiento a ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (width < 1024) {
    await page.getByRole("button", { name: "Menú", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Navegación" })).toBeVisible();
    expect(await page.locator("dialog").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
});
test("menú modal confina el foco, Escape restaura el disparador y libera scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page.getByRole("button", { name: "Menú", exact: true });
  await trigger.click();
  await expect(page.getByRole("button", { name: "Cerrar menú" })).toBeFocused();
  for (let i = 0; i < 12; i++) { await page.keyboard.press("Tab"); expect(await page.evaluate(() => !!document.activeElement?.closest("dialog"))).toBe(true); }
  await page.keyboard.press("Shift+Tab"); expect(await page.evaluate(() => !!document.activeElement?.closest("dialog"))).toBe(true);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible(); await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
});
test("cierra al tocar fondo y al pasar a escritorio", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Menú", exact: true }).click(); await page.mouse.click(5, 200);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Menú", exact: true }).click(); await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
});
test("navegación móvil conserva cuenta y periodo, sin filtros propios", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/anuncios?account=200&days=30&orden=cpa&pagina=4");
  await page.getByRole("button", { name: "Menú", exact: true }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Rendimiento", exact: true }).click();
  await expect(page).toHaveURL(/\/cuenta\?account=200&days=30$/); await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("7 → 30 días, cuenta nueva y Atrás/Adelante reflejan la URL", async ({ page }) => {
  await page.getByLabel("Periodo", { exact: true }).selectOption("30");
  await page.getByLabel("Cuenta", { exact: true }).selectOption("200");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/account=200&days=30$/);
  await expect(page.getByLabel("Periodo", { exact: true })).toHaveValue("30");
  await page.goBack(); await expect(page.getByLabel("Periodo", { exact: true })).toHaveValue("7"); await expect(page.getByLabel("Cuenta", { exact: true })).toHaveValue("100");
  await page.goForward(); await expect(page.getByLabel("Periodo", { exact: true })).toHaveValue("30"); await expect(page.getByLabel("Cuenta", { exact: true })).toHaveValue("200");
});
test("calendario no salta el foco y solo envía from/to", async ({ page }) => {
  await page.getByLabel("Periodo", { exact: true }).selectOption("custom");
  await page.getByLabel("Desde", { exact: true }).fill("2026-08-01");
  await expect(page.getByLabel("Desde", { exact: true })).toBeFocused();
  await page.getByLabel("Hasta", { exact: true }).fill("2026-08-07");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/account=100&from=2026-08-01&to=2026-08-07$/);
});
test("administración secundaria y usuarios solo en la presentación admin", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole("link", { name: "Usuarios", exact: true })).toHaveCount(0);
  await page.locator(".shell-sidebar summary").click();
  await expect(page.getByRole("link", { name: "Configuración · lectura" })).toBeVisible();
  await page.getByLabel("Probar vista de administrador").check();
  await expect(page.getByRole("link", { name: "Usuarios", exact: true })).toBeVisible();
  await expect(page.locator('.shell-sidebar [aria-current="page"]')).toHaveCount(1);
});
test("Hoy no ofrece un selector de fechas sin efecto", async ({ page }) => {
  await page.goto("/hoy?account=100");
  await expect(page.getByLabel("Periodo", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/^Ventana de 7 días cerrados/)).toBeVisible();
});
test("acceso público sin navegación privada ni sesión inventada", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Menú", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("capturas del shell compartido y acceso público", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({ path: resolve("../../docs/capturas/codex-im23-escritorio.png"), fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve("../../docs/capturas/codex-im23-movil.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Menú", exact: true }).click();
  await page.screenshot({ path: resolve("../../docs/capturas/codex-im23-menu-movil.png"), animations: "disabled" });
  await page.goto("/login"); await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve("../../docs/capturas/codex-im23-login.png"), animations: "disabled" });
});
