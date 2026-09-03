"use server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/supabase/server";
export async function annotate(form: FormData) {
  const user = await currentUser(); if (!user?.email) throw new Error("Sin sesión");
  const session_id = String(form.get("session_id")), author_email = user.email.toLowerCase(), reason = String(form.get("reason")).trim();
  if (!session_id || !author_email || !reason) return;
  const sb = db();
  const { data: allowed } = await sb.from("app_users").select("email").eq("email", author_email).maybeSingle();
  if (!allowed) throw new Error("Correo no autorizado");
  const { error } = await sb.from("annotations").insert({ session_id, author_email, reason, hypothesis: String(form.get("hypothesis") ?? "").trim() || null, success_criterion: String(form.get("success_criterion") ?? "").trim() || null });
  if (error) throw new Error(error.message);
  revalidatePath(`/sesion/${session_id}`); revalidatePath("/bitacora");
}
