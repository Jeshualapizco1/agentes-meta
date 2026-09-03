/** Parser de la nomenclatura real de Aromante. Ejemplos:
 *  "TC / Fase 1 / ABO / Abierta H  / Perfumes precio justo / 25/07/26"
 *  "CBO | SCALE"   ·   "[PD26] TC / PAU / H2; ¿Qué perfume usabas? / Home - Copia"
 */
export interface ParsedName {
  raw: string; segments: string[];
  tags: string[];                 // [PD26]
  prefix?: string;                // TC, PAU…
  fase?: number;                  // "Fase 1" → 1
  budgetType?: "ABO" | "CBO";
  audience?: string;              // "Abierta H"
  date?: string;                  // 2026-07-25
  isCopy: boolean;                // "- Copia"
  concept?: string;               // último segmento libre
}

export function parseName(raw: string): ParsedName {
  let s = raw.trim();
  const tags = [...s.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]!);
  s = s.replace(/\[[^\]]+\]/g, "").trim();
  const isCopy = /-\s*copia\b/i.test(s);
  s = s.replace(/\s*-\s*copia\b.*$/i, "").trim();
  const dateMatch = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*$/);
  let date: string | undefined;
  if (dateMatch) {
    const [, d, m, y] = dateMatch; const yy = y!.length === 2 ? "20" + y : y!;
    date = `${yy}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
    s = s.slice(0, dateMatch.index).replace(/[\/|\s]+$/, "");
  }
  const segments = s.split(/\s*[\/|;]\s*/).map(x => x.trim()).filter(Boolean);
  const out: ParsedName = { raw, segments, tags, isCopy, date };
  const rest: string[] = [];
  for (const seg of segments) {
    const up = seg.toUpperCase();
    const fase = seg.match(/^fase\s*(\d+)/i);
    if (fase) out.fase = Number(fase[1]);
    else if (up === "ABO" || up === "CBO") out.budgetType = up as "ABO" | "CBO";
    else if (/^(TC|PAU|PD|UGC|VSL)$/i.test(seg) && !out.prefix) out.prefix = up;
    else if (/^abierta\b|^lookalike\b|^lal\b|^interes|^retarget|^rmk\b|^broad\b/i.test(seg) && !out.audience) out.audience = seg;
    else rest.push(seg);
  }
  if (rest.length) out.concept = rest[rest.length - 1];
  return out;
}

/** Cumplimiento mínimo de nomenclatura para ad sets: prefijo + fase + ABO/CBO + fecha. */
export function namingIssues(p: ParsedName, level: "campaign" | "adset" | "ad"): string[] {
  const issues: string[] = [];
  if (level === "adset") {
    if (p.fase == null) issues.push("sin fase");
    if (!p.budgetType) issues.push("sin ABO/CBO");
    if (!p.date) issues.push("sin fecha");
  }
  if (p.isCopy) issues.push("nombre con '- Copia'");
  return issues;
}
