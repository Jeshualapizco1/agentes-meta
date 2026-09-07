import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";
import { HOY_SCENARIOS } from "../hoy-fixtures";

test.beforeEach(async ({ context, page }) => {
  await context.route("**/*", async route => {
    const request = route.request();
    if (new URL(request.url()).origin !== "http://127.0.0.1:4174" || !["GET", "HEAD"].includes(request.method())) {
      await route.abort(); throw new Error("El piloto no permite APIs externas ni solicitudes de escritura.");
    }
    await route.continue();
  });
  await page.goto("/hoy?account=100"); await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Lo importante, primero." })).toBeVisible();
});
async function review(page: Page) {
  await page.getByRole("button", { name: "Revisar propuesta: Ajustar presupuesto diario", exact: true }).click();
  return page.getByRole("dialog", { name: "Ajustar presupuesto diario", exact: true });
}
async function tools(page: Page) { await page.getByText("Escenarios de prueba · solo datos ficticios", { exact: true }).click(); }

for (const width of [320, 390, 768, 1440]) test(`Hoy y panel soportan nombres e importes largos a ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 960 }); await tools(page);
  await page.getByLabel("Nombres e importes largos").check();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator(".hoy-page .card").evaluateAll(cards => cards.filter(c => c.scrollWidth > c.clientWidth + 2).length)).toBe(0);
  const dialog = await review(page);
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(dialog.getByRole("heading", { name: "Evidencia de la propuesta" })).toBeVisible();
});
test("cuatro KPI consistentes y gráfica con alternativa de teclado", async ({ page }) => {
  await expect(page.locator(".hoy-kpis > .card")).toHaveCount(4);
  await expect(page.locator(".hoy-kpis").getByText("$24,860.00", { exact: true })).toBeVisible();
  await expect(page.locator(".hoy-kpis").getByText("3.42×", { exact: true })).toBeVisible();
  const summary = page.getByText("Ver los datos de la gráfica", { exact: true });
  await summary.focus(); await page.keyboard.press("Enter");
  const table = page.getByRole("table", { name: /La tendencia, sin ruido/ });
  await expect(table).toBeVisible(); await expect(table.getByRole("row")).toHaveCount(15);
  await expect(page.getByLabel("Periodo", { exact: true })).toHaveCount(0);
});
test("panel con teclado, retorno de foco y cierre por fondo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const trigger = page.getByRole("button", { name: "Revisar propuesta: Ajustar presupuesto diario", exact: true });
  const dialog = await review(page);
  await expect(dialog.getByRole("button", { name: "Cerrar panel" })).toBeFocused();
  for (let i = 0; i < 14; i++) { await page.keyboard.press("Tab"); expect(await page.evaluate(() => !!document.activeElement?.closest("dialog"))).toBe(true); }
  await page.keyboard.press("Shift+Tab"); expect(await page.evaluate(() => !!document.activeElement?.closest("dialog"))).toBe(true);
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  await trigger.click(); await page.mouse.click(5, 200); await expect(dialog).not.toBeVisible();
});
test("corregir importe y rechazar exigen una razón, sin perder borrador", async ({ page }) => {
  const dialog = await review(page);
  await dialog.getByLabel("Nuevo presupuesto diario", { exact: false }).fill("1900.50");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Simular aprobación", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Escribe una razón");
  await expect(dialog.getByLabel("Nuevo presupuesto diario", { exact: false })).toHaveValue("1900.50");
  await dialog.getByRole("button", { name: "Rechazar en demo" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Escribe una razón");
});
test("un fallo local conserva razón e importe y no afirma ejecución", async ({ page }) => {
  await tools(page); await page.getByLabel("Fallo de guardado local").check();
  const dialog = await review(page);
  await dialog.getByLabel("Nuevo presupuesto diario", { exact: false }).fill("1900.50");
  await dialog.getByLabel("Razón de la decisión").fill("Prefiero un cambio menor de ensayo.");
  await dialog.getByRole("checkbox").check(); await dialog.getByRole("button", { name: "Simular aprobación", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Guardando ensayo…" })).toBeDisabled();
  await expect(dialog.getByRole("alert")).toContainText("Conservamos tu borrador");
  await expect(dialog.getByLabel("Nuevo presupuesto diario", { exact: false })).toHaveValue("1900.50");
  await expect(dialog.getByLabel("Razón de la decisión")).toHaveValue("Prefiero un cambio menor de ensayo.");
});
test("una aprobación simulada solo afecta memoria y recargar restaura el escenario", async ({ page }) => {
  const dialog = await review(page); await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Simular aprobación", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("Aprobación simulada solo en esta vista. No se enviaron cambios a Meta.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Revisar propuesta: Ajustar presupuesto diario", exact: true })).toHaveCount(0);
  await page.reload(); await expect(page.getByRole("button", { name: "Revisar propuesta: Ajustar presupuesto diario", exact: true })).toBeVisible();
});
test("rechazo local con razón no se registra como ejecución", async ({ page }) => {
  const dialog = await review(page); await dialog.getByLabel("Razón de la decisión").fill("Revisar la muestra antes de continuar.");
  await dialog.getByRole("checkbox").check(); await dialog.getByRole("button", { name: "Rechazar en demo" }).click();
  await expect(dialog).not.toBeVisible(); await expect(page.locator("#hoy-decisions").getByText("Rechazada", { exact: true })).toBeVisible();
});
for (const state of ["partial", "stale", "brake", "off", "live", "expired", "unconfirmed"]) test(`${state} permite inspeccionar, pero bloquea la aprobación de ensayo`, async ({ page }) => {
  await page.goto(`/hoy?account=100&scenario=${state}`);
  const dialog = await review(page);
  await expect(dialog.getByRole("button", { name: "Simular aprobación", exact: true })).toBeDisabled();
});
test("error, carga y vacío nunca dibujan una cuenta sana ni gasto cero", async ({ page }) => {
  for (const state of ["error", "loading", "empty"]) {
    await page.goto(`/hoy?account=100&scenario=${state}`);
    await expect(page.locator(".hoy-kpis").getByText("$0.00", { exact: true })).toHaveCount(0);
    await expect(page.locator(".hoy-kpis").getByText("$24,860.00", { exact: true })).toHaveCount(0);
    await expect(page.getByText("todo en orden", { exact: false })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Revisar propuesta:/ })).toHaveCount(0);
  }
});
test("sin permiso no expone métricas, propuestas ni el nombre de la cuenta", async ({ page }) => {
  await page.goto("/hoy?account=100&scenario=forbidden");
  await expect(page.getByText("No tienes acceso a esta información", { exact: true })).toBeVisible();
  await expect(page.locator(".hoy-kpis")).toHaveCount(0); await expect(page.getByText("Horizonte Studio", { exact: true })).toHaveCount(0);
});
test("cambiar de cuenta no conserva propuestas, resultados ni borradores de otra", async ({ page }) => {
  await page.getByLabel("Cuenta de demostración", { exact: true }).selectOption("200");
  await page.getByRole("button", { name: "Cambiar", exact: true }).click();
  await expect(page).toHaveURL(/account=200$/); await expect(page.getByRole("button", { name: /^Revisar propuesta:/ })).toHaveCount(0);
  await expect(page.getByText("No hay propuestas pendientes", { exact: true })).toBeVisible();
  await expect(page.locator(".hoy-kpis").getByText("$12,430.00", { exact: true })).toBeVisible();
});
test("freno de ensayo detiene el agente, nunca anuncia que pausó anuncios", async ({ page }) => {
  await page.getByRole("button", { name: "Control del agente", exact: true }).click();
  await page.getByRole("button", { name: "Simular detención del agente" }).click();
  await expect(page.getByText("Detención simulada del agente. No se pausaron anuncios ni se escribió en la base.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ver freno activo" }).click();
  await expect(page.getByRole("button", { name: "Simular liberación del freno" })).toBeDisabled();
  await expect(page.getByText("Solo un administrador puede liberar el freno, con una razón.", { exact: true })).toBeVisible();
});
test("liberar requiere admin y motivo, y no reactiva automáticamente al agente", async ({ page }) => {
  await page.goto("/hoy?account=100&scenario=brake"); await tools(page); await page.getByLabel("Vista de administrador").check();
  await page.getByRole("button", { name: "Ver freno activo" }).click();
  const button = page.getByRole("button", { name: "Simular liberación del freno" }); await expect(button).toBeDisabled();
  await page.getByLabel("Razón (obligatoria)", { exact: true }).fill("Revisión de ejemplo completada."); await button.click();
  await expect(page.getByText("Freno liberado solo en la demo. El agente permanece detenido; no se reanudó ninguna ejecución.", { exact: true })).toBeVisible();
  await expect(page.locator("#hoy-agent").getByText("Agente detenido", { exact: true })).toBeVisible();
});
test("todos los escenarios son renderizables sin excepciones de página", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  for (const scenario of Object.keys(HOY_SCENARIOS)) { await page.goto(`/hoy?account=100&scenario=${scenario}`); await expect(page.locator(".hoy-page")).toBeVisible(); }
  expect(errors).toEqual([]);
});

test("un escenario de URL desconocido usa el ejemplo permitido, sin claves heredadas", async ({ page }) => {
  for (const scenario of ["inexistente", "toString", "__proto__"]) {
    await page.goto(`/hoy?account=100&scenario=${scenario}`); await tools(page);
    await expect(page.getByLabel("Estado de ejemplo")).toHaveValue("simulation");
    await expect(page.getByRole("heading", { name: "Lo importante, primero." })).toBeVisible();
  }
});

test("una cuenta de URL desconocida ofrece recuperación sin mostrar otra silenciosamente", async ({ page }) => {
  await page.goto("/hoy?account=no-existe");
  await expect(page.getByText("Cuenta de demostración no disponible", { exact: true })).toBeVisible();
  await expect(page.locator(".hoy-kpis")).toHaveCount(0);
  await page.getByRole("link", { name: "Volver al piloto" }).click();
  await expect(page).toHaveURL(/account=100$/);
  await expect(page.getByRole("heading", { name: "Lo importante, primero." })).toBeVisible();
});
test("capturas del piloto Hoy y su panel real renderizado", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: resolve("../../docs/capturas/codex-im21-hoy-escritorio.png"), fullPage: true, animations: "disabled" });
  await page.screenshot({ path: resolve("../../docs/capturas/codex-im21-hoy-inicio.png"), animations: "disabled" });
  await review(page); await page.screenshot({ path: resolve("../../docs/capturas/codex-im21-propuesta-escritorio.png"), animations: "disabled" });
  await page.keyboard.press("Escape"); await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve("../../docs/capturas/codex-im21-hoy-movil.png"), fullPage: true, animations: "disabled" });
  await review(page); await page.screenshot({ path: resolve("../../docs/capturas/codex-im21-propuesta-movil.png"), animations: "disabled" });
});
