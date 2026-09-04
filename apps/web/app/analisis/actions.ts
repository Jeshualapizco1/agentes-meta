"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/supabase/server";
import { saveWeekly } from "@agentes-meta/agents";

/** Forzar análisis: recalcula ventanas y guarda el reporte del periodo que termina ayer. La narrativa la añade la siguiente corrida del analista (Claude corre en GitHub Actions, no aquí). */
export async function forceWeekly(form: FormData) {
  const user = await currentUser();
  if (!user?.email) redirect("/login?next=/analisis");
  const accountId = String(form.get("account") ?? "");
  const sb = db();
  const { data: acc } = await sb.from("accounts").select("id,name,timezone_name").eq("id", accountId).single();
  if (!acc) redirect("/analisis");
  const yesterday = new Intl.DateTimeFormat("en-CA", { timeZone: acc.timezone_name, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() - 86400_000));
  await saveWeekly(sb, acc, yesterday, { anthropicKey: process.env.ANTHROPIC_API_KEY || undefined, triggeredBy: `manual:${user.email}`, log: () => {} });
  revalidatePath("/analisis");
  redirect(`/analisis?account=${accountId}&forzado=1`);
}
