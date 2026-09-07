import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Client } from "pg";

export interface Migration { name: string; checksum: string; sql: string }
export interface AppliedMigration { name: string; checksum: string }
export interface MigrationPlan { applied: string[]; pending: string[]; blocked: string | null }

export async function loadMigrations(directory: string): Promise<Migration[]> {
  const names = (await readdir(directory)).filter(name => name.endsWith(".sql")).sort();
  if (!names.length) throw new Error("No hay migraciones SQL.");
  return Promise.all(names.map(async (name, i) => {
    if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(name) || Number(name.slice(0, 4)) !== i + 1) {
      throw new Error(`Secuencia de migraciones inválida: ${name}`);
    }
    // Git puede convertir LF a CRLF en Windows; ambos deben identificar el mismo SQL.
    const sql = (await readFile(join(directory, name), "utf8")).replace(/\r\n/g, "\n");
    return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
  }));
}

export function planMigrations(files: Migration[], history: AppliedMigration[], hasExistingSchema: boolean): MigrationPlan {
  const applied = history.map(row => row.name);
  const result = { applied, pending: files.slice(history.length).map(file => file.name), blocked: null as string | null };
  if (!history.length && hasExistingSchema) {
    result.blocked = "Esquema existente sin historial verificable. No se reproducen ni se adoptan migraciones históricas automáticamente; requiere diagnóstico y adopción revisada.";
  } else if (history.some((row, index) => files[index]?.name !== row.name || files[index]?.checksum !== row.checksum)) {
    result.blocked = "El historial no coincide con los archivos (orden, nombre o checksum). No se aplicó ningún cambio.";
  }
  return result;
}

async function inspect(client: Client, files: Migration[]): Promise<MigrationPlan> {
  const { rows: [state] } = await client.query<{ ledger: string | null; existing: boolean }>(`
    select to_regclass('agentes_meta_migrations.history')::text as ledger,
      exists(select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r','p','v','m','S')) as existing`);
  const history = state?.ledger
    ? (await client.query<AppliedMigration>("select name, checksum from agentes_meta_migrations.history order by name")).rows
    : [];
  return planMigrations(files, history, state?.existing ?? true);
}

/** Inspección sin DDL ni adopción implícita, incluso en una base vacía. */
export async function inspectMigrations(client: Client, files: Migration[]): Promise<MigrationPlan> {
  await client.query("begin read only");
  try {
    const plan = await inspect(client, files);
    await client.query("commit");
    return plan;
  } catch (error) {
    await client.query("rollback"); throw error;
  }
}

/** Una conexión conserva el lock; cada SQL y su recibo se confirman juntos. */
export async function applyMigrations(client: Client, files: Migration[]): Promise<string[]> {
  const { rows: [lock] } = await client.query<{ locked: boolean }>("select pg_try_advisory_lock(170331, 6020) as locked");
  if (!lock?.locked) throw new Error("Otro proceso está ejecutando migraciones.");
  try {
    const plan = await inspectMigrations(client, files);
    if (plan.blocked) throw new Error(plan.blocked);
    const applied: string[] = [];
    for (const file of files.filter(file => plan.pending.includes(file.name))) {
      await client.query("begin");
      try {
        await client.query("set local lock_timeout = '5s'; set local statement_timeout = '60s'");
        await client.query(`create schema if not exists agentes_meta_migrations;
          revoke all on schema agentes_meta_migrations from public;
          create table if not exists agentes_meta_migrations.history (
            name text primary key, checksum text not null, applied_at timestamptz not null default clock_timestamp()
          );
          revoke all on agentes_meta_migrations.history from public`);
        await client.query(file.sql);
        await client.query("insert into agentes_meta_migrations.history(name, checksum) values ($1, $2)", [file.name, file.checksum]);
        await client.query("commit");
        applied.push(file.name);
      } catch (error) {
        await client.query("rollback");
        // El detalle del proveedor puede contener datos de la base; no se imprime desde la CLI.
        throw new Error(`Falló ${file.name}; su transacción se revirtió. Las migraciones anteriores conservan su recibo.`, { cause: error });
      }
    }
    return applied;
  } finally {
    await client.query("select pg_advisory_unlock(170331, 6020)");
  }
}
