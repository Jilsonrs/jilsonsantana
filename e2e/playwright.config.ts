import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load the server's seed credentials so specs can sign in. Manual parse keeps
// the e2e workspace dependency-free; only sets vars not already present.
function loadServerEnv(): void {
  try {
    const file = readFileSync(resolve(process.cwd(), "../server/.env"), "utf8");
    for (const line of file.split("\n")) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {
    /* .env may be absent (CI) — creds can be provided via the environment */
  }
}
loadServerEnv();

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Auth flows need BOTH the API (3000) and the Vite client (5173, which proxies
  // /api -> 3000). Reuses already-running dev servers locally.
  webServer: [
    {
      command: "npm run dev:server",
      url: "http://localhost:3000/api/health",
      reuseExistingServer: !process.env.CI,
      cwd: "..",
      timeout: 120_000,
    },
    {
      command: "npm run dev:client",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      cwd: "..",
      timeout: 120_000,
    },
  ],
});
