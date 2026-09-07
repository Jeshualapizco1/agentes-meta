import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const require = createRequire(import.meta.url);
const token = randomBytes(12).toString("hex");
const name = `agentes-meta-test-${token}`;
const password = randomBytes(24).toString("hex");
const docker = (args: string[]) => execFileSync("docker", args, {
  encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"], timeout: 120_000,
}).trim();
let created = false;
try {
  // No monta carpetas ni volúmenes del usuario. Solo publica en loopback.
  console.log("Creando PostgreSQL 17 temporal para pruebas SQL (sin .env ni servicios de negocio)…");
  docker(["run", "--detach", "--rm", "--name", name, "--label", `agentes-meta-test=${token}`,
    "--publish", "127.0.0.1::5432", "--tmpfs", "/var/lib/postgresql/data", "--memory", "512m",
    "--env", `POSTGRES_PASSWORD=${password}`, "--env", "POSTGRES_DB=agentes_meta_test", "postgres:17"]);
  created = true;
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { docker(["exec", name, "pg_isready", "-U", "postgres", "-d", "agentes_meta_test"]); ready = true; break; }
    catch { await delay(500); }
  }
  if (!ready) throw new Error("PostgreSQL temporal no inició a tiempo.");
  const port = docker(["port", name, "5432/tcp"]);
  if (!/^127\.0\.0\.1:\d+$/.test(port)) throw new Error("El contenedor no está limitado a loopback.");
  const env: NodeJS.ProcessEnv = {};
  // No heredar secretos del proyecto al proceso de tests.
  for (const key of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "TEMP", "TMP", "COMSPEC", "CI"]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  env.TEST_DATABASE_URL = `postgresql://postgres:${password}@${port}/agentes_meta_test`;
  env.AGENTES_META_EPHEMERAL_TEST = token;
  const child = spawn(process.execPath, [require.resolve("vitest/vitest.mjs"), "run", "--config", "vitest.integration.config.ts"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)), env, stdio: "inherit", windowsHide: true,
  });
  process.exitCode = await new Promise<number>((resolve, reject) => {
    child.once("error", reject); child.once("exit", code => resolve(code ?? 1));
  });
} catch {
  console.error("Falló la prueba SQL aislada. Revisa Docker y los resultados de tests; no se contactó una base configurada en .env.");
  process.exitCode = 1;
} finally {
  if (created) {
    try {
      // Solo se elimina el contenedor creado por esta invocación, tras verificar propiedad.
      if (docker(["inspect", "--format", '{{index .Config.Labels "agentes-meta-test"}}', name]) !== token) throw new Error("Etiqueta inesperada");
      docker(["rm", "--force", name]);
      console.log("Eliminada la base temporal de pruebas y su contenedor; no se conservan datos de ensayo.");
    } catch { console.error(`No se pudo limpiar el contenedor temporal ${name}. Revisarlo manualmente.`); process.exitCode = 1; }
  }
}
