"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { safeInternalPath } from "@/lib/navigation";

/** Marca un anuncio como revisado por el usuario de la sesión. */
export async function markReviewed(form: FormData) {
  const user = await requireMember("/anuncios");
  const ad_id = String(form.get("ad_id") ?? ""), account_id = String(form.get("account_id") ?? "");
  const note = String(form.get("note") ?? "").trim() || null;
  if (!ad_id || !account_id) return;
  const { error } = await db().from("ad_reviews").insert({ ad_id, account_id, reviewed_by: user.email, note });
  if (error) throw new Error(error.message);
  revalidatePath("/anuncios"); revalidatePath("/hoy");
  const back = String(form.get("back") ?? "/anuncios");
  redirect(safeInternalPath(back, "/anuncios"));
}
