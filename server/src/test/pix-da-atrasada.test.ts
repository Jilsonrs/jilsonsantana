import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import type { DocumentoFiscal } from "@jilson/core";
import type { AssinaturaNaStripe, AssinaturaNoCheckout, PrecoDoPlano } from "../lib/stripe.js";
import type { DetalhesDaAssinatura } from "../lib/stripe-assinatura.js";
import type { PagamentoPixCriado, PedidoDePix, PixDoCliente } from "../lib/stripe-pix.js";

// A Stripe na NOSSA fronteira: só o que iria à rede vira dublê, e cada ida fica anotada em `idas`, na ordem. A regra (de
// quem é a atrasada, a trava, a ordem das idas, a sincronia do espelho e o Pix de sempre) roda de verdade, contra o banco.
const idas: string[] = [];
const buscarDetalhes = vi.fn<(id: string) => Promise<DetalhesDaAssinatura>>();
vi.mock("../lib/stripe-assinatura.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-assinatura.js")>()),
  buscarDetalhes: (id: string) => buscarDetalhes(id),
}));
const encerrarParaOPix = vi.fn<(id: string) => Promise<void>>();
vi.mock("../lib/stripe-reembolso.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-reembolso.js")>()),
  encerrarParaOPix: (id: string) => encerrarParaOPix(id),
}));
const anularFatura = vi.fn<(faturaId: string) => Promise<"anulada" | "paga">>();
vi.mock("../lib/stripe-plano.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-plano.js")>()),
  anularFatura: (faturaId: string) => anularFatura(faturaId),
}));
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
const acertarNumeroFiscal = vi.fn<(clienteId: string, documento: DocumentoFiscal) => Promise<boolean>>();
const buscarPrecos = vi.fn<() => Promise<PrecoDoPlano[]>>();
const assinaturasDoCliente = vi.fn<(clienteId: string) => Promise<AssinaturaNoCheckout[]>>();
const criarCliente = vi.fn<(conta: { userId: string; email: string; nome: string | null }) => Promise<{ id: string; livemode: boolean }>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
  acertarNumeroFiscal: (clienteId: string, documento: DocumentoFiscal) => acertarNumeroFiscal(clienteId, documento),
  buscarPrecos: () => buscarPrecos(),
  assinaturasDoCliente: (clienteId: string) => assinaturasDoCliente(clienteId),
  criarCliente: (conta: { userId: string; email: string; nome: string | null }) => criarCliente(conta),
}));
const listarPixDoCliente = vi.fn<(clienteId: string) => Promise<PixDoCliente>>();
const criarPagamentoPix = vi.fn<(pedido: PedidoDePix) => Promise<PagamentoPixCriado>>();
vi.mock("../lib/stripe-pix.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-pix.js")>()),
  listarPixDoCliente: (clienteId: string) => listarPixDoCliente(clienteId),
  criarPagamentoPix: (pedido: PedidoDePix) => criarPagamentoPix(pedido),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { AssinaturaNaoEncontrada, DocumentoRecusado } from "../lib/stripe.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";
import { zerarLimitesDeTentativas } from "../lib/limite-de-tentativas.js";

// PAGAR COM PIX A COBRANÇA ATRASADA (Fase 4, etapa 4.9b, E14 — decisão do operador, P118; a tela aprovada em 30/10/2026).
// É a fronteira de dinheiro. O que estes testes protegem:
//   - nada sem login, nada sem o Pix configurado; só quem TEM uma atrasada (a outra recebe 409, sem nada encerrado);
//   - o corpo não escolhe plano, preço nem assinatura: o Pix é o do plano da atrasada, pelo preço do servidor;
//   - A ORDEM: o CPF primeiro (recusado, nada se encerra), depois encerrar, depois anular a cobrança em aberto (anulada
//     com a assinatura viva, a Stripe a reativaria), e só então o Pix;
//   - a cobrança que passou no meio: nada se encerra (relida com a trava) — ou, se passou no instante, alerta e sem Pix;
//   - a cobrança em aberto que não se anula: alerta (o cartão ainda poderia ser cobrado), e o Pix segue;
//   - a assinatura ocupada: nada é feito; a pessoa continua logada depois de encerrar, mesmo perdendo as aulas.

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const [PASSADO, FUTURO] = [new Date("2020-01-01T00:00:00Z"), new Date("2100-01-01T00:00:00Z")];
const SUB = `sub_${S}_atrasada`;
const CLIENTE = `cus_${S}_atrasada`;
const FATURA = `in_${S}_em_aberto`;
const CPF = "529.982.247-25";
const PRECOS: PrecoDoPlano[] = [
  { plano: "mensal", precoId: "price_mensal", centavos: 9990, moeda: "brl" },
  { plano: "anual", precoId: "price_anual", centavos: 99500, moeda: "brl" },
];
const AMBIENTE = ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_PIX_CONFIGURATION"] as const;
const antes = Object.fromEntries(AMBIENTE.map((nome) => [nome, process.env[nome]]));
let member: string[] = [];
let memberId = "";
let memberEmail = "";

/** O que a Stripe diz da atrasada (os detalhes da tela e da operação) e o que a sincronia lê. */
let detalhes: Partial<DetalhesDaAssinatura> = {};
let naStripe: Partial<AssinaturaNaStripe> = {};
const falhaHa = (dias: number) => new Date(Date.now() - dias * DIA);
const daStripe = (id: string): DetalhesDaAssinatura => ({ id, status: "past_due", pagoAte: falhaHa(5), plano: "mensal", preco: { centavos: 9990, moeda: "brl" }, fimDoPeriodo: new Date(Date.now() + 25 * DIA), comecouEm: null, acabaEm: null, acabaNoFimDoPeriodo: false, cartao: null, clienteId: CLIENTE, userId: memberId, pixPaymentIntentId: null, faturaEmAbertoId: FATURA, itemId: "si_do_teste", agendamentoId: null, agendamentoNosso: false, trocaMarcada: null, faturaDaTrocaId: null, ...detalhes });

const pagarAAtrasada = (cookies: string[] = member, corpo: object = { documento: CPF }) => request(servidor).post("/api/billing/minha-assinatura/pix").set("Cookie", cookies).send(corpo);
const espelho = () => prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: SUB } });
const doSeed = (status: string, currentPeriodEnd: Date | null) => prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status, currentPeriodEnd } });
const estaDentro = async () => (await request(servidor).get("/api/me").set("Cookie", member)).status === 200;

/** Segura a trava da assinatura, como faz quem a está sincronizando neste instante. */
async function comAAssinaturaOcupada(enquanto: () => Promise<void>): Promise<void> {
  let soltar: () => void = () => {};
  let travou: () => void = () => {};
  const comATrava = new Promise<void>((resolve) => (travou = resolve));
  const segurando = prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${SUB}))`;
      travou();
      await new Promise<void>((resolve) => (soltar = resolve));
    },
    { timeout: 20_000 },
  );
  await comATrava;
  try {
    await enquanto();
  } finally {
    soltar();
    await segurando;
  }
}

beforeAll(async () => {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email: process.env.SEED_MEMBER_EMAIL, password: process.env.SEED_MEMBER_PASSWORD });
  member = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(member.length).toBeGreaterThan(0);
  const conta = await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL }, select: { id: true, email: true } });
  [memberId, memberEmail] = [conta.id, conta.email];
});

beforeEach(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_da_suite_local";
  process.env.STRIPE_PIX_CONFIGURATION = "pmc_so_pix_da_suite";
  await zerarLimitesDeTentativas();
  // A assinatura de mentira do seed sai de cena: a do teste é a atrasada que a "Stripe" conhece (há 5 dias: sem aulas).
  await doSeed("canceled", PASSADO);
  await prisma.subscription.create({ data: { ownerUserId: memberId, status: "past_due", currentPeriodEnd: falhaHa(5), stripeSubscriptionId: SUB, stripeCustomerId: CLIENTE } });
  detalhes = {};
  naStripe = {};
  idas.length = 0;
  buscarDetalhes.mockReset().mockImplementation(async (id) => {
    if (id !== SUB) throw new AssinaturaNaoEncontrada(id);
    return daStripe(id);
  });
  buscarAssinatura.mockReset().mockImplementation(async (id) => ({ id, status: "past_due", pagoAte: falhaHa(5), clienteId: CLIENTE, userId: memberId, livemode: false, ...naStripe }));
  // Como na Stripe: encerrada, a assinatura é `canceled` (com o "pago até" de antes), e a sincronia lê isso.
  encerrarParaOPix.mockReset().mockImplementation(async (id) => {
    idas.push(`encerrar ${id}`);
    naStripe = { ...naStripe, status: "canceled", trocadaPorPix: true };
  });
  anularFatura.mockReset().mockImplementation(async (id) => (idas.push(`anular ${id}`), "anulada"));
  acertarNumeroFiscal.mockReset().mockImplementation(async (clienteId) => (idas.push(`documento ${clienteId}`), true));
  buscarPrecos.mockReset().mockResolvedValue(PRECOS);
  assinaturasDoCliente.mockReset().mockResolvedValue([]);
  criarCliente.mockReset().mockResolvedValue({ id: CLIENTE, livemode: false });
  listarPixDoCliente.mockReset().mockResolvedValue({ pagos: [], pendentes: [] });
  criarPagamentoPix.mockReset().mockImplementation(async (pedido) => (idas.push(`pix ${pedido.plano} ${pedido.precoId} ${pedido.centavos}`), { id: `pi_${S}`, segredo: `pi_${S}_secret_x`, livemode: false }));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await doSeed("active", FUTURO);
});

afterAll(() => {
  for (const nome of AMBIENTE) {
    if (antes[nome] === undefined) delete process.env[nome];
    else process.env[nome] = antes[nome];
  }
});

describe("POST /api/billing/minha-assinatura/pix — a porta", () => {
  it("sem login: 401, e a Stripe nem é chamada", async () => {
    expect((await pagarAAtrasada([])).status).toBe(401);
    expect(buscarDetalhes).not.toHaveBeenCalled();
    expect(idas).toEqual([]);
  });

  it("sem o Pix configurado: 503, e nada se encerra", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.STRIPE_PIX_CONFIGURATION;
    expect([(await pagarAAtrasada()).status, idas]).toEqual([503, []]);
  });

  it("o CPF ou CNPJ inválido no corpo: 400, sem ir à Stripe", async () => {
    expect((await pagarAAtrasada(member, { documento: "123" })).status).toBe(400);
    expect(idas).toEqual([]);
  });

  it("a assinatura em dia (não atrasada): 409 NaoAtrasada — nada se encerra, nenhum Pix", async () => {
    await prisma.subscription.update({ where: { stripeSubscriptionId: SUB }, data: { status: "active", currentPeriodEnd: new Date(Date.now() + 20 * DIA) } });
    detalhes = { status: "active", pagoAte: new Date(Date.now() + 20 * DIA), faturaEmAbertoId: null };
    const res = await pagarAAtrasada();
    expect([res.status, res.body]).toEqual([409, { error: "NaoAtrasada" }]);
    expect(idas).toEqual([]);
  });

  it("sem assinatura nenhuma: 409 NaoAtrasada", async () => {
    await prisma.subscription.update({ where: { stripeSubscriptionId: SUB }, data: { status: "canceled", currentPeriodEnd: falhaHa(30) } });
    expect((await pagarAAtrasada()).body).toEqual({ error: "NaoAtrasada" });
    expect(idas).toEqual([]);
  });
});

describe("POST /api/billing/minha-assinatura/pix — encerrar e pagar", () => {
  it("a atrasada sem aulas: o CPF, depois encerrar, depois anular a cobrança em aberto, e o Pix do MESMO plano pelo preço do servidor", async () => {
    const res = await pagarAAtrasada();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estado: "pagar", segredo: `pi_${S}_secret_x`, tipo: "pix", email: memberEmail });
    // O CPF vai à ficha do cliente da atrasada ANTES de encerrar; o Pix acerta o número de novo antes do QR (a regra de sempre).
    expect(idas.slice(0, 3)).toEqual([`documento ${CLIENTE}`, `encerrar ${SUB}`, `anular ${FATURA}`]);
    expect(idas.at(-1)).toBe("pix mensal price_mensal 9990");
    expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
    expect(criarPagamentoPix.mock.calls[0]?.[0]).toMatchObject({ plano: "mensal", precoId: "price_mensal", centavos: 9990, userId: memberId });
    // O espelho já diz encerrada (a sincronia com a trava), e a pessoa continua logada para pagar o QR.
    expect((await espelho()).status).toBe("canceled");
    expect(await estaDentro()).toBe(true);
  });

  it("o corpo não escolhe plano, preço nem assinatura: a atrasada é anual, e o Pix é o anual pelo preço do servidor", async () => {
    detalhes = { plano: "anual" };
    const res = await pagarAAtrasada(member, { documento: CPF, plano: "mensal", precoId: "price_de_mentira", centavos: 1, assinatura: "sub_de_outra_pessoa" });
    expect(res.status).toBe(200);
    expect(idas.at(-1)).toBe("pix anual price_anual 99500");
    expect(encerrarParaOPix.mock.calls.map(([id]) => id)).toEqual([SUB]);
  });

  it("ainda nos 3 dias (com aulas): encerra, as aulas trancam até o Pix cair — e a pessoa continua logada", async () => {
    await prisma.subscription.update({ where: { stripeSubscriptionId: SUB }, data: { currentPeriodEnd: falhaHa(1) } });
    detalhes = { pagoAte: falhaHa(1) };
    naStripe = { pagoAte: falhaHa(1) };
    expect((await request(servidor).get("/api/billing/assinatura").set("Cookie", member)).body).toMatchObject({ temAcesso: true });
    expect((await pagarAAtrasada()).status).toBe(200);
    expect((await request(servidor).get("/api/billing/assinatura").set("Cookie", member)).body).toMatchObject({ temAcesso: false });
    expect(await estaDentro()).toBe(true);
  });

  it("a Stripe recusa o CPF: 400 DocumentoInvalido — e NADA se encerra", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    acertarNumeroFiscal.mockRejectedValueOnce(new DocumentoRecusado("cpf"));
    const res = await pagarAAtrasada();
    expect([res.status, res.body]).toEqual([400, { error: "DocumentoInvalido" }]);
    expect(encerrarParaOPix).not.toHaveBeenCalled();
    expect(criarPagamentoPix).not.toHaveBeenCalled();
    expect((await espelho()).status).toBe("past_due");
  });

  it("a cobrança passou entre a leitura e a trava (outra aba trocou o cartão): relida com a trava, nada se encerra — 409 NaoAtrasada", async () => {
    buscarDetalhes.mockImplementationOnce(async (id) => daStripe(id)).mockImplementationOnce(async (id) => ({ ...daStripe(id), status: "active", faturaEmAbertoId: null }));
    const res = await pagarAAtrasada();
    expect([res.status, res.body]).toEqual([409, { error: "NaoAtrasada" }]);
    expect(encerrarParaOPix).not.toHaveBeenCalled();
    expect(criarPagamentoPix).not.toHaveBeenCalled();
  });

  it("a cobrança em aberto foi PAGA no instante do encerramento: alerta [stripe], 409 JaAssinante e nenhum Pix", async () => {
    const erros = vi.spyOn(console, "error").mockImplementation(() => {});
    anularFatura.mockResolvedValueOnce("paga");
    const res = await pagarAAtrasada();
    expect([res.status, res.body]).toEqual([409, { error: "JaAssinante" }]);
    expect(criarPagamentoPix).not.toHaveBeenCalled();
    expect(erros.mock.calls.some(([texto]) => String(texto).startsWith("[stripe] pix da atrasada") && String(texto).includes(SUB) && String(texto).includes("PAGA"))).toBe(true);
  });

  it("a cobrança em aberto não se anulou: alerta [stripe] (o cartão ainda poderia ser cobrado) — e o Pix segue", async () => {
    const erros = vi.spyOn(console, "error").mockImplementation(() => {});
    anularFatura.mockRejectedValueOnce(new Error("a Stripe caiu"));
    expect((await pagarAAtrasada()).status).toBe(200);
    expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
    expect(erros.mock.calls.some(([texto]) => String(texto).startsWith("[stripe] pix da atrasada") && String(texto).includes("NÃO foi anulada"))).toBe(true);
  });

  it("sem cobrança em aberto: encerra e segue sem anular nada", async () => {
    detalhes = { faturaEmAbertoId: null };
    expect((await pagarAAtrasada()).status).toBe(200);
    expect(anularFatura).not.toHaveBeenCalled();
    expect(idas.slice(0, 2)).toEqual([`documento ${CLIENTE}`, `encerrar ${SUB}`]);
  });

  it("a Stripe falha ao encerrar: 500, nada anulado e nenhum Pix", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    encerrarParaOPix.mockRejectedValueOnce(new Error("[stripe] o encerramento falhou"));
    expect((await pagarAAtrasada()).status).toBe(500);
    expect(anularFatura).not.toHaveBeenCalled();
    expect(criarPagamentoPix).not.toHaveBeenCalled();
    expect((await espelho()).status).toBe("past_due");
  });

  it("a assinatura ocupada (sendo acertada agora): 409 Ocupada, sem ir à Stripe para encerrar", async () => {
    await comAAssinaturaOcupada(async () => {
      const res = await pagarAAtrasada();
      expect([res.status, res.body]).toEqual([409, { error: "Ocupada" }]);
    });
    expect(encerrarParaOPix).not.toHaveBeenCalled();
    expect(criarPagamentoPix).not.toHaveBeenCalled();
  });
});
