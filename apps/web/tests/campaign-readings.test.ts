import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, fetchAll } from "@/lib/db";
import { loadCampaignReadings } from "@/lib/campaign-readings";
import { campaignRoasTone, presentCampaignTrend, type CampaignReading } from "@/lib/hoy-view";
import { calendarOffset } from "@agentes-meta/core";
import { fakeQuery } from "./fixtures";
vi.mock("@/lib/db", () => ({ db: vi.fn(), fetchAll: vi.fn() }));
const entity = (id: string) => ({ id, name: `Campaña ${id}`, level: "campaign", effective_status: "ACTIVE", campaign_id: null, daily_budget: 10000, snapshot_at: "2026-09-07T12:00:00Z" });
const rows = (id: string, current = 3, previous = 2, days = 14) => Array.from({ length: days }, (_, i) => ({ entity_id: id, date: calendarOffset("2026-09-07", -i - 1), spend: "100", purchases: "10", purchase_value: String(100 * (i < 7 ? current : previous)), is_closed_day: true, fetched_at: "2026-09-07T12:00:00Z" }));
describe("lectura ligera de campañas activas", () => {
  let tables: Record<string, ReturnType<typeof fakeQuery> & { order: ReturnType<typeof vi.fn>; gte: ReturnType<typeof vi.fn>; lte: ReturnType<typeof vi.fn>; range: ReturnType<typeof vi.fn> }>;
  beforeEach(() => {
    vi.resetAllMocks();
    const q = (data: unknown = null) => { const query = Object.assign(fakeQuery(data), { order: vi.fn(), gte: vi.fn(), lte: vi.fn(), range: vi.fn(async () => ({ data: [], error: null })) }); for (const key of ["order", "gte", "lte"] as const) query[key].mockReturnValue(query); return query; };
    tables = { entities: q(), insights_daily: q(), account_profiles: q({ target_roas: 3, breakeven_roas: 2, target_cpa: 20 }) };
    vi.mocked(db).mockReturnValue({ from: vi.fn((name: string) => tables[name]) } as unknown as ReturnType<typeof db>);
    vi.mocked(fetchAll).mockImplementation(async build => { const built = build(); return (built === tables.entities ? [entity("a"), entity("b")] : [...rows("a", 4), ...rows("b", 1)]) as never; });
  });
  it("reutiliza el core, normaliza números y prioriza proteger", async () => {
    const out = await loadCampaignReadings("100", "2026-09-07");
    expect(out.map(r => r.id)).toEqual(["b", "a"]);
    expect(out[0]).toMatchObject({ spend: 700, purchases: 70, roas: 1, previousRoas: 2, cpa: 10, available: 7, previousAvailable: 7, kind: "protect" });
    expect(out[1]!.kind).toBe("scale");
    expect(tables.entities!.eq).toHaveBeenCalledWith("effective_status", "ACTIVE");
    expect(tables.insights_daily!.eq).toHaveBeenCalledWith("account_id", "100");
    expect(tables.insights_daily!.eq).toHaveBeenCalledWith("level", "campaign");
    expect(tables.insights_daily!.gte).toHaveBeenCalledWith("date", "2026-08-24");
    expect(tables.insights_daily!.lte).toHaveBeenCalledWith("date", "2026-09-06");
  });
  it("conserva cobertura parcial y excluye el día en curso", async () => {
    vi.mocked(fetchAll).mockImplementation(async build => (build() === tables.entities ? [entity("a")] : [...rows("a", 4, 2, 6), { ...rows("a")[0], date: "2026-09-07", spend: "99999", is_closed_day: false }]) as never);
    expect((await loadCampaignReadings("100", "2026-09-07"))[0]).toMatchObject({ spend: 600, available: 6, kind: "observe" });
  });
  it("no muestra campañas sin inversión", async () => {
    vi.mocked(fetchAll).mockImplementation(async build => (build() === tables.entities ? [entity("a")] : rows("a").map(r => ({ ...r, spend: "0" }))) as never);
    expect(await loadCampaignReadings("100", "2026-09-07")).toEqual([]);
  });
  it("un fallo no se convierte en lista vacía", async () => { vi.mocked(fetchAll).mockRejectedValue(new Error("lectura fallida")); await expect(loadCampaignReadings("100", "2026-09-07")).rejects.toThrow("lectura fallida"); });
  it("ordena por gasto después de proteger, sin privilegiar crecimiento sobre observar", async () => {
    vi.mocked(fetchAll).mockImplementation(async build => (build() === tables.entities ? [entity("a"), entity("b")] : [...rows("a", 4), ...rows("b", 2.5).map(r => ({ ...r, spend: "200", purchase_value: "500", purchases: "20" }))]) as never);
    expect((await loadCampaignReadings("100", "2026-09-07")).map(r => r.id)).toEqual(["b", "a"]);
  });
});
const reading: CampaignReading = { id: "a", name: "Campaña", spend: 700, purchases: 70, roas: 2.24, previousRoas: 2, cpa: 10, available: 7, previousAvailable: 7, kind: "observe", targetRoas: 3, breakevenRoas: 2 };
describe("tendencia y color por campaña", () => {
  it.each([[2.24, "▲ +12\u2009%"], [1.84, "▼ −8\u2009%"], [2, "="], [2.001, "="], [null, "—"]])("muestra tendencia para ROAS %s", (roas, label) => expect(presentCampaignTrend({ ...reading, roas })).toBe(label));
  it("no compara bases incompletas ni cero", () => { expect(presentCampaignTrend({ ...reading, previousAvailable: 6 })).toBe("—"); expect(presentCampaignTrend({ ...reading, previousRoas: 0 })).toBe("—"); });
  it("muestra días disponibles sin semáforo", () => { expect(presentCampaignTrend({ ...reading, available: 4 })).toBe("4 de 7 días"); expect(campaignRoasTone({ ...reading, available: 4, roas: 4 })).toBe("neutral"); });
  it("aplica meta y equilibrio inclusivos; sin meta es neutro", () => {
    expect(campaignRoasTone({ ...reading, roas: 3 })).toBe("ok"); expect(campaignRoasTone({ ...reading, roas: 2 })).toBe("amber"); expect(campaignRoasTone({ ...reading, roas: 1.9 })).toBe("crit"); expect(campaignRoasTone({ ...reading, targetRoas: null })).toBe("neutral");
  });
});
