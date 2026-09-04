import { describe, it, expect } from "vitest";
import { normalize, groupEvents, groupSessions, sessionId, groupId, relinkByEvents, relinkByWindow, uuidV5 } from "./index.js";
import type { RawActivity } from "./types.js";

const ACC = "1703313583465547";
const raw = (o: Partial<RawActivity>): RawActivity => ({ event_time: "2026-08-01T10:00:00+0000", event_type: "update_campaign_budget", actor_id: "7", actor_name: "Eduardo", object_id: "9", object_name: "TC / Fase 1 / ABO / Abierta H / Test / 01/08/26", object_type: "CAMPAIGN_GROUP", extra_data: JSON.stringify({ old_value: "80000", new_value: "120000" }), ...o });
const build = (events: RawActivity[]) => {
  const norm = events.map(e => normalize(ACC, e));
  const groups = groupEvents(norm);
  const sessions = groupSessions(groups);
  const sessMembers = new Map(sessions.map(s => [sessionId(s), s.groups.flatMap(g => g.events.map(e => e.fingerprint))]));
  const groupMembers = new Map(groups.map(g => [groupId(g), g.events.map(e => e.fingerprint)]));
  return { sessions, groups, sessMembers, groupMembers };
};

describe("ids deterministas", () => {
  it("uuidV5 es estable y con formato v5", () => {
    expect(uuidV5("a")).toBe(uuidV5("a")); expect(uuidV5("a")).not.toBe(uuidV5("b"));
    expect(uuidV5("a")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it("regrupar los mismos eventos da los mismos IDs de sesión y grupo", () => {
    const evs = [raw({ event_time: "2026-08-01T10:00:00+0000" }), raw({ event_time: "2026-08-01T10:01:00+0000", object_id: "10" })];
    const a = build(evs), b = build([...evs].reverse());
    expect([...a.sessMembers.keys()]).toEqual([...b.sessMembers.keys()]);
    expect([...a.groupMembers.keys()]).toEqual([...b.groupMembers.keys()]);
  });
  it("sesión anotada + evento tardío anterior: la anotación se re-enlaza a la sesión nueva que contiene los mismos eventos", () => {
    const evs = [raw({ event_time: "2026-08-01T10:00:00+0000" }), raw({ event_time: "2026-08-01T10:01:00+0000", object_id: "10" })];
    const before = build(evs);
    expect(before.sessions).toHaveLength(1);
    const annotatedSession = sessionId(before.sessions[0]!);
    const annotatedGroup = groupId(before.groups[0]!);
    // Meta entrega tarde un evento del mismo actor 2 min antes: la sesión ahora empieza antes → su ID cambia
    const late = raw({ event_time: "2026-08-01T09:58:30+0000", object_id: "11" });
    const after = build([...evs, late]);
    expect(after.sessions).toHaveLength(1);
    const newSession = sessionId(after.sessions[0]!);
    expect(newSession).not.toBe(annotatedSession);
    const mapS = relinkByEvents(before.sessMembers, after.sessMembers);
    expect(mapS.get(annotatedSession)).toBe(newSession);
    // el grupo anotado no cambió de inicio: conserva su ID y no aparece en el mapa
    expect(after.groupMembers.has(annotatedGroup)).toBe(true);
    expect(relinkByEvents(before.groupMembers, after.groupMembers).has(annotatedGroup)).toBe(false);
  });
  it("si ningún evento del viejo sobrevive, no se inventa destino", () => {
    expect(relinkByEvents(new Map([["x", ["fp1"]]]), new Map([["y", ["fp2"]]])).size).toBe(0);
  });
});

describe("relinkByWindow (respaldo sin huellas)", () => {
  it("elige la sesión nueva del mismo actor que se traslapa; ignora otros actores y ventanas lejanas", () => {
    const d = (s: string) => new Date(s);
    const olds = [{ id: "old", actorId: "7", start: d("2026-08-01T10:00:00Z"), end: d("2026-08-01T10:01:00Z") }];
    const news = [
      { id: "otro-actor", actorId: "8", start: d("2026-08-01T10:00:00Z"), end: d("2026-08-01T10:01:00Z") },
      { id: "lejana", actorId: "7", start: d("2026-08-01T12:00:00Z"), end: d("2026-08-01T12:01:00Z") },
      { id: "nueva", actorId: "7", start: d("2026-08-01T09:58:30Z"), end: d("2026-08-01T10:01:00Z") },
    ];
    expect(relinkByWindow(olds, news).get("old")).toBe("nueva");
  });
});
