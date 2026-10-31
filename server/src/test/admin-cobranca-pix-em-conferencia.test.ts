import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { AssinaturaNaStripe, PagamentoPrePago, PrecoDoPlano } from "../lib/stripe.js";
import type { PrePagaDoPix, FaturaDaPrePaga } from "../lib/stripe-pix.js";
import type { DonoDaDevolucao, OQueFoiPago, Pagamento } from "../lib/stripe-reembolso.js";
import type { PedidoDeEmail, Envio } from "../lib/email.js";

// O PIX EM CONFERÊNCIA E O DINHEIRO SEM ASSINATURA NO PAINEL (etapa 4.7b, bloco 4, passo 4c — decisão do operador P117). Só a
// rede da Stripe e o balcão de e-mail viram dublê; a trava do Pix, a sincronia, os casos e o registro rodam de verdade. O que
// protege:
//   - os consertos que cada caso oferece: o Pix em conferência, aceitar ou devolver; o dinheiro sem assinatura, devolver;
//   - ACEITAR ESTE PIX: a pré-paga nasce no preço de AGORA (com a chave do operador — a do aviso devolveria a que morreu), a
//     marca de conferência sai, o espelho é gravado e as aulas abrem; a incompleta que se paga por fora é aproveitada; o Pix
//     que voltou, ou que já virou assinatura, fecha o caso sem criar nada; sem preço à venda, 409 — e o caso fica;
//   - DEVOLVER O PIX: inteiro, e o caso fecha com o valor; a falha, 502, e o caso fica;
//   - DEVOLVER ESTE PAGAMENTO: o da tentativa cancelada já paga (todas as faturas dela) e o da cobrança em aberto paga no
//     instante de cancelar (a fatura), com a trava e a sincronia da assinatura; o caso fecha com o valor.
const lerPagamentoPix = vi.fn<(id: string) => Promise<{ status: string; pagamento: PagamentoPrePago | null }>>();
const assinaturasDoPix = vi.fn<(cliente: string, pagamento: string) => Promise<PrePagaDoPix[]>>();
const garantirFaturaPaga = vi.fn<(assinatura: string) => Promise<FaturaDaPrePaga>>();
const criarAssinaturaPrePaga = vi.fn<(pagamento: PagamentoPrePago, quem?: "aviso" | "operador") => Promise<{ id: string; faturaPaga: boolean }>>();
const tirarDeConferencia = vi.fn<(id: string) => Promise<void>>();
vi.mock("../lib/stripe-pix.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-pix.js")>()),
  lerPagamentoPix: (id: string) => lerPagamentoPix(id),
  assinaturasDoPix: (cliente: string, pagamento: string) => assinaturasDoPix(cliente, pagamento),
  garantirFaturaPaga: (assinatura: string) => garantirFaturaPaga(assinatura),
  criarAssinaturaPrePaga: (pagamento: PagamentoPrePago, quem?: "aviso" | "operador") => criarAssinaturaPrePaga(pagamento, quem),
  tirarDeConferencia: (id: string) => tirarDeConferencia(id),
}));
const pixDevolvido = vi.fn<(id: string) => Promise<boolean>>();
const cobrancaDoPagamento = vi.fn<(id: string) => Promise<{ centavos: number; devolvido: number }>>();
vi.mock("../lib/stripe-devolucao.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-devolucao.js")>()),
  pixDevolvido: (id: string) => pixDevolvido(id),
  cobrancaDoPagamento: (id: string) => cobrancaDoPagamento(id),
}));
const buscarPrecos = vi.fn<() => Promise<PrecoDoPlano[]>>();
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
const cancelarIncompleta = vi.fn<(id: string) => Promise<string>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarPrecos: () => buscarPrecos(),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
  cancelarIncompleta: (id: string) => cancelarIncompleta(id),
}));
const devolver = vi.fn<(pagamento: Pagamento, dono: DonoDaDevolucao) => Promise<void>>();
const buscarOQueFoiPago = vi.fn<(id: string) => Promise<OQueFoiPago>>();
const oQueFoiPagoNaFatura = vi.fn<(id: string) => Promise<OQueFoiPago>>();
vi.mock("../lib/stripe-reembolso.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-reembolso.js")>()),
  devolver: (pagamento: Pagamento, dono: DonoDaDevolucao) => devolver(pagamento, dono),
  buscarOQueFoiPago: (id: string) => buscarOQueFoiPago(id),
  oQueFoiPagoNaFatura: (id: string) => oQueFoiPagoNaFatura(id),
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
const aluna = `pix-conferencia-${S}`;
const CLIENTE = `cus_${S}_conferencia`;
const ANTES = process.env.STRIPE_SECRET_KEY;
let admin: string[] = [];
let adminId = "";
let n = 0;
const novoId = (prefixo: string) => `${prefixo}_${S}_${++n}`;
const pagamentoDe = (id: string, extra: Partial<PagamentoPrePago> = {}): PagamentoPrePago => ({ id, plano: "mensal", precoId: "price_de_antes", clienteId: CLIENTE, livemode: false, centavos: 8990, userId: aluna, visitante: null, ...extra });
const PRECOS: PrecoDoPlano[] = [{ plano: "mensal", precoId: "price_de_agora", centavos: 9990, moeda: "brl" }];
const resolver = (casoId: number, acao: string) => request(servidor).post(`/api/admin/cobranca/casos/${casoId}/resolver`).set("Cookie", admin).send({ acao });
async function casoDe(tipo: TipoDeCaso, chave: string, extra: { assinatura?: string } = {}): Promise<number> {
  await abrirCaso({ tipo, chave, urgente: true, conta: aluna, cliente: CLIENTE, assinatura: extra.assinatura ?? null });
  return (await prisma.billingCase.findUniqueOrThrow({ where: { kind_key: { kind: tipo, key: chave } } })).id;
}
const casoAgora = (id: number) => prisma.billingCase.findUniqueOrThrow({ where: { id } });

async function entrar(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  adminId = (await prisma.user.findUniqueOrThrow({ where: { email: (process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase() } })).id;
  await prisma.user.create({ data: { id: aluna, email: `${aluna}@teste.local` } });
  await prisma.stripeCustomer.create({ data: { userId: aluna, stripeCustomerId: CLIENTE, livemode: false } });
});

beforeEach(() => {
  lerPagamentoPix.mockReset().mockImplementation(async (id) => ({ status: "succeeded", pagamento: pagamentoDe(id) }));
  assinaturasDoPix.mockReset().mockResolvedValue([]);
  garantirFaturaPaga.mockReset().mockResolvedValue({ fatura: "in_x", status: "paid" });
  criarAssinaturaPrePaga.mockReset().mockImplementation(async () => ({ id: novoId("sub_aceita"), faturaPaga: true }));
  tirarDeConferencia.mockReset().mockResolvedValue(undefined);
  pixDevolvido.mockReset().mockResolvedValue(false);
  cobrancaDoPagamento.mockReset().mockResolvedValue({ centavos: 8990, devolvido: 0 });
  buscarPrecos.mockReset().mockResolvedValue(PRECOS);
  buscarAssinatura.mockReset().mockImplementation(async (id) => ({ id, status: "active", pagoAte: new Date(Date.now() + 30 * DIA), clienteId: CLIENTE, userId: aluna, livemode: false }));
  cancelarIncompleta.mockReset().mockResolvedValue("incomplete_expired");
  devolver.mockReset().mockResolvedValue(undefined);
  buscarOQueFoiPago.mockReset().mockResolvedValue({ moeda: "brl", pagamentos: [{ pagamentoId: novoId("pi_tentativa"), centavos: 9990, devolvido: 0 }] });
  oQueFoiPagoNaFatura.mockReset().mockResolvedValue({ moeda: "brl", pagamentos: [{ pagamentoId: novoId("pi_fatura"), centavos: 9990, devolvido: 0 }] });
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "re_teste" });
});

afterAll(async () => {
  await prisma.billingLog.deleteMany({ where: { OR: [{ userId: aluna }, { actorUserId: adminId, stripeSubscriptionId: { contains: S } }] } });
  await prisma.billingCase.deleteMany({ where: { key: { contains: S } } });
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.stripeCustomer.deleteMany({ where: { userId: aluna } });
  await prisma.user.deleteMany({ where: { id: aluna } });
  if (ANTES === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ANTES;
});

describe("os consertos de cada caso", () => {
  it("o Pix em conferência: aceitar ou devolver; o dinheiro sem assinatura: devolver — e o campo antigo traz o primeiro", async () => {
    await casoDe(TipoDeCaso.PIX_EM_CONFERENCIA, `pix:pi_${S}_lista`);
    await casoDe(TipoDeCaso.PAGO_SEM_ASSINATURA, `sub:sub_${S}_lista`);
    await casoDe(TipoDeCaso.PAGO_SEM_ASSINATURA, `fatura:in_${S}_lista`);
    const res = await request(servidor).get("/api/admin/cobranca/casos?situacao=abertos&pagina=1").set("Cookie", admin);
    const casos = (res.body as { casos: { key?: string; detalhe: string | null; tipo: string; consertos: string[]; conserto: string | null; aluno: { id: string } | null }[] }).casos.filter((c) => c.aluno?.id === aluna);
    const porTipo = casos.map((c) => [c.tipo, c.consertos, c.conserto]);
    expect(porTipo).toContainEqual(["PIX_EM_CONFERENCIA", ["aceitar-pix", "devolver-pix"], "aceitar-pix"]);
    expect(porTipo.filter(([tipo]) => tipo === "PAGO_SEM_ASSINATURA")).toEqual([["PAGO_SEM_ASSINATURA", ["devolver-este-pagamento"], "devolver-este-pagamento"], ["PAGO_SEM_ASSINATURA", ["devolver-este-pagamento"], "devolver-este-pagamento"]]);
    await prisma.billingCase.deleteMany({ where: { key: { endsWith: `${S}_lista` } } });
  });
});

describe("aceitar este Pix", () => {
  it("sem pré-paga: nasce no preço de AGORA, com a chave do operador; a marca sai; o espelho é gravado; as aulas abrem; o caso fecha", async () => {
    const pix = novoId("pi_aceitar");
    const id = await casoDe(TipoDeCaso.PIX_EM_CONFERENCIA, `pix:${pix}`);
    const res = await resolver(id, "aceitar-pix");
    expect([res.status, res.body]).toEqual([200, { detalhe: "o Pix virou a assinatura pré-paga; com acesso às aulas" }]);
    expect(criarAssinaturaPrePaga.mock.calls).toEqual([[pagamentoDe(pix, { precoId: "price_de_agora" }), "operador"]]);
    expect(tirarDeConferencia.mock.calls).toEqual([[pix]]);
    expect(await temAcessoAtivo(aluna)).toBe(true);
    expect(await casoAgora(id)).toMatchObject({ open: false, closedBy: "OPERADOR", closedByUserId: adminId, note: "o Pix virou a assinatura pré-paga; com acesso às aulas" });
    await prisma.subscription.deleteMany({ where: { ownerUserId: aluna } });
  });

  it("a pré-paga incompleta que se paga por fora é aproveitada; a que não se paga é encerrada, e nasce outra", async () => {
    const pix = novoId("pi_incompleta");
    const id = await casoDe(TipoDeCaso.PIX_EM_CONFERENCIA, `pix:${pix}`);
    assinaturasDoPix.mockResolvedValue([{ id: `sub_${S}_incompleta`, status: "incomplete", faturaPaga: false }]);
    expect((await resolver(id, "aceitar-pix")).status).toBe(200);
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    expect(buscarAssinatura).toHaveBeenCalledWith(`sub_${S}_incompleta`);
    await prisma.subscription.deleteMany({ where: { ownerUserId: aluna } });

    const pix2 = novoId("pi_nao_se_paga");
    const id2 = await casoDe(TipoDeCaso.PIX_EM_CONFERENCIA, `pix:${pix2}`);
    garantirFaturaPaga.mockResolvedValue({ fatura: "in_y", status: "void" });
    expect((await resolver(id2, "aceitar-pix")).status).toBe(200);
    expect(cancelarIncompleta.mock.calls).toEqual([[`sub_${S}_incompleta`]]);
    expect(criarAssinaturaPrePaga).toHaveBeenCalledTimes(1);
    await prisma.subscription.deleteMany({ where: { ownerUserId: aluna } });
  });

  it("o Pix que já voltou, e o que já virou assinatura: o caso fecha, e nada nasce", async () => {
    const id = await casoDe(TipoDeCaso.PIX_EM_CONFERENCIA, `pix:${novoId("pi_voltou")}`);
    pixDevolvido.mockResolvedValue(true);
    expect((await resolver(id, "aceitar-pix")).body).toEqual({ detalhe: "o Pix já tinha voltado para a pessoa" });
    expect((await casoAgora(id)).open).toBe(false);
    pixDevolvido.mockResolvedValue(false);
    const virou = novoId("pi_virou");
    await prisma.subscription.create({ data: { stripeSubscriptionId: `sub_${S}_virou`, ownerUserId: aluna, status: "active", currentPeriodEnd: new Date(Date.now() + 10 * DIA), pixPaymentIntentId: virou } });
    const id2 = await casoDe(TipoDeCaso.PIX_EM_CONFERENCIA, `pix:${virou}`);
    expect((await resolver(id2, "aceitar-pix")).body).toEqual({ detalhe: "o Pix já tinha virado assinatura" });
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    expect(tirarDeConferencia).not.toHaveBeenCalled();
    await prisma.subscription.deleteMany({ where: { ownerUserId: aluna } });
  });

  it("o plano fora de venda: 409, nada nasce, e o caso continua aberto", async () => {
    const id = await casoDe(TipoDeCaso.PIX_EM_CONFERENCIA, `pix:${novoId("pi_sem_preco")}`);
    buscarPrecos.mockResolvedValue([]);
    expect((await resolver(id, "aceitar-pix")).body).toEqual({ error: "PixNaoAceito" });
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
    expect((await casoAgora(id)).open).toBe(true);
  });
});

describe("devolver o Pix", () => {
  it("volta inteiro, e o caso fecha com o valor; a falha: 502, e o caso fica", async () => {
    const pix = novoId("pi_devolver");
    const id = await casoDe(TipoDeCaso.PIX_EM_CONFERENCIA, `pix:${pix}`);
    devolver.mockRejectedValueOnce(new Error("[stripe] a devolução do pagamento falhou: StripeAPIError"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await resolver(id, "devolver-pix")).body).toEqual({ error: "DevolucaoFalhou" });
    expect((await casoAgora(id)).open).toBe(true);
    vi.restoreAllMocks();
    const res = await resolver(id, "devolver-pix");
    expect(res.status).toBe(200);
    expect((res.body as { detalhe: string }).detalhe).toMatch(/^R\$\s89,90 devolvidos; o Pix voltou para a pessoa$/);
    expect(devolver.mock.calls.at(-1)?.[0]).toEqual({ pagamentoId: pix, centavos: 8990, devolvido: 0 });
    expect(await casoAgora(id)).toMatchObject({ open: false, closedBy: "OPERADOR" });
    expect(criarAssinaturaPrePaga).not.toHaveBeenCalled();
  });
});

describe("devolver este pagamento (o dinheiro sem assinatura)", () => {
  it("o da tentativa cancelada já paga: todas as faturas pagas dela, com a trava e a sincronia; o caso fecha com o valor", async () => {
    const sub = `sub_${S}_tentativa`;
    const id = await casoDe(TipoDeCaso.PAGO_SEM_ASSINATURA, `sub:${sub}`, { assinatura: sub });
    const res = await resolver(id, "devolver-este-pagamento");
    expect(res.status).toBe(200);
    expect((res.body as { detalhe: string }).detalhe).toMatch(/^R\$\s99,90 devolvidos$/);
    expect(buscarOQueFoiPago.mock.calls).toEqual([[sub]]);
    expect(devolver).toHaveBeenCalledTimes(1);
    expect(buscarAssinatura).toHaveBeenCalledWith(sub);
    expect(await casoAgora(id)).toMatchObject({ open: false, closedBy: "OPERADOR" });
  });

  it("o da cobrança em aberto paga ao cancelar: pela fatura; nada faltava: o caso fecha também", async () => {
    const sub = `sub_${S}_da_fatura`;
    const id = await casoDe(TipoDeCaso.PAGO_SEM_ASSINATURA, `fatura:in_${S}_paga`, { assinatura: sub });
    expect((await resolver(id, "devolver-este-pagamento")).status).toBe(200);
    expect(oQueFoiPagoNaFatura.mock.calls).toEqual([[`in_${S}_paga`]]);
    expect(buscarAssinatura).toHaveBeenCalledWith(sub);
    const id2 = await casoDe(TipoDeCaso.PAGO_SEM_ASSINATURA, `fatura:in_${S}_ja_voltou`, { assinatura: sub });
    oQueFoiPagoNaFatura.mockResolvedValue({ moeda: "brl", pagamentos: [{ pagamentoId: "pi_x", centavos: 9990, devolvido: 9990 }] });
    expect((await resolver(id2, "devolver-este-pagamento")).body).toEqual({ detalhe: "nada faltava devolver" });
    expect((await casoAgora(id2)).open).toBe(false);
  });

  it("o conserto que não é do caso: 404", async () => {
    const id = await casoDe(TipoDeCaso.PAGO_SEM_ASSINATURA, `sub:sub_${S}_errado`);
    expect((await resolver(id, "aceitar-pix")).status).toBe(404);
    expect((await resolver(id, "devolver-pix")).status).toBe(404);
    expect(devolver).not.toHaveBeenCalled();
  });
});
