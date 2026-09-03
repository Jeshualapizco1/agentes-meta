"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { authClient } from "@/lib/supabase/server";
export async function sendLink(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = String(form.get("next") ?? "/bitacora");
  const { data: allowed } = await db().from("app_users").select("email").eq("email", email).maybeSingle();
  if (!allowed) redirect(`/login?error=${encodeURIComponent("Ese correo no está autorizado. Pide acceso a Jeshua.")}`);
  const h = await headers(); const origin = process.env.APP_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const sb = await authClient();
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true } });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect(`/login?sent=${encodeURIComponent(email)}`);
}
