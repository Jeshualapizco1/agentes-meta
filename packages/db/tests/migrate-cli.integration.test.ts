import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type pg from "pg";
import { connectTestDatabase, resetTestDatabase, migrations } from "./database-fixture.js";

const require = createRequire(import.meta.url);
const execute = promisify(execFile);
async function cli(args: string[], withDatabase = true) {
  const env: NodeJS.ProcessEnv = {};
  for (const key of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "TEMP", "TMP"]) if (process.env[key]) env[key] = process.env[key];
  if (withDatabase) env.MIGRATION_DATABASE_URL = process.env.TEST_DATABASE_URL;
  return execute(process.execPath, [require.resolve("tsx/cli"), fileURLToPath(new URL("../src/migrate.ts", import.meta.url)), ...args], {
    env, windowsHide: true, timeout: 15000,
  });
}
describe("CLI real de migraciones contra base efímera", () => {
  let client: pg.Client;
  beforeEach(async () => { client = await connectTestDatabase(); await resetTestDatabase(client); });
  afterEach(async () => { await client?.end(); });
  it("el modo por defecto inspecciona y no crea un ledger", async () => {
    const result = JSON.parse((await cli([])).stdout);
    expect(result.databaseChecked).toBe(true); expect(result.pending).toHaveLength((await migrations()).length);
    expect((await client.query("select to_regclass('agentes_meta_migrations.history') as ledger")).rows[0].ledger).toBeNull();
  });
  it("sin conexión explícita solo enumera los archivos locales", async () => {
    const result = JSON.parse((await cli([], false)).stdout);
    expect(result.databaseChecked).toBe(false); expect(result.files).toHaveLength((await migrations()).length);
  });
  it("exige un nombre de base que coincida antes de aplicar", async () => {
    await expect(cli(["--apply", "--expect-database", "equivocada"])).rejects.toMatchObject({ stderr: expect.stringContaining("no coincide") });
    expect((await client.query("select to_regclass('accounts') as t")).rows[0].t).toBeNull();
  });
  it("aplica, registra y después reporta cero pendientes", async () => {
    expect(JSON.parse((await cli(["--apply", "--expect-database", "agentes_meta_test"])).stdout).applied).toHaveLength((await migrations()).length);
    expect(JSON.parse((await cli(["--status"])).stdout).pending).toEqual([]);
  });
});
