/**
 * IDs estables y deterministas para sesiones y grupos (UUID v5). Regrupar no cambia el ID de una sesión si no cambió
 * su inicio, así las anotaciones del equipo (FK a change_sessions / change_groups) sobreviven a cada corrida.
 * Cuando un evento tardío mueve el inicio (y por tanto el ID), `relinkByEvents` encuentra la nueva sesión/grupo que
 * contiene los mismos eventos para re-enlazar las anotaciones antes de borrar la vieja.
 */
import { createHash } from "node:crypto";
import type { ChangeGroup } from "./types.js";
import type { ChangeSession } from "./sessions.js";

/** Espacio de nombres propio del proyecto (UUID fijo; cambiarlo cambiaría todos los IDs). */
export const ID_NAMESPACE = "8f5c2a1e-3b7d-4e6a-9c0f-0a1b2c3d4e5f";

export function uuidV5(name: string, namespace = ID_NAMESPACE): string {
  const ns = Buffer.from(namespace.replace(/-/g, ""), "hex");
  const h = createHash("sha1").update(Buffer.concat([ns, Buffer.from(name, "utf8")])).digest();
  h[6] = (h[6]! & 0x0f) | 0x50; h[8] = (h[8]! & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}

export const sessionId = (s: Pick<ChangeSession, "accountId" | "actorId" | "startedAt">) => uuidV5(`session|${s.accountId}|${s.actorId}|${s.startedAt.toISOString()}`);
export const groupId = (g: Pick<ChangeGroup, "accountId" | "actorId" | "objectId" | "startedAt">) => uuidV5(`group|${g.accountId}|${g.actorId}|${g.objectId}|${g.startedAt.toISOString()}`);

/**
 * Para cada ID viejo que ya no existe en el conjunto nuevo, devuelve el ID nuevo cuyo conjunto de eventos (huellas)
 * más se traslapa con el viejo. Los IDs que siguen existiendo no se tocan. Sin traslape → no aparece en el mapa.
 */
export function relinkByEvents(oldMembers: Map<string, string[]>, newMembers: Map<string, string[]>): Map<string, string> {
  const owner = new Map<string, string>();
  for (const [id, fps] of newMembers) for (const fp of fps) owner.set(fp, id);
  const out = new Map<string, string>();
  for (const [oldId, fps] of oldMembers) {
    if (newMembers.has(oldId)) continue;
    const votes = new Map<string, number>();
    for (const fp of fps) { const n = owner.get(fp); if (n) votes.set(n, (votes.get(n) ?? 0) + 1); }
    const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) out.set(oldId, best[0]);
  }
  return out;
}

/**
 * Respaldo cuando no hay huellas que comparar (p. ej. una corrida anterior quedó a medias): para cada viejo sin sucesor,
 * el nuevo del mismo actor cuya ventana [start, end] se traslapa (o queda a ≤ gapMs). Empate → el que empieza más cerca.
 */
export function relinkByWindow(olds: { id: string; actorId: string; start: Date; end: Date }[], news: { id: string; actorId: string; start: Date; end: Date }[], gapMs = 3 * 60 * 1000): Map<string, string> {
  const out = new Map<string, string>();
  const newIds = new Set(news.map(n => n.id));
  for (const o of olds) {
    if (newIds.has(o.id)) continue;
    const cands = news.filter(n => n.actorId === o.actorId && n.start.getTime() <= o.end.getTime() + gapMs && n.end.getTime() >= o.start.getTime() - gapMs)
      .sort((a, b) => Math.abs(a.start.getTime() - o.start.getTime()) - Math.abs(b.start.getTime() - o.start.getTime()));
    if (cands[0]) out.set(o.id, cands[0].id);
  }
  return out;
}

/**
 * Plan de re-enlace antes de borrar sesiones/grupos viejos. Puro: no toca la base, solo dice qué actualizar y qué soltar.
 *  - Anotaciones (las escribió el equipo): se re-enlazan a la sucesora; si no hay sucesora se devuelve un error y el
 *    collector no borra nada.
 *  - Ventanas de evaluación (derivadas, el analista las recalcula en cada corrida): se re-enlazan a la sesión/grupo
 *    sucesor; si chocan con el índice único (sesión, horizonte) —dos sesiones viejas que se fundieron en una— o si no hay
 *    sucesor, se sueltan con razón. Nunca se deja una ventana apuntando a un ID que va a desaparecer.
 */
export interface RelinkRow { id: string; session_id: string | null; group_id: string | null }
export interface RelinkWindowRow extends RelinkRow { horizon: string }
export interface RelinkPlan {
  annotations: { id: string; patch: { session_id?: string; group_id?: string | null } }[];
  windows: { id: string; patch: { session_id?: string; group_id?: string | null } }[];
  dropWindows: { id: string; reason: string }[];
  /** Anotaciones cuya sesión desaparecería sin sucesora: el collector debe fallar y no borrar nada. */
  errors: { annotation_id: string; session_id: string; message: string }[];
}
export function planRelink(o: { mapSession: Map<string, string>; mapGroup: Map<string, string>; staleSessions: Iterable<string>; staleGroups: Iterable<string>; annotations: RelinkRow[]; windows: RelinkWindowRow[] }): RelinkPlan {
  const staleS = new Set(o.staleSessions), staleG = new Set(o.staleGroups);
  const plan: RelinkPlan = { annotations: [], windows: [], dropWindows: [], errors: [] };
  for (const n of o.annotations) {
    const patch: { session_id?: string; group_id?: string | null } = {};
    if (n.session_id && staleS.has(n.session_id)) {
      const to = o.mapSession.get(n.session_id);
      if (!to) { plan.errors.push({ annotation_id: n.id, session_id: n.session_id, message: `La anotación ${n.id} está en la sesión ${n.session_id}, que desaparecería sin sucesora. No se borra nada.` }); continue; }
      patch.session_id = to;
    }
    if (n.group_id && staleG.has(n.group_id)) patch.group_id = o.mapGroup.get(n.group_id) ?? null;
    if (Object.keys(patch).length) plan.annotations.push({ id: n.id, patch });
  }
  // claves ocupadas por ventanas que sobreviven tal cual (sesión o grupo no viejo)
  const takenS = new Set<string>(), takenG = new Set<string>();
  for (const w of o.windows) {
    if (w.session_id && !staleS.has(w.session_id)) takenS.add(`${w.session_id}|${w.horizon}`);
    if (!w.session_id && w.group_id && !staleG.has(w.group_id)) takenG.add(`${w.group_id}|${w.horizon}`);
  }
  for (const w of o.windows) {
    const patch: { session_id?: string; group_id?: string | null } = {};
    if (w.session_id && staleS.has(w.session_id)) {
      const to = o.mapSession.get(w.session_id);
      if (!to) { plan.dropWindows.push({ id: w.id, reason: `la sesión ${w.session_id} desaparece sin sucesora` }); continue; }
      const key = `${to}|${w.horizon}`;
      if (takenS.has(key)) { plan.dropWindows.push({ id: w.id, reason: `la sesión sucesora ${to} ya tiene ventana ${w.horizon}` }); continue; }
      takenS.add(key); patch.session_id = to;
    }
    if (w.group_id && staleG.has(w.group_id)) {
      const to = o.mapGroup.get(w.group_id);
      if (!w.session_id) {
        // ventana heredada (solo por grupo): el grupo es su única ancla
        if (!to) { plan.dropWindows.push({ id: w.id, reason: `el grupo ${w.group_id} desaparece sin sucesor` }); continue; }
        const key = `${to}|${w.horizon}`;
        if (takenG.has(key)) { plan.dropWindows.push({ id: w.id, reason: `el grupo sucesor ${to} ya tiene ventana ${w.horizon}` }); continue; }
        takenG.add(key);
      }
      patch.group_id = to ?? null;
    }
    if (Object.keys(patch).length) plan.windows.push({ id: w.id, patch });
  }
  return plan;
}
