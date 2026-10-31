import { beforeAll, beforeEach } from "vitest";
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

// O LIMITE DE TENTATIVAS das rotas de cobrança (etapa 4.7, passo 1) conta no banco (desde
// 25/10/2026), e os testes dividem o banco: sem zerar, o quinto teste que troca o cartão do
// member@ receberia 429 por causa dos quatro anteriores — e passaria ou reprovaria pela ordem.
// O limite continua LIGADO em todo teste, como em produção; só a contagem recomeça.
// IMPORTADO AQUI DENTRO, e não no topo: o limite agora fala com o banco, e importá-lo antes do
// arquivo de teste criaria o cliente do Prisma com o endereço de sempre — o teste que liga o banco
// com UMA conexão (`checkout-uma-ligacao.test.ts`) troca o endereço antes de importar o app.
beforeEach(async () => {
  const { zerarLimitesDeTentativas } = await import("../lib/limite-de-tentativas.js");
  await zerarLimitesDeTentativas();
});

// OS CASOS DE "PRECISA DE ATENDENTE" (etapa 4.7b, bloco 2) também ficam no banco que os testes dividem: um caso urgente
// deixado aberto por OUTRO arquivo faria o aviso ao operador sair no primeiro aviso da Stripe deste — um e-mail a mais
// num teste que conta e-mails, e passaria ou reprovaria pela ordem. Cada arquivo começa sem os casos dos outros; os que
// ele mesmo abre continuam valendo. Importado aqui dentro, pelo mesmo motivo do limite, acima.
beforeAll(async () => {
  const { prisma } = await import("../lib/prisma.js");
  await prisma.billingCase.deleteMany();
});
