import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// A CONFIGURAÇÃO DO PRISMA 7 (26/10/2026) — o que o comando `prisma` usa: o esquema, as migrations e
// o banco. O banco das migrations é o DIRECT_URL (sem o `-pooler`), como era o `directUrl` do
// esquema no Prisma 5; o site usa o DATABASE_URL, em `src/lib/ligacoes.ts`.

// O `server/.env` (o banco de DEV) entra SEM sobrescrever variável que já veio no ambiente: é assim
// que a suíte de teste (que passa o banco local por variável) e o job das migrations no Cloud Run (que
// recebe o banco de produção do cofre) continuam valendo. As opções vão ESCRITAS, e não pelo
// `import "dotenv/config"`: com ele, um DOTENV_CONFIG_OVERRIDE no terminal fazia o reset da suíte
// ler o banco de dev — e apagá-lo (revisão de segurança, 26/10/2026; medido no dotenv 18).
config({ path: fileURLToPath(new URL(".env", import.meta.url)), override: false, quiet: true });

// `process.env`, e não o `env()` do Prisma: o `env()` falha sem a variável, e o `prisma generate`
// (no CI e na imagem) roda sem banco nenhum.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DIRECT_URL },
});
