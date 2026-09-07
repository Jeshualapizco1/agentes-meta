import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { loadMigrations, planMigrations, type Migration } from "../src/migrations.js";
const files: Migration[] = [
  { name: "0001_one.sql", checksum: "a", sql: "select 1" },
  { name: "0002_two.sql", checksum: "b", sql: "select 2" },
];
describe("plan de migraciones", () => {
  it("descubre las migraciones en orden con checksums e incluye la revisión de decisiones", async () => {
    const found = await loadMigrations(fileURLToPath(new URL("../migrations/", import.meta.url)));
    expect(found.map(file => file.name)).toEqual([...found.map(file => file.name)].sort());
    expect(found.at(-1)?.name).toBe("0021_decision_review.sql");
    expect(new Set(found.map(file => file.name)).size).toBe(found.length);
    expect(found.every(file => /^[a-f0-9]{64}$/.test(file.checksum))).toBe(true);
  });
  it("planea una instalación vacía", () => expect(planMigrations(files, [], false)).toEqual({ applied: [], pending: files.map(f => f.name), blocked: null }));
  it("no adopta una base histórica automáticamente", () => expect(planMigrations(files, [], true).blocked).toContain("Esquema existente"));
  it("solo propone el sufijo pendiente", () => expect(planMigrations(files, files.slice(0, 1), true).pending).toEqual([files[1]!.name]));
  it.each([
    [{ name: files[0]!.name, checksum: "cambiado" }],
    [files[1]!], [files[0]!, { name: "0002_desconocida.sql", checksum: "b" }],
    [...files, { name: "0003_externa.sql", checksum: "c" }],
  ].map(history => ({ history })))("rechaza historial adulterado o divergente: $history", ({ history }) => {
    expect(planMigrations(files, history, true).blocked).toContain("no coincide");
  });
});
