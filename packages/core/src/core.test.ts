import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { normalize, groupEvents, groupSessions, parseName, shiftHourCell, offsetHours } from "./index.js";
import type { RawActivity } from "./types.js";

const ACC = "1703313583465547";
const raw = (o: Partial<RawActivity>): RawActivity => ({ event_time: "2026-08-01T10:00:00+0000", event_type: "x", actor_id: "1", actor_name: "Eduardo", object_id: "9", object_name: "TC / Fase 1 / ABO / Abierta H / Test / 01/08/26", object_type: "CAMPAIGN", ...o });

describe("normalize", () => {
  it("maps legacy object types", () => {
    expect(normalize(ACC, raw({ object_type: "CAMPAIGN_GROUP" })).level).toBe("campaign");
    expect(normalize(ACC, raw({ object_type: "CAMPAIGN" })).level).toBe("adset");
    expect(normalize(ACC, raw({ object_type: "ADGROUP" })).level).toBe("ad");
  });
  it("marks pending-process transitions as system noise", () => {
    const e = normalize(ACC, raw({ event_type: "update_ad_set_run_status", extra_data: JSON.stringify({ old_value: "Activo", new_value: "Procesamiento pendiente", run_status: { old_value: 1, new_value: 17 }, type: "run_status" }) }));
    expect(e.significance).toBe("system");
  });
  it("parses budget cents and period", () => {
    const e = normalize(ACC, raw({ event_type: "update_campaign_budget", object_type: "CAMPAIGN_GROUP", extra_data: JSON.stringify({ old_value: { type: "payment_amount", currency: "MXN", old_value: 60000 }, new_value: { type: "payment_amount", currency: "MXN", new_value: 50000, additional_value: "por día" }, type: "payment_amount" }) }));
    expect(e.budgetOldCents).toBe(60000); expect(e.budgetNewCents).toBe(50000); expect(e.budgetPeriod).toBe("daily"); expect(e.kind).toBe("budget");
  });
  it("actor Meta is kind meta", () => { expect(normalize(ACC, raw({ actor_id: "0", actor_name: "Meta" })).actorKind).toBe("meta"); });
});

describe("groupEvents", () => {
  it("collapses pending↔active flip-flop into one group with net summary", () => {
    const mk = (t: string, o: number, n: number) => normalize(ACC, raw({ event_time: t, event_type: "update_ad_set_run_status", extra_data: JSON.stringify({ run_status: { old_value: o, new_value: n }, type: "run_status" }) }));
    const g = groupEvents([mk("2026-08-01T10:00:00+0000", 1, 17), mk("2026-08-01T10:00:03+0000", 17, 1)]);
    expect(g).toHaveLength(1); expect(g[0]!.events).toHaveLength(2); expect(g[0]!.summary).toMatch(/pasó por revisión/);
  });
  it("budget change summary with percent and learning reset", () => {
    const e = normalize(ACC, raw({ event_type: "update_campaign_budget", object_type: "CAMPAIGN_GROUP", extra_data: JSON.stringify({ old_value: { old_value: 25000 }, new_value: { new_value: 50000, additional_value: "por día" } }) }));
    const g = groupEvents([e])[0]!;
    expect(g.summary).toContain("$250 → $500 (+100%)"); expect(g.resetsLearning).toBe(true); expect(g.significance).toBe("major");
  });
  it("splits sessions separated by more than the gap", () => {
    const a = normalize(ACC, raw({ event_time: "2026-08-01T10:00:00+0000", event_type: "update_ad_set_name" }));
    const b = normalize(ACC, raw({ event_time: "2026-08-01T10:10:00+0000", event_type: "update_ad_set_name" }));
    expect(groupEvents([a, b])).toHaveLength(2);
  });
});

describe("naming", () => {
  it("parses the Aromante ad set convention", () => {
    const p = parseName("TC / Fase 1 / ABO / Abierta H  / Perfumes precio justo / 25/07/26");
    expect(p).toMatchObject({ prefix: "TC", fase: 1, budgetType: "ABO", audience: "Abierta H", date: "2026-07-25", concept: "Perfumes precio justo", isCopy: false });
  });
  it("parses tags and copies", () => {
    const p = parseName("[PD26] TC / PAU / H2; ¿Qué perfume usabas? / Home - Copia");
    expect(p.tags).toEqual(["PD26"]); expect(p.isCopy).toBe(true); expect(p.prefix).toBe("TC"); expect(p.concept).toBe("Home");
  });
  it("parses CBO campaign names", () => { expect(parseName("CBO | SCALE")).toMatchObject({ budgetType: "CBO", concept: "SCALE" }); });
});

describe("time", () => {
  it("Mazatlán is UTC-7 and CDMX UTC-6", () => {
    const d = new Date("2026-09-03T12:00:00Z");
    expect(offsetHours(d, "America/Mazatlan")).toBe(-7); expect(offsetHours(d, "America/Mexico_City")).toBe(-6);
  });
  it("shifts an hourly cell from Mazatlán to CDMX (+1h, wraps day)", () => {
    expect(shiftHourCell("2026-09-03", 10, "America/Mazatlan")).toEqual({ date: "2026-09-03", hour: 11 });
    expect(shiftHourCell("2026-09-03", 23, "America/Mazatlan")).toEqual({ date: "2026-09-04", hour: 0 });
  });
});

describe("real data (skipped if data/raw is absent)", () => {
  const f = "../../data/raw/activities_1703313583465547.ndjson";
  it.skipIf(!existsSync(f))("groups 3,595 real events into far fewer readable groups", () => {
    const rows = readFileSync(f, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l) as RawActivity);
    const groups = groupEvents(rows.map(r => normalize(ACC, r)));
    const sessions = groupSessions(groups);
    expect(groups.every(g => g.summary.length > 0)).toBe(true);
    expect(sessions.length).toBeLessThan(rows.length / 5);
    expect(sessions.every(s => s.summary.length > 0)).toBe(true);
  });
});
