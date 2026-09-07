import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
const webRoot = fileURLToPath(new URL("./", import.meta.url));
/** Laboratorio separado de Next: no importa layouts, sesión, consultas ni Server Actions. */
export default defineConfig({
  root: fileURLToPath(new URL("./preview/", import.meta.url)),
  envDir: fileURLToPath(new URL("./preview/", import.meta.url)),
  envPrefix: "VISUAL_DEMO_PUBLIC_",
  resolve: { alias: { "@": webRoot } },
  esbuild: { jsx: "automatic" },
  server: { host: "127.0.0.1", port: 4173, strictPort: true, fs: { strict: true } },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  build: { outDir: "../visual-dist", emptyOutDir: true },
  plugins: [{ name: "solo-presentacion", enforce: "pre", resolveId(source) {
    if (/@agentes-meta\/(agents|db|meta)|(?:^|\/)lib\/(?:db|auth|admin|supabase)(?:\.|\/|$)|(?:^|\/)app\/.+actions(?:\.|$)/.test(source)) {
      throw new Error("El laboratorio visual no puede importar servicios ni acciones reales.");
    }
  } }],
});
