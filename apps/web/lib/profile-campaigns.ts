export interface ProfileCampaign { id: string; name: string; effective_status: string | null; daily_budget: number | string | null }
export function profileCampaignChoices(campaigns: ProfileCampaign[], selected: string[]) {
  const whitelist = new Set(selected);
  const known = new Set(campaigns.map(c => c.id));
  return {
    visible: campaigns.filter(c => c.effective_status === "ACTIVE" || whitelist.has(c.id)),
    missing: [...whitelist].filter(id => !known.has(id)),
    activeCount: campaigns.filter(c => c.effective_status === "ACTIVE").length,
  };
}
