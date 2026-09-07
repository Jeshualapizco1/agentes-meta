import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type pg from "pg";
import { applyMigrations } from "../src/migrations.js";
import { connectTestDatabase, migrations, resetTestDatabase, saveProfileSql, seedProfileTest, validProfile, waitForDatabaseLock } from "./database-fixture.js";

describe("perfil e historial atómicos en PostgreSQL", () => {
  let client: pg.Client;
  beforeEach(async () => {
    client = await connectTestDatabase(); await resetTestDatabase(client);
    await applyMigrations(client, await migrations()); await seedProfileTest(client);
  });
  afterEach(async () => { await client?.end(); });
  async function snapshot() {
    return (await client.query("select to_jsonb(p) as profile, (select count(*)::int from profile_changes where account_id='100') as changes from account_profiles p where account_id='100'")).rows[0];
  }
  it("service_role guarda perfil, versión, diff y snapshots en una sola llamada", async () => {
    await client.query("set role service_role");
    expect((await saveProfileSql(client)).rows[0].version).toBe(2);
    const { rows: [change] } = await client.query("select * from profile_changes where account_id='100'");
    expect(change).toMatchObject({ changed_by: "admin@example.invalid", from_version: 1, to_version: 2,
      before_profile: { version: 1, target_roas: null }, after_profile: { version: 2, target_roas: 3, dry_run: true },
      patch: { target_roas: 3, whitelist_campaign_ids: ["101", "102"] } });
    expect(change.patch).not.toHaveProperty("mode"); // No cambió: el diff no inventa modificaciones.
    await client.query("reset role");
  });
  it.each(["anon", "authenticated"])("%s no puede invocar la RPC aunque invente un actor admin", async role => {
    await client.query(`set role ${role}`);
    await expect(saveProfileSql(client)).rejects.toMatchObject({ code: "42501" });
    await client.query("reset role");
    expect((await snapshot()).changes).toBe(0);
  });
  it.each(["buyer@example.invalid", "revocado@example.invalid"])("el backend también rechaza un actor no admin: %s", async actor => {
    await expect(saveProfileSql(client, validProfile(), 1, "100", actor)).rejects.toMatchObject({ code: "42501" });
    expect((await snapshot()).changes).toBe(0);
  });
  it("no guarda una cuenta deshabilitada", async () => {
    await client.query("update accounts set enabled=false where id='100'");
    await expect(saveProfileSql(client)).rejects.toThrow("PROFILE_ACCOUNT_UNAVAILABLE");
    expect((await snapshot()).profile.version).toBe(1);
  });
  it("no guarda una cuenta inexistente", async () => {
    await expect(saveProfileSql(client, validProfile(), 0, "999")).rejects.toThrow("PROFILE_ACCOUNT_UNAVAILABLE");
  });
  it.each([["201"], ["103"], ["999"], ["101", "201"]].map(ids => ({ ids })))("rechaza campañas ajenas, nivel incorrecto o ausentes: $ids", async ({ ids }) => {
    const before = await snapshot();
    await expect(saveProfileSql(client, { ...validProfile(), whitelist_campaign_ids: ids })).rejects.toThrow("PROFILE_INVALID_WHITELIST");
    expect(await snapshot()).toEqual(before);
  });
  it("preserva una campaña pausada y normaliza duplicados", async () => {
    await saveProfileSql(client, { ...validProfile(), whitelist_campaign_ids: ["102", "101", "102"] });
    expect((await snapshot()).profile.whitelist_campaign_ids).toEqual(["101", "102"]);
  });
  it.each([
    { mode: "auto" }, { gross_margin_pct: 101 }, { gross_margin_pct: 0 }, { gross_margin_pct: "50" },
    { target_roas: -1 }, { daily_spend_ceiling: -1 }, { cooldown_hours: 1.5 }, { cooldown_hours: 2147483648 },
    { cumulative_window_days: 0 }, { max_actions_per_day: null }, { exploration_budget_pct: 101 },
    { max_committed_budget_factor: 0 }, { dry_run: "false" }, { whitelist_campaign_ids: [101] },
    { whitelist_campaign_ids: null }, { hard_noes: "a".repeat(10001) }, { version: 99 },
    { daily_spend_floor: 2000 }, { max_budget_change_pct: 9007199254740992 },
  ])("valida el contrato también al llamar SQL directamente (%#)", async patch => {
    const before = await snapshot();
    await expect(saveProfileSql(client, { ...validProfile(), ...patch })).rejects.toMatchObject({ code: "22023" });
    expect(await snapshot()).toEqual(before);
  });
  it("rechaza campos ausentes y valores raíz inválidos", async () => {
    const { dry_run: _omitted, ...incomplete } = validProfile();
    for (const input of [incomplete, null, [], "texto"]) await expect(saveProfileSql(client, input)).rejects.toMatchObject({ code: "22023" });
    expect((await snapshot()).changes).toBe(0);
  });
  it("si falla el historial se revierte también perfil y versión", async () => {
    const before = await snapshot();
    await client.query(`create function fail_test_audit() returns trigger language plpgsql as $$ begin raise exception 'fallo de historial inyectado'; end $$;
      create trigger fail_test_audit before insert on profile_changes for each row execute function fail_test_audit()`);
    await expect(saveProfileSql(client)).rejects.toThrow("fallo de historial");
    expect(await snapshot()).toEqual(before);
  });
  it("dos conexiones con la misma versión: una gana y la otra no sobrescribe", async () => {
    const other = await connectTestDatabase();
    try {
      const pid = (await other.query("select pg_backend_pid() as pid")).rows[0].pid;
      await client.query("begin");
      await saveProfileSql(client, { ...validProfile(), target_roas: 3 });
      const concurrent = saveProfileSql(other, { ...validProfile(), target_roas: 9 }).then(
        result => ({ result, error: null }), error => ({ result: null, error }));
      await waitForDatabaseLock(client, pid);
      await client.query("commit");
      expect((await concurrent).error?.message).toBe("PROFILE_VERSION_CONFLICT");
      expect((await snapshot()).profile).toMatchObject({ target_roas: 3, version: 2 });
      expect((await snapshot()).changes).toBe(1);
    } finally { await client.query("rollback"); await other.end(); }
  });
  it("la creación simultánea sin perfil tampoco pierde un guardado", async () => {
    await client.query("delete from account_profiles where account_id='100'");
    const other = await connectTestDatabase();
    try {
      const results = await Promise.allSettled([saveProfileSql(client, validProfile(), 0), saveProfileSql(other, validProfile(), 0)]);
      expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
      const failure = results.find(r => r.status === "rejected") as PromiseRejectedResult;
      expect(failure.reason.message).toBe("PROFILE_VERSION_CONFLICT");
      expect((await snapshot()).profile.version).toBe(1);
      expect((await snapshot()).changes).toBe(1);
    } finally { await other.end(); }
  });
  it("una escritura administrativa directa invalida la versión anterior", async () => {
    await client.query("update account_profiles set target_roas=6 where account_id='100'");
    await expect(saveProfileSql(client)).rejects.toThrow("PROFILE_VERSION_CONFLICT");
    expect((await snapshot()).profile.target_roas).toBe(6);
  });
  it("una degradación concurrente de rol se revalida antes del guardado", async () => {
    const other = await connectTestDatabase();
    try {
      const pid = (await other.query("select pg_backend_pid() as pid")).rows[0].pid;
      await client.query("begin; update app_users set role='buyer' where email='admin@example.invalid'");
      const saving = saveProfileSql(other).then(() => null, error => error);
      await waitForDatabaseLock(client, pid);
      await client.query("commit");
      expect((await saving)?.code).toBe("42501");
      expect((await snapshot()).changes).toBe(0);
    } finally { await client.query("rollback"); await other.end(); }
  });
});
