"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/navigation";
export async function signIn(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = safeInternalPath(form.get("next"));
  const fail = (message: string): never => redirect(`/login?${new URLSearchParams({ next, error: message }).toString()}`);
  const { data: allowed, error: membershipError } = await db().from("app_users").select("email,role").eq("email", email).maybeSingle();
  if (membershipError) fail("No se pudo verificar el acceso. Intenta de nuevo.");
  if (!allowed || (allowed.role !== "admin" && allowed.role !== "buyer")) fail("Correo o contraseña incorrectos, o acceso no autorizado.");
  const sb = await authClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) fail("Correo o contraseña incorrectos, o acceso no autorizado.");
  redirect(next);
}
