import { loadTestEnv, assertTestDatabase } from "./test-env.js";

// setupFiles do Vitest — roda em CADA worker, ANTES de os módulos do app serem
// importados. É aqui que `lib/auth.ts` e o PrismaClient passam a enxergar o
// ambiente de teste.
//
// Por que não basta o globalSetup: ele roda no processo principal; os arquivos
// de teste rodam em workers, que não herdam mutações de `process.env` feitas lá.
// Sem isto, o app subiria apontando para o `.env` — produção.
//
// A trava é reexecutada de propósito: é barata e cobre quem rodar um arquivo de
// teste isolado (`vitest run src/test/smoke.test.ts`), caminho em que o
// globalSetup até roda, mas em que a garantia local vale por si.
loadTestEnv();
assertTestDatabase();
