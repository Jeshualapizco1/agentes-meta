import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const colors = Object.fromEntries([...css.matchAll(/--color-([\w-]+):\s*(#[\da-f]{6})/gi)].map(match => [match[1]!, match[2]!]));
function luminance(hex: string) {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0]! * .2126 + rgb[1]! * .7152 + rgb[2]! * .0722;
}
function contrast(a: string, b: string) { const l1 = luminance(a), l2 = luminance(b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); }

describe("contraste de tokens compartidos (luminancia sRGB, sin redondear para aprobar)", () => {
  const pairs = [
    ...["bg", "paper", "surface", "surface-solid", "surface-hover"].flatMap(bg => [["ink", bg], ["muted", bg]]),
    ["on-accent", "accent"], ["on-accent", "accent-hover"], ["on-accent", "accent-pressed"],
    ["ok", "ok-soft"], ["crit", "crit-soft"], ["crit", "crit-hover"], ["amber", "amber-soft"], ["meta", "meta-soft"],
    ["ok", "surface"], ["crit", "surface"], ["amber", "surface"], ["meta", "surface"],
  ];
  it.each(pairs)("texto %s sobre %s alcanza 4.5:1", (foreground, background) => {
    expect(contrast(colors[foreground!]!, colors[background!]!)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(["paper", "surface", "surface-solid", "surface-hover"])("contorno y foco sobre %s alcanzan 3:1", background => {
    expect(contrast(colors.control!, colors[background]!)).toBeGreaterThanOrEqual(3);
    expect(contrast(colors.focus!, colors[background]!)).toBeGreaterThanOrEqual(3);
  });
  it("el máximo halo de la tarjeta focal mantiene legibilidad", () => {
    const base = colors.surface!, tint = colors.meta!;
    const mixed = "#" + [1, 3, 5].map(i => Math.round(parseInt(base.slice(i, i + 2), 16) * .91 + parseInt(tint.slice(i, i + 2), 16) * .09).toString(16).padStart(2, "0")).join("");
    expect(contrast(colors.muted!, mixed)).toBeGreaterThanOrEqual(4.5);
  });
  it("la hoja global respeta movimiento reducido y controles sin tipografía remota", () => {
    expect(css).toContain("prefers-reduced-motion: reduce"); expect(css).toContain("forced-colors: active");
    expect(readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8")).not.toContain("fonts.googleapis.com");
  });
});
