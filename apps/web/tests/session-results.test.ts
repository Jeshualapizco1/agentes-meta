import { expect, it, vi } from "vitest";
import { db, fetchAll } from "@/lib/db";
import { loadSessionResults } from "@/lib/session-results";
import { fakeQuery } from "./fixtures";
vi.mock("@/lib/db", () => ({ db: vi.fn(), fetchAll: vi.fn() }));
it("pagina ventanas en lotes de 200 sesiones y agrupa por origen", async () => {
  const q = Object.assign(fakeQuery(), { order: vi.fn() }); q.order.mockReturnValue(q);
  const sb = { from: vi.fn(() => q) } as unknown as ReturnType<typeof db>;
  vi.mocked(fetchAll).mockImplementation(async build => { build(); return [{ session_id: "s0", horizon: "7d" }] as never; });
  const results = await loadSessionResults(sb, Array.from({ length: 401 }, (_, i) => `s${i}`));
  expect(q.in.mock.calls.map(call => call[1].length)).toEqual([200, 200, 1]);
  expect(fetchAll).toHaveBeenCalledTimes(3); expect(results.get("s0")).toHaveLength(3);
});
