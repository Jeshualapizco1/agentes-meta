"use server";
import { db, fetchAll } from "@/lib/db";
import { redirect } from "next/navigation";
import { toZoned, uuidV5 } from "@agentes-meta/core";
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

/** Documenta gasto ya vivo: no solicita ni reserva presupuesto nuevo de exploración. */
export async function registerSessionAsExperiment(form: FormData) {
  const user = await requireMember("/bitacora");
  const sessionId = String(form.get("session_id") ?? "").trim();
  if (!sessionId) throw new Error("Falta el cambio que quieres registrar.");
  const sb = db();
  const { data: session, error: sessionError } = await sb.from("change_sessions").select("id,account_id,summary,actor_name,campaign_ids,started_at").eq("id", sessionId).maybeSingle();
  if (sessionError || !session) throw new Error("El cambio no está disponible.");
  const { data: account, error: accountError } = await sb.from("accounts").select("id,timezone_name").eq("id", session.account_id).eq("enabled", true).maybeSingle();
  if (accountError || !account) throw new Error("La cuenta no está disponible.");
  const existing = await sb.from("experiments").select("id,status").eq("account_id", account.id).eq("session_id", sessionId).order("created_at").limit(1).maybeSingle();
  if (existing.error) throw new Error("No se pudo comprobar si este cambio ya tiene una prueba.");
  const href = (id: string, status: string) => `/experimentos?${new URLSearchParams({ account: account.id, ...(status === "borrador" ? { editar: id } : {}) })}#${status === "borrador" ? "nueva-prueba" : `prueba-${id}`}`;
  if (existing.data) redirect(href(existing.data.id, existing.data.status));
  const campaignIds = [...new Set<string>(session.campaign_ids ?? [])];
  const [{ data: profile, error: profileError }, { data: note, error: noteError }] = await Promise.all([
    sb.from("account_profiles").select("target_roas,breakeven_roas").eq("account_id", account.id).maybeSingle(),
    sb.from("annotations").select("hypothesis,reason").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (profileError || noteError) throw new Error("No se pudo preparar el criterio de la prueba.");
  const campaigns: { id: string; daily_budget: number | null }[] = [];
  for (let i = 0; i < campaignIds.length; i += 200) {
    const batch = campaignIds.slice(i, i + 200);
    campaigns.push(...await fetchAll<{ id: string; daily_budget: number | null }>(() => sb.from("entities").select("id,daily_budget").eq("account_id", account.id).eq("level", "campaign").in("id", batch).order("id")));
  }
  if (campaigns.length !== campaignIds.length) throw new Error("Las campañas del cambio no están disponibles en esta cuenta.");
  const positive = (value: unknown) => value != null && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
  const threshold = positive(profile?.target_roas) ?? positive(profile?.breakeven_roas) ?? 1;
  const startDate = session.started_at && Number.isFinite(Date.parse(session.started_at)) ? toZoned(new Date(session.started_at), account.timezone_name).date : null;
  const status = campaignIds.length && startDate ? "activo" : "borrador";
  const budgets = campaigns.flatMap(c => c.daily_budget != null && Number.isFinite(Number(c.daily_budget)) && Number(c.daily_budget) >= 0 ? [Number(c.daily_budget) / 100] : []);
  // Identidad estable: dos clics concurrentes chocan con la misma clave primaria.
  const id = uuidV5(`prueba-desde-sesion:${account.id}:${sessionId}`);
  const { error } = await sb.from("experiments").insert({
    id, account_id: account.id, name: (session.summary || "Cambio registrado").slice(0, 60),
    hypothesis: note?.hypothesis || note?.reason || `${session.actor_name ?? "Persona sin nombre"} cambió: ${session.summary}`,
    metric: "roas", threshold, min_purchases: 10, window_days: 7,
    budget: budgets.length ? budgets.reduce((sum, n) => sum + n, 0) : null,
    campaign_ids: campaignIds, entity_ids: campaignIds, start_date: startDate, session_id: sessionId, created_by: user.email, status,
  });
  if (error) {
    if (error.code !== "23505") throw new Error("No se pudo registrar la prueba. Inténtalo de nuevo.");
    const retry = await sb.from("experiments").select("id,status").eq("id", id).eq("account_id", account.id).eq("session_id", sessionId).maybeSingle();
    if (retry.error || !retry.data) throw new Error("No se pudo confirmar la prueba registrada.");
    redirect(href(retry.data.id, retry.data.status));
  }
  revalidatePath(`/sesion/${sessionId}`); revalidatePath("/experimentos"); revalidatePath("/hoy");
  redirect(href(id, status));
}
