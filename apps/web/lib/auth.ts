import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
/** Segunda capa de protección, independiente del middleware: toda página con datos la llama. */
export async function requireUser(next: string) {
  const user = await currentUser();
  if (!user?.email) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}
