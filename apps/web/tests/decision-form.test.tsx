// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DecisionDesk } from "@/components/decisiones/DecisionDesk";
import { previewDecisionPolicy, saveDecisionPolicy } from "@/app/decisiones/actions";

vi.mock("@/app/decisiones/actions", () => ({ previewDecisionPolicy: vi.fn(), saveDecisionPolicy: vi.fn(), generateDecisionProposals: vi.fn(), recordOpportunityDecision: vi.fn() }));
const props = {
  account: { id: "100", name: "Cuenta de prueba", currency: "MXN", timezone_name: "America/Mexico_City" },
  accounts: [{ id: "100", name: "Cuenta de prueba" }], admin: true,
  profile: { mode: "semi", dry_run: true, max_budget_change_pct: 20 },
  opportunities: [], reviews: [], today: "2026-09-06", evaluation: { proposals: [], exclusions: [], evaluatedAt: "2026-09-07T02:00:00Z" },
  rules: [{ id: "rule-test", version: 2, name: "Criterio de prueba", action: "subir_presupuesto", status: "activa", condition: { version: 1, level: "campaign", metric: "roas", operator: "gt", threshold: 3, days: 3, minPurchases: 3, minSpend: 100, changePct: 10, consecutive: false } }],
} as unknown as ComponentProps<typeof DecisionDesk>;

describe("intención del botón en el formulario real de reglas", () => {
  let container: HTMLDivElement, root: Root;
  beforeEach(async () => {
    vi.clearAllMocks(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.mocked(previewDecisionPolicy).mockResolvedValue({ ok: true, message: "Evaluación lista" });
    vi.mocked(saveDecisionPolicy).mockResolvedValue({ ok: true, message: "Regla guardada" });
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => root.render(<DecisionDesk {...props} />));
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  it.each([
    ["Evaluar con datos reales", "preview"], ["Guardar borrador", "draft"], ["Usar en simulación", "activate"],
  ])("%s envía su intención sin que React sustituya el nombre", async (label, intent) => {
    const form = container.querySelector<HTMLInputElement>('[name="ruleId"][value="rule-test"]')!.form!;
    const button = [...form.querySelectorAll("button")].find(b => b.textContent === label)!;
    await act(async () => form.requestSubmit(button));
    const expected = intent === "preview" ? previewDecisionPolicy : saveDecisionPolicy;
    const other = intent === "preview" ? saveDecisionPolicy : previewDecisionPolicy;
    expect(expected).toHaveBeenCalledTimes(1); expect(other).not.toHaveBeenCalled();
    expect(vi.mocked(expected).mock.calls[0]![1].get("intent")).toBe(intent);
    expect(vi.mocked(expected).mock.calls[0]![1].get("ruleId")).toBe("rule-test");
    expect(form.querySelector('[role="status"]')?.textContent).toBe(intent === "preview" ? "Evaluación lista" : "Regla guardada");
  });
});
