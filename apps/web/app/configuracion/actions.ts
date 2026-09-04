"use server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const num = (v: FormDataEntryValue | null) => { const s = String(v ?? "").trim().replace(/[$,%\s]/g, ""); if (!s) return null; const n = Number(s); return Number.isFinite(n) ? n : null; };

export async function saveProfile(form: FormData) {
  const user = await currentUser(); if (!user?.email) throw new Error("Sin sesión");
  const account_id = String(form.get("account_id"));
  const gross_margin_pct = num(form.get("gross_margin_pct"));
  // ROAS de equilibrio se deriva del margen si no se captura: 1 / margen
  const breakeven_roas = num(form.get("breakeven_roas")) ?? (gross_margin_pct ? Number((100 / gross_margin_pct).toFixed(2)) : null);
  const patch = {
    gross_margin_pct, breakeven_roas,
    target_roas: num(form.get("target_roas")), target_cpa: num(form.get("target_cpa")),
    daily_spend_ceiling: num(form.get("daily_spend_ceiling")), daily_spend_floor: num(form.get("daily_spend_floor")),
    max_budget_change_pct: num(form.get("max_budget_change_pct")) ?? 20, cooldown_hours: num(form.get("cooldown_hours")) ?? 72, max_actions_per_day: num(form.get("max_actions_per_day")) ?? 5,
    max_cumulative_change_pct: num(form.get("max_cumulative_change_pct")) ?? 35, cumulative_window_days: num(form.get("cumulative_window_days")) ?? 7,
    max_committed_budget_factor: num(form.get("max_committed_budget_factor")) ?? 1.3,
    exploration_budget_pct: num(form.get("exploration_budget_pct")) ?? 10,
    dry_run: form.get("dry_run") != null,
    whitelist_campaign_ids: form.getAll("whitelist").map(String),
    hard_noes: String(form.get("hard_noes") ?? "").trim() || null,
    mode: (["off", "semi", "auto"].includes(String(form.get("mode"))) ? String(form.get("mode")) : "off") as "off" | "semi" | "auto",
    updated_at: new Date().toISOString(),
  };
  const sb = db();
  const { error } = await sb.from("account_profiles").upsert({ account_id, ...patch }, { onConflict: "account_id" });
  if (error) throw new Error(error.message);
  await sb.from("profile_changes").insert({ account_id, changed_by: user.email, patch });
  revalidatePath("/configuracion"); revalidatePath("/cuenta");
  redirect(`/configuracion?account=${account_id}&saved=1`);
}
