import type { User } from "@supabase/supabase-js";
import { vi } from "vitest";

export function fakeUser(email = "buyer@example.invalid"): User {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    email,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
}

/** Doble de consultas: registra llamadas, NO simula transacciones ni RLS. */
export function fakeQuery(data: unknown = null, error: { message: string } | null = null) {
  const result = Promise.resolve({ data, error });
  const query = {
    select: vi.fn(), eq: vi.fn(), in: vi.fn(), is: vi.fn(),
    upsert: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    maybeSingle: vi.fn(() => result), single: vi.fn(() => result),
    then: result.then.bind(result),
  };
  for (const method of ["select", "eq", "in", "is", "upsert", "insert", "update", "delete"] as const) {
    query[method].mockReturnValue(query);
  }
  return query;
}

export class RedirectSignal extends Error {
  constructor(public readonly location: string) {
    super(`redirect:${location}`);
  }
}
