/** Utilidades de zona horaria. CDMX = UTC-6 fijo (sin horario de verano desde 2022). */
export const CDMX = "America/Mexico_City";

export function toZoned(d: Date, tz: string): { date: string; hour: number; iso: string } {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), iso: `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}` };
}

/** Offset en horas de una zona respecto a UTC en un instante dado (p. ej. Mazatlán = -7, CDMX = -6). */
export function offsetHours(d: Date, tz: string): number {
  const z = toZoned(d, tz);
  const asUtc = Date.UTC(Number(z.date.slice(0, 4)), Number(z.date.slice(5, 7)) - 1, Number(z.date.slice(8, 10)), z.hour, Number(z.iso.slice(14, 16)), Number(z.iso.slice(17, 19)));
  return Math.round((asUtc - d.getTime()) / 36e5);
}

/** Traslada una celda (fecha, hora) expresada en la zona de la cuenta a la zona CDMX. */
export function shiftHourCell(date: string, hour: number, fromTz: string, toTz: string = CDMX): { date: string; hour: number } {
  const probe = new Date(`${date}T12:00:00Z`);
  const delta = offsetHours(probe, toTz) - offsetHours(probe, fromTz); // Mazatlán→CDMX = +1
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCHours(hour + delta);
  return { date: base.toISOString().slice(0, 10), hour: base.getUTCHours() };
}

/** Un día está "cerrado" en la zona de la cuenta si ya pasó su medianoche + margen. */
export function isClosedDay(date: string, tz: string, now: Date = new Date(), marginHours = 3): boolean {
  const today = toZoned(now, tz);
  if (date < today.date) return true;
  if (date > today.date) return false;
  return false; // el día en curso nunca se juzga
}
