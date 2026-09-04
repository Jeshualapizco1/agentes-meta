import { describe, it, expect } from "vitest";
import { formatCriticalAlert, formatDailySummary, formatProposalPending, formatProposalExpired, escapeHtml } from "./index.js";

const URL = "https://bitacora-aromante.netlify.app";
describe("formato de mensajes de Telegram", () => {
  it("alerta crítica: título por tipo, cuenta, mensaje escapado y enlace a estado; clave por id de alerta", () => {
    const n = formatCriticalAlert({ id: "a1", kind: "emergency_brake", message: "gasto <x> & más", account_name: "Aromante 1" }, URL);
    expect(n.key).toBe("alert:a1"); expect(n.kind).toBe("alerta_critica");
    expect(n.text).toBe(`🔴 <b>Freno de emergencia activado</b> · Aromante 1\ngasto &lt;x&gt; &amp; más\n<a href="${URL}/estado">Ver estado</a>`);
  });
  it("resumen diario con los cinco datos y enlace a Hoy; clave por cuenta y día", () => {
    const n = formatDailySummary({ account_id: "170", account_name: "Aromante 1", day: "2026-09-03", reviewed: 146, proposed: 2, blocked: 1, brake: false, matured_windows: 3, experiments_expiring: 1, mode: "semi" }, URL);
    expect(n.key).toBe("summary:170:2026-09-03");
    expect(n.text).toBe(`📋 <b>Aromante 1</b> · pasada del 2026-09-03 (modo semi)\nRevisó 146 entidades, propuso 2 (1 descartadas por candados), freno: no, ventanas maduradas hoy: 3, experimentos por vencer: 1\n<a href="${URL}/hoy?account=170">Abrir Hoy</a>`);
    expect(formatDailySummary({ account_id: "170", account_name: "A", day: "d", reviewed: 0, proposed: 0, blocked: 0, brake: true, matured_windows: 0, experiments_expiring: 0, mode: "off" }, URL).text).toMatch(/freno: SÍ/);
  });
  it("propuesta pendiente: acción, entidad, antes → después, regla, expiración y enlace directo", () => {
    const n = formatProposalPending({ id: "p1", account_id: "170", account_name: "Aromante 1", rule_name: "subir_por_roas", action: "subir_presupuesto", entity_name: "CBO | SCALE", before_value: 1000, after_value: 1150, expires_at: "2026-09-05T06:20:00.000Z" }, URL);
    expect(n.key).toBe("proposal_pending:p1");
    expect(n.text).toBe(`🟡 <b>Propuesta pendiente</b> · Aromante 1\nSubir presupuesto · <b>CBO | SCALE</b>: $1,000 → $1,150 (regla subir_por_roas)\nExpira 2026-09-05 06:20 UTC\n<a href="${URL}/hoy?account=170">Aprobar o rechazar</a>`);
  });
  it("propuesta expirada: dice que se volverá a proponer; clave distinta a la de pendiente", () => {
    const n = formatProposalExpired({ id: "p1", account_id: "170", action: "pausar_anuncio", entity_name: "Anuncio X", before_value: "ACTIVE", after_value: "PAUSED" }, URL);
    expect(n.key).toBe("proposal_expired:p1"); expect(n.text).toMatch(/^⚪ <b>Propuesta expirada sin decisión<\/b>\nPausar anuncio · <b>Anuncio X<\/b>: ACTIVE → PAUSED\n/); expect(n.text).toMatch(/vuelve a proponer/);
  });
  it("escapa HTML", () => { expect(escapeHtml("<b>&</b>")).toBe("&lt;b&gt;&amp;&lt;/b&gt;"); });
});
