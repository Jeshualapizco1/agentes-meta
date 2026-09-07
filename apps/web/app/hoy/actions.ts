"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember, requireAdmin } from "@/lib/auth";
import { engageBrake as engage } from "@agentes-meta/agents";

function back(account: string, q: Record<string, string>): never { redirect(`/hoy?account=${account}&${new URLSearchParams(q).toString()}`); }

/** Formularios antiguos no pueden saltarse la revisión transaccional ni ejecutar Meta. */
export async function decideProposal(form: FormData) {
  await requireMember("/hoy");
  const account = String(form.get("account") ?? "");
  back(/^\d{1,30}$/.test(account) ? account : "", { error: "Este formulario quedó deshabilitado. Abre la propuesta en Hoy y usa la revisión en simulación." });
}

/** Cualquier miembro vigente puede bloquear nuevas acciones del agente. No pausa campañas en Meta. */
export async function engageBrake(form: FormData) {
  const user = await requireMember("/hoy");
  const account = String(form.get("account")), reason = String(form.get("reason") ?? "").trim() || "freno manual desde Hoy";
  await engage(db(), account, user.email, reason);
  revalidatePath("/hoy"); back(account, { decidido: "freno activado" });
}

/** Solo un administrador libera el freno, con razón obligatoria. */
export async function releaseBrake(form: FormData) {
  const user = await requireAdmin("/hoy");
  const account = String(form.get("account")), reason = String(form.get("reason") ?? "").trim();
  const sb = db();
  if (!reason) back(account, { error: "La razón de liberación es obligatoria." });
  const { error } = await sb.from("emergency_brakes").update({ active: false, released_by: user.email, released_at: new Date().toISOString(), release_reason: reason, updated_at: new Date().toISOString() }).eq("account_id", account);
  if (error) back(account, { error: error.message });
  await sb.from("alerts").update({ acknowledged_at: new Date().toISOString(), acknowledged_by: user.email }).eq("account_id", account).eq("kind", "emergency_brake").is("acknowledged_at", null);
  revalidatePath("/hoy"); back(account, { decidido: "freno liberado" });
}
