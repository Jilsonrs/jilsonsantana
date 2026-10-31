import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import type { AssinaturaNaStripe } from "../lib/stripe.js";

// O ESPELHO PARA O PAINEL DA COBRANÇA (etapa 4.7b, passo 1a). Só o que iria à rede vira dublê (a busca da
// assinatura na Stripe); a rotina da sincronia — a trava, a gravação, a regra do gate — roda de verdade, contra o
// banco. O que protege:
//   - a sincronia grava o plano, quando acaba e o código, e os REESCREVE com o que a Stripe diz agora (trocou de
//     plano, desfez o cancelamento, o desconto acabou) — o painel nunca fica com o retrato velho;
//   - o que a Stripe não diz vira vazio, e não o valor de antes;
//   - a marca de acabar NÃO tira o acesso: o gate lê status e data, nunca a marca (CLAUDE.md → Membership Gating,
//     "cancel_at_period_end NÃO é status").
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));

import { prisma } from "../lib/prisma.js";
import { temAcessoAtivo } from "../lib/acesso.js";
import { sincronizarAssinatura } from "../lib/assinaturas.js";

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const aluno = `espelho-painel-${S}`;
const SUB = `sub_painel_${S}`;
const espelho = () => prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: SUB }, select: { plan: true, cancelAt: true, promotionCode: true, status: true } });
const naStripe = (dados: Partial<AssinaturaNaStripe>) =>
  buscarAssinatura.mockResolvedValue({ id: SUB, status: "active", pagoAte: new Date(Date.now() + 30 * DIA), clienteId: `cus_${S}`, userId: aluno, livemode: false, ...dados });

beforeAll(async () => {
  await prisma.user.create({ data: { id: aluno, email: `${aluno}@teste.local` } });
});

afterEach(async () => {
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: SUB } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: aluno } });
});

describe("o espelho guarda o que o painel da cobrança mostra", () => {
  it("grava o plano, quando acaba e o código — e reescreve tudo com o que a Stripe diz agora", async () => {
    naStripe({ planoAtual: "mensal", acabaEm: null, codigoPromocional: "TESTE100" });
    await sincronizarAssinatura(SUB);
    expect(await espelho()).toMatchObject({ plan: "mensal", cancelAt: null, promotionCode: "TESTE100", status: "active" });

    const acaba = new Date(Date.now() + 20 * DIA);
    naStripe({ planoAtual: "anual", acabaEm: acaba, codigoPromocional: null });
    await sincronizarAssinatura(SUB);
    const depois = await espelho();
    expect(depois).toMatchObject({ plan: "anual", promotionCode: null });
    expect(depois.cancelAt?.toISOString()).toBe(acaba.toISOString());
  });

  it("o que a Stripe não diz vira vazio, e não o valor de antes", async () => {
    naStripe({ planoAtual: "anual", acabaEm: new Date(Date.now() + 5 * DIA), codigoPromocional: "CAMPANHA" });
    await sincronizarAssinatura(SUB);
    naStripe({});
    await sincronizarAssinatura(SUB);
    expect(await espelho()).toMatchObject({ plan: null, cancelAt: null, promotionCode: null });
  });

  it("marcada para acabar continua com acesso: o gate lê status e data, nunca a marca", async () => {
    naStripe({ planoAtual: "mensal", acabaEm: new Date(Date.now() + 10 * DIA) });
    await sincronizarAssinatura(SUB);
    expect(await temAcessoAtivo(aluno)).toBe(true);
  });
});
