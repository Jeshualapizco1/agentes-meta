/** Rango de fechas de los filtros (fechas YYYY-MM-DD en CDMX). `from`/`to` personalizados mandan sobre `days`. */
import { dayKey } from "./format";
export type Range = { from: string; to: string; days: number; custom: boolean; label: string; sinceIso: string; untilIso: string };
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const short = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
const isDate = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
export function resolveRange(p: Record<string, string | undefined>, defaultDays: number): Range {
  const today = dayKey(new Date());
  let from: string, to: string, custom = false;
  if (isDate(p.from) && isDate(p.to) && p.from <= p.to) { from = p.from; to = p.to; custom = true; }
  else if (isDate(p.from) && !p.to) { from = p.from; to = today; custom = true; }
  else { const n = Math.max(1, Number(p.days) || defaultDays); to = today; from = dayKey(new Date(Date.now() - (n - 1) * 86400_000)); }
  const days = Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86400_000) + 1;
  return { from, to, days, custom, label: custom ? `del ${short(from)} al ${short(to)}` : `últimos ${days} días`, sinceIso: `${from}T00:00:00-06:00`, untilIso: `${to}T23:59:59.999-06:00` };
}
/** Lista de días YYYY-MM-DD de `to` hacia `from` (descendente). */
export function listDays(r: Range): string[] { const out: string[] = []; for (let d = new Date(`${r.to}T12:00:00Z`); d.toISOString().slice(0, 10) >= r.from; d.setUTCDate(d.getUTCDate() - 1)) out.push(d.toISOString().slice(0, 10)); return out; }
