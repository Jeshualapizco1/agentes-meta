import "server-only";
import { db, fetchAll } from "./db";
import type { Win } from "./results";

/** Lotes pequeños para mantener acotada la URL y paginación para no truncar resultados. */
export async function loadSessionResults(sb: ReturnType<typeof db>, ids: string[]) {
  const bySession = new Map<string, Win[]>();
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += 200) {
    const batch = unique.slice(i, i + 200);
    const wins = await fetchAll<Win>(() => sb.from("evaluation_windows").select("session_id,horizon,status,confidence,verdict,caveats,agreement,reading,missing_refs,delta,metrics_before,metrics_after").in("session_id", batch).order("session_id").order("horizon"));
    for (const w of wins) bySession.set(w.session_id, [...(bySession.get(w.session_id) ?? []), w]);
  }
  return bySession;
}
