import { describe, expect, it } from "vitest";
import { presentAlert, type AlertRow } from "@/lib/alerts";

const row = (kind: string, extra: Partial<AlertRow> = {}): AlertRow => ({
  id: `alerta-${kind}`,
  kind,
  severity: "warning",
  message: "Mensaje comprensible",
  created_at: "2026-09-07T18:40:00Z",
  account_id: "cuenta 1",
  ...extra,
});

describe("presentación de alertas", () => {
  it.each([
    ["collector_failed", "La sincronización con Meta no terminó"],
    ["insights_failed", "No se pudieron actualizar las métricas de Meta"],
    ["analyst_failed", "La evaluación de resultados no terminó"],
    ["strategist_failed", "La revisión del agente no terminó"],
    ["meta_token_expiring", "La conexión con Meta vence pronto"],
    ["account_status", "La cuenta de Meta no está activa"],
    ["emergency_brake", "Freno de emergencia activado"],
    ["experiment_ready", "Una prueba terminó su ventana"],
    ["budget_committed", "Presupuestos activos por encima del techo"],
    ["spend_over_ceiling", "El gasto de ayer rebasó el techo"],
    ["budget_over_ceiling", "El presupuesto activo rebasa el techo"],
  ])("humaniza %s", (kind, title) => expect(presentAlert(row(kind), {}).title).toBe(title));

  it("usa la indicación humana y enlaza el cambio huérfano", () => {
    const alert = presentAlert(row("collector_failed", { message: "detalle interno", payload: { reason: "annotation_orphan", hint: "Revisa la razón guardada.", session_id: "sesión/1" } }), {});
    expect(alert.description).toBe("Revisa la razón guardada.");
    expect(alert.action).toEqual({ label: "Abrir el cambio", href: "/sesion/sesi%C3%B3n%2F1?account=cuenta%201" });
    expect(alert.technical).toBe("detalle interno");
  });

  it("oculta el mensaje sensible de conexión y formatea su vencimiento", () => {
    const alert = presentAlert(row("meta_token_expiring", { message: "nombre de acceso interno", payload: { expires_at: "2026-11-02T12:00:00Z" } }), {});
    expect(alert.description).toContain("2 nov 2026");
    expect(alert.description).not.toContain("nombre de acceso interno");
  });

  it("quita la instrucción técnica de una prueba terminada", () => {
    const alert = presentAlert(row("experiment_ready", { message: "La prueba A ya terminó. Confirmar en /experimentos." }), {});
    expect(alert.description).toBe("La prueba A ya terminó.");
    expect(alert.action?.href).toBe("/experimentos?account=cuenta%201");
  });

  it("reemplaza un error crudo desconocido y lo conserva solo como detalle técnico", () => {
    const alert = presentAlert(row("nuevo_tipo", { message: "TypeError: fetch failed" }), {});
    expect(alert.description).toBe("Ocurrió un problema al actualizar los datos. Se reintenta sola.");
    expect(alert.technical).toBe("TypeError: fetch failed");
  });

  it("ningún título conserva guiones bajos", () => {
    const kinds = ["collector_failed", "insights_failed", "analyst_failed", "strategist_failed", "meta_token_expiring", "account_status", "emergency_brake", "experiment_ready", "budget_committed", "spend_over_ceiling", "budget_over_ceiling", "tipo_desconocido"];
    expect(kinds.map(kind => presentAlert(row(kind), {}).title).every(title => !title.includes("_"))).toBe(true);
  });
});
