import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import Stripe from "stripe";
import { inspect } from "node:util";
import type { AssinaturaNaStripe } from "../lib/stripe.js";

// A Stripe na NOSSA fronteira: só a busca da assinatura (que iria à rede) vira dublê. A
// verificação do aviso roda de verdade, com avisos assinados pela própria biblioteca da Stripe.
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { temAcessoAtivo } from "../lib/acesso.js";
import { sincronizarAssinatura } from "../lib/assinaturas.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";

// O AVISO DA STRIPE (webhook — Fase 4, etapa 4.1; CLAUDE.md → Membership Gating). O que estes
// testes protegem — é a fronteira de dinheiro, e webhook não tem tela:
//   - sem o segredo configurado, NENHUM aviso é aceito; assinatura ausente, errada ou corpo
//     mexido → 400, e nada muda;
//   - o corpo é verificado CRU (o aviso vem formatado com espaços: lido como JSON e reescrito,
//     a assinatura não conferiria) — a rota fica ACIMA do `express.json()`;
//   - o espelho se recalcula da Stripe AGORA, nunca do retrato do aviso (fora de ordem);
//   - o aviso repetido não faz nada; o que falhou no meio não fica marcado (a Stripe entrega de
//     novo e dá certo);
//   - a assinatura só nasce no espelho ligada a uma conta que existe; o dono não muda;
//   - UMA ASSINATURA DE CADA VEZ: dois avisos dela ao mesmo tempo nunca deixam a resposta velha
//     da Stripe por cima da nova — e a busca na Stripe acontece DEPOIS da trava, nunca antes
//     (achado P1 da revisão de segurança, 09/10/2026);
//   - nenhuma recusa fica muda, e a assinatura paga sem conta grita no registro (achados P1/P2);
//   - de ponta a ponta com o gate: ativa → acesso; cancelada por falta de pagamento → sem acesso;
//   - PERDER O ACESSO DERRUBA A SESSÃO (etapa 4.4): o cookie de antes deixa de valer — mas só
//     o de quem TINHA acesso e deixou de ter. Quem cancelou e ainda tem dias pagos continua
//     assistindo e logado; quem tenta pagar e não consegue nunca é deslogado; outra assinatura
//     da conta segura a sessão; e a sessão das OUTRAS contas nunca cai junto.

const SEGREDO = "whsec_teste_da_suite_local";
const S = `${Date.now()}`;
const assinante = `assinante-${S}`;
// Uma conta só do teste de ponta a ponta: as outras assinaturas desta suíte dariam acesso a ela.
const doGate = `do-gate-${S}`;
const DIA = 24 * 60 * 60 * 1000;
let n = 0;
const novoId = (prefixo: string) => `${prefixo}_${S}_${++n}`;

type Aviso = { id: string; type: string; data: { object: Record<string, unknown> } };
const avisoDaAssinatura = (subId: string, type = "customer.subscription.updated", objeto: Record<string, unknown> = {}): Aviso => ({
  id: novoId("evt"),
  type,
  data: { object: { id: subId, object: "subscription", ...objeto } },
});

/** Envia o aviso como a Stripe: corpo formatado com espaços e quebras, assinado com o segredo. */
function enviar(aviso: Aviso, { segredo = SEGREDO, mexer = false, semAssinatura = false } = {}) {
  const corpo = JSON.stringify({ object: "event", ...aviso }, null, 2);
  const cabecalho = Stripe.webhooks.generateTestHeaderString({ payload: corpo, secret: segredo });
  const req = request(servidor).post("/api/stripe/webhook").set("Content-Type", "application/json");
  if (!semAssinatura) req.set("Stripe-Signature", cabecalho);
  return req.send(mexer ? corpo.replace("subscription", "subscriptiom") : corpo);
}

const naStripe = (subId: string, dados: Partial<AssinaturaNaStripe> = {}): AssinaturaNaStripe => ({
  id: subId,
  status: "active",
  pagoAte: new Date(Date.now() + 30 * DIA),
  clienteId: "cus_teste",
  userId: assinante,
  livemode: false,
  ...dados,
});
const espelho = (subId: string) => prisma.subscription.findUnique({ where: { stripeSubscriptionId: subId } });
const marcado = (eventoId: string) => prisma.stripeEvent.findUnique({ where: { id: eventoId } });

beforeAll(async () => {
  process.env.STRIPE_WEBHOOK_SECRET = SEGREDO;
  await prisma.user.create({ data: { id: assinante, email: `${assinante}@teste.local` } });
  await prisma.user.create({ data: { id: doGate, email: `${doGate}@teste.local` } });
});

beforeEach(() => {
  buscarAssinatura.mockReset();
});

afterAll(async () => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.stripeEvent.deleteMany({ where: { id: { contains: S } } });
  await prisma.user.deleteMany({ where: { id: { in: [assinante, doGate] } } });
});

describe("o aviso da Stripe — quem entra", () => {
  it("sem o segredo configurado: 503, e nada é processado", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    try {
      const aviso = avisoDaAssinatura(novoId("sub"));
      expect((await enviar(aviso)).status).toBe(503);
      expect(await marcado(aviso.id)).toBeNull();
    } finally {
      process.env.STRIPE_WEBHOOK_SECRET = SEGREDO;
    }
    expect(buscarAssinatura).not.toHaveBeenCalled();
  });

  it("sem assinatura, assinada com outro segredo, ou com o corpo mexido: 400, e nada muda", async () => {
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(naStripe(sub));
    for (const opcoes of [{ semAssinatura: true }, { segredo: "whsec_de_outra_pessoa" }, { mexer: true }]) {
      const aviso = avisoDaAssinatura(sub);
      const res = await enviar(aviso, opcoes);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "AssinaturaInvalida" });
      expect(await marcado(aviso.id)).toBeNull();
    }
    expect(buscarAssinatura).not.toHaveBeenCalled();
    expect(await espelho(sub)).toBeNull();
  });
});

describe("o aviso da Stripe — o espelho", () => {
  it("assinatura criada: o espelho nasce ligado à conta, com o que a Stripe diz agora", async () => {
    const sub = novoId("sub");
    const pagoAte = new Date(Date.now() + 30 * DIA);
    buscarAssinatura.mockResolvedValue(naStripe(sub, { pagoAte }));
    const aviso = avisoDaAssinatura(sub, "customer.subscription.created");

    expect((await enviar(aviso)).status).toBe(200);
    expect(buscarAssinatura).toHaveBeenCalledWith(sub);
    const linha = await espelho(sub);
    expect([linha?.ownerUserId, linha?.status, linha?.currentPeriodEnd?.getTime(), linha?.stripeCustomerId]).toEqual([
      assinante,
      "active",
      pagoAte.getTime(),
      "cus_teste",
    ]);
    expect(await marcado(aviso.id)).not.toBeNull();
  });

  it("o aviso repetido não faz nada: nem busca na Stripe, nem muda o espelho", async () => {
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(naStripe(sub));
    const aviso = avisoDaAssinatura(sub, "customer.subscription.created");
    await enviar(aviso);

    buscarAssinatura.mockReset().mockResolvedValue(naStripe(sub, { status: "canceled" }));
    expect((await enviar(aviso)).status).toBe(200);
    expect(buscarAssinatura).not.toHaveBeenCalled();
    expect((await espelho(sub))?.status).toBe("active");
  });

  it("fora de ordem: o aviso velho, chegando depois, não volta o espelho — vale o que a Stripe diz AGORA", async () => {
    const sub = novoId("sub");
    const novo = avisoDaAssinatura(sub, "customer.subscription.updated", { status: "past_due" });
    const velho = avisoDaAssinatura(sub, "customer.subscription.created", { status: "active" });
    buscarAssinatura.mockResolvedValue(naStripe(sub, { status: "past_due" }));

    await enviar(novo);
    await enviar(velho);
    expect((await espelho(sub))?.status).toBe("past_due");
  });

  it("a fatura paga ou recusada: a assinatura dela se recalcula", async () => {
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(naStripe(sub, { status: "past_due" }));
    const fatura: Aviso = {
      id: novoId("evt"),
      type: "invoice.payment_failed",
      data: { object: { id: novoId("in"), object: "invoice", parent: { type: "subscription_details", subscription_details: { subscription: sub } } } },
    };
    expect((await enviar(fatura)).status).toBe(200);
    expect(buscarAssinatura).toHaveBeenCalledWith(sub);
    expect((await espelho(sub))?.status).toBe("past_due");
  });

  it("aviso que não fala de assinatura: 200, marcado, e a Stripe nem é consultada", async () => {
    const aviso: Aviso = { id: novoId("evt"), type: "customer.created", data: { object: { id: "cus_x", object: "customer" } } };
    expect((await enviar(aviso)).status).toBe(200);
    expect(buscarAssinatura).not.toHaveBeenCalled();
    expect(await marcado(aviso.id)).not.toBeNull();
  });

  it("sem a conta (sem userId, ou conta que não existe): o espelho não nasce, e o aviso fica marcado", async () => {
    for (const userId of [null, `nao-existe-${S}`]) {
      const sub = novoId("sub");
      buscarAssinatura.mockResolvedValue(naStripe(sub, { userId }));
      const aviso = avisoDaAssinatura(sub, "customer.subscription.created");
      expect((await enviar(aviso)).status).toBe(200);
      expect(await espelho(sub)).toBeNull();
      expect(await marcado(aviso.id)).not.toBeNull();
    }
  });

  it("o dono não muda: o aviso seguinte atualiza o status e mantém a conta, mesmo se a Stripe disser outra", async () => {
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(naStripe(sub));
    await enviar(avisoDaAssinatura(sub, "customer.subscription.created"));
    buscarAssinatura.mockResolvedValue(naStripe(sub, { status: "past_due", userId: `outra-conta-${S}` }));
    await enviar(avisoDaAssinatura(sub));
    const linha = await espelho(sub);
    expect([linha?.ownerUserId, linha?.status]).toEqual([assinante, "past_due"]);
  });

  it("a Stripe não respondeu: 500, o aviso NÃO fica marcado — e a reentrega dá certo", async () => {
    const sub = novoId("sub");
    const aviso = avisoDaAssinatura(sub, "customer.subscription.created");
    buscarAssinatura.mockRejectedValueOnce(new Error("Stripe fora do ar"));
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await enviar(aviso)).status).toBe(500);
    } finally {
      silencio.mockRestore();
    }
    expect(await marcado(aviso.id)).toBeNull();
    expect(await espelho(sub)).toBeNull();

    buscarAssinatura.mockResolvedValue(naStripe(sub));
    expect((await enviar(aviso)).status).toBe(200);
    expect((await espelho(sub))?.status).toBe("active");
  });
});

describe("o aviso da Stripe — uma assinatura de cada vez", () => {
  it("dois avisos dela ao mesmo tempo: a resposta VELHA da Stripe não fica por cima da nova", async () => {
    const sub = novoId("sub");
    // O primeiro aviso pega uma resposta lenta e velha ("atrasada"); o segundo, uma rápida e nova
    // ("cancelada"). Sem a trava, a lenta gravaria por último e o espelho ficaria "atrasada" —
    // acesso liberado para sempre, porque assinatura cancelada não gera mais aviso.
    buscarAssinatura
      .mockImplementationOnce(() => new Promise((r) => setTimeout(() => r(naStripe(sub, { status: "past_due" })), 300)))
      .mockImplementationOnce(() => Promise.resolve(naStripe(sub, { status: "canceled", pagoAte: new Date(Date.now() - DIA) })));

    // O `.then` dispara o pedido JÁ: o supertest só envia quando alguém espera a resposta.
    const primeiro = enviar(avisoDaAssinatura(sub, "customer.subscription.updated")).then((r) => r);
    await new Promise((r) => setTimeout(r, 60));
    const segundo = enviar(avisoDaAssinatura(sub, "customer.subscription.deleted")).then((r) => r);
    const [a, b] = await Promise.all([primeiro, segundo]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect((await espelho(sub))?.status).toBe("canceled");
  });

  it("o aviso que chegou antes mas demorou a entrar (o banco ocupado) busca na Stripe só DEPOIS da trava", async () => {
    const sub = novoId("sub");
    // A verdade na Stripe muda no meio: "atrasada" até 100 ms, "cancelada" depois.
    const virada = Date.now() + 100;
    buscarAssinatura.mockImplementation(async () =>
      Date.now() < virada ? naStripe(sub, { status: "past_due" }) : naStripe(sub, { status: "canceled", pagoAte: new Date(Date.now() - DIA) }),
    );
    // O primeiro aviso espera 200 ms para conseguir a transação (como se o banco estivesse
    // ocupado); o segundo, que chega aos 120 ms, entra direto. Quem buscasse na Stripe ANTES da
    // trava levaria a resposta de quando chegou ("atrasada") e a gravaria por último.
    const transacao = prisma.$transaction.bind(prisma);
    let primeira = true;
    // Seguro: o dublê só atrasa e repassa os mesmos argumentos à transação de verdade.
    const atraso = vi.spyOn(prisma, "$transaction").mockImplementation((async (...args: Parameters<typeof prisma.$transaction>) => {
      if (primeira) {
        primeira = false;
        await new Promise((r) => setTimeout(r, 200));
      }
      return (transacao as (...a: Parameters<typeof prisma.$transaction>) => unknown)(...args);
    }) as unknown as typeof prisma.$transaction);
    try {
      const primeiro = enviar(avisoDaAssinatura(sub, "customer.subscription.updated")).then((r) => r);
      await new Promise((r) => setTimeout(r, 120));
      const segundo = enviar(avisoDaAssinatura(sub, "customer.subscription.deleted")).then((r) => r);
      const [a, b] = await Promise.all([primeiro, segundo]);
      expect([a.status, b.status]).toEqual([200, 200]);
    } finally {
      atraso.mockRestore();
    }
    expect((await espelho(sub))?.status).toBe("canceled");
  });

  it("a sincronia SEM aviso (o checkout, o admin) e um aviso ao mesmo tempo: a mesma trava — a resposta velha não fica por cima da nova", async () => {
    const sub = novoId("sub");
    // A sincronia pega uma resposta lenta e velha; o aviso, que chega depois, uma rápida e nova.
    buscarAssinatura
      .mockImplementationOnce(() => new Promise((r) => setTimeout(() => r(naStripe(sub, { status: "past_due" })), 300)))
      .mockImplementationOnce(() => Promise.resolve(naStripe(sub, { status: "canceled", pagoAte: new Date(Date.now() - DIA) })));
    const sincronia = sincronizarAssinatura(sub);
    await new Promise((r) => setTimeout(r, 60));
    const aviso = enviar(avisoDaAssinatura(sub, "customer.subscription.deleted")).then((r) => r);
    const [, resposta] = await Promise.all([sincronia, aviso]);
    expect(resposta.status).toBe(200);
    expect((await espelho(sub))?.status).toBe("canceled");
  });

  it("o espelho guarda se a assinatura é de verdade ou do modo de teste", async () => {
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(naStripe(sub, { livemode: true }));
    await enviar(avisoDaAssinatura(sub, "customer.subscription.created"));
    expect((await espelho(sub))?.livemode).toBe(true);
  });
});

describe("o aviso da Stripe — o registro", () => {
  it("nenhuma recusa fica muda — e o registro nunca leva o corpo do aviso", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      await enviar(avisoDaAssinatura(novoId("sub")));
      process.env.STRIPE_WEBHOOK_SECRET = SEGREDO;
      expect(erro.mock.calls.flat().join(" ")).toContain("STRIPE_WEBHOOK_SECRET não configurado");

      const recusado = avisoDaAssinatura(novoId("sub"));
      await enviar(recusado, { segredo: "whsec_de_outra_pessoa" });
      // Como o terminal mostraria: um objeto de erro sai com os campos dele (o da Stripe leva o corpo).
      const linhas = aviso.mock.calls.flat().map((x) => (typeof x === "string" ? x : inspect(x))).join(" ");
      expect(linhas).toContain("aviso recusado");
      expect(linhas).not.toContain(recusado.id);
      expect(linhas).not.toContain(String(recusado.data.object.id));
    } finally {
      process.env.STRIPE_WEBHOOK_SECRET = SEGREDO;
      erro.mockRestore();
      aviso.mockRestore();
    }
  });

  it("assinatura paga SEM CONTA: erro no registro, com a assinatura, o cliente e o motivo", async () => {
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(naStripe(sub, { userId: null, clienteId: "cus_sem_conta" }));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await enviar(avisoDaAssinatura(sub, "customer.subscription.created"));
      const linha = erro.mock.calls.flat().join(" ");
      expect(linha).toContain(sub);
      expect(linha).toContain("cus_sem_conta");
      expect(linha).toContain("SEM CONTA");
      expect(linha).toContain("sem userId");
    } finally {
      erro.mockRestore();
    }
  });
});

describe("o aviso da Stripe — de ponta a ponta com o gate", () => {
  it("ativa → acesso; cancelada por falta de pagamento (pago só até o começo do período) → sem acesso", async () => {
    const sub = novoId("sub");
    expect(await temAcessoAtivo(doGate)).toBe(false);
    buscarAssinatura.mockResolvedValue(naStripe(sub, { status: "active", userId: doGate }));
    await enviar(avisoDaAssinatura(sub, "customer.subscription.created"));
    expect(await temAcessoAtivo(doGate)).toBe(true);

    // As tentativas de cobrança falharam: a Stripe cancela; a última fatura não foi paga, então
    // o espelho guarda o começo do período (no passado) — o mês não pago não dá acesso.
    buscarAssinatura.mockResolvedValue(naStripe(sub, { status: "canceled", pagoAte: new Date(Date.now() - DIA), userId: doGate }));
    await enviar(avisoDaAssinatura(sub, "customer.subscription.deleted"));
    expect(await temAcessoAtivo(doGate)).toBe(false);
  });
});

describe("o aviso da Stripe — perder o acesso derruba a sessão", () => {
  // Sessões DE VERDADE: as do member@ e do admin semeados. A assinatura de teste do member@
  // sai do caminho (vencida) enquanto este bloco roda: o acesso dele depende só das assinaturas
  // que cada teste cria — e que saem ao fim de cada um.
  let memberId = "";
  const eu = (cookies: string[]) => request(servidor).get("/api/me").set("Cookie", cookies);
  async function entrar(email?: string, senha?: string): Promise<string[]> {
    const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
    const cookies = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
    expect(cookies.length).toBeGreaterThan(0);
    return cookies;
  }
  const entrarComoAluno = () => entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  const doAluno = (sub: string, dados: Partial<AssinaturaNaStripe> = {}) => naStripe(sub, { userId: memberId, ...dados });
  const VENCIDA = { status: "canceled", pagoAte: new Date(Date.now() - DIA) };
  /** O aviso chega com a Stripe dizendo isto da assinatura. */
  async function avisar(sub: string, dados: Partial<AssinaturaNaStripe> = {}) {
    buscarAssinatura.mockResolvedValue(doAluno(sub, dados));
    expect((await enviar(avisoDaAssinatura(sub))).status).toBe(200);
  }

  beforeAll(async () => {
    memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL }, select: { id: true } })).id;
    await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "canceled", currentPeriodEnd: new Date("2020-01-01T00:00:00Z") } });
  });
  afterEach(async () => {
    await prisma.subscription.deleteMany({ where: { ownerUserId: memberId, stripeSubscriptionId: { contains: S } } });
  });
  afterAll(async () => {
    await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "active", currentPeriodEnd: new Date("2100-01-01T00:00:00Z") } });
  });

  it("a assinatura acabou (as cobranças falharam e a Stripe cancelou): o cookie de antes deixa de valer", async () => {
    const sub = novoId("sub");
    await avisar(sub);
    const cookies = await entrarComoAluno();
    expect((await eu(cookies)).status).toBe(200);

    const registro = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      await avisar(sub, VENCIDA);
      expect(registro.mock.calls.flat().join(" ")).toContain("perdeu o acesso");
    } finally {
      registro.mockRestore();
    }
    expect(await temAcessoAtivo(memberId)).toBe(false);
    expect((await eu(cookies)).status).toBe(401);
    expect(await prisma.session.count({ where: { userId: memberId } })).toBe(0);
  });

  it("cancelou e ainda tem dias pagos: continua assistindo E logado, até o fim deles", async () => {
    const sub = novoId("sub");
    await avisar(sub);
    const cookies = await entrarComoAluno();
    await avisar(sub, { status: "canceled", pagoAte: new Date(Date.now() + 10 * DIA) });
    expect(await temAcessoAtivo(memberId)).toBe(true);
    expect((await eu(cookies)).status).toBe(200);
  });

  it("quem NÃO tinha acesso não é deslogado: a tentativa de pagar que expira, ou a assinatura antiga conferida de novo", async () => {
    const cookies = await entrarComoAluno();
    const tentativa = novoId("sub");
    await avisar(tentativa, { status: "incomplete" });
    await avisar(tentativa, { status: "incomplete_expired" });
    const antiga = novoId("sub");
    await avisar(antiga, VENCIDA);
    await avisar(antiga, VENCIDA);
    expect(await temAcessoAtivo(memberId)).toBe(false);
    expect((await eu(cookies)).status).toBe(200);
  });

  it("outra assinatura da conta ainda dá acesso: a sessão fica", async () => {
    const [uma, outra] = [novoId("sub"), novoId("sub")];
    await avisar(uma);
    await avisar(outra);
    const cookies = await entrarComoAluno();
    await avisar(uma, VENCIDA);
    expect(await temAcessoAtivo(memberId)).toBe(true);
    expect((await eu(cookies)).status).toBe(200);
  });

  it("cai SÓ a sessão de quem perdeu o acesso: a das outras contas continua", async () => {
    const sub = novoId("sub");
    await avisar(sub);
    const aluno = await entrarComoAluno();
    const admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
    await avisar(sub, VENCIDA);
    expect((await eu(aluno)).status).toBe(401);
    expect((await eu(admin)).status).toBe(200);
  });

  it("a sincronia SEM aviso (a do checkout e a do admin) é a mesma rotina: grava o espelho, derruba a sessão e não marca aviso nenhum", async () => {
    const sub = novoId("sub");
    const avisosAntes = await prisma.stripeEvent.count();
    buscarAssinatura.mockResolvedValue(doAluno(sub));
    expect(await sincronizarAssinatura(sub)).toMatchObject({ resultado: "atualizada", perdeuAcesso: false });
    expect((await espelho(sub))?.ownerUserId).toBe(memberId);
    expect(await temAcessoAtivo(memberId)).toBe(true);

    const cookies = await entrarComoAluno();
    buscarAssinatura.mockResolvedValue(doAluno(sub, VENCIDA));
    expect(await sincronizarAssinatura(sub)).toMatchObject({ resultado: "atualizada", perdeuAcesso: true });
    expect((await espelho(sub))?.status).toBe("canceled");
    expect((await eu(cookies)).status).toBe(401);
    expect(await prisma.stripeEvent.count()).toBe(avisosAntes);
  });

  it("a sincronia sem aviso com a Stripe fora do ar: o erro sobe dizendo QUAL assinatura, e nada é gravado", async () => {
    const sub = novoId("sub");
    buscarAssinatura.mockRejectedValue(new Error("a Stripe não respondeu"));
    await expect(sincronizarAssinatura(sub)).rejects.toThrow(sub);
    expect(await espelho(sub)).toBeNull();
  });
});
