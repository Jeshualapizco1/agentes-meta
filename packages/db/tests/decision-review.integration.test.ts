import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type pg from "pg";
import { applyMigrations } from "../src/migrations.js";
import { connectTestDatabase, migrations, resetTestDatabase, seedProfileTest } from "./database-fixture.js";
const id = "00000000-0000-4000-8000-000000000001", rule = "00000000-0000-4000-8000-000000000002";
describe("revisión atómica sin Meta", () => {
  let client: pg.Client, profileAt: string;
  beforeEach(async () => {
    client = await connectTestDatabase(); await resetTestDatabase(client); await applyMigrations(client, await migrations()); await seedProfileTest(client);
    await client.query(`update account_profiles set mode='semi',dry_run=true,whitelist_campaign_ids=array['101'],daily_spend_floor=10,daily_spend_ceiling=1000,max_budget_change_pct=20,max_cumulative_change_pct=35 where account_id='100';
      update entities set daily_budget=10000,snapshot_at=now() where id='101';
      insert into insights_daily(entity_id,account_id,level,date,spend,purchases,purchase_value,is_closed_day,fetched_at)
        select '101','100','campaign',(now() at time zone 'America/Mexico_City')::date-d,100,2,400,true,now() from generate_series(1,3) d;`);
    await client.query(`insert into rules(id,account_id,name,definition,condition,action,params) values($1,'100','Revisada','{}',$2,'subir_presupuesto','{"review_only":true}');`, [rule, JSON.stringify({ version: 1, level: "campaign", metric: "roas", operator: "gt", threshold: 3, days: 3, minPurchases: 3, minSpend: 100, changePct: 10, consecutive: false })]);
    await client.query(`insert into proposals(id,account_id,rule_id,entity_id,entity_level,campaign_id,action,before_value,after_value,evidence,expires_at) values($1,'100',$2,'101','campaign','101','subir_presupuesto','100','110','[{"ref":"RULE_VERSION","value":1}]',now()+interval '24 hours')`, [id, rule]);
    profileAt = (await client.query("select updated_at::text as at from account_profiles where account_id='100'")).rows[0].at;
  });
  afterEach(async () => { await client?.end(); });
  const review = (c: pg.Client, at: string, after: unknown = 110, decision = "simulada", reason = "", actor = "buyer@example.invalid", account = "100") => c.query("select review_proposal_simulation_v1($1,$2,$3,$4,$5::jsonb,$6,$7,1) as status", [actor, account, id, decision, JSON.stringify(after), reason, at]);
  const unchanged = async () => { expect((await client.query("select status from proposals where id=$1", [id])).rows[0].status).toBe("pendiente"); expect((await client.query("select count(*)::int as n from executions")).rows[0].n).toBe(0); };
  it("guarda decisión y una orden simulada, sin timestamps remotos ni ascenso automático", async () => {
    expect((await review(client, profileAt)).rows[0].status).toBe("simulada");
    expect((await client.query("select dry_run,sent_at,confirmed_at,response,order_payload from executions")).rows[0]).toMatchObject({ dry_run: true, sent_at: null, confirmed_at: null, response: { simulated: true, not_sent: true }, order_payload: { daily_budget_cents: 11000 } });
    expect((await client.query("select approved_streak from rules where id=$1", [rule])).rows[0].approved_streak).toBe(0);
  });
  it("un doble clic es idempotente incluso concurrente", async () => { const other = await connectTestDatabase(); try { await Promise.all([review(client, profileAt), review(other, profileAt)]); expect((await client.query("select count(*)::int as n from executions")).rows[0].n).toBe(1); } finally { await other.end(); } });
  it("rechaza con razón y sin orden", async () => { expect((await review(client, profileAt, 110, "rechazada", "Muestra poco representativa")).rows[0].status).toBe("rechazada"); expect((await client.query("select count(*)::int as n from executions")).rows[0].n).toBe(0); });
  it("corrige conservando propuesta original y razón", async () => { await review(client, profileAt, 115, "simulada", "Cambio revisado"); expect((await client.query("select corrected,proposed_value,after_value from proposals where id=$1", [id])).rows[0]).toEqual({ corrected: true, proposed_value: 110, after_value: 115 }); });
  it.each([null, "120", -1, 0, 100, 99, 110.123, 99999999999999999, 121])("no acepta presupuesto inválido %s", async after => { await expect(review(client, profileAt, after, "simulada", "Prueba")).rejects.toThrow(); await unchanged(); });
  it("no acepta corrección ni rechazo sin razón", async () => { await expect(review(client, profileAt, 115)).rejects.toThrow("REASON_REQUIRED"); await expect(review(client, profileAt, 110, "rechazada")).rejects.toThrow("REASON_REQUIRED"); await unchanged(); });
  it.each([
    ["modo real", "update account_profiles set dry_run=false where account_id='100'"],
    ["modo apagado", "update account_profiles set mode='off' where account_id='100'"],
    ["freno", "insert into emergency_brakes(account_id,active) values('100',true)"],
    ["versión de regla", "update rules set name='Editada' where id='00000000-0000-4000-8000-000000000002'"],
    ["entidad pausada", "update entities set effective_status='PAUSED' where id='101'"],
    ["presupuesto cambiado", "update entities set daily_budget=9999 where id='101'"],
    ["sin lista blanca", "update account_profiles set whitelist_campaign_ids='{}' where account_id='100'"],
    ["expirada", "update proposals set expires_at=now()-interval '1 second'"],
    ["congelada", "insert into entity_freezes(entity_id,account_id,until) values('101','100',now()+interval '1 day')"],
    ["día faltante", "delete from insights_daily where date=(select min(date) from insights_daily)"],
    ["día abierto", "update insights_daily set is_closed_day=false"],
    ["lectura antigua", "update insights_daily set fetched_at=now()-interval '31 hours'"],
    ["lectura futura mezclada", "update insights_daily set fetched_at=now()+interval '1 hour' where date=(select min(date) from insights_daily)"],
    ["métrica cambió", "update insights_daily set purchase_value=100"],
    ["muestra insuficiente", "update insights_daily set purchases=0"],
    ["techo proyectado", "update account_profiles set daily_spend_ceiling=100,max_committed_budget_factor=1 where account_id='100'"],
  ])("bloquea %s sin persistencia parcial", async (_label, sql) => { await client.query(sql); const at = (await client.query("select updated_at::text as at from account_profiles where account_id='100'")).rows[0].at; await expect(review(client, at)).rejects.toThrow(); await unchanged(); });
  it("no autoriza otra cuenta o un actor ausente", async () => { await expect(review(client, profileAt, 110, "simulada", "", "intruso@example.invalid")).rejects.toThrow("UNAUTHORIZED"); await expect(review(client, profileAt, 110, "simulada", "", "buyer@example.invalid", "200")).rejects.toThrow(); await unchanged(); });
  it("revierte la orden si falla el registro de la decisión", async () => { await client.query("create function fail_review() returns trigger language plpgsql as $$ begin raise exception 'test failure'; end $$; create trigger fail_review_trg before update on proposals for each row execute function fail_review()"); await expect(review(client, profileAt)).rejects.toThrow("test failure"); await unchanged(); });
  it("anon y authenticated no pueden invocar la función", async () => { for (const role of ["anon", "authenticated"]) expect((await client.query("select has_function_privilege($1,'review_proposal_simulation_v1(text,text,uuid,text,jsonb,text,timestamptz,integer)','execute') as allowed", [role])).rows[0].allowed).toBe(false); });
});
