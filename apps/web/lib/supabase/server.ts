import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
/** Cliente de Auth con la llave pública y cookies del usuario. NO lee tablas (RLS activo sin políticas). */
export async function authClient() {
  const store = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (all) => { try { for (const { name, value, options } of all) store.set(name, value, options); } catch { /* en Server Components no se puede escribir; el middleware refresca */ } } },
  });
}
export async function currentUser() {
  const sb = await authClient();
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}
