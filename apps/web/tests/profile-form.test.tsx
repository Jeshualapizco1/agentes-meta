// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ProfileForm } from "@/app/configuracion/ProfileForm";
import { saveProfileState } from "@/app/configuracion/actions";
vi.mock("@/app/configuracion/actions", () => ({ saveProfileState: vi.fn() }));

describe("formulario de configuración con React", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  async function render(canEdit = true) {
    await act(async () => root.render(<ProfileForm canEdit={canEdit}>
      <input name="expected_version" defaultValue="1" type="hidden" />
      <input name="target_roas" defaultValue="3" />
      <input name="whitelist" value="102" type="checkbox" defaultChecked />
    </ProfileForm>));
  }
  it("conserva texto y selección después de un conflicto y permite corregir", async () => {
    vi.mocked(saveProfileState).mockResolvedValue({ error: "Otra persona guardó una versión más reciente." });
    await render();
    const input = container.querySelector<HTMLInputElement>('[name="target_roas"]')!;
    const checkbox = container.querySelector<HTMLInputElement>('[name="whitelist"]')!;
    input.value = "9"; checkbox.checked = false;
    await act(async () => container.querySelector("form")!.requestSubmit());
    expect(saveProfileState).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveProfileState).mock.calls[0]![1].get("target_roas")).toBe("9");
    expect(input.value).toBe("9"); expect(checkbox.checked).toBe(false);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("más reciente");
    expect(container.querySelector("button")?.disabled).toBe(false);
  });
  it("deshabilita el envío duplicado durante la petición", async () => {
    let finish!: (value: { error: string }) => void;
    vi.mocked(saveProfileState).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    await render();
    await act(async () => container.querySelector("form")!.requestSubmit());
    expect(container.querySelector("button")?.disabled).toBe(true);
    expect(container.querySelector("fieldset")?.disabled).toBe(true);
    await act(async () => finish({ error: "No se pudo confirmar el guardado." }));
    expect(container.querySelector("fieldset")?.disabled).toBe(false);
  });
  it("un buyer solo ve consulta sin botón de guardar", async () => {
    await render(false); expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("fieldset")?.disabled).toBe(true);
  });
});
