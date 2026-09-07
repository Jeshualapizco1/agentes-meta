import http from "node:http";
import https from "node:https";
import { Socket } from "node:net";
import { expect, it } from "vitest";

it("bloquea fetch antes de enviar cualquier petición", async () => {
  await expect(fetch("https://example.invalid")).rejects.toThrow("Red real bloqueada");
});

it("bloquea HTTP, HTTPS y TCP directo", () => {
  expect(() => http.get("http://example.invalid")).toThrow("Red real bloqueada");
  expect(() => https.request("https://example.invalid")).toThrow("Red real bloqueada");
  const socket = new Socket();
  try { expect(() => socket.connect(443, "example.invalid")).toThrow("Red real bloqueada"); }
  finally { socket.destroy(); }
});
