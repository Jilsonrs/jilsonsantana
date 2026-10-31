import type { PrismaClient } from "../generated/prisma/client.js";
import { novoPrisma } from "./ligacoes.js";

// O cliente gerado pelo Prisma 7 (`prisma generate` → `src/generated/prisma`, fora do git). Todo
// código do servidor importa o `Prisma` e os tipos do banco DAQUI, e não do caminho gerado. As
// ligações (o `pg`, o TLS, o tamanho do pool) moram em `ligacoes.ts`.
export { Prisma, NotificationKind, SubscriptionEmailKind, OrigemDoLead, QuemFez, TipoDeCaso } from "../generated/prisma/client.js";
export type { PrismaClient } from "../generated/prisma/client.js";

// Single shared Prisma client for the app's route handlers (Phase 2 on). Prisma
// is the SOLE accessor to the database (CLAUDE.md). The globalThis cache keeps tsx
// `dev` hot-reloads from opening a new connection pool on every file change.
//
// Note: lib/auth.ts and seed.ts still construct their own PrismaClient (Better
// Auth adapter / standalone seed). Consolidating them onto this singleton is a
// deliberate future cleanup — left out of this block to avoid touching auth.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? novoPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** Os nomes que o Postgres dá ao UTC. */
export const FUSOS_EM_UTC: readonly string[] = ["UTC", "GMT", "Etc/UTC", "Etc/GMT", "Universal", "Zulu"];

/**
 * O BANCO TEM DE ESTAR EM UTC (Prisma 7, 26/10/2026). O adaptador do `pg` lê toda data COM fuso
 * trocando o fuso que o banco devolve por "+00:00": num banco em outro fuso, ela sairia errada pela
 * diferença, sem erro nenhum (no banco de teste do computador, que estava no horário de Brasília,
 * saiu 3 h errada). O Neon está em GMT, no dev e no ar; o servidor confere ao subir e, se mudar,
 * alerta em vez de gravar e ler datas erradas em silêncio.
 */
export async function conferirFusoDoBanco(cliente: PrismaClient = prisma): Promise<boolean> {
  const [linha] = await cliente.$queryRaw<{ fuso: string }[]>`SELECT current_setting('TimeZone') AS fuso`;
  const fuso = linha?.fuso ?? "(desconhecido)";
  if (FUSOS_EM_UTC.includes(fuso)) return true;
  console.error(`[api] o banco não está em UTC (fuso ${fuso}): as datas com fuso sairiam erradas`);
  return false;
}
