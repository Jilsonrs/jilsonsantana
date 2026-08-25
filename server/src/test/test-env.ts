import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Carregamento de env + TRAVA do banco de teste. Importado por DOIS contextos
// do Vitest, de propósito:
//   - `global-setup.ts`  → roda 1× no processo principal (reset + seed)
//   - `setup.ts`         → roda em CADA worker de teste (o app precisa do env)
// Vitest executa globalSetup e os arquivos de teste em contextos diferentes;
// mutar `process.env` em um não garante o outro. Daí os dois importarem isto.

/**
 * Ref do projeto Supabase de TESTE ("Jilson Santana Test").
 *
 * É comparado contra a `DATABASE_URL` antes de qualquer conexão porque o passo
 * seguinte é `prisma migrate reset --force`, que DROPA TODAS AS TABELAS sem
 * pedir confirmação. Apontado para o lugar errado, apaga a produção.
 *
 * Por que o REF e não a substring `_test` (a regra anterior, que NÃO
 * funcionava): o host do Supabase é montado a partir do project ref opaco,
 * nunca do nome do projeto — "Jilson Santana Website" atende em
 * `...gaxmbnhwltljlkukdwba...`, onde o nome não aparece. Uma trava contra
 * `_test` nunca dispararia, e trava que nunca dispara é o mesmo defeito do
 * `lint` que mentia. O ref é único globalmente: isto verifica IDENTIDADE, não
 * semelhança de texto. (CLAUDE.md → Database & Migrations.)
 */
export const TEST_DB_REF = "mvaobzypsiuhqzipcelw";

const here = path.dirname(fileURLToPath(import.meta.url));
/** Raiz do workspace `server` — daqui saem `.env.test`, o schema e o seed. */
export const SERVER_ROOT = path.resolve(here, "../..");
export const TEST_ENV_FILE = path.join(SERVER_ROOT, ".env.test");

/**
 * Carrega `.env.test` com `override: true`.
 *
 * O `override` é o ponto: sem ele, um `.env` já carregado no shell (ou pelo
 * `dotenv/config` de outro import) VENCERIA, e a suíte rodaria contra o banco
 * de desenvolvimento — que hoje é o de produção. O requisito é determinismo:
 * a suíte não pode depender de o operador ter feito `set -a` no terminal.
 */
export function loadTestEnv(): void {
  const result = loadEnv({ path: TEST_ENV_FILE, override: true });
  if (result.error) {
    throw new Error(
      `Não consegui ler ${TEST_ENV_FILE}. A suíte de servidor exige esse arquivo ` +
        `(ver server/.env.example). Erro: ${result.error.message}`,
    );
  }
}

/**
 * TRAVA. Lança se a `DATABASE_URL` não for a do banco de teste.
 *
 * Chamada ANTES de qualquer conexão e antes de qualquer comando destrutivo.
 */
export function assertTestDatabase(): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não está definida após carregar .env.test — abortando.");
  }
  if (!url.includes(TEST_DB_REF)) {
    throw new Error(
      `TRAVA DE BANCO DE TESTE: DATABASE_URL não aponta para o projeto de teste ` +
        `(ref esperado: ${TEST_DB_REF}). A suíte roda ` +
        `\`prisma migrate reset --force\`, que apaga todas as tabelas. Abortando ` +
        `antes de qualquer conexão.`,
    );
  }
  // Sem BETTER_AUTH_SECRET o Better Auth falha de forma obscura no meio do seed;
  // falhar aqui, com a causa dita, custa segundos em vez de uma sessão.
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET não está definida no .env.test — abortando.");
  }
}

/** Env explícito para processos-filho (prisma CLI, seed). */
export function childEnv(): NodeJS.ProcessEnv {
  // Passado EXPLICITAMENTE em vez de herdado: o prisma CLI e o seed carregam
  // `server/.env` (produção!) por conta própria via dotenv. Como dotenv NÃO
  // sobrescreve variável já presente no ambiente, o que passamos aqui vence.
  // Herdar seria o caminho até produção.
  return {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  };
}
