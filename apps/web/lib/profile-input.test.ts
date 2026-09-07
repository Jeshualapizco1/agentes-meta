import { describe, expect, it } from "vitest";
import { parseProfileForm, ProfileInputError } from "./profile-input";
import { validProfileForm } from "../tests/profile-fixture";

describe("contrato de entrada de configuración", () => {
  it("conserva MXN, deriva ROAS y no elimina campañas seleccionadas", () => {
    const form = validProfileForm(); form.append("whitelist", "102");
    expect(parseProfileForm(form)).toMatchObject({ accountId: "100", expectedVersion: 1, profile: {
      daily_spend_ceiling: 1000, breakeven_roas: 2, target_cpa: null, whitelist_campaign_ids: ["101", "102"], dry_run: true,
    } });
  });
  it.each(["NaN", "Infinity", "-1", "0x20", "1e3", "1,000", "$1000", "10%", "999999999999999999999999"])("rechaza números ambiguos/ilegales: %s", value => {
    const form = validProfileForm(); form.set("daily_spend_ceiling", value);
    expect(() => parseProfileForm(form)).toThrow(ProfileInputError);
  });
  it.each([
    ["gross_margin_pct", "0"], ["gross_margin_pct", "101"], ["exploration_budget_pct", "101"],
    ["max_actions_per_day", ""], ["cooldown_hours", "1.5"], ["cooldown_hours", "2147483648"],
    ["cooldown_hours", "5.0000000000000000001"], ["cumulative_window_days", "0"], ["max_committed_budget_factor", "0"],
    ["target_roas", "0"], ["daily_spend_floor", "1001"], ["expected_version", ""], ["expected_version", "1.2"],
    ["expected_version", "2147483648"], ["mode", "auto"], ["hard_noes", "a".repeat(10001)],
    ["dry_run", "false"], ["whitelist", "100,account_id.eq.200"],
  ])("rechaza límites/tipos inválidos en %s (%#)", (key, value) => {
    const form = validProfileForm(); form.set(key, value);
    expect(() => parseProfileForm(form)).toThrow(ProfileInputError);
  });
  it("permite campos económicos vacíos pero no borra políticas por omisión", () => {
    const form = validProfileForm(); form.delete("gross_margin_pct");
    expect(parseProfileForm(form).profile.breakeven_roas).toBeNull();
    form.delete("max_budget_change_pct"); expect(() => parseProfileForm(form)).toThrow(ProfileInputError);
  });
  it("rechaza campos únicos duplicados", () => {
    const form = validProfileForm(); form.append("mode", "semi"); expect(() => parseProfileForm(form)).toThrow("duplicado");
  });
  it("permite ceros para detener acciones y listas explícitamente vacías", () => {
    const form = validProfileForm(); form.set("max_actions_per_day", "0"); form.delete("whitelist");
    expect(parseProfileForm(form).profile).toMatchObject({ max_actions_per_day: 0, whitelist_campaign_ids: [] });
  });
});
