import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

export type Db = SupabaseClient;

export function dbFromEnv(env: Record<string, string | undefined> = process.env): Db {
  const url = env.SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Lectura completa paginada. PostgREST (Supabase) devuelve como máximo 1000 filas por petición aunque se pida `.limit(50000)`;
 * toda lectura que pueda pasar de unas cientos de filas va por aquí. `build` arma la consulta (sin range); se recorre por páginas.
 */
export async function fetchAll<T>(build: () => { range: (a: number, b: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> }, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

/** Upsert por lotes; lanza en el primer error. */
export async function upsertChunks(db: Db, table: string, rows: Record<string, unknown>[], onConflict: string, opts: { ignoreDuplicates?: boolean; chunk?: number } = {}): Promise<number> {
  const size = opts.chunk ?? 500; let n = 0;
  for (let i = 0; i < rows.length; i += size) {
    const slice = rows.slice(i, i + size);
    const { error } = await db.from(table).upsert(slice, { onConflict, ignoreDuplicates: opts.ignoreDuplicates ?? false });
    if (error) throw new Error(`${table} upsert: ${error.message}`);
    n += slice.length;
  }
  return n;
}

export async function insertReturning<T extends { id: string }>(db: Db, table: string, rows: Record<string, unknown>[], chunk = 500): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < rows.length; i += chunk) {
    const { data, error } = await db.from(table).insert(rows.slice(i, i + chunk)).select("id");
    if (error) throw new Error(`${table} insert: ${error.message}`);
    out.push(...((data ?? []) as T[]));
  }
  return out;
}

/** Lee .env del directorio raíz del repo (sin dependencia externa). */
export function loadDotenv(path = ".env"): void {
  // busca .env en el cwd y hasta 3 niveles arriba (monorepo)
  const candidates = [path, `../${path}`, `../../${path}`, `../../../${path}`];
  const found = candidates.find(c => { try { readFileSync(c); return true; } catch { return false; } });
  if (!found) return;
  try {
    for (const line of readFileSync(found, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/); if (!m) continue;
      if (process.env[m[1]!] === undefined) process.env[m[1]!] = m[2]!;
    }
  } catch { /* sin .env */ }
}
