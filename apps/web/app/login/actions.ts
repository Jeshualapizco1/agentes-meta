"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authClient } from "@/lib/supabase/server";
export async function signIn(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/bitacora");
  const { data: allowed } = await db().from("app_users").select("email").eq("email", email).maybeSingle();
  if (!allowed) redirect(`/login?error=${encodeURIComponent("Ese correo no está autorizado. Pide acceso a un administrador.")}`);
  const sb = await authClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent("Correo o contraseña incorrectos.")}`);
  redirect(next.startsWith("/") ? next : "/bitacora");
}
