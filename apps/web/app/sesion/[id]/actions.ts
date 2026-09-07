"use server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
export async function annotate(form: FormData) {
  const user = await requireMember("/bitacora");
  const session_id = String(form.get("session_id") ?? ""), author_email = user.email, reason = String(form.get("reason") ?? "").trim();
  if (!session_id || !author_email || !reason) return;
  const sb = db();
  const { error } = await sb.from("annotations").insert({ session_id, author_email, reason, hypothesis: String(form.get("hypothesis") ?? "").trim() || null, success_criterion: String(form.get("success_criterion") ?? "").trim() || null });
  if (error) throw new Error(error.message);
  revalidatePath(`/sesion/${session_id}`); revalidatePath("/bitacora");
}
