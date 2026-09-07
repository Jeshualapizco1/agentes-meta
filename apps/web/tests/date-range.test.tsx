// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DateRange } from "@/components/DateRange";
describe("selector controlado con React", () => {
  let root: Root, container: HTMLDivElement;
  beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  const render = async (days: number, from?: string, to?: string) => act(async () => root.render(<form><DateRange days={days} from={from} to={to} today="2026-09-06" /></form>));
  it("seleccionar 30 cambia el valor enviado, aunque las props sigan en 7", async () => {
    await render(7); const select = container.querySelector("select")!;
    await act(async () => { select.value = "30"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(new FormData(container.querySelector("form")!).get("days")).toBe("30");
  });
  it("props nuevas de navegación restauran el rango sin conservar un borrador anterior", async () => {
    await render(7); await render(30); expect(container.querySelector("select")!.value).toBe("30");
    await render(7); expect(container.querySelector("select")!.value).toBe("7");
    await render(3, "2026-09-01", "2026-09-03"); expect(container.querySelector("select")!.value).toBe("custom");
    expect(new FormData(container.querySelector("form")!).has("days")).toBe(false);
    await render(30); expect(container.querySelectorAll('input[type="date"]')).toHaveLength(0);
  });
  it("un periodo heredado fuera de los atajos se muestra como seleccionado", async () => {
    await render(28); expect(container.querySelector("select")!.value).toBe("28");
  });
  it("vincula etiqueta y select sin incluir las opciones en el nombre", async () => {
    await render(7); const select = container.querySelector("select")!;
    expect(container.querySelector("label")!.htmlFor).toBe(select.id); expect(container.querySelector("label")!.textContent).toBe("Periodo");
  });
});
