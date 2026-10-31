import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Stripe from "stripe";
import type { AssinaturaNaStripe } from "../lib/stripe.js";
import type { PedidoDeEmail, Envio } from "../lib/email.js";

// OS CASOS — "PRECISA DE VOCÊ" (etapa 4.7b, passo 2a). Na NOSSA fronteira: a busca da assinatura e o balcão de e-mail;
// o resto roda de verdade, contra o banco. O que protege:
//   - UM caso por situação: abrir de novo não duplica (atualiza o resumo e guarda quando abriu); fechado, a mesma
//     situação REABRE, limpa;
//   - dentro de uma transação da cobrança, o caso vive e morre com ela — e abrir um caso que já existe NÃO deixa a
//     transação abortada (a cobrança continua depois dele);
//   - o "pagou e está sem conta" abre quando o aviso diz que a assinatura sem conta dá acesso (e não abre quando não
//     dá), e fecha sozinho quando a conta nasce do pagamento.
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));
const enviarEmail = vi.fn<(pedido: PedidoDeEmail) => Promise<Envio>>();
vi.mock("../lib/email.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/email.js")>()),
  enviarEmail: (pedido: PedidoDeEmail) => enviarEmail(pedido),
}));

import servidor from "./servidor.js";
import { prisma, TipoDeCaso, QuemFez } from "../lib/prisma.js";
import { abrirCaso, fecharCaso } from "../lib/casos.js";
import { depoisDoAviso } from "../lib/depois-do-aviso.js";

const S = `${Date.now()}`;
const SEGREDO = "whsec_da_suite_dos_casos";
const DIA = 24 * 60 * 60 * 1000;
let n = 0;
const novoId = (prefixo: string) => `${prefixo}_${S}_${++n}`;
const caso = (chave: string) => prisma.billingCase.findUnique({ where: { kind_key: { kind: TipoDeCaso.PAGO_SEM_ASSINATURA, key: chave } } });

function enviar(id: string, subId: string) {
  const corpo = JSON.stringify({ object: "event", id, type: "customer.subscription.created", data: { object: { id: subId, object: "subscription" } } }, null, 2);
  const cabecalho = Stripe.webhooks.generateTestHeaderString({ payload: corpo, secret: SEGREDO });
  return request(servidor).post("/api/stripe/webhook").set("Content-Type", "application/json").set("Stripe-Signature", cabecalho).send(corpo);
}

beforeAll(() => {
  process.env.STRIPE_WEBHOOK_SECRET = SEGREDO;
});

beforeEach(() => {
  buscarAssinatura.mockReset();
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "re_teste" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  await prisma.billingCase.deleteMany({ where: { key: { contains: S } } });
  await prisma.billingLog.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.stripeEvent.deleteMany({ where: { id: { contains: S } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
  await prisma.guestCheckout.deleteMany({ where: { id: { contains: S } } });
});

describe("abrir e fechar um caso", () => {
  it("abrir de novo não duplica: o resumo muda e o 'abriu em' fica", async () => {
    const chave = `sub:${novoId("sub")}`;
    await abrirCaso({ tipo: TipoDeCaso.PAGO_SEM_ASSINATURA, chave, urgente: true, detalhe: "primeiro" });
    const antes = await caso(chave);
    await abrirCaso({ tipo: TipoDeCaso.PAGO_SEM_ASSINATURA, chave, urgente: true, detalhe: "segundo" });
    const depois = await caso(chave);
    expect(await prisma.billingCase.count({ where: { key: chave } })).toBe(1);
    expect(depois).toMatchObject({ open: true, urgent: true, detail: "segundo" });
    expect(depois?.openedAt.toISOString()).toBe(antes?.openedAt.toISOString());
  });

  it("fechado, a mesma situação reabre — limpa (sem a nota, quem fechou nem o aviso de antes)", async () => {
    const chave = `sub:${novoId("sub")}`;
    await abrirCaso({ tipo: TipoDeCaso.PAGO_SEM_ASSINATURA, chave, urgente: false });
    await prisma.billingCase.update({ where: { kind_key: { kind: TipoDeCaso.PAGO_SEM_ASSINATURA, key: chave } }, data: { notifiedAt: new Date() } });
    expect(await fecharCaso({ tipo: TipoDeCaso.PAGO_SEM_ASSINATURA, chave }, { quem: QuemFez.OPERADOR, conta: "admin-1", nota: "devolvido" })).toBe(true);
    expect(await caso(chave)).toMatchObject({ open: false, closedBy: "OPERADOR", closedByUserId: "admin-1", note: "devolvido" });
    expect(await fecharCaso({ tipo: TipoDeCaso.PAGO_SEM_ASSINATURA, chave }, { quem: QuemFez.OPERADOR })).toBe(false);
    await abrirCaso({ tipo: TipoDeCaso.PAGO_SEM_ASSINATURA, chave, urgente: true });
    expect(await caso(chave)).toMatchObject({ open: true, urgent: true, closedAt: null, closedBy: null, note: null, notifiedAt: null });
  });

  it("dentro da transação: o caso vive e morre com ela, e abrir um que já existe não a aborta", async () => {
    const desfeito = `sub:${novoId("sub")}`;
    await expect(
      prisma.$transaction(async (tx) => {
        await abrirCaso({ tipo: TipoDeCaso.PAGO_SEM_ASSINATURA, chave: desfeito, urgente: true }, tx);
        throw new Error("a cobrança falhou depois");
      }),
    ).rejects.toThrow("a cobrança falhou depois");
    expect(await caso(desfeito)).toBeNull();

    const existente = `sub:${novoId("sub")}`;
    await abrirCaso({ tipo: TipoDeCaso.PAGO_SEM_ASSINATURA, chave: existente, urgente: true });
    const contas = await prisma.$transaction(async (tx) => {
      await abrirCaso({ tipo: TipoDeCaso.PAGO_SEM_ASSINATURA, chave: existente, urgente: true, detalhe: "de novo, na transação" }, tx);
      return tx.user.count();
    });
    expect(contas).toBeGreaterThan(0);
    expect((await caso(existente))?.detail).toBe("de novo, na transação");
  });
});

describe("o 'pagou e está sem conta'", () => {
  const semConta = (sub: string, pagoAte: Date, status = "active") => ({ resultado: "sem-conta" as const, assinatura: { id: sub, status, pagoAte, clienteId: `cus_${S}`, userId: null, livemode: false }, motivo: "conta inexistente" as const });
  const doTipo = (chave: string) => prisma.billingCase.findUnique({ where: { kind_key: { kind: TipoDeCaso.PAGOU_SEM_CONTA, key: chave } } });

  it("abre quando a assinatura sem conta dá acesso (o alerta continua); não abre quando não dá", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const comAcesso = novoId("sub");
    await depoisDoAviso({ id: novoId("evt"), tipo: "customer.subscription.updated", assinatura: comAcesso }, semConta(comAcesso, new Date(Date.now() + 10 * DIA)));
    expect(await doTipo(`sub:${comAcesso}`)).toMatchObject({ open: true, urgent: true, stripeSubscriptionId: comAcesso });
    const semAcesso = novoId("sub");
    await depoisDoAviso({ id: novoId("evt"), tipo: "customer.subscription.updated", assinatura: semAcesso }, semConta(semAcesso, new Date(Date.now() - DIA), "canceled"));
    expect(await doTipo(`sub:${semAcesso}`)).toBeNull();
  });

  it("fecha sozinho quando a conta nasce do pagamento (a da assinatura e a da ficha)", async () => {
    const ficha = await prisma.guestCheckout.create({ data: { id: novoId("pedido"), email: `casos-${++n}-${S}@teste.local`, stripeCustomerId: novoId("cus"), livemode: false } });
    const sub = novoId("sub");
    await abrirCaso({ tipo: TipoDeCaso.PAGOU_SEM_CONTA, chave: `sub:${sub}`, urgente: true });
    await abrirCaso({ tipo: TipoDeCaso.PAGOU_SEM_CONTA, chave: `ficha:${ficha.id}`, urgente: true });
    buscarAssinatura.mockResolvedValue({ id: sub, status: "active", pagoAte: new Date(Date.now() + 30 * DIA), clienteId: ficha.stripeCustomerId, userId: null, pedido: ficha.id, doVisitante: { novidades: false, origem: null, campanha: null }, livemode: false });
    expect((await enviar(novoId("evt"), sub)).status).toBe(200);
    expect((await prisma.guestCheckout.findUniqueOrThrow({ where: { id: ficha.id } })).userId).not.toBeNull();
    expect(await doTipo(`sub:${sub}`)).toMatchObject({ open: false, closedBy: "STRIPE" });
    expect(await doTipo(`ficha:${ficha.id}`)).toMatchObject({ open: false, closedBy: "STRIPE" });
  });
});
