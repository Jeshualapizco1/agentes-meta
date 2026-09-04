/**
 * Mapa de entidades para resolver "en qué campaña" cayó un cambio. Se construye con TODO lo que la base conoce
 * (tabla `entities`, que conserva cada campaña, ad set y anuncio visto alguna vez, aunque Meta ya lo haya borrado)
 * y resuelve la campaña por jerarquía anuncio → ad set → campaña cuando la fila del anuncio no la trae.
 * Lo que no se pueda resolver aquí se consulta a Meta por id (collector) y se guarda para la próxima.
 */
import type { EntityMap, EntityRef } from "./sessions.js";
import type { ChangeGroup } from "./types.js";
import { campaignOf } from "./sessions.js";

export interface EntityRow { id: string; name: string; level: "campaign" | "adset" | "ad"; campaign_id?: string | null; parent_id?: string | null }

export function entityMapFromRows(rows: EntityRow[]): EntityMap {
  const byId = new Map(rows.map(r => [r.id, r]));
  const resolve = (r: EntityRow, depth = 0): string | undefined => {
    if (r.level === "campaign") return r.id;
    if (r.campaign_id) return r.campaign_id;
    const parent = r.parent_id ? byId.get(r.parent_id) : undefined;
    return parent && depth < 3 ? resolve(parent, depth + 1) : undefined;
  };
  const out: EntityMap = new Map();
  for (const r of rows) { const ref: EntityRef = { name: r.name, level: r.level, campaignId: resolve(r) }; out.set(r.id, ref); }
  return out;
}

/** Objetos de nivel anuncio o ad set cuya campaña no se resuelve con el mapa (candidatos a consultar a Meta por id). */
export function unresolvedObjectIds(groups: ChangeGroup[], ents: EntityMap): string[] {
  const out = new Set<string>();
  for (const g of groups) if ((g.level === "ad" || g.level === "adset") && !campaignOf(g, ents).id) out.add(g.objectId);
  return [...out];
}
