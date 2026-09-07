import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type pg from "pg";
import { applyMigrations, inspectMigrations } from "../src/migrations.js";
import { connectTestDatabase, migrations, resetTestDatabase } from "./database-fixture.js";

describe("migraciones en PostgreSQL real", () => {
  let client: pg.Client;
  beforeEach(async () => { client = await connectTestDatabase(); await resetTestDatabase(client); });
  afterEach(async () => { await client?.end(); });
  it("planifica sin crear tablas ni historial", async () => {
    expect((await inspectMigrations(client, await migrations())).pending).toHaveLength((await migrations()).length);
    expect((await client.query("select to_regclass('agentes_meta_migrations.history') as ledger")).rows[0].ledger).toBeNull();
  });
  it("instala todas las migraciones y repetir no cambia nada", async () => {
    const files = await migrations();
    expect(await applyMigrations(client, files)).toHaveLength(files.length);
    expect(await applyMigrations(client, files)).toEqual([]);
    expect((await inspectMigrations(client, files)).blocked).toBeNull();
  });
  it("actualiza 0019 a 0020 sin alterar política ni borrar historial", async () => {
    const files = await migrations(); await applyMigrations(client, files.slice(0, 19));
    await client.query("update account_profiles set dry_run=false, mode='semi', whitelist_campaign_ids=array['123']; insert into profile_changes(account_id,changed_by,patch) select account_id,'historico@example.invalid','{}' from account_profiles");
    const before = (await client.query("select to_jsonb(p) as profile from account_profiles p order by account_id")).rows.map(r => r.profile);
    expect(await applyMigrations(client, files.slice(0, 20))).toEqual([files[19]!.name]);
    const after = (await client.query("select to_jsonb(p) - 'version' as profile from account_profiles p order by account_id")).rows.map(r => r.profile);
    expect(before).toEqual(after);
    expect((await client.query("select count(*)::int as n from profile_changes where to_version is null")).rows[0].n).toBe(3);
  });
  it("bloquea una base existente sin recibos, sin ejecutar SQL histórico", async () => {
    await client.query("create table evidencia_heredada(id int)");
    await expect(applyMigrations(client, await migrations())).rejects.toThrow("Esquema existente");
    expect((await client.query("select to_regclass('evidencia_heredada') as t")).rows[0].t).toBeTruthy();
  });
  it("revierte DDL y recibo juntos al fallar una migración", async () => {
    const files = [{ name: "0001_fail.sql", checksum: "test", sql: "create table no_debe_quedar(id int); select 1/0" }];
    await expect(applyMigrations(client, files)).rejects.toThrow("se revirtió");
    expect((await client.query("select to_regclass('no_debe_quedar') as t, to_regclass('agentes_meta_migrations.history') as h")).rows[0]).toEqual({ t: null, h: null });
  });
  it("conserva migraciones anteriores confirmadas y permite reintentar la fallida", async () => {
    const good = { name: "0001_ok.sql", checksum: "ok", sql: "create table evidencia(id int)" };
    const bad = { name: "0002_fail.sql", checksum: "bad", sql: "select 1/0" };
    await expect(applyMigrations(client, [good, bad])).rejects.toThrow("0002_fail");
    expect((await inspectMigrations(client, [good, bad])).applied).toEqual([good.name]);
    expect(await applyMigrations(client, [good, { ...bad, sql: "select 1" }])).toEqual([bad.name]);
  });
  it("rechaza archivos históricos editados", async () => {
    const files = await migrations(); await applyMigrations(client, files);
    await expect(applyMigrations(client, [{ ...files[0]!, checksum: "distinto" }, ...files.slice(1)])).rejects.toThrow("no coincide");
  });
  it("excluye a un segundo migrador con otra conexión", async () => {
    const other = await connectTestDatabase();
    try {
      await client.query("select pg_advisory_lock(170331, 6020)");
      await expect(applyMigrations(other, await migrations())).rejects.toThrow("Otro proceso");
    } finally { await client.query("select pg_advisory_unlock(170331, 6020)"); await other.end(); }
  });
});
