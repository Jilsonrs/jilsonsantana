import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { DetalhesDaAssinatura, MotivoDado } from "../lib/stripe-assinatura.js";
import type { AssinaturaNaStripe } from "../lib/stripe.js";
import type { PedidoDeEmail, Envio } from "../lib/email.js";

// AS AÇÕES SEM DINHEIRO DO PAINEL (etapa 4.7b, passo 3a). Só a rede da Stripe e o balcão de e-mail viram dublê; as
// operações (as MESMAS do aluno), a sincronia, a trava e o registro rodam de verdade, contra o banco. O que protege:
//   - SÓ ADMIN; o corpo no formato; sem a Stripe configurada, nenhuma ação;
//   - cancelar chama a operação do aluno: em dia, para de renovar SEM motivo (o motivo é do aluno); atrasada, termina
//     agora; a pré-paga, não (409); e grava no registro QUEM fez, em quem e o que a Stripe respondeu;
//   - desfazer volta a renovar; conferir sincroniza e diz se a pessoa ficou com acesso; reenviar manda o e-mail do caso
//     e o caso fecha sozinho;
//   - a assinatura que não existe (404), a que a Stripe não conhece (409).
const buscarDetalhes = vi.fn<(id: string) => Promise<DetalhesDaAssinatura>>();
const pararRenovacao = vi.fn<(id: string, dado: MotivoDado) => Promise<DetalhesDaAssinatura>>();
const retomarRenovacao = vi.fn<(id: string, acabaNoFimDoPeriodo: boolean) => Promise<DetalhesDaAssinatura>>();
vi.mock("../lib/stripe-assinatura.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-assinatura.js")>()),
  buscarDetalhes: (id: string) => buscarDetalhes(id),
  pararRenovacao: (id: string, dado: MotivoDado) => pararRenovacao(id, dado),
  retomarRenovacao: (id: string, acabaNoFimDoPeriodo: boolean) => retomarRenovacao(id, acabaNoFimDoPeriodo),
}));
const cancelarNaHora = vi.fn<(id: string, dado: MotivoDado) => Promise<void>>();
vi.mock("../lib/stripe-reembolso.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-reembolso.js")>()),
  cancelarNaHora: (id: string, dado: MotivoDado) => cancelarNaHora(id, dado),
}));
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
const assinaturasDoCliente = vi.fn().mockResolvedValue([]);
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
  assinaturasDoCliente: (cliente: string) => assinaturasDoCliente(cliente),
}));
const enviarEmail = vi.fn<(pedido: PedidoDeEmail) => Promise<Envio>>();
vi.mock("../lib/email.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/email.js")>()),
  enviarEmail: (pedido: PedidoDeEmail) => enviarEmail(pedido),
}));

import servidor from "./servidor.js";
import { prisma, TipoDeCaso } from "../lib/prisma.js";
import { abrirCaso } from "../lib/casos.js";
import { AssinaturaNaoEncontrada } from "../lib/stripe.js";

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const EM_30_DIAS = new Date(Date.now() + 30 * DIA);
const aluna = `acoes-${S}`;
const SUB = `sub_${S}_acoes`;
const CLIENTE = `cus_${S}_acoes`;
const ANTES = process.env.STRIPE_SECRET_KEY;
let admin: string[] = [];
let member: string[] = [];
let adminId = "";
let espelhoId = 0;
let detalhes: Partial<DetalhesDaAssinatura> = {};
let naStripe: Partial<AssinaturaNaStripe> = {};
const daStripe = (id: string): DetalhesDaAssinatura => ({ id, status: "active", pagoAte: EM_30_DIAS, plano: "mensal", preco: { centavos: 9990, moeda: "brl" }, fimDoPeriodo: EM_30_DIAS, comecouEm: null, acabaEm: null, acabaNoFimDoPeriodo: false, cartao: null, clienteId: CLIENTE, userId: aluna, pixPaymentIntentId: null, faturaEmAbertoId: null, itemId: "si_do_teste", agendamentoId: null, agendamentoNosso: false, trocaMarcada: null, faturaDaTrocaId: null, ...detalhes });

async function entrar(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  const cookies = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(cookies.length).toBeGreaterThan(0);
  return cookies;
}
const acao = (nome: string, corpo: object, cookies: string[] = admin) => request(servidor).post(`/api/admin/cobranca/acoes/${nome}`).set("Cookie", cookies).send(corpo);
const ultimaDoRegistro = (acaoDoRegistro: string) => prisma.billingLog.findFirst({ where: { action: acaoDoRegistro, actorUserId: adminId }, orderBy: { id: "desc" } });

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  adminId = (await prisma.user.findUniqueOrThrow({ where: { email: (process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase() } })).id;
  await prisma.user.create({ data: { id: aluna, email: `${aluna}@teste.local` } });
  espelhoId = (await prisma.subscription.create({ data: { ownerUserId: aluna, status: "active", currentPeriodEnd: EM_30_DIAS, stripeSubscriptionId: SUB, stripeCustomerId: CLIENTE } })).id;
});

beforeEach(() => {
  detalhes = {};
  naStripe = {};
  buscarDetalhes.mockReset().mockImplementation(async (id) => daStripe(id));
  pararRenovacao.mockReset().mockImplementation(async (id) => daStripe(id));
  retomarRenovacao.mockReset().mockImplementation(async (id) => daStripe(id));
  cancelarNaHora.mockReset().mockResolvedValue(undefined);
  buscarAssinatura.mockReset().mockImplementation(async (id) => ({ id, status: "active", pagoAte: EM_30_DIAS, clienteId: CLIENTE, userId: aluna, livemode: false, ...naStripe }));
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "re_teste" });
});

afterAll(async () => {
  await prisma.billingLog.deleteMany({ where: { OR: [{ userId: aluna }, { stripeSubscriptionId: SUB }] } });
  await prisma.subscriptionEmail.deleteMany({ where: { subscription: { stripeSubscriptionId: SUB } } });
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.user.deleteMany({ where: { id: aluna } });
  if (ANTES === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ANTES;
});

describe("as ações — quem entra e o formato", () => {
  it("sem login 401; aluno 403 — e a Stripe nem é consultada", async () => {
    for (const nome of ["conferir", "cancelar", "desfazer-cancelamento"]) {
      expect((await acao(nome, { assinatura: espelhoId }, [])).status).toBe(401);
      expect((await acao(nome, { assinatura: espelhoId }, member)).status).toBe(403);
    }
    expect((await request(servidor).post("/api/admin/cobranca/casos/1/reenviar").set("Cookie", member)).status).toBe(403);
    expect(buscarDetalhes).not.toHaveBeenCalled();
  });

  it("corpo fora do formato: 400; sem a Stripe configurada: 503", async () => {
    expect((await acao("cancelar", { assinatura: "1" })).status).toBe(400);
    expect((await acao("cancelar", {})).status).toBe(400);
    delete process.env.STRIPE_SECRET_KEY;
    try {
      expect((await acao("cancelar", { assinatura: espelhoId })).status).toBe(503);
    } finally {
      process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
    }
  });

  it("a assinatura que não existe: 404; a que a Stripe não conhece: 409", async () => {
    expect((await acao("cancelar", { assinatura: 999999999 })).status).toBe(404);
    buscarDetalhes.mockRejectedValue(new AssinaturaNaoEncontrada(SUB));
    expect([(await acao("cancelar", { assinatura: espelhoId })).body]).toEqual([{ error: "StripeNaoConhece" }]);
  });
});

describe("cancelar e desfazer", () => {
  it("em dia: para de renovar SEM motivo (o motivo é do aluno) — e o registro diz quem fez", async () => {
    const res = await acao("cancelar", { assinatura: espelhoId });
    expect(res.status).toBe(200);
    expect(pararRenovacao.mock.calls).toEqual([[SUB, {}]]);
    expect(cancelarNaHora).not.toHaveBeenCalled();
    expect((res.body as { detalhe: string }).detalhe).toMatch(/^não renova; acesso até /);
    expect(await ultimaDoRegistro("cancelar")).toMatchObject({ who: "OPERADOR", userId: aluna, stripeSubscriptionId: SUB });
  });

  it("atrasada: termina agora (a mesma operação do aluno)", async () => {
    detalhes = { status: "past_due", pagoAte: new Date(Date.now() - DIA) };
    const res = await acao("cancelar", { assinatura: espelhoId });
    expect([res.status, res.body]).toEqual([200, { detalhe: "terminou agora (a cobrança estava atrasada)" }]);
    expect(cancelarNaHora).toHaveBeenCalledTimes(1);
    expect(pararRenovacao).not.toHaveBeenCalled();
  });

  it("a pré-paga do Pix não tem renovação: 409, e nada muda", async () => {
    detalhes = { acabaEm: EM_30_DIAS, acabaNoFimDoPeriodo: true, pixPaymentIntentId: "pi_do_teste" };
    expect((await acao("cancelar", { assinatura: espelhoId })).body).toEqual({ error: "PrePaga" });
    expect(pararRenovacao).not.toHaveBeenCalled();
  });

  it("desfazer: volta a renovar; e o que já renova é 'nada a fazer'", async () => {
    detalhes = { acabaEm: EM_30_DIAS, acabaNoFimDoPeriodo: true };
    const res = await acao("desfazer-cancelamento", { assinatura: espelhoId });
    expect([res.status, res.body]).toEqual([200, { detalhe: "volta a renovar" }]);
    expect(retomarRenovacao.mock.calls).toEqual([[SUB, true]]);
    expect(await ultimaDoRegistro("desfazer-cancelamento")).toMatchObject({ who: "OPERADOR", userId: aluna });
  });
});

describe("conferir e reenviar", () => {
  it("conferir pela conta: sincroniza e diz se ela ficou com acesso — e grava no registro", async () => {
    const res = await acao("conferir", { conta: aluna });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ temAcesso: true });
    expect(buscarAssinatura).toHaveBeenCalledWith(SUB);
    expect(await ultimaDoRegistro("conferir-na-stripe")).toMatchObject({ who: "OPERADOR", userId: aluna });
    expect((await acao("conferir", { conta: `nao-existe-${S}` })).status).toBe(404);
  });

  it("reenviar: manda o e-mail da cobrança devido, e o caso fecha sozinho; um caso que não é de e-mail: 404", async () => {
    const falha = new Date(Date.now() - 60_000);
    await prisma.subscription.update({ where: { id: espelhoId }, data: { status: "past_due", currentPeriodEnd: falha } });
    naStripe = { status: "past_due", pagoAte: falha, proximaTentativa: new Date(Date.now() + 2 * DIA) };
    await abrirCaso({ tipo: TipoDeCaso.EMAIL_NAO_SAIU, chave: `email:COBRANCA_FALHOU:${SUB}`, urgente: false, conta: aluna, assinatura: SUB });
    const caso = await prisma.billingCase.findUniqueOrThrow({ where: { kind_key: { kind: TipoDeCaso.EMAIL_NAO_SAIU, key: `email:COBRANCA_FALHOU:${SUB}` } } });
    const res = await request(servidor).post(`/api/admin/cobranca/casos/${caso.id}/reenviar`).set("Cookie", admin);
    expect([res.status, res.body]).toEqual([200, { detalhe: "o e-mail saiu" }]);
    expect(enviarEmail.mock.calls.map(([p]) => p.tipo)).toContain("cobranca-falhou");
    expect((await prisma.billingCase.findUniqueOrThrow({ where: { id: caso.id } })).open).toBe(false);
    // Um caso de OUTRO tipo, com assinatura: só o tipo o barra.
    await abrirCaso({ tipo: TipoDeCaso.COBRANCA_EM_ABERTO, chave: `fatura:${S}`, urgente: false, assinatura: SUB });
    const outro = await prisma.billingCase.findUniqueOrThrow({ where: { kind_key: { kind: TipoDeCaso.COBRANCA_EM_ABERTO, key: `fatura:${S}` } } });
    expect((await request(servidor).post(`/api/admin/cobranca/casos/${outro.id}/reenviar`).set("Cookie", admin)).status).toBe(404);
  });
});
