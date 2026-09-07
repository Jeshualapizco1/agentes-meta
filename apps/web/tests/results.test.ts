import { describe, expect, it } from "vitest";
import { presentResult, resultPercent, type Win } from "@/lib/results";
const win = (extra: Partial<Win> = {}): Win => ({ session_id: "s", horizon: "7d", status: "mature", confidence: "high", agreement: "agree", reading: "up", delta: { roas_pct: 18.4 }, metrics_after: { days: 7 }, ...extra });
describe("presentador del resultado de un cambio", () => {
  it.each([
    ["up", 18.4, "ok", "Mejoró · ROAS +18\u2009% (7 d)"],
    ["down", -12.1, "crit", "Empeoró · ROAS −12\u2009% (7 d)"],
    ["flat", 1, "neutral", "Sin cambio claro (7 d)"],
  ])("presenta una ventana madura %s", (reading, pct, tone, label) => {
    expect(presentResult([win({ reading: String(reading), delta: { roas_pct: Number(pct) } })])).toMatchObject({ tone, label, horizon: "7d", detail: "7 de 7 días medidos · evidencia sólida" });
  });
  it("da prioridad a mixta sobre mejora", () => expect(presentResult([win({ agreement: "mixed" })])).toMatchObject({ tone: "amber", label: "Resultado mixto (7 d)" }));
  it.each(["up", "down"])("no colorea como resultado final una preliminar %s", reading => expect(presentResult([win({ status: "preliminary", reading })])).toMatchObject({ tone: "amber", label: expect.stringContaining(" · preliminar") }));
  it("presenta pendiente antes que insuficiente", () => expect(presentResult([win({ status: "pending", confidence: "insufficient" })])).toMatchObject({ tone: "neutral", label: "Esperando días completos" }));
  it("presenta evidencia insuficiente antes que mixta", () => expect(presentResult([win({ confidence: "insufficient", agreement: "mixed" })])).toMatchObject({ tone: "neutral", label: "Sin evidencia suficiente" }));
  it("no inventa resultado ni horizonte sin ventanas", () => expect(presentResult([])).toMatchObject({ tone: "neutral", horizon: null, horizons: [], detail: "" }));
  it("elige la madura más larga sin modificar la entrada", () => {
    const wins = [win({ horizon: "14d", status: "preliminary" }), win({ horizon: "72h" }), win()];
    expect(presentResult(wins).horizon).toBe("7d"); expect(wins[0]!.horizon).toBe("14d");
    expect(presentResult([win(), win({ horizon: "14d" })]).horizon).toBe("14d");
  });
  it("prefiere preliminar a pendiente y el horizonte más largo de cada estado", () => {
    expect(presentResult([win({ status: "preliminary" }), win({ horizon: "14d", status: "pending" })]).horizon).toBe("7d");
    expect(presentResult([win({ status: "pending" }), win({ horizon: "14d", status: "pending" })]).horizon).toBe("14d");
  });
  it("usa días medidos y primera salvedad; nunca estima días faltantes", () => {
    expect(presentResult([win({ confidence: "medium", caveats: ["Presupuesto compartido", "Otra"], metrics_after: { days: 4 } })]).detail).toBe("4 de 7 días medidos · evidencia media · Presupuesto compartido");
    expect(presentResult([win({ metrics_after: null })]).detail).toContain("— de 7");
  });
  it("formatea signos y valores no calculables", () => { expect(resultPercent(-12)).toBe("−12\u2009%"); expect(resultPercent(0)).toBe("+0\u2009%"); expect(resultPercent(NaN)).toBe("—"); });
});
