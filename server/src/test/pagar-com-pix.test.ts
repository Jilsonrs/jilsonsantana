import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import { createHash } from "node:crypto";
import type { DocumentoFiscal } from "@jilson/core";
import type { AssinaturaNaStripe, AssinaturaNoCheckout, PagamentoPrePago, PedidoDeAssinatura, PrecoDoPlano } from "../lib/stripe.js";
import type { PagamentoPixCriado, PedidoDePix, PixDoCliente, PixPendente, PrePagaDoPix } from "../lib/stripe-pix.js";
import type { PedidoDeEmail, Envio } from "../lib/email.js";

// A Stripe na NOSSA fronteira: só o que iria à rede vira dublê. Uma "Stripe de mentira" guarda as
// assinaturas e os pagamentos Pix de cada cliente, para a regra de verdade (a trava, a ficha, a
// tentativa, um QR por vez) rodar contra o banco de verdade.
const buscarPrecos = vi.fn<() => Promise<PrecoDoPlano[]>>();
const buscarCodigo = vi.fn<(codigo: string) => Promise<null>>();
const criarCliente = vi.fn<(conta: { userId: string; email: string; nome: string | null }) => Promise<{ id: string; livemode: boolean }>>();
const criarClienteDoVisitante = vi.fn<(cliente: { pedido: string; email: string; documento: DocumentoFiscal }) => Promise<{ id: string; livemode: boolean }>>();
const acertarNumeroFiscal = vi.fn<(clienteId: string, documento: DocumentoFiscal) => Promise<boolean>>();
const assinaturasDoCliente = vi.fn<(clienteId: string) => Promise<AssinaturaNoCheckout[]>>();
const cancelarIncompleta = vi.fn<(id: string) => Promise<string>>();
const criarAssinatura = vi.fn<(pedido: PedidoDeAssinatura) => Promise<AssinaturaNoCheckout | null>>();
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarPrecos: () => buscarPrecos(),
  buscarCodigo: (codigo: string) => buscarCodigo(codigo),
  criarCliente: (conta: { userId: string; email: string; nome: string | null }) => criarCliente(conta),
  criarClienteDoVisitante: (cliente: { pedido: string; email: string; documento: DocumentoFiscal }) => criarClienteDoVisitante(cliente),
  acertarNumeroFiscal: (clienteId: string, documento: DocumentoFiscal) => acertarNumeroFiscal(clienteId, documento),
  assinaturasDoCliente: (clienteId: string) => assinaturasDoCliente(clienteId),
  cancelarIncompleta: (id: string) => cancelarIncompleta(id),
  criarAssinatura: (pedido: PedidoDeAssinatura) => criarAssinatura(pedido),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));
const criarPagamentoPix = vi.fn<(pedido: PedidoDePix) => Promise<PagamentoPixCriado>>();
// A LISTA dos Pix do cliente — os pagos e os à espera, numa ida só (achado 6 da segunda revisão do passo 6).
const listarPixDoCliente = vi.fn<(clienteId: string) => Promise<PixDoCliente>>();
const cancelarPagamentoPix = vi.fn<(id: string) => Promise<void>>();
// O Pix JÁ PAGO cujo aviso ainda não chegou (passo 6, achado 4): a leitura de um, e o que a rotina do aviso faz
// na Stripe para transformá-lo em assinatura (a rotina em si roda de verdade, contra o banco).
const lerPagamentoPix = vi.fn<(id: string) => Promise<{ status: string; pagamento: PagamentoPrePago | null }>>();
const criarAssinaturaPrePaga = vi.fn<(pagamento: PagamentoPrePago) => Promise<{ id: string; faturaPaga: boolean }>>();
const garantirFaturaPaga = vi.fn<(assinaturaId: string) => Promise<{ fatura: string | null; status: string }>>();
const assinaturasDoPix = vi.fn<(clienteId: string, pagamentoId: string) => Promise<PrePagaDoPix[]>>();
const marcarEmConferencia = vi.fn<(pagamentoId: string, motivo: string) => Promise<boolean>>();
vi.mock("../lib/stripe-pix.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-pix.js")>()),
  criarPagamentoPix: (pedido: PedidoDePix) => criarPagamentoPix(pedido),
  listarPixDoCliente: (clienteId: string) => listarPixDoCliente(clienteId),
  cancelarPagamentoPix: (id: string) => cancelarPagamentoPix(id),
  lerPagamentoPix: (id: string) => lerPagamentoPix(id),
  criarAssinaturaPrePaga: (pagamento: PagamentoPrePago) => criarAssinaturaPrePaga(pagamento),
  garantirFaturaPaga: (assinaturaId: string) => garantirFaturaPaga(assinaturaId),
  assinaturasDoPix: (clienteId: string, pagamentoId: string) => assinaturasDoPix(clienteId, pagamentoId),
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
import { DocumentoRecusado } from "../lib/stripe.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";
import { assinaturasAoMesmoTempo, comVaga } from "../lib/assinaturas-em-andamento.js";
import { temAcessoAtivo } from "../lib/acesso.js";
import { LIMITES_DO_VISITANTE } from "../lib/limite-de-tentativas.js";

// PAGAR COM PIX, PRÉ-PAGO (Fase 4, etapa 4.9, passo 2 — decisões do operador, 28/10/2026). O que
// estes testes protegem — é a fronteira de dinheiro, nas duas portas (logado e sem conta):
//   - nada responde sem o Pix configurado; com login, nada sem sessão; o corpo não escolhe preço,
//     cliente nem conta, e o código promocional não existe aqui (o Pix é sempre o preço cheio);
//   - quem JÁ TEM ACESSO não paga de novo; quem a Stripe diz que já assina (o aviso atrasou) é
//     SINCRONIZADO — sem QR —; a cobrança atrasada manda trocar o cartão;
//   - UM QR POR VEZ: o novo clique do mesmo plano é o mesmo QR; o de outro plano cancela o anterior;
//     o visitante só segue com o QR da MESMA tentativa (sem o código, o anterior morre);
//   - UM PAGAMENTO ABERTO POR VEZ, nos dois sentidos: o Pix cancela o cartão começado e não pago, e
//     o checkout por cartão cancela o Pix à espera;
//   - o CPF ou CNPJ vai para a ficha do cliente antes do QR, também no reaproveitado;
//   - NADA grava o espelho: a assinatura nasce quando o Pix cai (`pix-pre-pago.test.ts`);
//   - dois cliques ao mesmo tempo: "ocupada" na hora; o teto de "ao mesmo tempo"; os limites sem login;
//   - O PIX JÁ PAGO cujo aviso ainda não chegou (passo 6, achado 4, 29/10/2026): nas quatro portas
//     (Pix e cartão, logado e visitante) ele vira assinatura NA HORA e a resposta é "já assina" /
//     "já tem conta" — sem outro QR, sem outro cartão, sem mexer no CPF nem na tentativa da ficha;
//     a conta nasce presa à tentativa que PAGOU; o QR só é reaproveitado com o MESMO preço; o
//     "outro" Pix pago no meio do cancelamento é processado, não um 500.
//   - a SEGUNDA REVISÃO do passo 6 (29/10/2026): a pré-paga incompleta de um Pix pago nunca é cancelada
//     (achado 2); o Pix pago com espelho morto não é vendido de novo — fica EM CONFERÊNCIA (409
//     `PixEmConferencia`), com um alerta só, e o clique seguinte nem processa (achados 3 e 4); o Pix
//     DEVOLVIDO não conta como pago (achado 1); a conta que nasce no meio do clique não recebe a
//     tentativa nova (achado 6); e o cartão também processa o Pix pago no meio do cancelamento (achado 9).

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const PRECOS: PrecoDoPlano[] = [
  { plano: "mensal", precoId: "price_mensal", centavos: 9990, moeda: "brl" },
  { plano: "anual", precoId: "price_anual", centavos: 99500, moeda: "brl" },
];
const CPF = "529.982.247-25";
const CPF_LIMPO = "52998224725";
const OUTRO_CPF = "111.444.777-35";
const PMC = "pmc_so_pix_da_suite";
const AMBIENTE = ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_PIX_CONFIGURATION"] as const;
const antes = Object.fromEntries(AMBIENTE.map((nome) => [nome, process.env[nome]]));

let member: string[] = [];
let memberId = "";
let memberEmail = "";
let n = 0;
const novoEmail = () => `pix-${++n}-${S}@teste.local`;
// TEST-NET-3: fora da faixa que os outros arquivos usam (198.51.100.x) — a contagem por endereço é no banco, e os arquivos dividem o banco.
let enderecos = 0;
const novoEndereco = () => `203.0.113.${++enderecos}`;
/** O resumo que a ficha e a Stripe guardam: o SHA-256 da tentativa, em hexadecimal — calculado aqui, à parte. */
const sha256 = (texto: string) => createHash("sha256").update(texto, "utf8").digest("hex");

/** A Stripe de mentira: as assinaturas e os pagamentos Pix de cada cliente. */
type SubNaStripe = AssinaturaNoCheckout & { cliente: string };
/** `emConferencia`: a marca nos metadados do Pix (`marcarEmConferencia`); `devolvido`: o dinheiro voltou por inteiro. */
type PixNaStripe = PixPendente & { cliente: string; status: string; pedido: PedidoDePix; emConferencia?: string; devolvido?: boolean };
let naStripe: SubNaStripe[] = [];
let pixNaStripe: PixNaStripe[] = [];
/** As pré-pagas que a Stripe de mentira "criou" de um Pix pago, por id — é o que `buscarAssinatura` devolve para a sincronia. */
let prePagas = new Map<string, PagamentoPrePago>();
/** Um Pix da Stripe de mentira lido como o pagamento pré-pago (o que `listarPixDoCliente` e `lerPagamentoPix` devolvem). */
const paraPago = (p: PixNaStripe): PagamentoPrePago => ({ id: p.id, plano: p.pedido.plano, precoId: p.pedido.precoId, clienteId: p.cliente, livemode: false, centavos: p.pedido.centavos, userId: "userId" in p.pedido ? p.pedido.userId : null, visitante: "visitante" in p.pedido ? p.pedido.visitante : null });
/** A Stripe de mentira passa a conhecer as pré-pagas criadas: o que a sincronia lê de cada uma. */
const stripeConhecePrePagas = async (id: string): Promise<AssinaturaNaStripe> => {
  const pg = prePagas.get(id);
  if (!pg) throw new Error(`a Stripe deste teste não conhece ${id}`);
  return { id, status: "active", pagoAte: new Date(Date.now() + 30 * DIA), clienteId: pg.clienteId, userId: pg.userId, pedido: pg.visitante?.pedido ?? null, doVisitante: pg.visitante?.escolha, livemode: false, pixPaymentIntentId: pg.id, resumoDaTentativa: pg.visitante?.resumoDaTentativa ?? null };
};
/** O Pix de um cliente caiu — e o aviso ainda não chegou. */
const pixCaiu = (cliente: string) => {
  pixNaStripe = pixNaStripe.map((p) => (p.cliente === cliente && p.status === "requires_action" ? { ...p, status: "succeeded" } : p));
};
// Os clientes criados: um id novo por teste INTEIRO — a ficha do visitante guarda o id e é única por cliente.
let clientes = 0;
const incompleta = (id: string, cliente: string, precoId = "price_mensal"): SubNaStripe => ({ id, cliente, status: "incomplete", precoId, codigoId: null, segredoDoPagamento: `pi_${id}_secret_x`, segredoDoCartao: null });
const viva = (id: string, cliente: string, status = "active"): SubNaStripe => ({ id, cliente, status, precoId: "price_mensal", codigoId: null, segredoDoPagamento: null, segredoDoCartao: null });
/** O que a sincronia ouve da Stripe sobre a assinatura viva. */
const dizAStripe = (id: string, clienteId: string, dados: Partial<AssinaturaNaStripe> = {}): AssinaturaNaStripe => ({
  id,
  status: "active",
  pagoAte: new Date(Date.now() + 30 * DIA),
  clienteId,
  userId: memberId,
  livemode: false,
  ...dados,
});

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}
const pix = (corpo: object, cookies: string[] = member) => request(servidor).post("/api/billing/pix").set("Cookie", cookies).send({ documento: CPF, ...corpo });
const cartao = (corpo: object, cookies: string[] = member) => request(servidor).post("/api/billing/assinatura").set("Cookie", cookies).send({ documento: CPF, ...corpo });
const pixVisitante = (corpo: object, endereco: string) => request(servidor).post("/api/billing/visitante/pix").set("x-forwarded-for", endereco).send(corpo);
const cartaoVisitante = (corpo: object, endereco: string) => request(servidor).post("/api/billing/visitante/assinatura").set("x-forwarded-for", endereco).send(corpo);
const pedido = (email: string, extra: object = {}) => ({ email, documento: CPF, plano: "mensal", novidades: false, ...extra });
const ficha = (email: string) => prisma.guestCheckout.findUnique({ where: { email: email.toLowerCase() } });
const clienteDoMember = async () => (await prisma.stripeCustomer.findUniqueOrThrow({ where: { userId: memberId } })).stripeCustomerId;
const pixDoMember = () => prisma.subscription.count({ where: { ownerUserId: memberId, pixPaymentIntentId: { not: null } } });

/** Roda o bloco com a assinatura de teste do member@ vencida, e devolve ela ao fim. */
async function semAssinatura(fn: () => Promise<void>) {
  await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "canceled", currentPeriodEnd: new Date("2020-01-01T00:00:00Z") } });
  try {
    await fn();
  } finally {
    await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "active", currentPeriodEnd: new Date("2100-01-01T00:00:00Z") } });
  }
}

/** Dois pedidos ao mesmo tempo: o primeiro fica PARADO com a trava na mão (a Stripe de mentira segura a lista), o segundo corre inteiro. */
async function comOPrimeiroParado(primeiro: () => Promise<request.Response>, segundo: () => Promise<request.Response>) {
  let dentro!: () => void;
  let soltar!: () => void;
  const entrou = new Promise<void>((ok) => (dentro = ok));
  const segura = new Promise<void>((ok) => (soltar = ok));
  assinaturasDoCliente.mockImplementationOnce(async (clienteId) => {
    dentro();
    await segura;
    return naStripe.filter((a) => a.cliente === clienteId);
  });
  // O `.then` DISPARA o pedido (o do supertest só sai quando alguém o espera).
  const parado = primeiro().then((res) => res);
  await entrou;
  const resposta = await segundo();
  soltar();
  return { primeiro: await parado, segundo: resposta };
}

/** O pagamento Pix que a Stripe de mentira cria: à espera do pagamento, com o QR. */
async function pixDeMentira(p: PedidoDePix): Promise<PagamentoPixCriado> {
  const id = `pi_${S}_${++n}`;
  pixNaStripe.push({ id, cliente: p.clienteId, status: "requires_action", segredo: `${id}_secret_x`, plano: p.plano, precoId: p.precoId, resumoDaTentativa: "visitante" in p ? p.visitante.resumoDaTentativa : null, pedido: p });
  return { id, segredo: `${id}_secret_x`, livemode: false };
}

beforeAll(async () => {
  for (const nome of AMBIENTE) process.env[nome] = nome === "STRIPE_SECRET_KEY" ? "sk_test_da_suite_local" : nome === "STRIPE_PUBLISHABLE_KEY" ? "pk_test_da_suite_local" : PMC;
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  expect(member.length).toBeGreaterThan(0);
  const conta = await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL }, select: { id: true, email: true } });
  memberId = conta.id;
  memberEmail = conta.email;
});

beforeEach(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_da_suite_local";
  process.env.STRIPE_PIX_CONFIGURATION = PMC;
  await prisma.stripeCustomer.deleteMany({ where: { userId: memberId } });
  naStripe = [];
  pixNaStripe = [];
  buscarPrecos.mockReset().mockResolvedValue(PRECOS);
  buscarCodigo.mockReset().mockRejectedValue(new Error("o código promocional não devia ser buscado: o Pix não tem código"));
  criarCliente.mockReset().mockImplementation(async () => ({ id: `cus_${S}_${++clientes}`, livemode: false }));
  criarClienteDoVisitante.mockReset().mockImplementation(async () => ({ id: `cus_${S}_${++clientes}`, livemode: false }));
  acertarNumeroFiscal.mockReset().mockResolvedValue(false);
  assinaturasDoCliente.mockReset().mockImplementation(async (clienteId) => naStripe.filter((a) => a.cliente === clienteId));
  cancelarIncompleta.mockReset().mockImplementation(async (id) => {
    naStripe = naStripe.map((a) => (a.id === id ? { ...a, status: "incomplete_expired", segredoDoPagamento: null } : a));
    return "incomplete_expired";
  });
  criarAssinatura.mockReset().mockImplementation(async (p) => {
    const nova = incompleta(`sub_${S}_${++n}`, p.clienteId, p.precoId);
    naStripe.push(nova);
    return nova;
  });
  buscarAssinatura.mockReset().mockRejectedValue(new Error("este teste não combinou o que a Stripe diz da assinatura"));
  criarPagamentoPix.mockReset().mockImplementation(pixDeMentira);
  listarPixDoCliente.mockReset().mockImplementation(async (clienteId) => {
    const doCliente = pixNaStripe.filter((p) => p.cliente === clienteId);
    return {
      // Como a de verdade: o devolvido por inteiro não conta como pago.
      pagos: doCliente.filter((p) => p.status === "succeeded" && !p.devolvido).map((p) => ({ ...paraPago(p), emConferencia: p.emConferencia ?? null })),
      pendentes: doCliente.filter((p) => p.status === "requires_action").map(({ id, segredo, plano, precoId, resumoDaTentativa }) => ({ id, segredo, plano, precoId, resumoDaTentativa })),
    };
  });
  prePagas = new Map();
  lerPagamentoPix.mockReset().mockImplementation(async (id) => {
    const p = pixNaStripe.find((x) => x.id === id);
    return { status: p?.status ?? "canceled", pagamento: p && p.status === "succeeded" ? paraPago(p) : null };
  });
  criarAssinaturaPrePaga.mockReset().mockImplementation(async (pagamento) => {
    const id = `sub_${S}_${++n}`;
    naStripe.push({ ...viva(id, pagamento.clienteId), pixPaymentIntentId: pagamento.id });
    prePagas.set(id, pagamento);
    return { id, faturaPaga: true };
  });
  // A fatura da incompleta, paga por fora: ela passa a valer (a sincronia a lê de `prePagas`).
  garantirFaturaPaga.mockReset().mockImplementation(async (assinaturaId) => {
    naStripe = naStripe.map((a) => (a.id === assinaturaId && a.status === "incomplete" ? { ...a, status: "active", segredoDoPagamento: null } : a));
    return { fatura: `in_${assinaturaId}`, status: "paid" };
  });
  assinaturasDoPix.mockReset().mockImplementation(async (clienteId, pagamentoId) =>
    naStripe.filter((a) => a.cliente === clienteId && a.pixPaymentIntentId === pagamentoId).map((a) => ({ id: a.id, status: a.status, faturaPaga: a.status !== "incomplete" && a.status !== "incomplete_expired" })),
  );
  marcarEmConferencia.mockReset().mockImplementation(async (pagamentoId, motivo) => {
    if (pixNaStripe.find((p) => p.id === pagamentoId)?.emConferencia) return false;
    pixNaStripe = pixNaStripe.map((p) => (p.id === pagamentoId ? { ...p, emConferencia: motivo } : p));
    return true;
  });
  pixDevolvido.mockReset().mockImplementation(async (pagamentoId) => pixNaStripe.find((p) => p.id === pagamentoId)?.devolvido === true);
  cancelarPagamentoPix.mockReset().mockImplementation(async (id) => {
    pixNaStripe = pixNaStripe.map((p) => (p.id === id ? { ...p, status: "canceled" } : p));
  });
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "email_da_suite" });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

afterAll(async () => {
  for (const nome of AMBIENTE) {
    if (antes[nome] === undefined) delete process.env[nome];
    else process.env[nome] = antes[nome];
  }
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.stripeCustomer.deleteMany({ where: { userId: memberId } });
  // Apagar a conta leva junto a ligação com a Stripe e a ficha dela (cascade); as fichas sem conta saem depois.
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
  await prisma.guestCheckout.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
});

describe("POST /api/billing/pix — com a conta logada", () => {
  it("sem login: 401, e nada vai à Stripe", async () => {
    const res = await pix({ plano: "mensal" }, []);
    expect(res.status).toBe(401);
    expect(buscarPrecos).not.toHaveBeenCalled();
    expect(criarPagamentoPix).not.toHaveBeenCalled();
  });

  it("o corpo: plano fora da lista, CPF errado ou sem CPF — 400, antes da Stripe", async () => {
    expect((await pix({ plano: "semanal" })).status).toBe(400);
    expect((await pix({ plano: "mensal", documento: "529.982.247-24" })).status).toBe(400);
    expect((await pix({ plano: "mensal", documento: undefined })).status).toBe(400);
    expect(buscarPrecos).not.toHaveBeenCalled();
    expect(criarCliente).not.toHaveBeenCalled();
    expect(criarPagamentoPix).not.toHaveBeenCalled();
  });

  it("sem a configuração só-Pix (ou sem a chave da Stripe): 503 'NaoConfigurado', um alerta, e nada vai à Stripe", async () => {
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.STRIPE_PIX_CONFIGURATION;
    let res = await pix({ plano: "mensal" });
    expect([res.status, res.body]).toEqual([503, { error: "NaoConfigurado" }]);
    expect(alerta.mock.calls.map(([linha]) => String(linha))).toEqual([expect.stringContaining("STRIPE_PIX_CONFIGURATION")]);
    process.env.STRIPE_PIX_CONFIGURATION = PMC;
    delete process.env.STRIPE_SECRET_KEY;
    res = await pix({ plano: "mensal" });
    expect(res.status).toBe(503);
    expect(buscarPrecos).not.toHaveBeenCalled();
    expect(criarPagamentoPix).not.toHaveBeenCalled();
  });

  it("quem JÁ TEM ACESSO não paga de novo: 409 'JaAssinante', sem ir à Stripe (pagar de novo é só depois de acabar)", async () => {
    expect(await temAcessoAtivo(memberId)).toBe(true);
    const res = await pix({ plano: "anual" });
    expect([res.status, res.body]).toEqual([409, { error: "JaAssinante" }]);
    expect(criarCliente).not.toHaveBeenCalled();
    expect(acertarNumeroFiscal).not.toHaveBeenCalled();
    expect(criarPagamentoPix).not.toHaveBeenCalled();
  });

  it("o caminho feliz: o QR do plano pedido, com o preço do SERVIDOR, para o cliente da CONTA — o CPF na ficha antes; nada no espelho; nada de id na resposta", async () => {
    await semAssinatura(async () => {
      const res = await pix({ plano: "anual" });
      expect(res.status).toBe(200);
      const clienteId = await clienteDoMember();
      // Com o e-mail de quem paga (P113): o quadro do Pix não o pede, e o site o entrega à Stripe na confirmação.
      expect(res.body).toEqual({ estado: "pagar", segredo: `${pixNaStripe[0]?.id}_secret_x`, tipo: "pix", email: memberEmail });
      expect(criarCliente).toHaveBeenCalledWith({ userId: memberId, email: memberEmail, nome: expect.anything() });
      expect(criarPagamentoPix).toHaveBeenCalledWith({ clienteId, precoId: "price_anual", plano: "anual", centavos: 99500, userId: memberId });
      expect(acertarNumeroFiscal).toHaveBeenCalledWith(clienteId, { tipo: "cpf", numero: CPF_LIMPO });
      // O número vai para a ficha ANTES do QR nascer.
      expect(acertarNumeroFiscal.mock.invocationCallOrder[0]).toBeLessThan(criarPagamentoPix.mock.invocationCallOrder[0] ?? 0);
      expect(res.text).not.toContain("price_");
      expect(res.text).not.toContain("cus_");
      expect(await pixDoMember()).toBe(0);
      expect(await temAcessoAtivo(memberId)).toBe(false);
    });
  });

  it("o código promocional não existe no Pix: `codigo` no corpo é ignorado, e o QR é do preço cheio", async () => {
    await semAssinatura(async () => {
      const res = await pix({ plano: "mensal", codigo: "CEM" });
      expect(res.status).toBe(200);
      expect(buscarCodigo).not.toHaveBeenCalled();
      expect(criarPagamentoPix.mock.calls[0]?.[0].centavos).toBe(9990);
    });
  });

  it("UM QR POR VEZ: o novo clique do MESMO plano é o mesmo QR (sem outro na Stripe); o de OUTRO plano cancela o anterior e cria o novo — e o CPF vai para a ficha nas três vezes", async () => {
    await semAssinatura(async () => {
      const primeiro = await pix({ plano: "mensal" });
      const segundo = await pix({ plano: "mensal" });
      expect(segundo.status).toBe(200);
      expect(segundo.body.segredo).toBe(primeiro.body.segredo);
      expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
      expect(cancelarPagamentoPix).not.toHaveBeenCalled();

      const terceiro = await pix({ plano: "anual", documento: OUTRO_CPF });
      expect(terceiro.status).toBe(200);
      expect(terceiro.body.segredo).not.toBe(primeiro.body.segredo);
      expect(cancelarPagamentoPix).toHaveBeenCalledWith(pixNaStripe[0]?.id);
      expect(pixNaStripe.map((p) => [p.plano, p.status])).toEqual([["mensal", "canceled"], ["anual", "requires_action"]]);
      expect(criarPagamentoPix.mock.calls[1]?.[0]).toMatchObject({ precoId: "price_anual", centavos: 99500 });
      expect(acertarNumeroFiscal.mock.calls.map(([, documento]) => documento.numero)).toEqual([CPF_LIMPO, CPF_LIMPO, "11144477735"]);
    });
  });

  it("UM PAGAMENTO ABERTO POR VEZ: o cartão começado e não pago morre quando a pessoa segue por Pix; o que foi PAGO no meio é 'já é assinante', sem QR novo, e alerta", async () => {
    await semAssinatura(async () => {
      const primeiro = await pix({ plano: "mensal" });
      const clienteId = await clienteDoMember();
      naStripe.push(incompleta(`sub_${S}_cartao_aberto`, clienteId));
      const segundo = await pix({ plano: "mensal" });
      expect(segundo.status).toBe(200);
      expect(segundo.body.segredo).toBe(primeiro.body.segredo);
      expect(cancelarIncompleta).toHaveBeenCalledWith(`sub_${S}_cartao_aberto`);
      expect(criarPagamentoPix).toHaveBeenCalledTimes(1);

      // Pago entre a lista e o cancelamento (outra aba): o cancelamento encerrou uma assinatura paga.
      const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
      naStripe.push(incompleta(`sub_${S}_pago_no_meio`, clienteId));
      cancelarIncompleta.mockResolvedValueOnce("active");
      const terceiro = await pix({ plano: "anual" });
      expect([terceiro.status, terceiro.body]).toEqual([409, { error: "JaAssinante" }]);
      expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
      expect(cancelarPagamentoPix).not.toHaveBeenCalled();
      expect(acertarNumeroFiscal).toHaveBeenCalledTimes(2);
      expect(alerta.mock.calls.map(([linha]) => String(linha))).toEqual([expect.stringContaining(`sub_${S}_pago_no_meio`)]);
      expect(String(alerta.mock.calls[0]?.[0])).toContain("já PAGA");
    });
  });

  describe("a Stripe diz que a conta já assina, e o espelho não dá acesso", () => {
    afterEach(async () => {
      await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { startsWith: `sub_viva_${S}` } } });
    });

    it("o aviso se perdeu (pagou por cartão, ou um Pix que caiu): SINCRONIZA — 409 'JaAssinante', o espelho nasce, a conta passa a ter acesso, e nenhum QR", async () => {
      await semAssinatura(async () => {
        const id = `sub_viva_${S}_perdida`;
        const clienteId = `cus_${S}_viva`;
        await prisma.stripeCustomer.create({ data: { userId: memberId, stripeCustomerId: clienteId, livemode: false } });
        naStripe = [viva(id, clienteId)];
        buscarAssinatura.mockResolvedValue(dizAStripe(id, clienteId));
        const res = await pix({ plano: "mensal" });
        expect([res.status, res.body]).toEqual([409, { error: "JaAssinante" }]);
        expect(buscarAssinatura).toHaveBeenCalledWith(id);
        expect(await prisma.subscription.findUnique({ where: { stripeSubscriptionId: id } })).toMatchObject({ ownerUserId: memberId, status: "active" });
        expect(await temAcessoAtivo(memberId)).toBe(true);
        expect(criarPagamentoPix).not.toHaveBeenCalled();
        expect(cancelarPagamentoPix).not.toHaveBeenCalled();
        // A ficha de quem já assina NÃO é mexida.
        expect(acertarNumeroFiscal).not.toHaveBeenCalled();
      });
    });

    it("a cobrança do cartão atrasada há mais de 3 dias, já sem aulas: 409 'CobrancaAtrasada' — o caminho é trocar o cartão, não um Pix por cima", async () => {
      const grito = vi.spyOn(console, "error").mockImplementation(() => {});
      await semAssinatura(async () => {
        const id = `sub_viva_${S}_sem_aulas`;
        const clienteId = `cus_${S}_atrasada`;
        const falhou = new Date(Date.now() - 4 * DIA);
        await prisma.stripeCustomer.create({ data: { userId: memberId, stripeCustomerId: clienteId, livemode: false } });
        await prisma.subscription.create({ data: { ownerUserId: memberId, status: "past_due", currentPeriodEnd: falhou, stripeSubscriptionId: id } });
        naStripe = [viva(id, clienteId, "past_due")];
        buscarAssinatura.mockResolvedValue(dizAStripe(id, clienteId, { status: "past_due", pagoAte: falhou }));
        const res = await pix({ plano: "mensal" });
        expect([res.status, res.body]).toEqual([409, { error: "CobrancaAtrasada" }]);
        expect(await temAcessoAtivo(memberId)).toBe(false);
        expect(criarPagamentoPix).not.toHaveBeenCalled();
        expect(grito).not.toHaveBeenCalled();
      });
    });
  });

  it("DOIS CLIQUES ao mesmo tempo: o segundo ouve 'ocupada' sem esperar; um cliente, um QR", async () => {
    await semAssinatura(async () => {
      const { primeiro, segundo } = await comOPrimeiroParado(() => pix({ plano: "mensal" }), () => pix({ plano: "mensal" }));
      expect([segundo.status, segundo.body]).toEqual([409, { error: "Ocupada" }]);
      expect(primeiro.status).toBe(200);
      expect(criarCliente).toHaveBeenCalledTimes(1);
      expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
    });
  });

  it("o teto de 'ao mesmo tempo' (o mesmo das assinaturas) cheio: 409 'MuitosAoMesmoTempo' na hora, e nada vai à Stripe", async () => {
    let soltar!: () => void;
    const segura = new Promise<void>((ok) => (soltar = ok));
    const ocupadas = Array.from({ length: assinaturasAoMesmoTempo() }, () => comVaga(() => segura));
    try {
      await semAssinatura(async () => {
        const res = await pix({ plano: "mensal" });
        expect([res.status, res.body]).toEqual([409, { error: "MuitosAoMesmoTempo" }]);
        expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
      });
      expect(criarCliente).not.toHaveBeenCalled();
      expect(criarPagamentoPix).not.toHaveBeenCalled();
    } finally {
      soltar();
      await Promise.all(ocupadas);
    }
  });

  it("a Stripe recusou o CPF que o core aceitou: 400 'DocumentoInvalido', nenhum QR, e alerta", async () => {
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    await semAssinatura(async () => {
      acertarNumeroFiscal.mockRejectedValueOnce(new DocumentoRecusado("cpf"));
      const res = await pix({ plano: "mensal" });
      expect([res.status, res.body]).toEqual([400, { error: "DocumentoInvalido" }]);
      expect(criarPagamentoPix).not.toHaveBeenCalled();
      expect(alerta).toHaveBeenCalledTimes(1);
    });
  });
});

describe("POST /api/billing/visitante/pix — sem conta", () => {
  it("o corpo: sem e-mail, CPF errado ou plano fora da lista — 400, antes da Stripe e sem ficha", async () => {
    const endereco = novoEndereco();
    const email = novoEmail();
    expect((await pixVisitante({ documento: CPF, plano: "mensal", novidades: false }, endereco)).status).toBe(400);
    expect((await pixVisitante(pedido(email, { documento: "529.982.247-24" }), endereco)).status).toBe(400);
    expect((await pixVisitante(pedido(email, { plano: "semanal" }), endereco)).status).toBe(400);
    expect(buscarPrecos).not.toHaveBeenCalled();
    expect(criarClienteDoVisitante).not.toHaveBeenCalled();
    expect(await ficha(email)).toBeNull();
  });

  it("o e-mail que JÁ TEM CONTA (em qualquer grafia) é mandado entrar: 409 'JaTemConta', antes da Stripe", async () => {
    const res = await pixVisitante(pedido(memberEmail.toUpperCase()), novoEndereco());
    expect([res.status, res.body]).toEqual([409, { error: "JaTemConta" }]);
    expect(buscarPrecos).not.toHaveBeenCalled();
    expect(criarClienteDoVisitante).not.toHaveBeenCalled();
  });

  it("o caminho feliz: a ficha do e-mail nasce com o CPF, o QR leva a ficha, o RESUMO da tentativa e a escolha; a tentativa só vai ao navegador; o `codigo` é ignorado; conta nenhuma nasce", async () => {
    const email = novoEmail();
    const res = await pixVisitante(pedido(email, { novidades: true, origem: "youtube", codigo: "CEM" }), novoEndereco());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ estado: "pagar", tipo: "pix", segredo: `${pixNaStripe[0]?.id}_secret_x` });
    const tentativa: unknown = res.body.tentativa;
    expect(typeof tentativa).toBe("string");
    if (typeof tentativa !== "string") return;
    const f = await ficha(email);
    expect(f).toMatchObject({ tentativa: sha256(tentativa), userId: null });
    expect(criarClienteDoVisitante).toHaveBeenCalledWith({ pedido: f?.id, email, documento: { tipo: "cpf", numero: CPF_LIMPO } });
    expect(criarPagamentoPix).toHaveBeenCalledWith({
      clienteId: f?.stripeCustomerId,
      precoId: "price_mensal",
      plano: "mensal",
      centavos: 9990,
      visitante: { pedido: f?.id, resumoDaTentativa: sha256(tentativa), escolha: { novidades: true, origem: "youtube", campanha: null } },
    });
    // A ficha nova já nasceu com o número; o código promocional não existe aqui.
    expect(acertarNumeroFiscal).not.toHaveBeenCalled();
    expect(buscarCodigo).not.toHaveBeenCalled();
    expect(res.text).not.toContain(sha256(tentativa));
    expect(res.text).not.toContain("cus_");
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it("a TENTATIVA: com o código dela e o mesmo plano, o mesmo QR (até com outro CPF, que vai para a ficha); SEM o código, o anterior morre e nasce outro, com código novo; outro plano, idem", async () => {
    const email = novoEmail();
    const endereco = novoEndereco();
    const primeiro = await pixVisitante(pedido(email), endereco);
    const tentativa: unknown = primeiro.body.tentativa;
    if (typeof tentativa !== "string") throw new Error("sem tentativa");

    const mesma = await pixVisitante(pedido(email, { tentativa }), endereco);
    expect(mesma.body).toEqual({ estado: "pagar", segredo: primeiro.body.segredo, tipo: "pix", tentativa, email: email.toLowerCase() });
    const outroCpf = await pixVisitante(pedido(email, { tentativa, documento: OUTRO_CPF }), endereco);
    expect(outroCpf.body).toEqual(mesma.body);
    expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
    expect(cancelarPagamentoPix).not.toHaveBeenCalled();
    // A fatura só nasce quando o Pix cai: o número da ficha é o do último pedido desta tentativa.
    expect(acertarNumeroFiscal.mock.calls.map(([, documento]) => documento.numero)).toEqual([CPF_LIMPO, "11144477735"]);

    // Outra pessoa, que sabe só o e-mail: nunca recebe o QR anterior.
    const semCodigo = await pixVisitante(pedido(email), endereco);
    expect(semCodigo.status).toBe(200);
    expect(semCodigo.body.segredo).not.toBe(primeiro.body.segredo);
    expect(semCodigo.body.tentativa).not.toBe(tentativa);
    expect(cancelarPagamentoPix).toHaveBeenCalledWith(pixNaStripe[0]?.id);
    expect((await ficha(email))?.tentativa).toBe(sha256(String(semCodigo.body.tentativa)));

    const anual = await pixVisitante(pedido(email, { plano: "anual", tentativa: semCodigo.body.tentativa as string }), endereco);
    expect(anual.status).toBe(200);
    expect(anual.body.segredo).not.toBe(semCodigo.body.segredo);
    expect(pixNaStripe.map((p) => [p.plano, p.status])).toEqual([["mensal", "canceled"], ["mensal", "canceled"], ["anual", "requires_action"]]);
    expect(criarPagamentoPix.mock.calls[2]?.[0]).toMatchObject({ precoId: "price_anual", centavos: 99500 });
  });

  it("alguém já PAGOU por este e-mail (a Stripe tem assinatura viva): SINCRONIZA — a conta nasce, as boas-vindas saem — e 'já tem conta', sem QR e sem mexer no CPF", async () => {
    const email = novoEmail();
    const endereco = novoEndereco();
    await pixVisitante(pedido(email), endereco);
    const f = await ficha(email);
    if (!f) throw new Error("sem ficha");
    const id = `sub_${S}_paga_por_cartao`;
    naStripe = [viva(id, f.stripeCustomerId)];
    buscarAssinatura.mockResolvedValue(dizAStripe(id, f.stripeCustomerId, { userId: null, pedido: f.id, doVisitante: { novidades: false, origem: null, campanha: null } }));

    const res = await pixVisitante(pedido(email, { documento: OUTRO_CPF }), endereco);
    expect([res.status, res.body]).toEqual([409, { error: "JaTemConta" }]);
    expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
    expect(acertarNumeroFiscal).not.toHaveBeenCalled();
    const conta = await prisma.user.findUnique({ where: { email } });
    expect(conta).not.toBeNull();
    expect((await prisma.subscription.findUnique({ where: { stripeSubscriptionId: id } }))?.ownerUserId).toBe(conta?.id);
    expect(enviarEmail.mock.calls.map(([e]) => e.para)).toEqual([email]);
  });

  it("DOIS CLIQUES do mesmo e-mail ao mesmo tempo: o segundo ouve 'ocupada' sem esperar; um cliente, um QR", async () => {
    const email = novoEmail();
    const endereco = novoEndereco();
    const { primeiro, segundo } = await comOPrimeiroParado(() => pixVisitante(pedido(email), endereco), () => pixVisitante(pedido(email), endereco));
    expect([segundo.status, segundo.body]).toEqual([409, { error: "Ocupada" }]);
    expect(primeiro.status).toBe(200);
    expect(criarClienteDoVisitante).toHaveBeenCalledTimes(1);
    expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
  });

  it("sem a configuração só-Pix: 503, e nem a ficha nasce", async () => {
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.STRIPE_PIX_CONFIGURATION;
    const email = novoEmail();
    const res = await pixVisitante(pedido(email), novoEndereco());
    expect([res.status, res.body]).toEqual([503, { error: "NaoConfigurado" }]);
    expect(criarClienteDoVisitante).not.toHaveBeenCalled();
    expect(await ficha(email)).toBeNull();
    expect(alerta).toHaveBeenCalledTimes(1);
  });

  it("o limite por E-MAIL do assinar sem login vale aqui: o 6º pedido em 15 minutos é recusado", async () => {
    const email = novoEmail();
    const endereco = novoEndereco();
    expect(LIMITES_DO_VISITANTE.assinar.email.porJanela).toBe(5);
    for (let i = 0; i < 5; i++) expect((await pixVisitante(pedido(email), endereco)).status, `pedido ${i + 1}`).toBe(200);
    const recusa = await pixVisitante(pedido(email), endereco);
    expect([recusa.status, recusa.body]).toEqual([429, { error: "MuitasTentativas" }]);
    expect(Number(recusa.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("os E-MAILS NOVOS do dia (10 por endereço) contam os clientes que o Pix cria: o 11º é recusado, sem ficha", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
    const endereco = novoEndereco();
    const emails = Array.from({ length: LIMITES_DO_VISITANTE.emailsNovosPorDia }, novoEmail);
    for (let i = 0; i < emails.length; i++) {
      // Em rodadas que respeitam a janela de 15 minutos do endereço.
      if (i > 0 && i % 5 === 0) vi.setSystemTime(Date.now() + 16 * 60_000);
      expect((await pixVisitante(pedido(emails[i] ?? ""), endereco)).status, `e-mail ${i + 1}`).toBe(200);
    }
    vi.setSystemTime(Date.now() + 16 * 60_000);
    const decimoPrimeiro = novoEmail();
    const recusa = await pixVisitante(pedido(decimoPrimeiro), endereco);
    expect([recusa.status, recusa.body]).toEqual([429, { error: "MuitasTentativas" }]);
    expect(await ficha(decimoPrimeiro)).toBeNull();
    expect(criarClienteDoVisitante).toHaveBeenCalledTimes(10);
  });
});

describe("UM PAGAMENTO ABERTO POR VEZ — o checkout por cartão cancela o Pix à espera", () => {
  it("com a conta logada: o QR aberto morre quando a mesma conta segue por cartão", async () => {
    await semAssinatura(async () => {
      const qr = await pix({ plano: "mensal" });
      expect(qr.status).toBe(200);
      const res = await cartao({ plano: "mensal" });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ estado: "pagar", tipo: "pagamento" });
      expect(cancelarPagamentoPix).toHaveBeenCalledWith(pixNaStripe[0]?.id);
      expect(pixNaStripe.map((p) => p.status)).toEqual(["canceled"]);
    });
  });

  it("sem conta: o QR aberto da ficha morre quando o e-mail segue por cartão", async () => {
    const email = novoEmail();
    const endereco = novoEndereco();
    expect((await pixVisitante(pedido(email), endereco)).status).toBe(200);
    const res = await cartaoVisitante(pedido(email), endereco);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ estado: "pagar", tipo: "pagamento" });
    expect(cancelarPagamentoPix).toHaveBeenCalledWith(pixNaStripe[0]?.id);
    expect(pixNaStripe.map((p) => p.status)).toEqual(["canceled"]);
  });
});

describe("os planos dizem se o Pix está no ar", () => {
  it("com a configuração só-Pix, as duas vitrines levam a configuração (sem a chave secreta); sem ela, `pix` é nulo", async () => {
    const logado = await request(servidor).get("/api/billing/planos").set("Cookie", member);
    const visitante = await request(servidor).get("/api/billing/visitante/planos").set("x-forwarded-for", novoEndereco());
    expect(logado.body.pix).toEqual({ configuracao: PMC });
    expect(visitante.body.pix).toEqual({ configuracao: PMC });
    expect(logado.text).not.toContain("sk_test");

    delete process.env.STRIPE_PIX_CONFIGURATION;
    expect((await request(servidor).get("/api/billing/planos").set("Cookie", member)).body.pix).toBeNull();
    expect((await request(servidor).get("/api/billing/visitante/planos").set("x-forwarded-for", novoEndereco())).body.pix).toBeNull();
  });
});

describe("o Pix JÁ PAGO cujo aviso ainda não chegou (passo 6, achado 4)", () => {
  // As pré-pagas que nascem aqui são do member@: saem entre um teste e outro (o `semAssinatura` só mexe na assinatura de teste).
  afterEach(async () => {
    await prisma.subscription.deleteMany({ where: { ownerUserId: memberId, pixPaymentIntentId: { not: null } } });
  });

  it("logado, 'Pagar com Pix' de novo: a assinatura nasce na hora, 409 JaAssinante — sem outro QR, sem mexer no CPF", async () => {
    await semAssinatura(async () => {
      expect((await pix({ plano: "mensal" })).status).toBe(200);
      const cliente = await clienteDoMember();
      pixCaiu(cliente);
      buscarAssinatura.mockImplementation(stripeConhecePrePagas);
      const res = await pix({ plano: "anual" });
      expect([res.status, res.body]).toEqual([409, { error: "JaAssinante" }]);
      expect(criarAssinaturaPrePaga).toHaveBeenCalledTimes(1);
      expect(criarAssinaturaPrePaga.mock.calls[0]?.[0]).toMatchObject({ plano: "mensal", clienteId: cliente, userId: memberId });
      expect(garantirFaturaPaga).not.toHaveBeenCalled();
      expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
      expect(acertarNumeroFiscal).toHaveBeenCalledTimes(1);
      expect(await pixDoMember()).toBe(1);
      expect(await temAcessoAtivo(memberId)).toBe(true);
    });
  });

  it("logado, o checkout por CARTÃO com um Pix pago: idem — nenhum cartão por cima do Pix", async () => {
    await semAssinatura(async () => {
      expect((await pix({ plano: "mensal" })).status).toBe(200);
      pixCaiu(await clienteDoMember());
      buscarAssinatura.mockImplementation(stripeConhecePrePagas);
      const res = await cartao({ plano: "mensal" });
      expect([res.status, res.body]).toEqual([409, { error: "JaAssinante" }]);
      expect(criarAssinatura).not.toHaveBeenCalled();
      expect(cancelarPagamentoPix).not.toHaveBeenCalled();
      expect(await pixDoMember()).toBe(1);
      expect(await temAcessoAtivo(memberId)).toBe(true);
    });
  });

  it("o visitante clica de novo SEM o código (ou alguém com o e-mail dele): a conta nasce presa à tentativa que PAGOU, 409 JaTemConta, boas-vindas — sem outro QR, sem trocar a tentativa da ficha", async () => {
    const email = novoEmail();
    const endereco = novoEndereco();
    const primeiro = await pixVisitante(pedido(email), endereco);
    expect(primeiro.status).toBe(200);
    const tentativaPaga = String(primeiro.body.tentativa);
    const f = await ficha(email);
    pixCaiu(f!.stripeCustomerId);
    buscarAssinatura.mockImplementation(stripeConhecePrePagas);
    const res = await pixVisitante(pedido(email, { documento: OUTRO_CPF }), endereco);
    expect([res.status, res.body]).toEqual([409, { error: "JaTemConta" }]);
    const conta = await prisma.user.findUnique({ where: { email } });
    expect(conta).not.toBeNull();
    expect(await temAcessoAtivo(conta!.id)).toBe(true);
    const depois = await ficha(email);
    expect(depois?.userId).toBe(conta!.id);
    expect(depois?.tentativa).toBe(sha256(tentativaPaga));
    expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
    expect(acertarNumeroFiscal).not.toHaveBeenCalled();
    expect(enviarEmail.mock.calls.some(([e]) => e.tipo === "boas-vindas" && e.para === email)).toBe(true);
    // Com a conta nascida, o código da tentativa que pagou responde "já valeu"; o do clique alheio, não.
    expect((await request(servidor).post("/api/billing/visitante/confirmacao").set("x-forwarded-for", endereco).send({ tentativa: tentativaPaga })).body).toEqual({ confirmada: true });
  });

  it("o visitante segue por CARTÃO com um Pix pago: a conta nasce, 409 JaTemConta, nenhuma assinatura por cartão", async () => {
    const email = novoEmail();
    const endereco = novoEndereco();
    expect((await pixVisitante(pedido(email), endereco)).status).toBe(200);
    pixCaiu((await ficha(email))!.stripeCustomerId);
    buscarAssinatura.mockImplementation(stripeConhecePrePagas);
    const res = await cartaoVisitante(pedido(email), endereco);
    expect([res.status, res.body]).toEqual([409, { error: "JaTemConta" }]);
    expect(criarAssinatura).not.toHaveBeenCalled();
    expect((await prisma.user.findUnique({ where: { email } }))).not.toBeNull();
  });

  it("o QR só é reaproveitado com o MESMO preço (achado 7): mudou o preço do plano, o QR antigo é cancelado e nasce outro no preço novo", async () => {
    await semAssinatura(async () => {
      const antigo = await pix({ plano: "mensal" });
      expect(antigo.status).toBe(200);
      const idAntigo = String(antigo.body.segredo).split("_secret_")[0];
      buscarPrecos.mockResolvedValue([{ plano: "mensal", precoId: "price_mensal_novo", centavos: 10990, moeda: "brl" }, PRECOS[1]!]);
      const novo = await pix({ plano: "mensal" });
      expect(novo.status).toBe(200);
      expect(String(novo.body.segredo).split("_secret_")[0]).not.toBe(idAntigo);
      expect(cancelarPagamentoPix).toHaveBeenCalledWith(idAntigo);
      expect(criarPagamentoPix).toHaveBeenCalledTimes(2);
      expect(criarPagamentoPix.mock.calls[1]?.[0]).toMatchObject({ precoId: "price_mensal_novo", centavos: 10990 });
    });
  });

  it("o 'outro' Pix foi PAGO entre a lista e o cancelamento (achado 9): processado em vez de 500 — 409 JaAssinante, a assinatura nasce", async () => {
    const avisos = vi.spyOn(console, "warn").mockImplementation(() => {});
    await semAssinatura(async () => {
      expect((await pix({ plano: "mensal" })).status).toBe(200);
      cancelarPagamentoPix.mockImplementationOnce(async (id) => {
        pixNaStripe = pixNaStripe.map((p) => (p.id === id ? { ...p, status: "succeeded" } : p));
        throw new Error("[stripe] o cancelamento do pagamento Pix falhou: invalid_request_error (payment_intent_unexpected_state), status 400");
      });
      buscarAssinatura.mockImplementation(stripeConhecePrePagas);
      const res = await pix({ plano: "anual" });
      expect([res.status, res.body]).toEqual([409, { error: "JaAssinante" }]);
      expect(criarAssinaturaPrePaga).toHaveBeenCalledTimes(1);
      expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
      expect(await pixDoMember()).toBe(1);
      expect(avisos.mock.calls.some(([texto]) => String(texto).includes("PAGO no meio do cancelamento"))).toBe(true);
    });
  });
});

describe("a segunda revisão do passo 6 (29/10/2026) — nas portas", () => {
  // As pré-pagas e os espelhos que nascem aqui são do member@: saem entre um teste e outro.
  afterEach(async () => {
    await prisma.subscription.deleteMany({ where: { ownerUserId: memberId, pixPaymentIntentId: { not: null } } });
  });

  /** O member@ com um Pix PAGO cujo aviso ainda não chegou — devolve o id dele. */
  async function pixPagoDoMember(): Promise<string> {
    expect((await pix({ plano: "mensal" })).status).toBe(200);
    const cliente = await clienteDoMember();
    pixCaiu(cliente);
    buscarAssinatura.mockImplementation(stripeConhecePrePagas);
    return pixNaStripe.find((p) => p.cliente === cliente && p.status === "succeeded")!.id;
  }
  const alertasDo = (alertas: { mock: { calls: unknown[][] } }, pi: string) => alertas.mock.calls.filter(([texto]) => String(texto).includes(pi));

  it("a PRÉ-PAGA incompleta de um Pix pago (a fatura dela ficou no meio): o clique NÃO a cancela — a fatura é paga, e é ela que vale (achado 2)", async () => {
    await semAssinatura(async () => {
      const pi = await pixPagoDoMember();
      const cliente = await clienteDoMember();
      const id = `sub_${S}_${++n}`;
      naStripe.push({ ...incompleta(id, cliente), pixPaymentIntentId: pi });
      prePagas.set(id, paraPago(pixNaStripe.find((p) => p.id === pi)!));
      const res = await pix({ plano: "mensal" });
      expect([res.status, res.body]).toEqual([409, { error: "JaAssinante" }]);
      expect(cancelarIncompleta).not.toHaveBeenCalled();
      expect(garantirFaturaPaga).toHaveBeenCalledWith(id);
      expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
      expect(await prisma.subscription.findUnique({ where: { stripeSubscriptionId: id } })).toMatchObject({ ownerUserId: memberId, status: "active", pixPaymentIntentId: pi });
      expect(await temAcessoAtivo(memberId)).toBe(true);
      // Os pagos e os à espera vêm de UMA lista por clique (achado 6).
      expect(listarPixDoCliente).toHaveBeenCalledTimes(2);
    });
  });

  it("o Pix pago com um espelho MORTO (a pré-paga dele nunca valeu): o clique NÃO vende de novo — 409 PixEmConferencia, um alerta só; o clique seguinte, por Pix ou cartão, nem processa (achados 3 e 4)", async () => {
    const alertas = vi.spyOn(console, "error").mockImplementation(() => {});
    await semAssinatura(async () => {
      const pi = await pixPagoDoMember();
      const cliente = await clienteDoMember();
      const morta = `sub_${S}_${++n}`;
      naStripe.push({ ...incompleta(morta, cliente), status: "incomplete_expired", segredoDoPagamento: null, pixPaymentIntentId: pi });
      // O espelho morto, como uma sincronia antiga o teria gravado.
      await prisma.subscription.create({ data: { stripeSubscriptionId: morta, ownerUserId: memberId, status: "incomplete_expired", stripeCustomerId: cliente, pixPaymentIntentId: pi } });
      const res = await pix({ plano: "mensal" });
      expect([res.status, res.body]).toEqual([409, { error: "PixEmConferencia" }]);
      expect(pixNaStripe.find((p) => p.id === pi)?.emConferencia).toContain(`a pré-paga ${morta} acabou sem ser paga`);
      expect(alertasDo(alertas, pi).filter(([texto]) => String(texto).includes("EM CONFERÊNCIA"))).toHaveLength(1);

      assinaturasDoPix.mockClear();
      const porPix = await pix({ plano: "anual" });
      const porCartao = await cartao({ plano: "mensal" });
      expect([porPix.status, porPix.body]).toEqual([409, { error: "PixEmConferencia" }]);
      expect([porCartao.status, porCartao.body]).toEqual([409, { error: "PixEmConferencia" }]);
      expect(assinaturasDoPix).not.toHaveBeenCalled();
      expect(alertasDo(alertas, pi)).toHaveLength(1);
      expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
      expect(criarAssinatura).not.toHaveBeenCalled();
      expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
      expect(await temAcessoAtivo(memberId)).toBe(false);
    });
  });

  it("o Pix DEVOLVIDO com a incompleta dele aberta: o clique a encerra e pede para tentar de novo (409 Ocupada), sem conferência; o seguinte gera o QR (achado 1)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await semAssinatura(async () => {
      const pi = await pixPagoDoMember();
      const cliente = await clienteDoMember();
      const id = `sub_${S}_${++n}`;
      naStripe.push({ ...incompleta(id, cliente), pixPaymentIntentId: pi });
      pixNaStripe = pixNaStripe.map((p) => (p.id === pi ? { ...p, devolvido: true } : p));
      const res = await pix({ plano: "mensal" });
      expect([res.status, res.body]).toEqual([409, { error: "Ocupada" }]);
      expect(cancelarIncompleta).toHaveBeenCalledWith(id);
      expect(garantirFaturaPaga).not.toHaveBeenCalled();
      expect(marcarEmConferencia).not.toHaveBeenCalled();
      expect(await temAcessoAtivo(memberId)).toBe(false);

      expect((await pix({ plano: "mensal" })).status).toBe(200);
      expect(criarPagamentoPix).toHaveBeenCalledTimes(2);
      expect(await pixDoMember()).toBe(0);
    });
  });

  it("o Pix DEVOLVIDO sem assinatura nenhuma não conta como pago: o clique segue para um QR novo", async () => {
    await semAssinatura(async () => {
      const pi = await pixPagoDoMember();
      pixNaStripe = pixNaStripe.map((p) => (p.id === pi ? { ...p, devolvido: true } : p));
      expect((await pix({ plano: "mensal" })).status).toBe(200);
      expect(criarPagamentoPix).toHaveBeenCalledTimes(2);
      expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
      expect(await pixDoMember()).toBe(0);
    });
  });

  // E17 da revisão ampla (decisão do operador, 29/10/2026, P124): sem login, o "em conferência" só para a ABA QUE PAGOU —
  // pelo código da tentativa, que só ela tem. Outra aba, ou outra pessoa com o mesmo e-mail: "ocupada", sem contar que há
  // um Pix pago para este e-mail, e sem nunca criar outro pagamento.
  it("o visitante com um Pix pago EM CONFERÊNCIA: a aba que pagou recebe 409 PixEmConferencia (por Pix e por cartão); as outras, 409 Ocupada — sem QR novo, sem cartão, sem conta", async () => {
    const email = novoEmail();
    const endereco = novoEndereco();
    const primeiro = await pixVisitante(pedido(email), endereco);
    expect(primeiro.status).toBe(200);
    const tentativa = (primeiro.body as { tentativa: string }).tentativa;
    expect(tentativa).toBeTruthy();
    const cliente = (await ficha(email))!.stripeCustomerId;
    pixNaStripe = pixNaStripe.map((p) => (p.cliente === cliente ? { ...p, status: "succeeded", emConferencia: "pagou 9990 centavos e o preço price_mensal custa 10990" } : p));
    const porPix = await pixVisitante(pedido(email, { tentativa }), endereco);
    const porCartao = await cartaoVisitante(pedido(email, { tentativa }), endereco);
    expect([porPix.status, porPix.body]).toEqual([409, { error: "PixEmConferencia" }]);
    expect([porCartao.status, porCartao.body]).toEqual([409, { error: "PixEmConferencia" }]);
    for (const outra of [pedido(email), pedido(email, { tentativa: "tentativa-de-outra-aba" })]) {
      const outraPorPix = await pixVisitante(outra, endereco);
      const outraPorCartao = await cartaoVisitante(outra, endereco);
      expect([outraPorPix.status, outraPorPix.body]).toEqual([409, { error: "Ocupada" }]);
      expect([outraPorCartao.status, outraPorCartao.body]).toEqual([409, { error: "Ocupada" }]);
    }
    expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
    expect(criarAssinatura).not.toHaveBeenCalled();
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it("a conta do e-mail nasceu NO MEIO do clique por Pix (alguém pagou por ele): a tentativa nova não fica com a ficha — o QR novo é cancelado, 409 JaTemConta (achado 6)", async () => {
    const email = novoEmail();
    const endereco = novoEndereco();
    expect((await pixVisitante(pedido(email), endereco)).status).toBe(200);
    const antes = await ficha(email);
    criarPagamentoPix.mockImplementationOnce(async (p) => {
      const criado = await pixDeMentira(p);
      // O aviso de outro pagamento deste e-mail fez a conta nascer enquanto este clique criava o QR.
      const conta = await prisma.user.create({ data: { id: `conta_${S}_${++n}`, email } });
      await prisma.guestCheckout.update({ where: { id: antes!.id }, data: { userId: conta.id } });
      return criado;
    });
    const res = await pixVisitante(pedido(email), endereco);
    expect([res.status, res.body]).toEqual([409, { error: "JaTemConta" }]);
    expect(cancelarPagamentoPix).toHaveBeenCalledWith(pixNaStripe.at(-1)?.id);
    expect(pixNaStripe.map((p) => p.status)).toEqual(["canceled", "canceled"]);
    expect((await ficha(email))?.tentativa).toBe(antes?.tentativa);
  });

  it("idem no CARTÃO do visitante: a assinatura nova é encerrada, e a ficha fica com a tentativa de antes (achado 6)", async () => {
    const email = novoEmail();
    const endereco = novoEndereco();
    expect((await cartaoVisitante(pedido(email), endereco)).status).toBe(200);
    const antes = await ficha(email);
    criarAssinatura.mockImplementationOnce(async (p) => {
      const nova = incompleta(`sub_${S}_${++n}`, p.clienteId, p.precoId);
      naStripe.push(nova);
      const conta = await prisma.user.create({ data: { id: `conta_${S}_${++n}`, email } });
      await prisma.guestCheckout.update({ where: { id: antes!.id }, data: { userId: conta.id } });
      return nova;
    });
    const res = await cartaoVisitante(pedido(email), endereco);
    expect([res.status, res.body]).toEqual([409, { error: "JaTemConta" }]);
    expect(cancelarIncompleta).toHaveBeenCalledWith(naStripe.at(-1)?.id);
    expect((await ficha(email))?.tentativa).toBe(antes?.tentativa);
  });

  it("o checkout por CARTÃO e o Pix PAGO no meio do cancelamento: processado — 409 JaAssinante, nenhum cartão (achado 9)", async () => {
    const avisos = vi.spyOn(console, "warn").mockImplementation(() => {});
    await semAssinatura(async () => {
      expect((await pix({ plano: "mensal" })).status).toBe(200);
      cancelarPagamentoPix.mockImplementationOnce(async (id) => {
        pixNaStripe = pixNaStripe.map((p) => (p.id === id ? { ...p, status: "succeeded" } : p));
        throw new Error("[stripe] o cancelamento do pagamento Pix falhou: invalid_request_error (payment_intent_unexpected_state), status 400");
      });
      buscarAssinatura.mockImplementation(stripeConhecePrePagas);
      const res = await cartao({ plano: "mensal" });
      expect([res.status, res.body]).toEqual([409, { error: "JaAssinante" }]);
      expect(criarAssinatura).not.toHaveBeenCalled();
      expect(criarAssinaturaPrePaga).toHaveBeenCalledTimes(1);
      expect(await pixDoMember()).toBe(1);
      expect(avisos.mock.calls.some(([texto]) => String(texto).includes("PAGO no meio do cancelamento"))).toBe(true);
    });
  });

  // AS PORTAS DO CARTÃO E A DO VISITANTE nos mesmos casos (as mutações do fechamento acharam os caminhos sem teste).
  it("o checkout por CARTÃO com a pré-paga incompleta de um Pix DEVOLVIDO: nunca a reaproveita como cartão — a encerra e pede para tentar de novo (409 Ocupada); o seguinte segue (achados 1 e 2)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await semAssinatura(async () => {
      const pi = await pixPagoDoMember();
      const cliente = await clienteDoMember();
      const id = `sub_${S}_${++n}`;
      naStripe.push({ ...incompleta(id, cliente), pixPaymentIntentId: pi });
      pixNaStripe = pixNaStripe.map((p) => (p.id === pi ? { ...p, devolvido: true } : p));
      const res = await cartao({ plano: "mensal" });
      expect([res.status, res.body]).toEqual([409, { error: "Ocupada" }]);
      expect(cancelarIncompleta).toHaveBeenCalledWith(id);
      expect(criarAssinatura).not.toHaveBeenCalled();
      expect(garantirFaturaPaga).not.toHaveBeenCalled();
      expect(marcarEmConferencia).not.toHaveBeenCalled();

      expect((await cartao({ plano: "mensal" })).status).toBe(200);
      expect(criarAssinatura).toHaveBeenCalledTimes(1);
      expect(await pixDoMember()).toBe(0);
    });
  });

  it("o VISITANTE por cartão com a pré-paga incompleta de um Pix DEVOLVIDO: idem — 409 Ocupada, sem conferência, sem conta; o clique seguinte gera o QR (achados 1 e 2)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const email = novoEmail();
    const endereco = novoEndereco();
    expect((await pixVisitante(pedido(email), endereco)).status).toBe(200);
    const cliente = (await ficha(email))!.stripeCustomerId;
    pixCaiu(cliente);
    const pi = pixNaStripe.find((p) => p.cliente === cliente && p.status === "succeeded")!.id;
    const id = `sub_${S}_${++n}`;
    naStripe.push({ ...incompleta(id, cliente), pixPaymentIntentId: pi });
    pixNaStripe = pixNaStripe.map((p) => (p.id === pi ? { ...p, devolvido: true } : p));
    const res = await cartaoVisitante(pedido(email), endereco);
    expect([res.status, res.body]).toEqual([409, { error: "Ocupada" }]);
    expect(cancelarIncompleta).toHaveBeenCalledWith(id);
    expect(criarAssinatura).not.toHaveBeenCalled();
    expect(marcarEmConferencia).not.toHaveBeenCalled();
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();

    expect((await pixVisitante(pedido(email), endereco)).status).toBe(200);
    expect(criarPagamentoPix).toHaveBeenCalledTimes(2);
  });

  it("o VISITANTE por cartão e o Pix PAGO no meio do cancelamento: processado — 409 JaTemConta, a conta nasce com acesso, nenhum cartão (achado 9)", async () => {
    const avisos = vi.spyOn(console, "warn").mockImplementation(() => {});
    const email = novoEmail();
    const endereco = novoEndereco();
    expect((await pixVisitante(pedido(email), endereco)).status).toBe(200);
    cancelarPagamentoPix.mockImplementationOnce(async (id) => {
      pixNaStripe = pixNaStripe.map((p) => (p.id === id ? { ...p, status: "succeeded" } : p));
      throw new Error("[stripe] o cancelamento do pagamento Pix falhou: invalid_request_error (payment_intent_unexpected_state), status 400");
    });
    buscarAssinatura.mockImplementation(stripeConhecePrePagas);
    const res = await cartaoVisitante(pedido(email), endereco);
    expect([res.status, res.body]).toEqual([409, { error: "JaTemConta" }]);
    expect(criarAssinatura).not.toHaveBeenCalled();
    expect(criarAssinaturaPrePaga).toHaveBeenCalledTimes(1);
    const conta = await prisma.user.findUnique({ where: { email } });
    expect(conta).not.toBeNull();
    expect(await temAcessoAtivo(conta!.id)).toBe(true);
    expect(avisos.mock.calls.some(([texto]) => String(texto).includes("PAGO no meio do cancelamento"))).toBe(true);
  });

  /** A Stripe diz que a pré-paga recém-criada NÃO dá acesso (encerrada, o período no passado): o Pix foi processado e a pessoa segue trancada. */
  const prePagaSemAcesso = async (id: string): Promise<AssinaturaNaStripe> => ({ ...(await stripeConhecePrePagas(id)), status: "canceled", pagoAte: new Date(Date.now() - DIA) });

  it.each([
    ["a marca é NOVA: o Pix fica marcado e sai UM alerta", true],
    ["o Pix JÁ estava marcado: nenhum alerta a mais", false],
  ])("logado, o Pix processado e a conta segue SEM ACESSO — 409 PixEmConferencia (achados 3 e 4): %s", async (_, nova) => {
    const alertas = vi.spyOn(console, "error").mockImplementation(() => {});
    await semAssinatura(async () => {
      const pi = await pixPagoDoMember();
      buscarAssinatura.mockImplementation(prePagaSemAcesso);
      if (!nova) marcarEmConferencia.mockResolvedValueOnce(false);
      const res = await pix({ plano: "mensal" });
      expect([res.status, res.body]).toEqual([409, { error: "PixEmConferencia" }]);
      expect(marcarEmConferencia).toHaveBeenCalledWith(pi, expect.stringContaining(`a conta ${memberId} segue sem acesso`));
      if (nova) expect(pixNaStripe.find((p) => p.id === pi)?.emConferencia).toContain("segue sem acesso");
      expect(alertasDo(alertas, pi).filter(([texto]) => String(texto).includes("EM CONFERÊNCIA"))).toHaveLength(nova ? 1 : 0);
      expect(await temAcessoAtivo(memberId)).toBe(false);
    });
  });

  it.each([
    ["a marca é NOVA: o Pix fica marcado e sai UM alerta", true],
    ["o Pix JÁ estava marcado: nenhum alerta a mais", false],
  ])("o VISITANTE com o Pix processado e o e-mail ainda SEM CONTA com acesso — 409 PixEmConferencia para a aba que pagou (achados 3 e 4; E17): %s", async (_, nova) => {
    const alertas = vi.spyOn(console, "error").mockImplementation(() => {});
    const email = novoEmail();
    const endereco = novoEndereco();
    const primeiro = await pixVisitante(pedido(email), endereco);
    expect(primeiro.status).toBe(200);
    const tentativa = (primeiro.body as { tentativa: string }).tentativa;
    const cliente = (await ficha(email))!.stripeCustomerId;
    pixCaiu(cliente);
    const pi = pixNaStripe.find((p) => p.cliente === cliente && p.status === "succeeded")!.id;
    buscarAssinatura.mockImplementation(prePagaSemAcesso);
    if (!nova) marcarEmConferencia.mockResolvedValueOnce(false);
    const res = await pixVisitante(pedido(email, { tentativa }), endereco);
    expect([res.status, res.body]).toEqual([409, { error: "PixEmConferencia" }]);
    expect(marcarEmConferencia).toHaveBeenCalledWith(pi, expect.stringContaining("o e-mail segue sem conta com acesso"));
    if (nova) expect(pixNaStripe.find((p) => p.id === pi)?.emConferencia).toContain("sem conta com acesso");
    expect(alertasDo(alertas, pi).filter(([texto]) => String(texto).includes("EM CONFERÊNCIA"))).toHaveLength(nova ? 1 : 0);
    const conta = await prisma.user.findUnique({ where: { email } });
    expect(conta === null || !(await temAcessoAtivo(conta.id))).toBe(true);
    // E17: OUTRA aba (sem o código da tentativa) — "ocupada", sem contar do Pix pago e sem criar outro pagamento.
    const pagamentos = criarPagamentoPix.mock.calls.length;
    const outra = await pixVisitante(pedido(email), endereco);
    expect([outra.status, outra.body]).toEqual([409, { error: "Ocupada" }]);
    expect(criarPagamentoPix.mock.calls.length).toBe(pagamentos);
  });

  // Revisão do grupo 3 da 4.9b: a PRÉ-PAGA incompleta cujo Pix não se lê pago é o terceiro caminho do "em conferência"
  // sem login — também só para a aba dela (pela tentativa gravada na pré-paga), e o alerta sai uma vez só.
  it.each([
    ["pelo Pix", "pix"],
    ["pelo cartão", "cartao"],
  ])("a PRÉ-PAGA incompleta com o Pix que não se lê pago, sem login, %s: as outras abas recebem 409 Ocupada; a dela, PixEmConferencia; o alerta sai uma vez", async (_, porta) => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const email = novoEmail();
    const endereco = novoEndereco();
    const primeiro = await pixVisitante(pedido(email), endereco);
    expect(primeiro.status).toBe(200);
    const tentativa = (primeiro.body as { tentativa: string }).tentativa;
    const cliente = (await ficha(email))!.stripeCustomerId;
    const pix = pixNaStripe.find((x) => x.cliente === cliente)!;
    naStripe.push({ ...incompleta(`sub_${S}_${++n}`, cliente), pixPaymentIntentId: pix.id, resumoDaTentativa: pix.resumoDaTentativa });
    const pedir = porta === "pix" ? pixVisitante : cartaoVisitante;
    const outra = await pedir(pedido(email), endereco);
    expect([outra.status, outra.body]).toEqual([409, { error: "Ocupada" }]);
    const daAba = await pedir(pedido(email, { tentativa }), endereco);
    expect([daAba.status, daAba.body]).toEqual([409, { error: "PixEmConferencia" }]);
    expect(erro.mock.calls.filter(([texto]) => String(texto).includes(`a pré-paga do Pix ${pix.id} está incompleta`))).toHaveLength(1);
    expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a aba que pagou (com o código da tentativa): 409 PixEmConferencia", true, "PixEmConferencia"],
    ["outra aba (sem o código): 409 Ocupada", false, "Ocupada"],
  ])("idem pela porta do CARTÃO sem login (E17), com o Pix processado na hora e em conferência — %s; nenhuma assinatura por cartão", async (_, daQuePagou, erro) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const email = novoEmail();
    const endereco = novoEndereco();
    const primeiro = await pixVisitante(pedido(email), endereco);
    expect(primeiro.status).toBe(200);
    const tentativa = (primeiro.body as { tentativa: string }).tentativa;
    const cliente = (await ficha(email))!.stripeCustomerId;
    pixCaiu(cliente);
    buscarAssinatura.mockImplementation(prePagaSemAcesso);
    const res = await cartaoVisitante(daQuePagou ? pedido(email, { tentativa }) : pedido(email), endereco);
    expect([res.status, res.body]).toEqual([409, { error: erro }]);
    expect(criarAssinatura).not.toHaveBeenCalled();
  });
});
