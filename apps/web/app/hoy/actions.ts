"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/supabase/server";
import { engageBrake as engage } from "@agentes-meta/agents";

function back(account: string, q: Record<string, string>): never { redirect(`/hoy?account=${account}&${new URLSearchParams(q).toString()}`); }

/** Aprobar o rechazar una propuesta. En modo semi solo cambia el estado (nadie escribe en Meta hasta la Fase 4b). Rechazar exige razón. */
export async function decideProposal(form: FormData) {
  const user = await currentUser(); if (!user?.email) redirect("/login?next=/hoy");
  const id = String(form.get("id")), account = String(form.get("account")), decision = String(form.get("decision")), reason = String(form.get("reason") ?? "").trim();
  if (!["aprobada", "rechazada"].includes(decision)) back(account, { error: "Decisión inválida." });
  if (decision === "rechazada" && !reason) back(account, { error: "Para rechazar hay que escribir la razón." });
  const sb = db();
  const { data: x } = await sb.from("proposals").select("id,status,rule_id").eq("id", id).single();
  if (!x || x.status !== "pendiente") back(account, { error: "La propuesta ya no está pendiente." });
  const { error } = await sb.from("proposals").update({ status: decision, decided_by: user.email, decided_at: new Date().toISOString(), decision_reason: reason || null }).eq("id", id);
  if (error) back(account, { error: error.message });
  // racha de la regla: aprobada sin corrección suma; rechazo la regresa a cero (el paso a auto es de la Fase 4b)
  if (x.rule_id) {
    const { data: r } = await sb.from("rules").select("approved_streak").eq("id", x.rule_id).single();
    await sb.from("rules").update({ approved_streak: decision === "aprobada" ? Number(r?.approved_streak ?? 0) + 1 : 0, updated_by: user.email }).eq("id", x.rule_id);
  }
  revalidatePath("/hoy"); back(account, { decidido: decision });
}

/** Cualquier usuario puede frenar la cuenta. */
export async function engageBrake(form: FormData) {
  const user = await currentUser(); if (!user?.email) redirect("/login?next=/hoy");
  const account = String(form.get("account")), reason = String(form.get("reason") ?? "").trim() || "freno manual desde Hoy";
  await engage(db(), account, user.email, reason);
  revalidatePath("/hoy"); back(account, { decidido: "freno activado" });
}

/** Solo un administrador libera el freno, con razón obligatoria. */
export async function releaseBrake(form: FormData) {
  const user = await currentUser(); if (!user?.email) redirect("/login?next=/hoy");
  const account = String(form.get("account")), reason = String(form.get("reason") ?? "").trim();
  const sb = db();
  const { data: mine } = await sb.from("app_users").select("role").eq("email", user.email.toLowerCase()).maybeSingle();
  if (mine?.role !== "admin") back(account, { error: "Solo un administrador puede liberar el freno." });
  if (!reason) back(account, { error: "La razón de liberación es obligatoria." });
  const { error } = await sb.from("emergency_brakes").update({ active: false, released_by: user.email, released_at: new Date().toISOString(), release_reason: reason, updated_at: new Date().toISOString() }).eq("account_id", account);
  if (error) back(account, { error: error.message });
  await sb.from("alerts").update({ acknowledged_at: new Date().toISOString(), acknowledged_by: user.email }).eq("account_id", account).eq("kind", "emergency_brake").is("acknowledged_at", null);
  revalidatePath("/hoy"); back(account, { decidido: "freno liberado" });
}
