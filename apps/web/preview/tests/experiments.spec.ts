import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" || new URL(route.request().url()).hostname === "localhost" ? route.continue() : route.abort());
  await page.goto("/prueba-guiada");
});
async function plan(page: import("@playwright/test").Page) {
  await page.getByLabel("¿Qué cambiarás y qué esperas mejorar?").fill("Probar un nuevo gancho para mejorar el ROAS.");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("ROAS mínimo para considerar éxito").fill("6");
  await page.getByLabel("Presupuesto de la prueba por día").fill("300");
}
test("guía, confirma y conserva el plan ante una respuesta del servidor", async ({ page }) => {
  await expect(page.getByLabel("Prospección · nuevos clientes")).toBeChecked();
  await expect(page.getByLabel("ROAS mínimo para considerar éxito")).toHaveCount(0);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Describe el cambio");
  await plan(page);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Iniciar seguimiento" })).toBeDisabled();
  await page.getByLabel("Confirmo el cambio").check();
  await page.getByRole("button", { name: "Iniciar seguimiento" }).click();
  await expect(page.getByRole("alert")).toContainText("Ensayo completado");
  await page.getByRole("button", { name: "Atrás" }).click();
  await expect(page.getByLabel("ROAS mínimo para considerar éxito")).toHaveValue("6");
});
test("bloquea exceso de presupuesto y permite conservar borrador", async ({ page }) => {
  await plan(page);
  await page.getByLabel("Presupuesto de la prueba por día").fill("501");
  await expect(page.getByText(/El importe supera/)).toBeVisible();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Confirmo el cambio").check();
  await expect(page.getByRole("button", { name: "Iniciar seguimiento" })).toBeDisabled();
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByRole("alert")).toContainText("Borrador de ensayo");
});
test("móvil: pasos, campos y confirmación sin desbordamiento", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await plan(page);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByText("Tu plan, listo para revisar.")).toBeVisible();
});
test("cambiar ROAS por CPA limpia el umbral anterior", async ({ page }) => {
  await plan(page); await page.getByLabel("Quiero mejorar").selectOption("cpa");
  await expect(page.getByLabel("Costo máximo por compra")).toHaveValue("");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("meta mayor");
});
