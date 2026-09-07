import http from "node:http";
import https from "node:https";
import { Socket } from "node:net";
import { beforeEach, vi } from "vitest";

function denyNetwork(): never {
  throw new Error("Red real bloqueada en pruebas: configura un doble explícito.");
}

function installGuards() {
  vi.stubGlobal("fetch", vi.fn(async () => denyNetwork()));
  vi.spyOn(http, "request").mockImplementation(denyNetwork);
  vi.spyOn(http, "get").mockImplementation(denyNetwork);
  vi.spyOn(https, "request").mockImplementation(denyNetwork);
  vi.spyOn(https, "get").mockImplementation(denyNetwork);
  vi.spyOn(Socket.prototype, "connect").mockImplementation(denyNetwork);
  vi.stubEnv("SUPABASE_URL", "https://supabase.example.invalid");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-not-a-secret");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-only-public-key");
}

// También antes de importar los módulos bajo prueba, no solo dentro de cada test.
installGuards();
beforeEach(installGuards);
