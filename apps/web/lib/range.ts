import { CDMX, dayKey } from "./format";

export type Range = { from: string; to: string; days: number; custom: boolean; label: string; sinceIso: string; untilIso: string };
/** Límite de consulta/UI, no regla de operación del agente. */
export const MAX_RANGE_DAYS = 366;
const DAY = 86_400_000;
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const short = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
export class InvalidRangeError extends Error {
  constructor() { super(`Elige fechas válidas, sin días futuros, con inicio anterior o igual al fin y un máximo de ${MAX_RANGE_DAYS} días.`); }
}
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}
export function validDayCount(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^[1-9]\d{0,2}$/.test(value)) return;
  const n = Number(value);
  return n <= MAX_RANGE_DAYS ? n : undefined;
}
const shift = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
const localParts = new Intl.DateTimeFormat("en-CA", { timeZone: CDMX, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
/** Resuelve medianoche con la zona IANA, incluido el horario de verano histórico. */
function midnight(date: string): number {
  const target = Date.parse(`${date}T00:00:00Z`);
  // Empezar al mediodía evita caer en el año anterior al formatear 0001-01-01.
  let instant = target + 12 * 60 * 60 * 1000;
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(localParts.formatToParts(instant).map(x => [x.type, x.value]));
    const local = Date.parse(`${p.year!.padStart(4, "0")}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    instant += target - local;
  }
  return instant;
}
/** Fechas de calendario CDMX. Un rango inválido nunca consulta otro periodo en silencio. */
export function resolveRange(p: Record<string, string | undefined>, defaultDays: number, now = new Date()): Range {
  const today = dayKey(now);
  let from: string, to: string, custom = false;
  if (p.from !== undefined || p.to !== undefined) {
    if (!isCalendarDate(p.from) || !isCalendarDate(p.to) || p.from > p.to || p.to > today) throw new InvalidRangeError();
    from = p.from; to = p.to; custom = true;
  } else {
    const days = p.days === undefined ? defaultDays : validDayCount(p.days);
    if (!days || !Number.isInteger(days) || days < 1 || days > MAX_RANGE_DAYS) throw new InvalidRangeError();
    to = today; from = shift(today, 1 - days);
  }
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY) + 1;
  if (days > MAX_RANGE_DAYS) throw new InvalidRangeError();
  return { from, to, days, custom, label: custom ? `del ${short(from)} al ${short(to)}` : `últimos ${days} días`, sinceIso: new Date(midnight(from)).toISOString(), untilIso: new Date(midnight(shift(to, 1)) - 1).toISOString() };
}
/** Estado recuperable antes de consultar datos. */
export function readRange(p: Record<string, string | undefined>, defaultDays: number): Range | null {
  try { return resolveRange(p, defaultDays); } catch (error) { if (error instanceof InvalidRangeError) return null; throw error; }
}
export function listDays(r: Range): string[] {
  if (!isCalendarDate(r.from) || !isCalendarDate(r.to) || r.from > r.to) throw new InvalidRangeError();
  const count = Math.round((Date.parse(r.to) - Date.parse(r.from)) / DAY) + 1;
  if (count > MAX_RANGE_DAYS) throw new InvalidRangeError();
  return Array.from({ length: count }, (_, i) => shift(r.to, -i));
}
