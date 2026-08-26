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
 * Hosts aceitos para o banco de TESTE — e só eles.
 *
 * É verificado antes de qualquer conexão porque o passo seguinte é
 * `prisma migrate reset --force`, que DROPA TODAS AS TABELAS sem pedir
 * confirmação. Apontado para o lugar errado, apaga a produção.
 *
 * HISTÓRICO DA TRAVA — duas mudanças, cada uma consertando o defeito da
 * anterior. Registrado aqui porque as duas vezes o problema foi o MESMO:
 * comparar TEXTO em vez de verificar IDENTIDADE.
 *
 *  1. `url.includes("_test")` — nunca disparava. O host do Supabase é montado
 *     a partir do project ref opaco, não do nome do projeto: "Jilson Santana
 *     Website" atende em `...gaxmbnhwltljlkukdwba...`, sem o nome em lugar
 *     nenhum. Trava que nunca dispara é o defeito do `lint` que mentia.
 *  2. `url.includes(TEST_DB_REF)` — funcionava, mas o banco de teste deixou de
 *     morar no Supabase (Ago 2026: Postgres local, ver CLAUDE.md → Database &
 *     Migrations), então não há mais ref a comparar.
 *
 * A forma atual verifica o **hostname parseado**, não uma substring da URL, e
 * isso não é preciosismo: `postgresql://u:p@evil.com:5432/localhost` **passa**
 * num `includes("localhost")` e é BLOQUEADO aqui. Um banco em `localhost` não
 * pode ser um banco de nuvem — a garantia é estrutural, não textual.
 */
export const ALLOWED_TEST_HOSTS = ["localhost", "127.0.0.1", "::1"] as const;

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
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error(
      "TRAVA DE BANCO DE TESTE: DATABASE_URL não é uma URL parseável — abortando " +
        "antes de qualquer conexão.",
    );
  }
  // O parser devolve IPv6 entre colchetes (`[::1]`); a lista guarda a forma nua.
  const host = hostname.replace(/^\[|\]$/g, "");
  if (!(ALLOWED_TEST_HOSTS as readonly string[]).includes(host)) {
    throw new Error(
      `TRAVA DE BANCO DE TESTE: DATABASE_URL aponta para o host "${host}", que não ` +
        `é local (aceitos: ${ALLOWED_TEST_HOSTS.join(", ")}). A suíte roda ` +
        `\`prisma migrate reset --force\`, que apaga todas as tabelas — em produção ` +
        `isso destrói o banco que o Railway serve. Abortando antes de qualquer conexão.`,
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
