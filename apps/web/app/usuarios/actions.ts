"use server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { upsertAuthUser, deleteAuthUser } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createUser(form: FormData) {
  await requireAdmin("/usuarios");
  const email = String(form.get("email") ?? "").trim().toLowerCase(), password = String(form.get("password") ?? ""), name = String(form.get("name") ?? "").trim(), role = String(form.get("role") ?? "buyer") === "admin" ? "admin" : "buyer";
  if (!email || password.length < 8) redirect(`/usuarios?error=${encodeURIComponent("Correo válido y contraseña de al menos 8 caracteres.")}`);
  try {
    await upsertAuthUser(email, password, name, role);
    const { error } = await db().from("app_users").upsert({ email, name, role }, { onConflict: "email" });
    if (error) throw new Error(error.message);
  } catch (e) { redirect(`/usuarios?error=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`); }
  revalidatePath("/usuarios"); redirect(`/usuarios?ok=${encodeURIComponent(email)}`);
}
export async function removeUser(form: FormData) {
  const me = await requireAdmin("/usuarios");
  const email = String(form.get("email") ?? "").toLowerCase();
  if (email === me.email!.toLowerCase()) redirect(`/usuarios?error=${encodeURIComponent("No puedes eliminarte a ti mismo.")}`);
  await deleteAuthUser(email);
  await db().from("app_users").delete().eq("email", email);
  revalidatePath("/usuarios"); redirect("/usuarios");
}
