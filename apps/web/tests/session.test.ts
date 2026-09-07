import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { currentUser } from "@/lib/supabase/server";
import { fakeUser } from "./fixtures";

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ getAll: () => [], set: vi.fn() })) }));

describe("identidad validada por Auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    { user: fakeUser(), error: null, allowed: true },
    { user: null, error: null, allowed: false },
    { user: null, error: { message: "sesión expirada" }, allowed: false },
    { user: fakeUser(), error: { message: "error de verificación" }, allowed: false },
  ])("no utiliza una identidad si falló su verificación: $allowed", async ({ user, error, allowed }) => {
    vi.mocked(createServerClient).mockReturnValue({ auth: { getUser: vi.fn(async () => ({ data: { user }, error })) } } as unknown as ReturnType<typeof createServerClient>);
    await expect(currentUser()).resolves.toEqual(allowed ? user : null);
    expect(fetch).not.toHaveBeenCalled();
  });
});
