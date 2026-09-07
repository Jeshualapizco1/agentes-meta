import { defineConfig } from "@playwright/test";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const packageRequire = createRequire(__filename);
export default defineConfig({
  testDir: "./preview/tests", outputDir: "./visual-results", fullyParallel: false, workers: 1,
  timeout: 30_000, reporter: "list",
  use: { baseURL: "http://127.0.0.1:4174", browserName: "chromium", headless: true, locale: "es-MX", colorScheme: "dark", screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: {
    command: `"${process.execPath}" "${join(dirname(packageRequire.resolve("vite/package.json")), "bin/vite.js")}" --config vite.visual.config.ts --port 4174`,
    url: "http://127.0.0.1:4174", reuseExistingServer: false, timeout: 30_000,
    env: { VISUAL_DEMO_PUBLIC_ENVIRONMENT: "fixture" },
  },
});
