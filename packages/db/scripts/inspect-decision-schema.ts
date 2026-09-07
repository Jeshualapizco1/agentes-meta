/** Solo lectura del catálogo. Salida deliberadamente sin URLs, tokens ni mensajes del proveedor. */
import pg from "pg";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000, query_timeout: 10000 });
try {
  await client.connect();
  const { rows } = await client.query(`select current_database() as database,
    to_regprocedure('public.review_proposal_simulation_v1(text,text,uuid,text,jsonb,text,timestamptz,integer)') is not null as decision_function,
    to_regprocedure('public.save_account_profile_v1(text,integer,text,jsonb)') is not null as profile_function,
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='account_profiles' and column_name='version') as profile_version,
    to_regclass('agentes_meta_migrations.history') is not null as migration_ledger`);
  console.log(JSON.stringify(rows));
} catch (error) { console.error(JSON.stringify({ connected: false, code: (error as { code?: string }).code ?? "CONNECTION_FAILED" })); process.exitCode = 1; }
finally { await client.end().catch(() => {}); }
