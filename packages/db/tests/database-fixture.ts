import pg from "pg";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { loadMigrations } from "../src/migrations.js";

export async function connectTestDatabase() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "https://missing.invalid");
  if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" || url.pathname !== "/agentes_meta_test" ||
      !/^[a-f0-9]{24}$/.test(process.env.AGENTES_META_EPHEMERAL_TEST ?? "")) {
    throw new Error("Las pruebas SQL solo aceptan la base temporal del script test:integration.");
  }
  const client = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
  await client.connect(); return client;
}

export async function resetTestDatabase(client: pg.Client) {
  // Destructivo SOLO dentro de la base efímera recién creada por el arnés.
  if ((await client.query("select current_database() as name")).rows[0].name !== "agentes_meta_test") throw new Error("Base de ensayo inesperada");
  await client.query(`drop schema public cascade; create schema public;
    drop schema if exists agentes_meta_migrations cascade;
    do $$ begin
      if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
      if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
    end $$;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to service_role;
    alter default privileges in schema public grant all on sequences to service_role`);
}

export const migrations = () => loadMigrations(fileURLToPath(new URL("../migrations/", import.meta.url)));
export const validProfile = () => ({
  gross_margin_pct: 50, breakeven_roas: 2, target_roas: 3, target_cpa: null,
  daily_spend_ceiling: 1000, daily_spend_floor: 100, max_budget_change_pct: 20,
  cooldown_hours: 72, max_actions_per_day: 5, max_cumulative_change_pct: 35,
  cumulative_window_days: 7, max_committed_budget_factor: 1.3, exploration_budget_pct: 10,
  mode: "off", dry_run: true, whitelist_campaign_ids: ["101", "102"], hard_noes: null,
});
export async function seedProfileTest(client: pg.Client) {
  await client.query(`insert into accounts(id,name,timezone_name) values ('100','Cuenta de prueba','America/Mexico_City'),('200','Otra cuenta de prueba','America/Mexico_City');
    insert into account_profiles(account_id) values ('100');
    insert into app_users(email,role) values ('admin@example.invalid','admin'),('buyer@example.invalid','buyer');
    insert into entities(id,account_id,level,name,effective_status,raw) values
      ('101','100','campaign','Activa','ACTIVE','{}'),('102','100','campaign','Pausada','PAUSED','{}'),
      ('103','100','adset','Conjunto','ACTIVE','{}'),('201','200','campaign','Otra cuenta','ACTIVE','{}')`);
}
export async function saveProfileSql(client: pg.Client, profile: unknown = validProfile(), version = 1, account = "100", actor = "admin@example.invalid") {
  return client.query("select public.save_account_profile_v1($1, $2, $3, $4::jsonb) as version", [account, version, actor, JSON.stringify(profile)]);
}

/** Barrera observable: asegura que la segunda conexión realmente esperó un lock antes de liberar la primera. */
export async function waitForDatabaseLock(observer: pg.Client, pid: number) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const { rows: [row] } = await observer.query("select wait_event_type from pg_stat_activity where pid=$1", [pid]);
    if (row?.wait_event_type === "Lock") return;
    await delay(10);
  }
  throw new Error("La conexión concurrente no llegó al bloqueo esperado.");
}
