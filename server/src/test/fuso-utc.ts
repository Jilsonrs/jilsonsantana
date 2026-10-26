import pg from "pg";
import { assertTestDatabase, loadTestEnv } from "./test-env.js";

// O BANCO DE TESTE EM UTC, como o Neon (dev e produção estão em GMT). O adaptador do `pg` no Prisma 7
// lê as datas com fuso como se o banco estivesse em UTC (`lib/prisma.ts` → conferirFusoDoBanco); o
// Postgres instalado no computador vem no fuso da máquina, e as datas saíam 3 h erradas. Roda no
// preparo da suíte de servidor e do E2E, logo depois do reset, com a mesma trava de banco local.
// Vale para as ligações NOVAS: todas as dos testes abrem depois disto.
loadTestEnv();
assertTestDatabase();
const cliente = new pg.Client({ connectionString: process.env.DIRECT_URL });
await cliente.connect();
try {
  await cliente.query(`DO $$ BEGIN EXECUTE format('ALTER DATABASE %I SET timezone TO ''UTC''', current_database()); END $$`);
} finally {
  await cliente.end();
}
