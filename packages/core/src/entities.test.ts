import { describe, it, expect } from "vitest";
import { normalize, groupEvents, groupSessions, entityMapFromRows, unresolvedObjectIds } from "./index.js";
import type { RawActivity } from "./types.js";

const ACC = "1703313583465547";
// Evento de anuncio: Meta manda extra_data.campaign_id = ad set (nombre heredado)
const adEvent = (objectId: string, adsetId: string): RawActivity => ({ event_time: "2026-08-20T10:00:00+0000", event_type: "update_ad_run_status", actor_id: "7", actor_name: "Eduardo", object_id: objectId, object_name: "Anuncio X", object_type: "ADGROUP", extra_data: JSON.stringify({ campaign_id: adsetId, old_value: "1", new_value: "8" }) });

describe("resolución de campaña por jerarquía", () => {
  it("sesión sobre un anuncio cuyo padre solo existe en snapshots: resuelve la campaña por el ad set", () => {
    // el anuncio ya no existe en Meta ni en entities; el ad set sí quedó guardado con su campaña
    const ents = entityMapFromRows([
      { id: "C1", name: "CBO | SCALE", level: "campaign" },
      { id: "AS1", name: "AS uno", level: "adset", campaign_id: "C1", parent_id: "C1" },
    ]);
    const groups = groupEvents([normalize(ACC, adEvent("AD-borrado", "AS1"))]);
    const [s] = groupSessions(groups, undefined, ents);
    expect(s!.campaignIds).toEqual(["C1"]);
    expect(unresolvedObjectIds(groups, ents)).toEqual([]);
  });
  it("anuncio guardado sin campaign_id pero con parent_id: sube por la jerarquía anuncio → ad set → campaña", () => {
    const ents = entityMapFromRows([
      { id: "C1", name: "CBO | SCALE", level: "campaign" },
      { id: "AS1", name: "AS uno", level: "adset", campaign_id: null, parent_id: "C1" },
      { id: "AD1", name: "Anuncio", level: "ad", campaign_id: null, parent_id: "AS1" },
    ]);
    expect(ents.get("AD1")?.campaignId).toBe("C1"); expect(ents.get("AS1")?.campaignId).toBe("C1");
  });
  it("si ni el anuncio ni su ad set existen, el objeto queda como no resuelto para consultarlo a Meta", () => {
    const ents = entityMapFromRows([{ id: "C1", name: "CBO | SCALE", level: "campaign" }]);
    const groups = groupEvents([normalize(ACC, adEvent("AD-x", "AS-x"))]);
    expect(groupSessions(groups, undefined, ents)[0]!.campaignIds).toEqual([]);
    expect(unresolvedObjectIds(groups, ents)).toEqual(["AD-x"]);
  });
});
