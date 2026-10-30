import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import type Stripe from "stripe";
import type { AssinaturaNaStripe } from "../lib/stripe.js";
import type { PedidoDeEmail, Envio } from "../lib/email.js";

// A CONTESTAÇÃO E O AVISO DE FRAUDE (E7 da revisão ampla da cobrança; decisões do operador P122 e de 30/10/2026). A
// Stripe na NOSSA fronteira vira dublê (o que ela diz da assinatura, de que assinatura é o pagamento, e o cancelamento);
// o processamento do aviso, a sincronia e o que vem depois rodam de verdade, contra o banco. O que protege: a
// contestação cancela a assinatura na Stripe ANTES da sincronia, corta o acesso, derruba as sessões e alerta com o
// prazo — uma vez só (a reentrega não cancela nem alerta de novo); a Stripe que falha não marca o aviso (ele volta);
// a contestação de um pagamento que não é de assinatura alerta do mesmo jeito; o aviso de fraude só alerta.
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));
const assinaturaDoPagamento = vi.fn<(pagamento: string) => Promise<string | null>>();
const cancelarPorContestacao = vi.fn<(assinatura: string, contestacao: string) => Promise<void>>();
vi.mock("../lib/stripe-reembolso.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-reembolso.js")>()),
  assinaturaDoPagamento: (pagamento: string) => assinaturaDoPagamento(pagamento),
  cancelarPorContestacao: (assinatura: string, contestacao: string) => cancelarPorContestacao(assinatura, contestacao),
}));
const enviarEmail = vi.fn<(pedido: PedidoDeEmail) => Promise<Envio>>();
vi.mock("../lib/email.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/email.js")>()),
  enviarEmail: (pedido: PedidoDeEmail) => enviarEmail(pedido),
}));

import { prisma } from "../lib/prisma.js";
import { temAcessoAtivo } from "../lib/acesso.js";
import { paraAviso } from "../lib/stripe.js";
import { processarAviso } from "../lib/assinaturas.js";
import { depoisDoAviso } from "../lib/depois-do-aviso.js";

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const dono = `contestacao-${S}`;
let n = 0;
const novoId = (prefixo: string) => `${prefixo}_contestacao_${S}_${++n}`;
const PRAZO = 1_900_000_000;

// Seguro: os avisos de teste têm só os campos que a rotina lê; a forma completa é da Stripe.
const daContestacao = (pagamento: string | null) =>
  ({ id: novoId("evt"), object: "event", type: "charge.dispute.created", created: Math.floor(Date.now() / 1000), data: { object: { id: novoId("dp"), object: "dispute", amount: 9990, charge: novoId("ch"), payment_intent: pagamento, reason: "fraudulent", evidence_details: { due_by: PRAZO } } } }) as unknown as Stripe.Event;
const doAvisoDeFraude = () =>
  ({ id: novoId("evt"), object: "event", type: "radar.early_fraud_warning.created", created: Math.floor(Date.now() / 1000), data: { object: { id: novoId("issfr"), object: "radar.early_fraud_warning", charge: novoId("ch"), payment_intent: novoId("pi"), fraud_type: "made_with_stolen_card", actionable: true } } }) as unknown as Stripe.Event;
/** O que a Stripe diz da assinatura DEPOIS de marcada e cancelada: encerrada, com o período contestado sem contar. */
const canceladaNaStripe = (id: string): AssinaturaNaStripe => ({ id, status: "canceled", pagoAte: new Date(Date.now() - 10 * DIA), clienteId: "cus_contestacao", userId: dono, livemode: false });
const espelho = (id: string) => prisma.subscription.findUnique({ where: { stripeSubscriptionId: id } });
const marcado = (id: string) => prisma.stripeEvent.findUnique({ where: { id } });
const alertas = (erro: { mock: { calls: unknown[][] } }) => erro.mock.calls.map(([texto]) => String(texto)).filter((texto) => texto.startsWith("[stripe] contestação") || texto.startsWith("[stripe] aviso de fraude"));

/** Uma assinatura ATIVA da conta, com uma sessão aberta. */
async function assinanteComSessao(): Promise<string> {
  const id = novoId("sub");
  await prisma.subscription.create({ data: { stripeSubscriptionId: id, ownerUserId: dono, status: "active", currentPeriodEnd: new Date(Date.now() + 20 * DIA), livemode: false } });
  await prisma.session.create({ data: { id: novoId("sessao"), token: novoId("token"), userId: dono, expiresAt: new Date(Date.now() + 7 * DIA) } });
  return id;
}

beforeAll(async () => {
  await prisma.user.create({ data: { id: dono, email: `${dono}@teste.local` } });
});
beforeEach(() => {
  buscarAssinatura.mockReset().mockImplementation(async (id) => canceladaNaStripe(id));
  assinaturaDoPagamento.mockReset().mockResolvedValue(null);
  cancelarPorContestacao.mockReset().mockResolvedValue(undefined);
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "email_da_suite" });
});
afterEach(async () => {
  vi.restoreAllMocks();
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: `contestacao_${S}` } } });
  await prisma.session.deleteMany({ where: { userId: dono } });
});
afterAll(async () => {
  await prisma.stripeEvent.deleteMany({ where: { id: { contains: `contestacao_${S}` } } });
  await prisma.user.deleteMany({ where: { id: dono } });
});

describe("a contestação de um pagamento", () => {
  it("cancela a assinatura na Stripe ANTES da sincronia, corta o acesso, derruba as sessões e alerta com o prazo — e a reentrega não faz nada de novo", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    const assinatura = await assinanteComSessao();
    const pagamento = novoId("pi");
    assinaturaDoPagamento.mockImplementation(async (pedido) => (pedido === pagamento ? assinatura : null));
    expect(await temAcessoAtivo(dono)).toBe(true);

    const evento = daContestacao(pagamento);
    const aviso = paraAviso(evento);
    const desfecho = await processarAviso(aviso);
    await depoisDoAviso(aviso, desfecho);

    expect(cancelarPorContestacao.mock.calls).toEqual([[assinatura, aviso.contestacao?.id]]);
    expect(cancelarPorContestacao.mock.invocationCallOrder[0]).toBeLessThan(buscarAssinatura.mock.invocationCallOrder[0] ?? 0);
    expect(desfecho).toMatchObject({ resultado: "atualizada", perdeuAcesso: true });
    expect(await espelho(assinatura)).toMatchObject({ status: "canceled" });
    expect(await temAcessoAtivo(dono)).toBe(false);
    expect(await prisma.session.count({ where: { userId: dono } })).toBe(0);
    expect(await marcado(evento.id)).not.toBeNull();
    expect(alertas(erro)).toHaveLength(1);
    expect(alertas(erro)[0]).toContain(`contestação ${aviso.contestacao?.id}`);
    expect(alertas(erro)[0]).toContain(`a assinatura ${assinatura} foi cancelada e o acesso, cortado`);
    expect(alertas(erro)[0]).toContain("R$ 99,90");
    expect(alertas(erro)[0]).toContain(`até ${new Date(PRAZO * 1000).toISOString().slice(0, 10)}`);

    const deNovo = await processarAviso(aviso);
    await depoisDoAviso(aviso, deNovo);
    expect(deNovo).toEqual({ resultado: "repetido" });
    expect(cancelarPorContestacao).toHaveBeenCalledTimes(1);
    expect(alertas(erro)).toHaveLength(1);
  });

  it("a Stripe falhou ao cancelar: nada fica marcado nem muda — o aviso volta, e o acesso só cai quando ele valer", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const assinatura = await assinanteComSessao();
    const pagamento = novoId("pi");
    assinaturaDoPagamento.mockResolvedValue(assinatura);
    cancelarPorContestacao.mockRejectedValue(new Error("[stripe] o cancelamento da assinatura contestada falhou: api_error, status 500"));
    const evento = daContestacao(pagamento);
    await expect(processarAviso(paraAviso(evento))).rejects.toThrow(/contestada falhou/);
    expect(await marcado(evento.id)).toBeNull();
    expect(await espelho(assinatura)).toMatchObject({ status: "active" });
    expect(buscarAssinatura).not.toHaveBeenCalled();
  });

  it("o pagamento contestado não é de uma assinatura da escola (ou não veio): alerta do mesmo jeito, sem cancelar nada", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    for (const pagamento of [novoId("pi"), null]) {
      const evento = daContestacao(pagamento);
      const aviso = paraAviso(evento);
      const desfecho = await processarAviso(aviso);
      await depoisDoAviso(aviso, desfecho);
      expect(desfecho).toEqual({ resultado: "sem-assinatura" });
      expect(await marcado(evento.id)).not.toBeNull();
    }
    expect(cancelarPorContestacao).not.toHaveBeenCalled();
    expect(alertas(erro)).toHaveLength(2);
    expect(alertas(erro).every((linha) => linha.includes("o pagamento não é de uma assinatura da escola"))).toBe(true);
  });
});

describe("o aviso de fraude", () => {
  it("só alerta: nada é cancelado nem sincronizado, e o acesso fica", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    await assinanteComSessao();
    const evento = doAvisoDeFraude();
    const aviso = paraAviso(evento);
    const desfecho = await processarAviso(aviso);
    await depoisDoAviso(aviso, desfecho);
    expect(desfecho).toEqual({ resultado: "sem-assinatura" });
    expect(cancelarPorContestacao).not.toHaveBeenCalled();
    expect(buscarAssinatura).not.toHaveBeenCalled();
    expect(await temAcessoAtivo(dono)).toBe(true);
    expect(alertas(erro)).toHaveLength(1);
    expect(alertas(erro)[0]).toContain(`aviso de fraude ${aviso.avisoDeFraude?.id}`);
    expect(alertas(erro)[0]).toContain("made_with_stolen_card");
  });
});
