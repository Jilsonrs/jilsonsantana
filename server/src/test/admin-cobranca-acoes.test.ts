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
const trocarNumeroFiscal = vi.fn<(cliente: string, documento: { tipo: string; numero: string }) => Promise<void>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
  assinaturasDoCliente: (cliente: string) => assinaturasDoCliente(cliente),
  trocarNumeroFiscal: (cliente: string, documento: { tipo: string; numero: string }) => trocarNumeroFiscal(cliente, documento),
}));
const anularFatura = vi.fn<(faturaId: string) => Promise<"anulada" | "paga">>();
const soltarAgendamento = vi.fn<(agendamentoId: string) => Promise<void>>();
vi.mock("../lib/stripe-plano.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-plano.js")>()),
  anularFatura: (faturaId: string) => anularFatura(faturaId),
  soltarAgendamento: (agendamentoId: string) => soltarAgendamento(agendamentoId),
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
  await prisma.stripeCustomer.create({ data: { userId: aluna, stripeCustomerId: CLIENTE, livemode: false } });
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
  trocarNumeroFiscal.mockReset().mockResolvedValue(undefined);
  anularFatura.mockReset().mockResolvedValue("anulada");
  soltarAgendamento.mockReset().mockResolvedValue(undefined);
});

afterAll(async () => {
  await prisma.billingLog.deleteMany({ where: { OR: [{ userId: aluna }, { stripeSubscriptionId: SUB }] } });
  await prisma.subscriptionEmail.deleteMany({ where: { subscription: { stripeSubscriptionId: SUB } } });
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.stripeCustomer.deleteMany({ where: { userId: aluna } });
  await prisma.billingCase.deleteMany({ where: { key: { contains: S } } });
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

describe("os consertos do caso (passo 3b)", () => {
  const caso = async (tipo: TipoDeCaso, chave: string, objeto: string | null = null) => {
    await abrirCaso({ tipo, chave: `${chave}:${S}`, urgente: false, conta: aluna, assinatura: SUB, objeto });
    return (await prisma.billingCase.findUniqueOrThrow({ where: { kind_key: { kind: tipo, key: `${chave}:${S}` } } })).id;
  };
  const resolver = (id: number, acao: string) => request(servidor).post(`/api/admin/cobranca/casos/${id}/resolver`).set("Cookie", admin).send({ acao });

  it("anular a cobrança em aberto: com a assinatura ENCERRADA, anula e fecha o caso — com ela VIVA, recusa (seria acesso sem pagar)", async () => {
    const viva = await caso(TipoDeCaso.COBRANCA_EM_ABERTO, "fatura-viva", `in_${S}_viva`);
    expect((await resolver(viva, "anular-cobranca")).body).toEqual({ error: "AssinaturaViva" });
    expect(anularFatura).not.toHaveBeenCalled();
    detalhes = { status: "canceled" };
    const res = await resolver(viva, "anular-cobranca");
    expect([res.status, res.body]).toEqual([200, { detalhe: "a cobrança em aberto foi anulada" }]);
    expect(anularFatura.mock.calls).toEqual([[`in_${S}_viva`]]);
    expect(await prisma.billingCase.findUniqueOrThrow({ where: { id: viva } })).toMatchObject({ open: false, closedBy: "OPERADOR", closedByUserId: adminId, note: "a cobrança em aberto foi anulada" });
    expect(await ultimaDoRegistro("anular-cobranca")).toMatchObject({ who: "OPERADOR", userId: aluna });
  });

  it("…a fatura da TROCA de plano se anula com a assinatura viva (é o que a tela do aluno já faz)", async () => {
    const daTroca = await caso(TipoDeCaso.COBRANCA_EM_ABERTO, "fatura-troca", `in_${S}_troca`);
    detalhes = { faturaDaTrocaId: `in_${S}_troca` };
    expect((await resolver(daTroca, "anular-cobranca")).status).toBe(200);
    expect(anularFatura.mock.calls).toEqual([[`in_${S}_troca`]]);
  });

  it("soltar o agendamento e encerrar na hora (sem devolver): a mesma operação de sempre, com a trava e a sincronia", async () => {
    await abrirCaso({ tipo: TipoDeCaso.TROCA_DE_PLANO, chave: `agendamento:sub_sched_${S}`, urgente: false, conta: aluna, assinatura: SUB });
    const agendamento = (await prisma.billingCase.findUniqueOrThrow({ where: { kind_key: { kind: TipoDeCaso.TROCA_DE_PLANO, key: `agendamento:sub_sched_${S}` } } })).id;
    expect((await resolver(agendamento, "soltar-agendamento")).status).toBe(200);
    expect(soltarAgendamento.mock.calls).toEqual([[`sub_sched_${S}`]]);
    const semPeriodo = await caso(TipoDeCaso.ATIVA_SEM_PERIODO_PAGO, "sub");
    const res = await resolver(semPeriodo, "encerrar-na-hora");
    expect([res.status, res.body]).toEqual([200, { detalhe: "encerrada agora, sem devolver" }]);
    expect(cancelarNaHora.mock.calls).toEqual([[SUB, {}]]);
  });

  it("o conserto que não é do tipo do caso: 404; encerrar a já encerrada: 409", async () => {
    const outro = await caso(TipoDeCaso.CONTESTACAO, "du");
    expect((await resolver(outro, "anular-cobranca")).status).toBe(404);
    const semPeriodo = await caso(TipoDeCaso.ATIVA_SEM_PERIODO_PAGO, "sub-encerrada");
    detalhes = { status: "canceled" };
    expect((await resolver(semPeriodo, "encerrar-na-hora")).body).toEqual({ error: "NadaAFazer" });
    expect(cancelarNaHora).not.toHaveBeenCalled();
  });
});

describe("o CPF e o link por e-mail (passo 3b)", () => {
  it("corrigir o CPF: confere o número no servidor, troca em cada cliente da pessoa, e o número NUNCA vai ao registro", async () => {
    expect((await acao("corrigir-documento", { conta: aluna, documento: "111.111.111-11" })).body).toEqual({ error: "DocumentoInvalido" });
    expect(trocarNumeroFiscal).not.toHaveBeenCalled();
    const res = await acao("corrigir-documento", { conta: aluna, documento: "529.982.247-25" });
    expect([res.status, res.body]).toEqual([200, { detalhe: "CPF corrigido" }]);
    expect(trocarNumeroFiscal.mock.calls).toEqual([[CLIENTE, { tipo: "cpf", numero: "52998224725" }]]);
    const registro = await ultimaDoRegistro("corrigir-documento");
    expect(registro).toMatchObject({ who: "OPERADOR", userId: aluna, detail: "CPF corrigido" });
    expect(JSON.stringify(registro)).not.toContain("52998224725");
    expect((await acao("corrigir-documento", { conta: `nao-existe-${S}`, documento: "529.982.247-25" })).status).toBe(404);
  });

  it("enviar o link: um e-mail à conta (o e-mail do banco), com o botão para entrar e seguir — e fica no registro", async () => {
    const res = await acao("enviar-link", { conta: aluna, link: "trocarCartao" });
    expect([res.status, res.body]).toEqual([200, { detalhe: "o link (trocarCartao) foi enviado" }]);
    const [pedido] = enviarEmail.mock.calls.map(([p]) => p).filter((p) => p.tipo === "link-do-painel");
    expect(pedido?.para).toBe(`${aluna}@teste.local`);
    expect(pedido?.mensagem.botao?.endereco).toMatch(/\/login\?depois=cartao$/);
    expect(await ultimaDoRegistro("enviar-link")).toMatchObject({ who: "OPERADOR", userId: aluna });
    expect((await acao("enviar-link", { conta: aluna, link: "outro" })).status).toBe(400);
  });
});
