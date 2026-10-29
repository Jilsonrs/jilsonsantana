import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import Stripe from "stripe";
import type { AssinaturaNaStripe, PagamentoPrePago } from "../lib/stripe.js";
import type { PedidoDeEmail, Envio } from "../lib/email.js";

// Na NOSSA fronteira: a busca da assinatura (a rede da Stripe), a criação da assinatura pré-paga e a
// busca pelos metadados. O aviso, a verificação da assinatura dele, a trava, o espelho, o gate e a
// conta do visitante rodam de verdade, contra o banco.
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
/** Os preços como a Stripe diz: é com eles que o valor do Pix é conferido antes de criar a pré-paga. */
const PRECOS = [
  { plano: "mensal", precoId: "price_mensal", centavos: 9990, moeda: "brl" },
  { plano: "anual", precoId: "price_anual", centavos: 99500, moeda: "brl" },
] as const;
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
  buscarPrecos: async () => PRECOS.map((p) => ({ ...p })),
}));
const criarAssinaturaPrePaga = vi.fn<(pagamento: PagamentoPrePago) => Promise<string>>();
const assinaturaDoPagamentoPrePago = vi.fn<(pagamentoId: string) => Promise<string | null>>();
const garantirFaturaPaga = vi.fn<(assinaturaId: string, pagamentoId: string) => Promise<{ fatura: string | null; status: string }>>();
vi.mock("../lib/stripe-pix.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-pix.js")>()),
  criarAssinaturaPrePaga: (pagamento: PagamentoPrePago) => criarAssinaturaPrePaga(pagamento),
  assinaturaDoPagamentoPrePago: (pagamentoId: string) => assinaturaDoPagamentoPrePago(pagamentoId),
  garantirFaturaPaga: (assinaturaId: string, pagamentoId: string) => garantirFaturaPaga(assinaturaId, pagamentoId),
}));
const enviarEmail = vi.fn<(pedido: PedidoDeEmail) => Promise<Envio>>();
vi.mock("../lib/email.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/email.js")>()),
  enviarEmail: (pedido: PedidoDeEmail) => enviarEmail(pedido),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { temAcessoAtivo } from "../lib/acesso.js";

// O PIX PRÉ-PAGO QUE CAIU (Fase 4, etapa 4.9, passo 1 — decisão do operador, 28/10/2026). O que estes
// testes protegem:
//   - o aviso `payment_intent.succeeded` de um pagamento NOSSO cria UMA assinatura pré-paga, o espelho
//     nasce ativo com o id do Pix, e o gate abre;
//   - o aviso repetido, outro aviso do mesmo Pix e dois ao mesmo tempo não criam outra;
//   - a assinatura que já existe na Stripe (a busca pelos metadados) não é criada de novo;
//   - o visitante: a conta nasce da ficha, como na assinatura por cartão;
//   - o pagamento que não é nosso, ou veio incompleto, não cria nada;
//   - a criação que falha deixa o aviso sem marca — a Stripe entrega de novo, e aí nasce uma só;
//   - a assinatura ACHADA (espelho ou busca) tem a fatura garantida paga antes da sincronia; o valor
//     do Pix diferente do preço não cria nada (marcado, com alerta); e o Pix pago que termina sem
//     acesso é alerta (achados 5 e 9 do passo 6, 29/10/2026).

const SEGREDO = "whsec_teste_da_suite_local";
const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
let n = 0;
const novoId = (prefixo: string) => `${prefixo}_${S}_${++n}`;

type Aviso = { id: string; type: string; data: { object: Record<string, unknown> } };
/** O aviso de um Pix que caiu, como a Stripe manda: o pagamento com os NOSSOS metadados, no valor do plano. */
const pixCaiu = (pi: string, metadata: Record<string, string>, extra: Record<string, unknown> = {}): Aviso => ({
  id: novoId("evt"),
  type: "payment_intent.succeeded",
  data: { object: { id: pi, object: "payment_intent", amount: metadata.prepago === "anual" ? 99500 : 9990, currency: "brl", customer: `cus_${pi}`, livemode: false, metadata, ...extra } },
});
function enviar(aviso: Aviso) {
  const corpo = JSON.stringify({ object: "event", ...aviso }, null, 2);
  const cabecalho = Stripe.webhooks.generateTestHeaderString({ payload: corpo, secret: SEGREDO });
  return request(servidor).post("/api/stripe/webhook").set("Content-Type", "application/json").set("Stripe-Signature", cabecalho).send(corpo);
}

/** A Stripe de mentira guarda as assinaturas pré-pagas que "criou": a busca devolve cada uma como a Stripe diria. */
const naStripe = new Map<string, AssinaturaNaStripe>();
const DIAS_DO_PLANO = { mensal: 30, anual: 365 } as const;
function criadaDoPix(pagamento: PagamentoPrePago): string {
  const id = novoId("sub");
  naStripe.set(id, {
    id,
    status: "active",
    pagoAte: new Date(Date.now() + DIAS_DO_PLANO[pagamento.plano] * DIA),
    clienteId: pagamento.clienteId,
    userId: pagamento.userId,
    pedido: pagamento.visitante?.pedido ?? null,
    doVisitante: pagamento.visitante?.escolha ?? { novidades: false, origem: null, campanha: null },
    livemode: pagamento.livemode,
    pixPaymentIntentId: pagamento.id,
  });
  return id;
}
async function novaConta() {
  const id = novoId("conta");
  return prisma.user.create({ data: { id, email: `pix-${n}-${S}@teste.local` } });
}
const espelhoDoPix = (pi: string) => prisma.subscription.findUnique({ where: { pixPaymentIntentId: pi } });

beforeAll(() => {
  process.env.STRIPE_WEBHOOK_SECRET = SEGREDO;
});

beforeEach(() => {
  naStripe.clear();
  buscarAssinatura.mockReset().mockImplementation(async (id) => {
    const assinatura = naStripe.get(id);
    if (!assinatura) throw new Error(`a Stripe deste teste não conhece ${id}`);
    return assinatura;
  });
  criarAssinaturaPrePaga.mockReset().mockImplementation(async (pagamento) => {
    // Um instante, como a rede: dois avisos juntos chegariam aqui os dois sem a trava.
    await new Promise((ok) => setTimeout(ok, 30));
    return criadaDoPix(pagamento);
  });
  assinaturaDoPagamentoPrePago.mockReset().mockResolvedValue(null);
  garantirFaturaPaga.mockReset().mockResolvedValue({ fatura: "in_teste", status: "paid" });
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "re_teste" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.stripeEvent.deleteMany({ where: { id: { contains: S } } });
  await prisma.guestCheckout.deleteMany({ where: { id: { contains: S } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
});

describe("o Pix pré-pago que caiu — a conta logada", () => {
  it("cria a assinatura pré-paga UMA vez: o espelho nasce ativo com o id do Pix, o gate abre, o aviso fica marcado", async () => {
    const conta = await novaConta();
    const pi = novoId("pi");
    const aviso = pixCaiu(pi, { prepago: "anual", precoId: "price_anual", userId: conta.id });
    expect((await enviar(aviso)).status).toBe(200);

    expect(criarAssinaturaPrePaga).toHaveBeenCalledTimes(1);
    const [pagamento] = criarAssinaturaPrePaga.mock.calls[0]!;
    expect(pagamento).toMatchObject({ id: pi, plano: "anual", precoId: "price_anual", clienteId: `cus_${pi}`, userId: conta.id, visitante: null, centavos: 99500, livemode: false });
    const espelho = await espelhoDoPix(pi);
    expect(espelho).toMatchObject({ status: "active", ownerUserId: conta.id, pixPaymentIntentId: pi });
    // O "pago até" é o que a Stripe (de mentira) disse: prova a GRAVAÇÃO no espelho, não o período —
    // o período de verdade é da Stripe, provado na área restrita (passo 6).
    expect(espelho?.currentPeriodEnd?.getTime()).toBeGreaterThan(Date.now() + 360 * DIA);
    expect(await temAcessoAtivo(conta.id)).toBe(true);
    expect(await prisma.stripeEvent.findUnique({ where: { id: aviso.id } })).not.toBeNull();

    // O MESMO aviso de novo (a Stripe entregou duas vezes): repetido, nada nasce.
    expect((await enviar(aviso)).status).toBe(200);
    // OUTRO aviso do mesmo Pix: a assinatura já está no espelho — sem criar, e sem ir à busca de novo
    // (a busca é consultada UMA vez, antes de criar na primeira entrega).
    expect((await enviar(pixCaiu(pi, { prepago: "anual", precoId: "price_anual", userId: conta.id }))).status).toBe(200);
    expect(criarAssinaturaPrePaga).toHaveBeenCalledTimes(1);
    expect(assinaturaDoPagamentoPrePago).toHaveBeenCalledTimes(1);
    expect(await prisma.subscription.count({ where: { ownerUserId: conta.id } })).toBe(1);
    // A assinatura ACHADA no espelho tem a fatura garantida paga antes da sincronia (a criação já garante a dela).
    expect(garantirFaturaPaga).toHaveBeenCalledTimes(1);
    expect(garantirFaturaPaga).toHaveBeenCalledWith(espelho?.stripeSubscriptionId, pi);
  });

  it("dois avisos do mesmo Pix AO MESMO TEMPO: uma assinatura só", async () => {
    const conta = await novaConta();
    const pi = novoId("pi");
    const metadata = { prepago: "mensal", precoId: "price_mensal", userId: conta.id };
    const [a, b] = await Promise.all([enviar(pixCaiu(pi, metadata)), enviar(pixCaiu(pi, metadata))]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(criarAssinaturaPrePaga).toHaveBeenCalledTimes(1);
    expect(await prisma.subscription.count({ where: { ownerUserId: conta.id } })).toBe(1);
  });

  it("a assinatura já existe na Stripe (o aviso chegou depois de 24 h, sem espelho): a busca a acha, e nada é criado", async () => {
    const conta = await novaConta();
    const pi = novoId("pi");
    const existente = criadaDoPix({ id: pi, plano: "mensal", precoId: "price_mensal", clienteId: `cus_${pi}`, livemode: false, centavos: 9990, userId: conta.id, visitante: null });
    assinaturaDoPagamentoPrePago.mockResolvedValue(existente);
    expect((await enviar(pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", userId: conta.id }))).status).toBe(200);
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    expect((await espelhoDoPix(pi))?.stripeSubscriptionId).toBe(existente);
    // … e a fatura dela é garantida paga: a Stripe pode ter caído entre o criar e o pagar por fora.
    expect(garantirFaturaPaga).toHaveBeenCalledWith(existente, pi);
  });

  it("a assinatura achada pela busca e o pagar por fora que FALHA de novo: 500, o aviso sem marca, nada no espelho", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const conta = await novaConta();
    const pi = novoId("pi");
    const existente = criadaDoPix({ id: pi, plano: "mensal", precoId: "price_mensal", clienteId: `cus_${pi}`, livemode: false, centavos: 9990, userId: conta.id, visitante: null });
    assinaturaDoPagamentoPrePago.mockResolvedValue(existente);
    garantirFaturaPaga.mockRejectedValueOnce(new Error("[stripe] a fatura da assinatura pré-paga falhou"));
    const aviso = pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", userId: conta.id });
    expect((await enviar(aviso)).status).toBe(500);
    expect(await prisma.stripeEvent.findUnique({ where: { id: aviso.id } })).toBeNull();
    expect(await espelhoDoPix(pi)).toBeNull();
    // A Stripe entrega de novo; desta vez a fatura é paga, e o espelho nasce.
    expect((await enviar(aviso)).status).toBe(200);
    expect((await espelhoDoPix(pi))?.status).toBe("active");
  });

  it("o VALOR do Pix é diferente do preço do plano: nada é criado, o aviso fica marcado (sem reentrega) e sai o alerta", async () => {
    const alertas = vi.spyOn(console, "error").mockImplementation(() => {});
    const conta = await novaConta();
    const pi = novoId("pi");
    const aviso = pixCaiu(pi, { prepago: "anual", precoId: "price_anual", userId: conta.id }, { amount: 9990 });
    expect((await enviar(aviso)).status).toBe(200);
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    expect(await espelhoDoPix(pi)).toBeNull();
    expect(await prisma.stripeEvent.findUnique({ where: { id: aviso.id } })).not.toBeNull();
    expect(alertas.mock.calls.some(([texto]) => String(texto).includes(pi) && String(texto).includes("NÃO foi criada") && String(texto).includes("custa 99500"))).toBe(true);
    // O mesmo aviso de novo: repetido, e o alerta não sai duas vezes.
    alertas.mockClear();
    expect((await enviar(aviso)).status).toBe(200);
    expect(alertas).not.toHaveBeenCalled();
  });

  it("o preço do Pix não está mais à venda (mudou entre o QR e o pagamento): idem, com o motivo", async () => {
    const alertas = vi.spyOn(console, "error").mockImplementation(() => {});
    const conta = await novaConta();
    const pi = novoId("pi");
    expect((await enviar(pixCaiu(pi, { prepago: "mensal", precoId: "price_velho", userId: conta.id }))).status).toBe(200);
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    expect(alertas.mock.calls.some(([texto]) => String(texto).includes(pi) && String(texto).includes("não está mais à venda"))).toBe(true);
  });

  it("o Pix virou assinatura, mas ela NÃO dá acesso (incompleta — a fatura não pôde ser paga): o espelho grava, e sai o alerta de pagante trancado", async () => {
    const alertas = vi.spyOn(console, "error").mockImplementation(() => {});
    const conta = await novaConta();
    const pi = novoId("pi");
    criarAssinaturaPrePaga.mockImplementationOnce(async (pagamento) => {
      const id = criadaDoPix(pagamento);
      naStripe.set(id, { ...naStripe.get(id)!, status: "incomplete", pagoAte: new Date(Date.now() - DIA) });
      return id;
    });
    const aviso = pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", userId: conta.id });
    expect((await enviar(aviso)).status).toBe(200);
    expect((await espelhoDoPix(pi))?.status).toBe("incomplete");
    expect(await temAcessoAtivo(conta.id)).toBe(false);
    expect(alertas.mock.calls.some(([texto]) => String(texto).includes(pi) && String(texto).includes("pagante trancado"))).toBe(true);
  });

  it("a criação na Stripe FALHA: 500, o aviso fica sem marca; a Stripe entrega de novo e nasce uma só", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const conta = await novaConta();
    const pi = novoId("pi");
    const aviso = pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", userId: conta.id });
    criarAssinaturaPrePaga.mockRejectedValueOnce(new Error("a Stripe caiu"));
    expect((await enviar(aviso)).status).toBe(500);
    expect(await prisma.stripeEvent.findUnique({ where: { id: aviso.id } })).toBeNull();
    expect(await espelhoDoPix(pi)).toBeNull();

    expect((await enviar(aviso)).status).toBe(200);
    expect(criarAssinaturaPrePaga).toHaveBeenCalledTimes(2);
    expect((await espelhoDoPix(pi))?.status).toBe("active");
  });
});

describe("o Pix pré-pago que caiu — o visitante", () => {
  it("a conta nasce da ficha, com a escolha da tentativa paga, e a assinatura pré-paga é dela", async () => {
    const pi = novoId("pi");
    const ficha = await prisma.guestCheckout.create({ data: { id: novoId("pedido"), email: `visitante-pix-${n}-${S}@teste.local`, stripeCustomerId: `cus_${pi}`, livemode: false, tentativa: "resumo-da-tentativa" } });
    const aviso = pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", pedido: ficha.id, tentativa: "resumo-da-tentativa", novidades: "sim", origem: "youtube" });
    expect((await enviar(aviso)).status).toBe(200);

    const [pagamento] = criarAssinaturaPrePaga.mock.calls[0]!;
    expect(pagamento.userId).toBeNull();
    expect(pagamento.visitante).toEqual({ pedido: ficha.id, resumoDaTentativa: "resumo-da-tentativa", escolha: { novidades: true, origem: "youtube", campanha: null } });
    const conta = await prisma.user.findUnique({ where: { email: ficha.email } });
    expect(conta).not.toBeNull();
    expect(conta?.marketingConsent).toBe(true);
    expect((await espelhoDoPix(pi))).toMatchObject({ ownerUserId: conta?.id, status: "active" });
    expect(await temAcessoAtivo(conta!.id)).toBe(true);
    // As boas-vindas saem para a conta que nasceu — a rota só conhece a assinatura depois de processar o aviso.
    const boasVindas = enviarEmail.mock.calls.map(([p]) => p).filter((p) => p.tipo === "boas-vindas");
    expect(boasVindas.map((p) => p.para)).toEqual([ficha.email]);
  });
});

describe("o que NÃO é um Pix pré-pago nosso", () => {
  it("um pagamento sem a marca (outro produto, um teste no painel): nada é criado", async () => {
    const pi = novoId("pi");
    const res = await enviar(pixCaiu(pi, { precoId: "price_mensal", userId: "alguem" }));
    expect(res.status).toBe(200);
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    expect(await espelhoDoPix(pi)).toBeNull();
  });

  it("a marca com um plano que não existe, ou sem o preço: ignorado (com aviso), nada é criado", async () => {
    const avisos = vi.spyOn(console, "warn").mockImplementation(() => {});
    const semPreco = novoId("pi");
    expect((await enviar(pixCaiu(semPreco, { prepago: "mensal", userId: "alguem" }))).status).toBe(200);
    expect((await enviar(pixCaiu(novoId("pi"), { prepago: "vitalicio", precoId: "price_x", userId: "alguem" }))).status).toBe(200);
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    expect(avisos.mock.calls.some(([texto]) => String(texto).includes(semPreco) && String(texto).includes("sem preço"))).toBe(true);
  });
});
