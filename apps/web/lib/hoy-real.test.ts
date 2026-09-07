import { describe, expect, it } from "vitest";
import { aggregateRealInsights, buildRealHoySnapshot, mapRealProposal, type RealInsight, type RealProposal } from "./hoy-real";

const ok = <T,>(data: T) => ({ data, error: null } as const);
const failed = <T,>() => ({ data: null, error: true } as const);
const run = { started_at: "2026-09-06T15:00:00Z", finished_at: "2026-09-06T15:05:00Z", status: "ok" };
const proposal: RealProposal = { id: "p1", account_id: "100", rule_name: "regla real", action: "subir_presupuesto", entity_name: "Campaña A", entity_level: "campaign", entity_id: "c1", before_value: 1000, after_value: 1100, evidence: [{ ref: "R1", label: "ROAS", value: 4.2 }], locks: [{ lock: "brake", ok: true, reason: "liberado" }], created_at: "2026-09-06T14:00:00Z", expires_at: "2026-09-07T14:00:00Z" };
type SnapshotInput = Parameters<typeof buildRealHoySnapshot>[0];
function input(): SnapshotInput {
  return {
    account: { id: "100", name: "Cuenta real", currency: "MXN", timezone_name: "America/Mazatlan" }, reportingDate: "2026-09-06", asOf: "2026-09-06T16:00:00Z",
    insights: ok<RealInsight[]>([]), profile: ok({ mode: "semi", dry_run: true }), proposals: ok([proposal]), decisions: ok([]), alerts: ok([]), activity: ok([]), brake: ok(null), collector: ok(run), strategist: ok(run),
  };
}

describe("adaptador de lectura real de Hoy", () => {
  it("agrega filas de campaña por día sin contar un null de Meta como fallo", () => {
    const rows: RealInsight[] = [
      { date: "2026-09-05", spend: "10.25", purchases: null, purchase_value: null, is_closed_day: true, fetched_at: "2026-09-06T01:00:00Z" },
      { date: "2026-09-05", spend: 20, purchases: 2, purchase_value: 80, is_closed_day: true, fetched_at: "2026-09-06T01:00:00Z" },
    ];
    expect(aggregateRealInsights(rows)).toEqual([{ date: "2026-09-05", closed: true, spend: 30.25, purchases: 2, revenue: 80 }]);
  });
  it("una cifra inválida invalida el día en lugar de convertirla en cero", () => {
    const rows: RealInsight[] = [{ date: "2026-09-05", spend: "invalido", purchases: 1, purchase_value: 20, is_closed_day: true, fetched_at: "2026-09-06T01:00:00Z" }];
    expect(aggregateRealInsights(rows)[0]).toMatchObject({ spend: null, purchases: null, revenue: null });
  });
  it("convierte presupuestos reales expresados en unidades a centavos", () => {
    expect(mapRealProposal(proposal).change).toEqual({ kind: "budget", beforeMinor: 100000, afterMinor: 110000 });
  });
  it("preserva evidencia y candados almacenados", () => {
    const mapped = mapRealProposal(proposal);
    expect(mapped.evidence).toEqual([{ ref: "R1", label: "ROAS", value: "4.2" }]);
    expect(mapped.locks[0]).toMatchObject({ id: "brake", ok: true, reason: "liberado" });
  });
  it("deriva simulación y freno del perfil real sin conceder capacidades", () => {
    const snapshot = buildRealHoySnapshot(input());
    expect(snapshot.agent).toMatchObject({ mode: "semi", execution: "simulation", brake: "released", collection: "ok" });
  });
  it("un fallo de insights no conserva cifras parciales", () => {
    const data = input(); data.insights = failed<RealInsight[]>();
    const snapshot = buildRealHoySnapshot(data);
    expect(snapshot.readings).toEqual({ state: "error", rows: [] });
  });
  it("un fallo de una sección se muestra como error y no como lista vacía", () => {
    const data = input(); data.alerts = failed();
    expect(buildRealHoySnapshot(data).alerts).toEqual({ state: "error" });
  });
  it("una propuesta malformada degrada la sección completa sin tirar el dashboard", () => {
    const data = input(); data.proposals = ok([{ ...proposal, after_value: "no-numérico" }]);
    expect(buildRealHoySnapshot(data).proposals).toEqual({ state: "error" });
  });
  it("una corrida fallida marca datos desactualizados y evita presentarlos como vigentes", () => {
    const data = input(); data.collector = ok({ ...run, status: "failed" });
    expect(buildRealHoySnapshot(data).readings.state).toBe("stale");
  });
});
