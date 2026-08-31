import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

// O env de TESTE é carregado pelo globalSetup (que importa a trava do servidor),
// não aqui. A config antiga lia `../server/.env` num try/catch silencioso — ou
// seja, apontava para o banco de DEV/produção sem avisar ninguém. As credenciais
// que as specs usam chegam via `webServer.env` + o próprio globalSetup.
const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..");
const TEST_ENV_FILE = path.resolve(REPO_ROOT, "server/.env.test");

export default defineConfig({
  testDir: "./tests",

  // O globalSetup roda a trava de host local, o reset e o seed — nesta ordem,
  // antes de o webServer subir.
  globalSetup: "./global-setup.ts",

  // FALSE de propósito: as specs compartilham UM banco. Em paralelo elas
  // disputam as mesmas linhas e produzem falha intermitente, que é a pior
  // classe de teste — mesma razão do `fileParallelism: false` da suíte de
  // servidor.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",

  use: {
    // localhost, não 127.0.0.1: o Vite escuta em `[::1]` (IPv6), e o IPv4
    // recusa conexão mesmo com tudo funcionando.
    baseURL: process.env.BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Auth precisa da API (3000) E do client Vite (5173, que proxeia /api -> 3000).
  //
  // `--env-file` é o ponto: o servidor faz `import "dotenv/config"`, que carrega
  // `server/.env` (o banco de DEV). Como o dotenv NÃO sobrescreve variável já
  // presente no ambiente, o que o Node injeta por `--env-file` VENCE. Sem isso o
  // Playwright resetaria o banco local e depois dirigiria um servidor conectado
  // a outro banco — testando um mundo que não é o que ele preparou.
  webServer: [
    {
      command: `node --env-file=${TEST_ENV_FILE} --import tsx/esm src/index.ts`,
      cwd: path.resolve(REPO_ROOT, "server"),
      url: "http://localhost:3000/api/health",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "npm run dev:client",
      cwd: REPO_ROOT,
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
