export const CDMX = "America/Mexico_City";
const dayFmt = new Intl.DateTimeFormat("es-MX", { timeZone: CDMX, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("es-MX", { timeZone: CDMX, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: CDMX, year: "numeric", month: "2-digit", day: "2-digit" });
export const fmtDay = (d: string | Date) => { const s = dayFmt.format(new Date(d)); return s.charAt(0).toUpperCase() + s.slice(1); };
export const fmtTime = (d: string | Date) => timeFmt.format(new Date(d));
export const dayKey = (d: string | Date) => keyFmt.format(new Date(d));
export const mxn = (cents: number) => "$" + (cents / 100).toLocaleString("es-MX", { maximumFractionDigits: 0 });
export const KIND_LABEL: Record<string, string> = { budget: "Presupuesto", status: "Estado", targeting: "Segmentación", creative: "Creativo", bid: "Puja", schedule: "Programación", audience: "Audiencia", name: "Nombre", objective: "Objetivo", delivery: "Entrega", review: "Revisión", other: "Otro" };
export const ACTOR_COLORS = ["#60a5fa", "#a78bfa", "#fbbf24", "#fb7185", "#2dd4bf", "#f472b6"];   // identidad de actor (texto oscuro encima)
export function actorColor(name: string): string { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return ACTOR_COLORS[h % ACTOR_COLORS.length]!; }
export const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
