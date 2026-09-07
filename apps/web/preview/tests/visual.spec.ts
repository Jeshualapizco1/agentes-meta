import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test.beforeEach(async ({ context, page }) => {
  // Solo recursos del laboratorio local. Ni APIs externas ni fuentes remotas ni sesiones guardadas.
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://127.0.0.1:4174") { await route.abort(); throw new Error(`Solicitud fuera del laboratorio: ${url.origin}`); }
    await route.continue();
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "El pulso de tu cuenta." })).toBeVisible();
});

for (const width of [320, 390, 768, 1440]) {
  test(`bento adaptable sin desbordamiento a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.getByLabel("Probar importes largos").check();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByText("$123,456,789,012", { exact: true })).toBeVisible();
    const overflow = await page.locator(".demo-bento .card").evaluateAll(cards => cards.filter(c => c.scrollWidth > c.clientWidth + 2).length);
    expect(overflow).toBe(0);
  });
}
test("botones y campos comparten contraste, tamaño y foco visibles", async ({ page }) => {
  const primary = page.getByRole("button", { name: "Guardar ejemplo", exact: true });
  const colors = await primary.evaluate(el => { const s = getComputedStyle(el); return { color: s.color, background: s.backgroundColor, height: el.getBoundingClientRect().height }; });
  expect(colors).toMatchObject({ color: "rgb(26, 16, 11)", background: "rgb(255, 116, 61)" }); expect(colors.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();
  expect(await page.getByRole("link", { name: "Saltar al contenido" }).evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
  const field = page.getByLabel("Margen bruto");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(field).toHaveAccessibleDescription("El margen no puede superar 100%.");
});
test("revisión y guardado solo afectan el estado del ejemplo", async ({ page }) => {
  await page.getByRole("button", { name: "Revisar ejemplo" }).click();
  await expect(page.getByText("Esto es una demostración", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Guardar ejemplo", exact: true }).click();
  await expect(page.getByText("Ejemplo guardado solo en esta vista.", { exact: false })).toBeVisible();
  await page.getByLabel("Nota de ejemplo").fill("Un borrador de prueba");
  await expect(page.getByLabel("Nota de ejemplo")).toHaveValue("Un borrador de prueba");
  await expect(page.getByRole("button", { name: "Guardando…" })).toBeDisabled();
});
test("un error o ausencia de datos no muestra un resumen positivo", async ({ page }) => {
  await page.getByLabel("Estado de los datos del resumen").selectOption("error");
  await expect(page.locator("#resumen").getByText("No pudimos cargar los datos")).toBeVisible();
  await expect(page.locator("#resumen").getByText("+12.5%", { exact: false })).toHaveCount(0);
  await expect(page.locator("#resumen").getByText("No se pudo verificar", { exact: true })).toHaveCount(3);
  await page.getByLabel("Estado de los datos del resumen").selectOption("empty");
  await expect(page.locator("#resumen").getByText("Sin datos disponibles", { exact: true })).toHaveCount(3);
});
test("hay alternativa de tabla navegable con teclado para la gráfica", async ({ page }) => {
  const summary = page.getByText("Ver los datos de la gráfica", { exact: true });
  await summary.focus(); await page.keyboard.press("Enter");
  const table = page.getByRole("table", { name: /La tendencia/ });
  await expect(table).toBeVisible(); await expect(table.getByRole("row")).toHaveCount(8);
});
test("movimiento reducido desactiva transiciones e indicadores animados", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const names = await page.locator(".ui-spinner").evaluateAll(elements => elements.map(el => getComputedStyle(el).animationName));
  expect(names.every(name => name === "none")).toBe(true);
});
test("capturas de referencia del laboratorio real", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: resolve("../../docs/capturas/codex-im22-vista-general.png"), animations: "disabled" });
  await page.screenshot({ path: resolve("../../docs/capturas/codex-im22-escritorio.png"), fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve("../../docs/capturas/codex-im22-movil-inicio.png"), animations: "disabled" });
  await page.screenshot({ path: resolve("../../docs/capturas/codex-im22-movil.png"), fullPage: true, animations: "disabled" });
});
