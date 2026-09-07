import { fileURLToPath } from "node:url";
import pg from "pg";
import { applyMigrations, inspectMigrations, loadMigrations } from "./migrations.js";

async function main() {
  const args = process.argv.slice(2).filter(arg => arg !== "--");
  const mode = args[0] ?? "--plan";
  if (!["--plan", "--status", "--apply"].includes(mode) ||
      (mode === "--apply" ? args.length !== 3 || args[1] !== "--expect-database" : args.length > 1)) {
    throw new Error("Uso: db:migrate [--plan | --status | --apply --expect-database NOMBRE]");
  }
  const files = await loadMigrations(fileURLToPath(new URL("../migrations/", import.meta.url)));
  // No se carga .env ni se reutiliza SUPABASE_URL / DATABASE_URL por accidente.
  const connectionString = process.env.MIGRATION_DATABASE_URL;
  if (!connectionString) {
    if (mode !== "--plan") throw new Error("Falta MIGRATION_DATABASE_URL explícita.");
    console.log(JSON.stringify({ databaseChecked: false, files: files.map(({ name, checksum }) => ({ name, checksum })) }, null, 2));
    return;
  }
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000, application_name: "agentes-meta-migrations" });
  try {
    await client.connect();
    if (mode === "--apply") {
      const { rows: [row] } = await client.query<{ name: string }>("select current_database() as name");
      if (row?.name !== args[2]) throw new Error("El nombre de la base no coincide con --expect-database.");
      console.log(JSON.stringify({ applied: await applyMigrations(client, files) }, null, 2));
    } else {
      const plan = await inspectMigrations(client, files);
      console.log(JSON.stringify({ databaseChecked: true, ...plan }, null, 2));
      if (plan.blocked) process.exitCode = 1;
    }
  } finally { await client.end(); }
}

main().catch(error => {
  // Solo errores controlados; un error SQL/conexión crudo puede revelar infraestructura o valores.
  const message = error instanceof Error && !('code' in error) ? error.message : "No se pudo completar la operación de migraciones. Revisar conexión/permisos sin publicar credenciales.";
  console.error(message); process.exitCode = 1;
});
