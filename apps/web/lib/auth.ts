import "server-only";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { currentUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { safeInternalPath } from "@/lib/navigation";

export type AppRole = "admin" | "buyer";
export type AppMember = User & { email: string; appRole: AppRole };
const ACCESS_UNAVAILABLE = "No se pudo verificar el acceso. Intenta de nuevo.";

/** La sesión identifica; app_users autoriza. Sin caché global: una revocación se consulta de nuevo. */
export async function requireMember(next: string): Promise<AppMember> {
  const user = await currentUser();
  const email = user?.email?.trim().toLowerCase();
  // El middleware sobrescribe este dato. Solo sirve de retorno, nunca de autorización.
  const requestPath = (await headers()).get("x-agentes-return-path");
  const destination = `/login?next=${encodeURIComponent(safeInternalPath(requestPath, safeInternalPath(next)))}`;
  if (!user || !email) redirect(destination);

  let result;
  try {
    result = await db().from("app_users").select("email,role").eq("email", email).maybeSingle();
  } catch {
    throw new Error(ACCESS_UNAVAILABLE);
  }
  if (result.error) throw new Error(ACCESS_UNAVAILABLE);
  const role: unknown = result.data?.role;
  if (result.data?.email !== email || (role !== "admin" && role !== "buyer")) {
    redirect(`${destination}&error=${encodeURIComponent("Tu acceso no está autorizado. Consulta a un administrador.")}`);
  }
  return { ...user, email, appRole: role };
}

/** Compatibilidad con las páginas existentes: ahora también verifica membresía vigente. */
export async function requireUser(next: string): Promise<AppMember> {
  return requireMember(next);
}

/** El rol procede de la DB, nunca de user_metadata ni de un formulario. */
export async function requireAdmin(next: string): Promise<AppMember> {
  const member = await requireMember(next);
  if (member.appRole !== "admin") redirect("/hoy");
  return member;
}
