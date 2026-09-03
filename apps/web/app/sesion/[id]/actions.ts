"use server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
export async function annotate(form: FormData) {
  const session_id = String(form.get("session_id")), author_email = String(form.get("author_email")).trim().toLowerCase(), reason = String(form.get("reason")).trim();
  if (!session_id || !author_email || !reason) return;
  const sb = db();
  const { data: user } = await sb.from("app_users").select("email").eq("email", author_email).maybeSingle();
  if (!user) throw new Error("Correo no autorizado");
  const { error } = await sb.from("annotations").insert({ session_id, author_email, reason, hypothesis: String(form.get("hypothesis") ?? "").trim() || null, success_criterion: String(form.get("success_criterion") ?? "").trim() || null });
  if (error) throw new Error(error.message);
  revalidatePath(`/sesion/${session_id}`); revalidatePath("/bitacora");
}
