export function validProfileForm() {
  const form = new FormData();
  const fields = {
    account_id: "100", expected_version: "1", mode: "off", dry_run: "on", gross_margin_pct: "50",
    daily_spend_ceiling: "1000", max_budget_change_pct: "20", cooldown_hours: "72", max_actions_per_day: "5",
    max_cumulative_change_pct: "35", cumulative_window_days: "7", max_committed_budget_factor: "1.3", exploration_budget_pct: "10",
  };
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  form.append("whitelist", "101"); form.append("whitelist", "102");
  return form;
}
