import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import Stripe from "stripe";
import type { AssinaturaNaStripe, PagamentoPrePago } from "../lib/stripe.js";
import type { PrePagaDoPix } from "../lib/stripe-pix.js";
import type { PedidoDeEmail, Envio } from "../lib/email.js";

// Na NOSSA fronteira, a Stripe: a leitura da assinatura, a lista das pré-pagas de um Pix, a criação, a
// fatura paga por fora, a marca de conferência, a devolução e o cancelamento da incompleta. O aviso, a
// verificação da assinatura dele, a trava, o espelho, o gate e a conta do visitante rodam de verdade,
// contra o banco.
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
const cancelarIncompleta = vi.fn<(id: string) => Promise<string>>();
/** Os preços como a Stripe diz: é com eles que o valor do Pix é conferido antes de criar a pré-paga. */
const PRECOS = [
  { plano: "mensal", precoId: "price_mensal", centavos: 9990, moeda: "brl" },
  { plano: "anual", precoId: "price_anual", centavos: 99500, moeda: "brl" },
] as const;
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
  buscarPrecos: async () => PRECOS.map((p) => ({ ...p })),
  cancelarIncompleta: (id: string) => cancelarIncompleta(id),
}));
const criarAssinaturaPrePaga = vi.fn<(pagamento: PagamentoPrePago) => Promise<{ id: string; faturaPaga: boolean }>>();
const assinaturasDoPix = vi.fn<(clienteId: string, pagamentoId: string) => Promise<PrePagaDoPix[]>>();
const garantirFaturaPaga = vi.fn<(assinaturaId: string) => Promise<{ fatura: string | null; status: string }>>();
const marcarEmConferencia = vi.fn<(pagamentoId: string, motivo: string) => Promise<boolean>>();
vi.mock("../lib/stripe-pix.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-pix.js")>()),
  criarAssinaturaPrePaga: (pagamento: PagamentoPrePago) => criarAssinaturaPrePaga(pagamento),
  assinaturasDoPix: (clienteId: string, pagamentoId: string) => assinaturasDoPix(clienteId, pagamentoId),
  garantirFaturaPaga: (assinaturaId: string) => garantirFaturaPaga(assinaturaId),
  marcarEmConferencia: (pagamentoId: string, motivo: string) => marcarEmConferencia(pagamentoId, motivo),
}));
const pixDevolvido = vi.fn<(pagamentoId: string) => Promise<boolean>>();
vi.mock("../lib/stripe-devolucao.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-devolucao.js")>()),
  pixDevolvido: (pagamentoId: string) => pixDevolvido(pagamentoId),
}));
const enviarEmail = vi.fn<(pedido: PedidoDeEmail) => Promise<Envio>>();
vi.mock("../lib/email.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/email.js")>()),
  enviarEmail: (pedido: PedidoDeEmail) => enviarEmail(pedido),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { temAcessoAtivo } from "../lib/acesso.js";
import { processarPixPago, TEMPO_DO_PIX } from "../lib/assinaturas.js";
import { assinaturasAoMesmoTempo, comVaga } from "../lib/assinaturas-em-andamento.js";

// O PIX PRÉ-PAGO QUE CAIU (Fase 4, etapa 4.9, passo 1 — decisão do operador, 28/10/2026). O que estes
// testes protegem:
//   - o aviso `payment_intent.succeeded` de um pagamento NOSSO cria UMA assinatura pré-paga, o espelho
//     nasce ativo com o id do Pix, e o gate abre;
//   - o aviso repetido, outro aviso do mesmo Pix e dois ao mesmo tempo não criam outra;
//   - a assinatura que já existe na Stripe (achada pela LISTA das assinaturas do cliente) não é criada de
//     novo — nem quando a criação anterior deu certo na Stripe e a resposta se perdeu;
//   - a incompleta achada tem a fatura paga por fora antes da sincronia (achado 5 do passo 6);
//   - o visitante: a conta nasce da ficha, como na assinatura por cartão;
//   - o pagamento que não é nosso, ou veio incompleto, não cria nada;
//   - a criação que falha deixa o aviso sem marca — a Stripe entrega de novo, e aí nasce uma só.
// E, da segunda revisão do passo 6 (29/10/2026):
//   - o Pix DEVOLVIDO antes de virar assinatura não vira (achado 1), e a incompleta dele é encerrada;
//   - o Pix pago que não pode virar assinatura sozinho (o valor diferente do preço, o preço fora de venda,
//     a fatura que não se paga, a pré-paga que morreu sem ser paga) fica EM CONFERÊNCIA: nada é criado,
//     o espelho morto não é gravado como se valesse, e o alerta sai UMA vez (achados 3 e 4);
//   - sem aviso (o clique e o admin), a trava do Pix não espera (achado 7).

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

/**
 * A Stripe de mentira: as assinaturas pré-pagas que ela "tem" — cada uma com a primeira fatura paga ou não
 * —, os Pix devolvidos e as marcas de conferência. A leitura e a lista devolvem cada uma como a Stripe diria.
 */
type NaStripe = { assinatura: AssinaturaNaStripe; faturaPaga: boolean; dias: number };
const naStripe = new Map<string, NaStripe>();
const devolvidos = new Set<string>();
const marcas = new Map<string, string>();
const DIAS_DO_PLANO = { mensal: 30, anual: 365 } as const;
/** Uma pré-paga deste Pix na Stripe: paga (ativa), ou ainda com a fatura aberta (incompleta). */
function criadaDoPix(pagamento: PagamentoPrePago, { faturaPaga = true }: { faturaPaga?: boolean } = {}): string {
  const id = novoId("sub");
  const dias = DIAS_DO_PLANO[pagamento.plano];
  naStripe.set(id, {
    faturaPaga,
    dias,
    assinatura: {
      id,
      status: faturaPaga ? "active" : "incomplete",
      pagoAte: faturaPaga ? new Date(Date.now() + dias * DIA) : null,
      clienteId: pagamento.clienteId,
      userId: pagamento.userId,
      pedido: pagamento.visitante?.pedido ?? null,
      doVisitante: pagamento.visitante?.escolha ?? { novidades: false, origem: null, campanha: null },
      livemode: pagamento.livemode,
      pixPaymentIntentId: pagamento.id,
      resumoDaTentativa: pagamento.visitante?.resumoDaTentativa ?? null,
    },
  });
  return id;
}
/** O pagamento como a rotina o recebe do aviso — para semear a Stripe de mentira antes de o aviso chegar. */
const pagamentoDe = (pi: string, userId: string, plano: "mensal" | "anual" = "mensal"): PagamentoPrePago => ({
  id: pi,
  plano,
  precoId: `price_${plano}`,
  clienteId: `cus_${pi}`,
  livemode: false,
  centavos: plano === "anual" ? 99500 : 9990,
  userId,
  visitante: null,
});
async function novaConta() {
  const id = novoId("conta");
  return prisma.user.create({ data: { id, email: `pix-${n}-${S}@teste.local` } });
}
const espelhoDoPix = (pi: string) => prisma.subscription.findUnique({ where: { pixPaymentIntentId: pi } });
/** Os alertas (`console.error`) que falam deste Pix e contêm o trecho. */
const alertasDo = (alertas: { mock: { calls: unknown[][] } }, pi: string, trecho: string) => alertas.mock.calls.filter(([texto]) => String(texto).includes(pi) && String(texto).includes(trecho));

beforeAll(() => {
  process.env.STRIPE_WEBHOOK_SECRET = SEGREDO;
});

beforeEach(() => {
  naStripe.clear();
  devolvidos.clear();
  marcas.clear();
  buscarAssinatura.mockReset().mockImplementation(async (id) => {
    const lida = naStripe.get(id);
    if (!lida) throw new Error(`a Stripe deste teste não conhece ${id}`);
    return { ...lida.assinatura };
  });
  criarAssinaturaPrePaga.mockReset().mockImplementation(async (pagamento) => {
    // Um instante, como a rede: dois avisos juntos chegariam aqui os dois sem a trava.
    await new Promise((ok) => setTimeout(ok, 30));
    return { id: criadaDoPix(pagamento), faturaPaga: true };
  });
  assinaturasDoPix.mockReset().mockImplementation(async (clienteId, pagamentoId) =>
    [...naStripe.values()]
      .filter(({ assinatura }) => assinatura.pixPaymentIntentId === pagamentoId && assinatura.clienteId === clienteId)
      .map(({ assinatura, faturaPaga }) => ({ id: assinatura.id, status: assinatura.status, faturaPaga })),
  );
  garantirFaturaPaga.mockReset().mockImplementation(async (assinaturaId) => {
    const lida = naStripe.get(assinaturaId);
    if (!lida) throw new Error(`a Stripe deste teste não conhece ${assinaturaId}`);
    if (lida.faturaPaga) return { fatura: `in_${assinaturaId}`, status: "paid" };
    // Só a incompleta tem a fatura aberta; a que expirou tem a fatura anulada, que não se paga.
    if (lida.assinatura.status !== "incomplete") return { fatura: `in_${assinaturaId}`, status: "void" };
    lida.faturaPaga = true;
    lida.assinatura = { ...lida.assinatura, status: "active", pagoAte: new Date(Date.now() + lida.dias * DIA) };
    return { fatura: `in_${assinaturaId}`, status: "paid" };
  });
  marcarEmConferencia.mockReset().mockImplementation(async (pagamentoId, motivo) => {
    if (marcas.has(pagamentoId)) return false;
    marcas.set(pagamentoId, motivo);
    return true;
  });
  pixDevolvido.mockReset().mockImplementation(async (pagamentoId) => devolvidos.has(pagamentoId));
  cancelarIncompleta.mockReset().mockImplementation(async (id) => {
    const lida = naStripe.get(id);
    if (lida) lida.assinatura = { ...lida.assinatura, status: "canceled" };
    return "canceled";
  });
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
    // OUTRO aviso do mesmo Pix: o espelho que VALEU responde — sem criar, e sem ir à lista de novo (a
    // lista é consultada UMA vez, antes de criar na primeira entrega).
    expect((await enviar(pixCaiu(pi, { prepago: "anual", precoId: "price_anual", userId: conta.id }))).status).toBe(200);
    expect(criarAssinaturaPrePaga).toHaveBeenCalledTimes(1);
    expect(assinaturasDoPix).toHaveBeenCalledTimes(1);
    expect(await prisma.subscription.count({ where: { ownerUserId: conta.id } })).toBe(1);
    // A criação garante a fatura dela; a assinatura que já valeu não precisa de outra ida.
    expect(garantirFaturaPaga).not.toHaveBeenCalled();
    expect(marcarEmConferencia).not.toHaveBeenCalled();
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

  it("a assinatura já existe na Stripe, paga (o aviso chegou depois da janela da chave, sem espelho): a lista a acha, e nada é criado", async () => {
    const conta = await novaConta();
    const pi = novoId("pi");
    const existente = criadaDoPix(pagamentoDe(pi, conta.id));
    expect((await enviar(pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", userId: conta.id }))).status).toBe(200);
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    expect(assinaturasDoPix).toHaveBeenCalledWith(`cus_${pi}`, pi);
    expect((await espelhoDoPix(pi))?.stripeSubscriptionId).toBe(existente);
    expect(garantirFaturaPaga).not.toHaveBeenCalled();
  });

  it("a criação deu certo na Stripe e a resposta se PERDEU (500): a reentrega acha a assinatura na lista e NÃO cria outra (achado 5 da segunda revisão)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const conta = await novaConta();
    const pi = novoId("pi");
    criarAssinaturaPrePaga.mockImplementationOnce(async (pagamento) => {
      criadaDoPix(pagamento);
      throw new Error("[stripe] a resposta da criação se perdeu");
    });
    const aviso = pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", userId: conta.id });
    expect((await enviar(aviso)).status).toBe(500);
    expect(await espelhoDoPix(pi)).toBeNull();

    expect((await enviar(aviso)).status).toBe(200);
    expect(criarAssinaturaPrePaga).toHaveBeenCalledTimes(1);
    expect([...naStripe.values()].filter(({ assinatura }) => assinatura.pixPaymentIntentId === pi)).toHaveLength(1);
    expect((await espelhoDoPix(pi))?.status).toBe("active");
    expect(await temAcessoAtivo(conta.id)).toBe(true);
  });

  it("a assinatura existe e a fatura dela NÃO foi paga (a Stripe caiu entre o criar e o pagar): a fatura é paga por fora, e é ela que vale", async () => {
    const conta = await novaConta();
    const pi = novoId("pi");
    const existente = criadaDoPix(pagamentoDe(pi, conta.id), { faturaPaga: false });
    expect((await enviar(pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", userId: conta.id }))).status).toBe(200);
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    expect(garantirFaturaPaga).toHaveBeenCalledWith(existente);
    expect(await espelhoDoPix(pi)).toMatchObject({ stripeSubscriptionId: existente, status: "active" });
    expect(await temAcessoAtivo(conta.id)).toBe(true);
  });

  it("a incompleta achada e o pagar por fora que FALHA: 500, o aviso sem marca, nada no espelho; na reentrega, paga", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const conta = await novaConta();
    const pi = novoId("pi");
    criadaDoPix(pagamentoDe(pi, conta.id), { faturaPaga: false });
    garantirFaturaPaga.mockRejectedValueOnce(new Error("[stripe] a fatura da assinatura pré-paga falhou"));
    const aviso = pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", userId: conta.id });
    expect((await enviar(aviso)).status).toBe(500);
    expect(await prisma.stripeEvent.findUnique({ where: { id: aviso.id } })).toBeNull();
    expect(await espelhoDoPix(pi)).toBeNull();
    // A Stripe entrega de novo; desta vez a fatura é paga, e o espelho nasce.
    expect((await enviar(aviso)).status).toBe(200);
    expect((await espelhoDoPix(pi))?.status).toBe("active");
  });

  it("a criação na Stripe FALHA sem criar nada: 500, o aviso fica sem marca; a Stripe entrega de novo e nasce uma só", async () => {
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

// Revisão do grupo 3 da 4.9b: o Pix pago segura uma ligação do banco por até 180 s — só com uma vaga das assinaturas,
// que deixa sempre 2 ligações livres para o gate e as aulas.
describe("o aviso do Pix pago sem vaga", () => {
  it("muitas assinaturas em andamento nesta cópia: 503, sem abrir transação nem marcar o aviso — e com vaga, ele vale", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const conta = await novaConta();
    const pi = novoId("pi");
    const aviso = pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", userId: conta.id });
    let soltar!: () => void;
    const segura = new Promise<void>((ok) => (soltar = ok));
    const ocupadas = Array.from({ length: assinaturasAoMesmoTempo() }, () => comVaga(() => segura));
    try {
      expect((await enviar(aviso)).status).toBe(503);
      expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
      expect(await prisma.stripeEvent.findUnique({ where: { id: aviso.id } })).toBeNull();
    } finally {
      soltar();
      await Promise.all(ocupadas);
    }
    expect((await enviar(aviso)).status).toBe(200);
    expect((await espelhoDoPix(pi))?.status).toBe("active");
  });
});

describe("o Pix pago que NÃO pode virar assinatura sozinho — EM CONFERÊNCIA (achados 3 e 4 da segunda revisão)", () => {
  it("o VALOR do Pix é diferente do preço do plano: nada é criado, o Pix fica marcado, o aviso também — e o alerta sai UMA vez, mesmo com outro aviso", async () => {
    const alertas = vi.spyOn(console, "error").mockImplementation(() => {});
    const conta = await novaConta();
    const pi = novoId("pi");
    const aviso = pixCaiu(pi, { prepago: "anual", precoId: "price_anual", userId: conta.id }, { amount: 9990 });
    expect((await enviar(aviso)).status).toBe(200);
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    expect(await espelhoDoPix(pi)).toBeNull();
    expect(await temAcessoAtivo(conta.id)).toBe(false);
    expect(marcas.get(pi)).toContain("custa 99500");
    expect(await prisma.stripeEvent.findUnique({ where: { id: aviso.id } })).not.toBeNull();
    expect(alertasDo(alertas, pi, "EM CONFERÊNCIA")).toHaveLength(1);

    // O MESMO aviso de novo: repetido. OUTRO aviso do mesmo Pix: a marca já existe — nenhum alerta novo.
    alertas.mockClear();
    expect((await enviar(aviso)).status).toBe(200);
    expect((await enviar(pixCaiu(pi, { prepago: "anual", precoId: "price_anual", userId: conta.id }, { amount: 9990 }))).status).toBe(200);
    expect(alertas).not.toHaveBeenCalled();
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
  });

  // E11 da revisão ampla (30/10/2026): vale o preço de AGORA do plano — o id gravado no Pix pode ter saído de venda (um
  // preço novo, com o mesmo valor), e a Stripe não aceita assinatura nova num preço arquivado.
  it("o id do preço do Pix saiu de venda, mas o plano custa o MESMO valor: vira assinatura, no preço de AGORA — sem conferência", async () => {
    const alertas = vi.spyOn(console, "error").mockImplementation(() => {});
    const conta = await novaConta();
    const pi = novoId("pi");
    expect((await enviar(pixCaiu(pi, { prepago: "mensal", precoId: "price_velho", userId: conta.id }))).status).toBe(200);
    expect(criarAssinaturaPrePaga).toHaveBeenCalledTimes(1);
    expect(criarAssinaturaPrePaga.mock.calls[0]?.[0]).toMatchObject({ id: pi, plano: "mensal", precoId: "price_mensal", centavos: 9990 });
    expect(marcas.has(pi)).toBe(false);
    expect(alertasDo(alertas, pi, "EM CONFERÊNCIA")).toEqual([]);
    expect((await espelhoDoPix(pi))?.status).toBe("active");
  });

  it("o prazo da transação do Pix cobre o pior caso: 8 idas à Stripe, de até 20 s cada (E12)", () => {
    expect(TEMPO_DO_PIX.timeout).toBeGreaterThanOrEqual(8 * 20_000);
  });

  it("a assinatura criada cuja fatura NÃO pôde ser paga: em conferência, e o espelho NÃO é gravado (a assinatura não valeu)", async () => {
    const alertas = vi.spyOn(console, "error").mockImplementation(() => {});
    const conta = await novaConta();
    const pi = novoId("pi");
    criarAssinaturaPrePaga.mockImplementationOnce(async (pagamento) => ({ id: criadaDoPix(pagamento, { faturaPaga: false }), faturaPaga: false }));
    const aviso = pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", userId: conta.id });
    expect((await enviar(aviso)).status).toBe(200);
    expect(await espelhoDoPix(pi)).toBeNull();
    expect(await temAcessoAtivo(conta.id)).toBe(false);
    expect(marcas.get(pi)).toContain("não pôde ser paga por fora");
    expect(await prisma.stripeEvent.findUnique({ where: { id: aviso.id } })).not.toBeNull();
    expect(alertasDo(alertas, pi, "EM CONFERÊNCIA")).toHaveLength(1);
  });

  it("a pré-paga achada cuja fatura não se paga (anulada): em conferência, sem criar outra", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const conta = await novaConta();
    const pi = novoId("pi");
    const existente = criadaDoPix(pagamentoDe(pi, conta.id), { faturaPaga: false });
    garantirFaturaPaga.mockResolvedValueOnce({ fatura: `in_${existente}`, status: "void" });
    expect((await enviar(pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", userId: conta.id }))).status).toBe(200);
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    expect(await espelhoDoPix(pi)).toBeNull();
    expect(marcas.get(pi)).toContain("ficou void");
  });

  it("o espelho do Pix é de uma pré-paga que MORREU sem ser paga: o Pix não fica escondido por ele — em conferência, nada é criado, nada vale (achado 3)", async () => {
    const alertas = vi.spyOn(console, "error").mockImplementation(() => {});
    const conta = await novaConta();
    const pi = novoId("pi");
    const morta = criadaDoPix(pagamentoDe(pi, conta.id), { faturaPaga: false });
    naStripe.get(morta)!.assinatura.status = "incomplete_expired";
    // O espelho morto, como uma sincronia antiga o teria gravado.
    await prisma.subscription.create({ data: { stripeSubscriptionId: morta, ownerUserId: conta.id, status: "incomplete_expired", stripeCustomerId: `cus_${pi}`, pixPaymentIntentId: pi } });
    expect((await enviar(pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", userId: conta.id }))).status).toBe(200);
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    expect(assinaturasDoPix).toHaveBeenCalledTimes(1);
    expect(marcas.get(pi)).toContain(`a pré-paga ${morta} acabou sem ser paga`);
    expect((await espelhoDoPix(pi))?.status).toBe("incomplete_expired");
    expect(await temAcessoAtivo(conta.id)).toBe(false);
    expect(alertasDo(alertas, pi, "EM CONFERÊNCIA")).toHaveLength(1);
  });
});

describe("o Pix DEVOLVIDO antes de virar assinatura (achado 1 da segunda revisão)", () => {
  it("sem assinatura nenhuma: nada nasce, o aviso fica marcado, sem alerta de pagante (o dinheiro voltou)", async () => {
    const alertas = vi.spyOn(console, "error").mockImplementation(() => {});
    const avisos = vi.spyOn(console, "warn").mockImplementation(() => {});
    const conta = await novaConta();
    const pi = novoId("pi");
    devolvidos.add(pi);
    const aviso = pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", userId: conta.id });
    expect((await enviar(aviso)).status).toBe(200);
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    expect(await espelhoDoPix(pi)).toBeNull();
    expect(await temAcessoAtivo(conta.id)).toBe(false);
    expect(await prisma.stripeEvent.findUnique({ where: { id: aviso.id } })).not.toBeNull();
    expect(avisos.mock.calls.some(([texto]) => String(texto).includes(pi) && String(texto).includes("devolvido"))).toBe(true);
    expect(alertas.mock.calls.filter(([texto]) => String(texto).includes(pi))).toEqual([]);
  });

  it("com a incompleta dele na Stripe: ela é ENCERRADA, e a fatura dela não é paga", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const conta = await novaConta();
    const pi = novoId("pi");
    const incompleta = criadaDoPix(pagamentoDe(pi, conta.id), { faturaPaga: false });
    devolvidos.add(pi);
    expect((await enviar(pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", userId: conta.id }))).status).toBe(200);
    expect(cancelarIncompleta).toHaveBeenCalledWith(incompleta);
    expect(garantirFaturaPaga).not.toHaveBeenCalled();
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    expect(await espelhoDoPix(pi)).toBeNull();
  });
});

describe("o Pix pago que VALEU e a Stripe agora diz sem acesso", () => {
  it("a sincronia grava o espelho como a Stripe diz, e sai o alerta de pagante trancado", async () => {
    const alertas = vi.spyOn(console, "error").mockImplementation(() => {});
    const conta = await novaConta();
    const pi = novoId("pi");
    const encerrada = criadaDoPix(pagamentoDe(pi, conta.id));
    naStripe.get(encerrada)!.assinatura = { ...naStripe.get(encerrada)!.assinatura, status: "canceled", pagoAte: new Date(Date.now() - DIA) };
    expect((await enviar(pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", userId: conta.id }))).status).toBe(200);
    expect((await espelhoDoPix(pi))?.status).toBe("canceled");
    expect(await temAcessoAtivo(conta.id)).toBe(false);
    expect(alertasDo(alertas, pi, "pagante trancado")).toHaveLength(1);
  });
});

describe("sem aviso (o clique do aluno, o admin) — achado 7 da segunda revisão", () => {
  it("a trava do Pix ocupada NÃO espera: devolve `ocupada` na hora, e nada é criado", async () => {
    const conta = await novaConta();
    const pi = novoId("pi");
    let travou!: () => void;
    const travada = new Promise<void>((ok) => (travou = ok));
    let soltar!: () => void;
    const solta = new Promise<void>((ok) => (soltar = ok));
    const segurando = prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pix:${pi}`}))`;
        travou();
        await solta;
      },
      { timeout: 20_000 },
    );
    await travada;
    const inicio = Date.now();
    expect(await processarPixPago(pagamentoDe(pi, conta.id))).toEqual({ resultado: "ocupada" });
    expect(Date.now() - inicio).toBeLessThan(5_000);
    soltar();
    await segurando;
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    // Livre, a mesma rotina cria — sem nenhum `event.id` marcado.
    expect(await processarPixPago(pagamentoDe(pi, conta.id))).toMatchObject({ resultado: "atualizada" });
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

  it("a ficha volta a apontar para a tentativa que PAGOU (achado 4 do passo 6): um clique posterior sem o código tinha trocado a tentativa dela", async () => {
    const pi = novoId("pi");
    // A ficha já está com a tentativa de um clique POSTERIOR ao pagamento (de outra aba — ou de outra pessoa).
    const ficha = await prisma.guestCheckout.create({ data: { id: novoId("pedido"), email: `visitante-pix-${n}-${S}@teste.local`, stripeCustomerId: `cus_${pi}`, livemode: false, tentativa: `resumo-do-clique-posterior-${S}` } });
    const aviso = pixCaiu(pi, { prepago: "mensal", precoId: "price_mensal", pedido: ficha.id, tentativa: `resumo-da-que-pagou-${S}`, novidades: "nao" });
    expect((await enviar(aviso)).status).toBe(200);
    const depois = await prisma.guestCheckout.findUniqueOrThrow({ where: { id: ficha.id } });
    expect(depois.userId).not.toBeNull();
    expect(depois.tentativa).toBe(`resumo-da-que-pagou-${S}`);
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
