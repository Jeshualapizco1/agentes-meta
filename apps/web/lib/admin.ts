import "server-only";
/** Llamadas al API de administración de Auth (solo servidor, llave secreta). */
const base = () => ({ url: process.env.SUPABASE_URL!, key: process.env.SUPABASE_SERVICE_ROLE_KEY! });
async function call(path: string, init: RequestInit) {
  const { url, key } = base();
  const res = await fetch(`${url}/auth/v1/admin${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.msg ?? body.message ?? `HTTP ${res.status}`);
  return body as Record<string, unknown>;
}
export async function listAuthUsers(): Promise<{ id: string; email: string; last_sign_in_at?: string; email_confirmed_at?: string }[]> {
  const b = await call(`/users?per_page=200`, { method: "GET" });
  return (b.users as { id: string; email: string; last_sign_in_at?: string; email_confirmed_at?: string }[]) ?? [];
}
export async function upsertAuthUser(email: string, password: string, name: string, role: string) {
  const users = await listAuthUsers();
  const existing = users.find(u => u.email?.toLowerCase() === email);
  const body = JSON.stringify({ email, password, email_confirm: true, user_metadata: { name, role } });
  return existing ? call(`/users/${existing.id}`, { method: "PUT", body }) : call(`/users`, { method: "POST", body });
}
export async function deleteAuthUser(email: string) {
  const users = await listAuthUsers();
  const u = users.find(x => x.email?.toLowerCase() === email);
  if (u) await call(`/users/${u.id}`, { method: "DELETE" });
}
