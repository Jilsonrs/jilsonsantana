import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { Plano } from "@jilson/core";
import type { AssinaturaNaStripe, PrecoDoPlano } from "../lib/stripe.js";
import type { DetalhesDaAssinatura, MotivoDado } from "../lib/stripe-assinatura.js";
import type { PedidoDeEmail, Envio } from "../lib/email.js";

// LIBERAR (etapa 4.7b, bloco 4, passo 4d). Só a rede da Stripe e o balcão de e-mail viram dublê; a trava, a sincronia, os
// casos e o registro rodam de verdade. O que protege:
//   - SÓ ADMIN, e o corpo no formato;
//   - LIBERAR ACESSO PAGO POR FORA (P120): só para a conta SEM acesso; a assinatura é PRÉ-PAGA de verdade, paga por fora,
//     com a marca de quem liberou; o espelho guarda que ela é paga por fora; as aulas abrem; o registro diz o plano e o
//     valor; e ela é pré-paga para as operações (cancelar não se aplica);
//   - LIBERAR DE NOVO (a contestação): só com a contestação GANHA, lida na Stripe; a marca sai pela operação na assinatura
//     (a trava e a sincronia), as aulas voltam e o caso fecha; sem ganhar, nada muda.
const criarAssinaturaPagaPorFora = vi.fn<(pedido: { clienteId: string; precoId: string; plano: Plano; userId: string; operador: string }) => Promise<{ id: string; faturaPaga: boolean }>>();
vi.mock("../lib/stripe-pix.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-pix.js")>()),
  criarAssinaturaPagaPorFora: (pedido: { clienteId: string; precoId: string; plano: Plano; userId: string; operador: string }) => criarAssinaturaPagaPorFora(pedido),
}));
const statusDaContestacao = vi.fn<(id: string) => Promise<string | null>>();
const tirarMarcaDeContestacao = vi.fn<(id: string) => Promise<void>>();
vi.mock("../lib/stripe-reembolso.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-reembolso.js")>()),
  statusDaContestacao: (id: string) => statusDaContestacao(id),
  tirarMarcaDeContestacao: (id: string) => tirarMarcaDeContestacao(id),
  cancelarNaHora: async (_id: string, _dado: MotivoDado) => undefined,
}));
const buscarPrecos = vi.fn<() => Promise<PrecoDoPlano[]>>();
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarPrecos: () => buscarPrecos(),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));
const buscarDetalhes = vi.fn<(id: string) => Promise<DetalhesDaAssinatura>>();
vi.mock("../lib/stripe-assinatura.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-assinatura.js")>()),
  buscarDetalhes: (id: string) => buscarDetalhes(id),
}));
const enviarEmail = vi.fn<(pedido: PedidoDeEmail) => Promise<Envio>>();
vi.mock("../lib/email.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/email.js")>()),
  enviarEmail: (pedido: PedidoDeEmail) => enviarEmail(pedido),
}));

import servidor from "./servidor.js";
import { prisma, TipoDeCaso } from "../lib/prisma.js";
import { abrirCaso } from "../lib/casos.js";
import { temAcessoAtivo } from "../lib/acesso.js";

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const EM_30_DIAS = new Date(Date.now() + 30 * DIA);
const aluna = `liberar-${S}`;
const CLIENTE = `cus_${S}_liberar`;
const POR_FORA = `sub_${S}_por_fora`;
const CONTESTADA = `sub_${S}_contestada`;
const ANTES = process.env.STRIPE_SECRET_KEY;
let admin: string[] = [];
let member: string[] = [];
let adminId = "";
let naStripe: Partial<AssinaturaNaStripe> = {};
const PRECOS: PrecoDoPlano[] = [
  { plano: "mensal", precoId: "price_mensal", centavos: 9990, moeda: "brl" },
  { plano: "anual", precoId: "price_anual", centavos: 99500, moeda: "brl" },
];
const acao = (nome: string, corpo: object, cookies: string[] = admin) => request(servidor).post(`/api/admin/cobranca/acoes/${nome}`).set("Cookie", cookies).send(corpo);
const daStripe = (id: string): DetalhesDaAssinatura => ({ id, status: "active", pagoAte: EM_30_DIAS, plano: "mensal", preco: { centavos: 9990, moeda: "brl" }, fimDoPeriodo: EM_30_DIAS, comecouEm: null, acabaEm: EM_30_DIAS, acabaNoFimDoPeriodo: true, cartao: null, clienteId: CLIENTE, userId: aluna, pixPaymentIntentId: null, faturaEmAbertoId: null, itemId: "si_x", agendamentoId: null, pagoPorFora: true, agendamentoNosso: false, trocaMarcada: null, faturaDaTrocaId: null });

async function entrar(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  adminId = (await prisma.user.findUniqueOrThrow({ where: { email: (process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase() } })).id;
  await prisma.user.create({ data: { id: aluna, email: `${aluna}@teste.local`, name: "Ana" } });
  await prisma.stripeCustomer.create({ data: { userId: aluna, stripeCustomerId: CLIENTE, livemode: false } });
});

beforeEach(async () => {
  naStripe = {};
  await prisma.subscription.deleteMany({ where: { ownerUserId: aluna } });
  criarAssinaturaPagaPorFora.mockReset().mockResolvedValue({ id: POR_FORA, faturaPaga: true });
  statusDaContestacao.mockReset().mockResolvedValue("won");
  tirarMarcaDeContestacao.mockReset().mockImplementation(async () => {
    naStripe = { status: "canceled", pagoAte: EM_30_DIAS };
  });
  buscarPrecos.mockReset().mockResolvedValue(PRECOS);
  buscarAssinatura.mockReset().mockImplementation(async (id) => ({ id, status: "active", pagoAte: EM_30_DIAS, clienteId: CLIENTE, userId: aluna, livemode: false, pagoPorFora: id === POR_FORA, ...naStripe }));
  buscarDetalhes.mockReset().mockImplementation(async (id) => daStripe(id));
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "re_teste" });
});

afterAll(async () => {
  await prisma.billingLog.deleteMany({ where: { OR: [{ userId: aluna }, { stripeSubscriptionId: { contains: S } }] } });
  await prisma.billingCase.deleteMany({ where: { key: { contains: S } } });
  await prisma.subscriptionEmail.deleteMany({ where: { subscription: { ownerUserId: aluna } } });
  await prisma.subscription.deleteMany({ where: { ownerUserId: aluna } });
  await prisma.stripeCustomer.deleteMany({ where: { userId: aluna } });
  await prisma.user.deleteMany({ where: { id: aluna } });
  if (ANTES === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ANTES;
});

describe("liberar acesso pago por fora", () => {
  it("só admin, e o corpo no formato", async () => {
    expect((await acao("liberar-pago-por-fora", { conta: aluna, plano: "mensal" }, [])).status).toBe(401);
    expect((await acao("liberar-pago-por-fora", { conta: aluna, plano: "mensal" }, member)).status).toBe(403);
    expect((await acao("liberar-pago-por-fora", { conta: aluna, plano: "semestral" })).status).toBe(400);
    expect(criarAssinaturaPagaPorFora).not.toHaveBeenCalled();
  });

  it("a conta sem acesso: a pré-paga paga por fora nasce, o espelho guarda que é por fora, as aulas abrem, e o registro diz o plano e o valor", async () => {
    const res = await acao("liberar-pago-por-fora", { conta: aluna, plano: "anual" });
    expect(res.status).toBe(200);
    expect((res.body as { detalhe: string }).detalhe).toBe(`anual pago por fora; com acesso às aulas até ${EM_30_DIAS.toISOString().slice(0, 10)}`);
    expect(criarAssinaturaPagaPorFora.mock.calls).toEqual([[{ clienteId: CLIENTE, precoId: "price_anual", plano: "anual", userId: aluna, operador: adminId }]]);
    expect(await prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: POR_FORA } })).toMatchObject({ ownerUserId: aluna, status: "active", paidOutOfBand: true });
    expect(await temAcessoAtivo(aluna)).toBe(true);
    expect(await prisma.billingLog.findFirst({ where: { action: "liberar-pago-por-fora", userId: aluna } })).toMatchObject({ who: "OPERADOR", actorUserId: adminId, amount: 99500, stripeSubscriptionId: POR_FORA });
  });

  it("a paga por fora é pré-paga para as operações: cancelar não se aplica (409)", async () => {
    await acao("liberar-pago-por-fora", { conta: aluna, plano: "mensal" });
    const espelho = await prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: POR_FORA } });
    expect((await acao("cancelar", { assinatura: espelho.id })).body).toEqual({ error: "PrePaga" });
  });

  it("a conta que já tem acesso: 409, e nada nasce", async () => {
    await prisma.subscription.create({ data: { stripeSubscriptionId: `sub_${S}_ja_tem`, ownerUserId: aluna, status: "active", currentPeriodEnd: EM_30_DIAS } });
    expect((await acao("liberar-pago-por-fora", { conta: aluna, plano: "mensal" })).body).toEqual({ error: "JaTemAcesso" });
    expect(criarAssinaturaPagaPorFora).not.toHaveBeenCalled();
  });

  it("a fatura que não se pagou por fora: 409, e nada vai ao registro", async () => {
    criarAssinaturaPagaPorFora.mockResolvedValue({ id: POR_FORA, faturaPaga: false });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await acao("liberar-pago-por-fora", { conta: aluna, plano: "mensal" })).body).toEqual({ error: "NadaAFazer" });
    expect(await temAcessoAtivo(aluna)).toBe(false);
    vi.restoreAllMocks();
  });
});

describe("liberar de novo (a contestação ganha)", () => {
  const casoDaContestacao = async (du: string) => {
    await abrirCaso({ tipo: TipoDeCaso.CONTESTACAO, chave: `du:${du}`, urgente: true, conta: aluna, assinatura: CONTESTADA });
    return (await prisma.billingCase.findUniqueOrThrow({ where: { kind_key: { kind: TipoDeCaso.CONTESTACAO, key: `du:${du}` } } })).id;
  };
  const resolver = (casoId: number) => request(servidor).post(`/api/admin/cobranca/casos/${casoId}/resolver`).set("Cookie", admin).send({ acao: "liberar-de-novo" });

  it("ganha: a marca sai pela operação na assinatura, as aulas voltam até o fim do período pago, e o caso fecha", async () => {
    await prisma.subscription.create({ data: { stripeSubscriptionId: CONTESTADA, ownerUserId: aluna, status: "canceled", currentPeriodEnd: new Date(Date.now() - DIA) } });
    expect(await temAcessoAtivo(aluna)).toBe(false);
    const id = await casoDaContestacao(`du_${S}_ganha`);
    const res = await resolver(id);
    expect([res.status, res.body]).toEqual([200, { detalhe: "a escola ganhou a contestação: o período pago voltou a valer; com acesso às aulas" }]);
    expect(statusDaContestacao.mock.calls).toEqual([[`du_${S}_ganha`]]);
    expect(tirarMarcaDeContestacao.mock.calls).toEqual([[CONTESTADA]]);
    expect(await temAcessoAtivo(aluna)).toBe(true);
    expect(await prisma.billingCase.findUniqueOrThrow({ where: { id } })).toMatchObject({ open: false, closedBy: "OPERADOR", closedByUserId: adminId });
  });

  it("não ganha (aberta, perdida, ou que a Stripe não conhece): 409, e nada muda", async () => {
    const id = await casoDaContestacao(`du_${S}_aberta`);
    for (const status of ["needs_response", "lost", null]) {
      statusDaContestacao.mockResolvedValueOnce(status);
      expect((await resolver(id)).body).toEqual({ error: "ContestacaoNaoGanha" });
    }
    expect(tirarMarcaDeContestacao).not.toHaveBeenCalled();
    expect((await prisma.billingCase.findUniqueOrThrow({ where: { id } })).open).toBe(true);
  });

  it("na lista, o caso da contestação traz 'Liberar de novo'", async () => {
    await casoDaContestacao(`du_${S}_lista`);
    const res = await request(servidor).get("/api/admin/cobranca/casos?situacao=abertos&pagina=1").set("Cookie", admin);
    const doTeste = (res.body as { casos: { tipo: string; consertos: string[]; aluno: { id: string } | null }[] }).casos.filter((c) => c.tipo === "CONTESTACAO" && c.aluno?.id === aluna);
    expect(doTeste.length).toBeGreaterThan(0);
    expect(doTeste.every((c) => c.consertos.includes("liberar-de-novo"))).toBe(true);
  });
});
