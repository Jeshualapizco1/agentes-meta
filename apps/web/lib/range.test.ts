import { describe, expect, it } from "vitest";
import { isCalendarDate, resolveRange, readRange, listDays, InvalidRangeError } from "./range";
const now = new Date("2026-09-06T03:30:00Z"); // Todavía 5 de septiembre en CDMX.
describe("contrato de fechas de la interfaz", () => {
  it("resuelve 7 y 30 días desde el calendario CDMX, no desde UTC", () => {
    expect(resolveRange({ days: "7" }, 14, now)).toMatchObject({ from: "2026-08-30", to: "2026-09-05", days: 7, sinceIso: "2026-08-30T06:00:00.000Z", untilIso: "2026-09-06T05:59:59.999Z" });
    expect(resolveRange({ days: "30" }, 14, now)).toMatchObject({ from: "2026-08-07", days: 30 });
  });
  it.each(["0", "-1", "1.5", "Infinity", "NaN", "1e2", "999999", "367", "", "7foo", "007"])("rechaza días inválidos: %s", days => {
    expect(() => resolveRange({ days }, 14, now)).toThrow(InvalidRangeError);
  });
  it.each([
    { from: "2026-02-30", to: "2026-03-01" }, { from: "2026-09-05" }, { to: "2026-09-05" },
    { from: "2026-09-06", to: "2026-09-05" }, { from: "2026-09-05", to: "2026-09-06" },
    { from: "2024-01-01", to: "2026-01-01" }, { from: "0000-01-01", to: "0000-01-01" },
    { from: ["2026-09-01", "2026-09-02"], to: "2026-09-05" },
  ])("rechaza calendario imposible, incompleto, futuro o excesivo: %j", p => {
    expect(() => resolveRange(p as Record<string, string>, 14, now)).toThrow(InvalidRangeError);
  });
  it("valida año bisiesto y enumera extremos inclusivos", () => {
    const earliest = resolveRange({ from: "0001-01-01", to: "0001-01-01" }, 14, now);
    expect(earliest.sinceIso.startsWith("0001-01-01T")).toBe(true); expect(earliest.days).toBe(1);
    expect(isCalendarDate("2024-02-29")).toBe(true); expect(isCalendarDate("2025-02-29")).toBe(false);
    const range = resolveRange({ from: "2024-02-28", to: "2024-03-01", days: "999999" }, 14, now);
    expect(listDays(range)).toEqual(["2024-03-01", "2024-02-29", "2024-02-28"]);
    expect(range.label).toBe("del 28 feb 2024 al 1 mar 2024");
  });
  it("acepta exactamente 366 días, sin bucles ilimitados", () => {
    const range = resolveRange({ days: "366" }, 14, now);
    expect(listDays(range)).toHaveLength(366);
    expect(() => listDays({ ...range, from: "1900-01-01" })).toThrow(InvalidRangeError);
  });
  it.each([
    ["2021-07-01", "2021-07-01T05:00:00.000Z", "2021-07-02T04:59:59.999Z"],
    ["2021-04-04", "2021-04-04T06:00:00.000Z", "2021-04-05T04:59:59.999Z"],
    ["2021-10-31", "2021-10-31T05:00:00.000Z", "2021-11-01T05:59:59.999Z"],
  ])("respeta offsets y días de 23/25 horas históricos: %s", (date, sinceIso, untilIso) => {
    expect(resolveRange({ from: date, to: date }, 14, now)).toMatchObject({ days: 1, sinceIso, untilIso });
  });
  it("entrega estado inválido a la página, no una ventana diferente", () => expect(readRange({ days: "Infinity" }, 14)).toBeNull());
});
