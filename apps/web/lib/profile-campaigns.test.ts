import { describe, expect, it } from "vitest";
import { profileCampaignChoices } from "./profile-campaigns";
const campaigns = [
  { id: "101", name: "Activa", effective_status: "ACTIVE", daily_budget: null },
  { id: "102", name: "Pausada elegida", effective_status: "PAUSED", daily_budget: null },
  { id: "103", name: "Archivada sin elegir", effective_status: "ARCHIVED", daily_budget: null },
];
describe("campañas en Configuración", () => {
  it("conserva las seleccionadas aunque ya no estén activas", () => {
    const result = profileCampaignChoices(campaigns, ["102"]);
    expect(result.visible.map(c => c.id)).toEqual(["101", "102"]); expect(result.activeCount).toBe(1);
  });
  it("no oculta una selección que desapareció del catálogo", () => {
    expect(profileCampaignChoices(campaigns, ["999"]).missing).toEqual(["999"]);
  });
  it("una lista vacía no selecciona todas por defecto", () => {
    expect(profileCampaignChoices(campaigns, []).missing).toEqual([]);
    expect(profileCampaignChoices(campaigns, []).visible.map(c => c.id)).toEqual(["101"]);
  });
});
