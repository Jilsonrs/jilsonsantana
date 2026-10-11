import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";

// O REEMBOLSO NA STRIPE (Fase 4, etapa 4.6, sessão b) — com a biblioteca dela trocada por um
// dublê do tamanho exato do que estas funções usam; elas rodam de verdade, só a rede é dublê.
// O que protege, e é DINHEIRO SAINDO:
//   - o que se devolve é o que FALTA voltar de tudo o que foi pago naquela assinatura;
//   - repetir não devolve duas vezes;
//   - encerrar para reembolsar é NA HORA, sem crédito e sem fatura nova;
//   - a fatura devolvida por inteiro deixa de contar como paga no espelho — a parcial, não;
//   - o aviso de dinheiro devolvido acha a assinatura certa pelo pagamento.
const falsa = {
  subscriptions: { retrieve: vi.fn(), update: vi.fn(), cancel: vi.fn() },
  invoices: { list: vi.fn() },
  invoicePayments: { list: vi.fn() },
  paymentIntents: { retrieve: vi.fn() },
  refunds: { create: vi.fn() },
};
// A biblioteca falsa entra pela fábrica do cliente: é dela que saem TODAS as idas à Stripe,
// inclusive as do próprio `stripe.ts` (a busca da assinatura que alimenta o espelho).
vi.mock("./stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import { AssinaturaNaoEncontrada, buscarAssinatura } from "./stripe.js";
import { cobrancaDoPagamento, faturaDevolvida } from "./stripe-devolucao.js";
import { aDevolver, assinaturaDoPagamento, buscarOQueFoiPago, cancelarNaHora, devolver, paraPedidoDeDevolucao } from "./stripe-reembolso.js";

const DONO = { userId: "u-1", assinaturaId: "sub_1" };
const recusa = (code: string) => new Stripe.errors.StripeInvalidRequestError({ message: "mensagem crua da Stripe, com sk_test_abc", type: "invalid_request_error", code, statusCode: 400 });
const foraDoAr = () => new Stripe.errors.StripeConnectionError({ message: "mensagem crua da Stripe, com sk_test_abc", type: "api_error" });
const pago = (pi: string) => ({ status: "paid", payment: { type: "payment_intent", payment_intent: pi } });
const fatura = (id: string, amount_paid: number, pagamentos: object[], status = "paid") => ({ id, status, amount_paid, currency: "brl", payments: { data: pagamentos } });
/** As cobranças, por pagamento: quanto cobrou e quanto já voltou. */
function comCobrancas(cobrancas: Record<string, { amount: number; amount_refunded: number } | null>) {
  falsa.paymentIntents.retrieve.mockImplementation(async (id: string) => ({ id, latest_charge: cobrancas[id] ?? null }));
}

beforeEach(() => {
  for (const grupo of Object.values(falsa)) for (const dublê of Object.values(grupo)) dublê.mockReset();
});

describe("quanto ainda há a devolver", () => {
  it("o que foi cobrado, menos o que já voltou — de todos os pagamentos", () => {
    expect(aDevolver({ moeda: "brl", pagamentos: [{ pagamentoId: "pi_1", centavos: 9990, devolvido: 0 }, { pagamentoId: "pi_2", centavos: 89800, devolvido: 1000 }] })).toBe(9990 + 88800);
    expect(aDevolver({ moeda: "brl", pagamentos: [{ pagamentoId: "pi_1", centavos: 9990, devolvido: 9990 }] })).toBe(0);
    expect(aDevolver({ moeda: null, pagamentos: [] })).toBe(0);
  });

  it("nunca negativo, nem que a Stripe diga que voltou mais do que cobrou", () => {
    expect(aDevolver({ moeda: "brl", pagamentos: [{ pagamentoId: "pi_1", centavos: 100, devolvido: 500 }, { pagamentoId: "pi_2", centavos: 300, devolvido: 0 }] })).toBe(300);
  });
});

describe("tudo o que foi pago numa assinatura", () => {
  it("as faturas PAGAS desta assinatura, com a cobrança de cada pagamento", async () => {
    falsa.invoices.list.mockResolvedValue({ data: [fatura("in_2", 89800, [pago("pi_2")]), fatura("in_1", 9990, [pago("pi_1")])] });
    comCobrancas({ pi_1: { amount: 9990, amount_refunded: 0 }, pi_2: { amount: 89800, amount_refunded: 1000 } });
    expect(await buscarOQueFoiPago("sub_1")).toEqual({ moeda: "brl", pagamentos: [{ pagamentoId: "pi_2", centavos: 89800, devolvido: 1000 }, { pagamentoId: "pi_1", centavos: 9990, devolvido: 0 }] });
    expect(falsa.invoices.list.mock.calls).toEqual([[{ subscription: "sub_1", status: "paid", limit: 100, expand: ["data.payments"] }]]);
  });

  it("a cortesia: fatura paga de valor zero, sem pagamento nenhum — nada foi pago, e nenhuma cobrança é lida", async () => {
    falsa.invoices.list.mockResolvedValue({ data: [fatura("in_1", 0, [])] });
    expect(await buscarOQueFoiPago("sub_1")).toEqual({ moeda: null, pagamentos: [] });
    expect(falsa.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  it("a Stripe fora do ar: sobe, sem a mensagem dela", async () => {
    falsa.invoices.list.mockRejectedValue(foraDoAr());
    await expect(buscarOQueFoiPago("sub_1")).rejects.toThrow("[stripe] a lista das faturas pagas da assinatura falhou: StripeConnectionError");
    await expect(buscarOQueFoiPago("sub_1")).rejects.not.toThrow(/sk_test/);
  });
});

describe("encerrar a assinatura para reembolsar", () => {
  it("NA HORA, sem crédito proporcional e sem fatura nova — e com o motivo", async () => {
    falsa.subscriptions.cancel.mockResolvedValue({ id: "sub_1", status: "canceled" });
    falsa.subscriptions.update.mockResolvedValue({ id: "sub_1" });
    await cancelarNaHora("sub_1", { motivo: "caro", comentario: "volto em janeiro" });
    expect(falsa.subscriptions.cancel.mock.calls).toEqual([["sub_1", { prorate: false, invoice_now: false, cancellation_details: { feedback: "too_expensive", comment: "volto em janeiro" } }]]);
    // O motivo exato da escola vai depois de encerrar.
    expect(falsa.subscriptions.update.mock.calls).toEqual([["sub_1", { metadata: { motivo: "caro" } }]]);
  });

  it("sem motivo: só encerra", async () => {
    falsa.subscriptions.cancel.mockResolvedValue({ id: "sub_1", status: "canceled" });
    await cancelarNaHora("sub_1", {});
    expect(falsa.subscriptions.cancel.mock.calls).toEqual([["sub_1", { prorate: false, invoice_now: false }]]);
    expect(falsa.subscriptions.update).not.toHaveBeenCalled();
  });

  it("o motivo não foi gravado: é aviso — não segura o reembolso", async () => {
    falsa.subscriptions.cancel.mockResolvedValue({ id: "sub_1", status: "canceled" });
    falsa.subscriptions.update.mockRejectedValue(foraDoAr());
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await expect(cancelarNaHora("sub_1", { motivo: "outro" })).resolves.toBeUndefined();
      expect(aviso.mock.calls.flat().join(" ")).toContain("o motivo da assinatura sub_1 não foi gravado");
    } finally {
      aviso.mockRestore();
    }
  });

  it("não encerrou: sobe, sem a mensagem da Stripe", async () => {
    falsa.subscriptions.cancel.mockRejectedValue(foraDoAr());
    await expect(cancelarNaHora("sub_1", {})).rejects.toThrow("[stripe] o encerramento da assinatura falhou: StripeConnectionError");
  });
});

describe("devolver um pagamento", () => {
  it("o pedido: o que FALTA voltar deste pagamento, a pedido do cliente, com de quem é", () => {
    expect(paraPedidoDeDevolucao({ pagamentoId: "pi_1", centavos: 9990, devolvido: 1000 }, DONO)).toEqual({ payment_intent: "pi_1", amount: 8990, reason: "requested_by_customer", metadata: { para: "reembolso", userId: "u-1", assinatura: "sub_1" } });
  });

  it("vai à Stripe com a chave de repetição do pagamento e do quanto já tinha voltado", async () => {
    falsa.refunds.create.mockResolvedValue({ id: "re_1", status: "succeeded" });
    await devolver({ pagamentoId: "pi_1", centavos: 9990, devolvido: 0 }, DONO);
    expect(falsa.refunds.create.mock.calls).toEqual([[{ payment_intent: "pi_1", amount: 9990, reason: "requested_by_customer", metadata: { para: "reembolso", userId: "u-1", assinatura: "sub_1" } }, { idempotencyKey: "reembolso-pi_1-0" }]]);
  });

  it("nada a devolver deste pagamento: a Stripe nem é chamada", async () => {
    await devolver({ pagamentoId: "pi_1", centavos: 9990, devolvido: 9990 }, DONO);
    expect(falsa.refunds.create).not.toHaveBeenCalled();
  });

  it("a Stripe diz que já voltou por inteiro: conta como feito (repetir não devolve duas vezes)", async () => {
    falsa.refunds.create.mockRejectedValue(recusa("charge_already_refunded"));
    await expect(devolver({ pagamentoId: "pi_1", centavos: 9990, devolvido: 0 }, DONO)).resolves.toBeUndefined();
  });

  it("a devolução nasceu falha, ou a Stripe recusou por outro motivo: sobe — nunca 'devolvido'", async () => {
    falsa.refunds.create.mockResolvedValue({ id: "re_1", status: "failed" });
    await expect(devolver({ pagamentoId: "pi_1", centavos: 9990, devolvido: 0 }, DONO)).rejects.toThrow("a devolução nasceu failed");
    falsa.refunds.create.mockRejectedValue(recusa("charge_disputed"));
    await expect(devolver({ pagamentoId: "pi_1", centavos: 9990, devolvido: 0 }, DONO)).rejects.toThrow("[stripe] a devolução do pagamento falhou");
  });

  it("a devolução ainda em andamento (`pending`) vale: o banco é que demora", async () => {
    falsa.refunds.create.mockResolvedValue({ id: "re_1", status: "pending" });
    await expect(devolver({ pagamentoId: "pi_1", centavos: 9990, devolvido: 0 }, DONO)).resolves.toBeUndefined();
  });
});

describe("a fatura devolvida por inteiro", () => {
  // Seguro: só os campos que as funções leem; a forma completa é da Stripe.
  const comoFatura = (f: object) => f as unknown as Stripe.Invoice;

  it("tudo o que ela recebeu já voltou: devolvida", async () => {
    comCobrancas({ pi_1: { amount: 9990, amount_refunded: 9990 } });
    expect(await faturaDevolvida(comoFatura(fatura("in_1", 9990, [pago("pi_1")])))).toBe(true);
  });

  it("devolução PARCIAL: continua contando como paga", async () => {
    comCobrancas({ pi_1: { amount: 9990, amount_refunded: 9989 } });
    expect(await faturaDevolvida(comoFatura(fatura("in_1", 9990, [pago("pi_1")])))).toBe(false);
  });

  it("dois pagamentos, um só devolvido: não é por inteiro", async () => {
    comCobrancas({ pi_1: { amount: 5000, amount_refunded: 5000 }, pi_2: { amount: 4990, amount_refunded: 0 } });
    expect(await faturaDevolvida(comoFatura(fatura("in_1", 9990, [pago("pi_1"), pago("pi_2")])))).toBe(false);
  });

  it("o que não tem o que conferir conta como pago, sem ir à Stripe: não paga, valor zero, sem pagamento, só o id, nenhuma", async () => {
    for (const f of [fatura("in_1", 9990, [pago("pi_1")], "open"), fatura("in_1", 0, []), fatura("in_1", 9990, [])]) expect(await faturaDevolvida(comoFatura(f))).toBe(false);
    expect(await faturaDevolvida("in_so_o_id")).toBe(false);
    expect(await faturaDevolvida(null)).toBe(false);
    expect(falsa.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  it("a cobrança que não veio: nada cobrado, nada devolvido — e a leitura que falha sobe, sem a mensagem da Stripe", async () => {
    comCobrancas({ pi_1: null });
    expect(await cobrancaDoPagamento("pi_1")).toEqual({ centavos: 0, devolvido: 0 });
    expect(falsa.paymentIntents.retrieve.mock.calls).toEqual([["pi_1", { expand: ["latest_charge"] }]]);
    falsa.paymentIntents.retrieve.mockRejectedValue(foraDoAr());
    await expect(cobrancaDoPagamento("pi_1")).rejects.toThrow("[stripe] a leitura da cobrança do pagamento falhou: StripeConnectionError");
  });
});

describe("a busca da assinatura para o espelho", () => {
  const fim = 1_900_000_000;
  const inicio = fim - 30 * 24 * 60 * 60;
  const daStripe = (status: string, ultima: object) => ({ id: "sub_1", status, livemode: false, metadata: { userId: "u-1" }, customer: { id: "cus_1", metadata: {} }, pause_collection: null, latest_invoice: ultima, items: { data: [{ current_period_start: inicio, current_period_end: fim }] } });

  it("pede a assinatura com os PAGAMENTOS da última fatura — sem eles não há como saber da devolução", async () => {
    falsa.subscriptions.retrieve.mockResolvedValue(daStripe("active", fatura("in_1", 9990, [pago("pi_1")])));
    comCobrancas({ pi_1: { amount: 9990, amount_refunded: 0 } });
    expect((await buscarAssinatura("sub_1")).pagoAte?.getTime()).toBe(fim * 1000);
    expect(falsa.subscriptions.retrieve.mock.calls).toEqual([["sub_1", { expand: ["customer", "latest_invoice.payments"] }]]);
  });

  it("encerrada com a última fatura DEVOLVIDA POR INTEIRO: pago só até o começo do período — o acesso acaba", async () => {
    falsa.subscriptions.retrieve.mockResolvedValue(daStripe("canceled", fatura("in_1", 9990, [pago("pi_1")])));
    comCobrancas({ pi_1: { amount: 9990, amount_refunded: 9990 } });
    const assinatura = await buscarAssinatura("sub_1");
    expect([assinatura.status, assinatura.pagoAte?.getTime()]).toEqual(["canceled", inicio * 1000]);
  });

  it("encerrada SEM devolução (quem só parou a renovação e venceu): continua paga até o fim", async () => {
    falsa.subscriptions.retrieve.mockResolvedValue(daStripe("canceled", fatura("in_1", 9990, [pago("pi_1")])));
    comCobrancas({ pi_1: { amount: 9990, amount_refunded: 0 } });
    expect((await buscarAssinatura("sub_1")).pagoAte?.getTime()).toBe(fim * 1000);
  });

  it("a Stripe não conhece a assinatura; a leitura da cobrança que falha sobe (nada é gravado com dado pela metade)", async () => {
    falsa.subscriptions.retrieve.mockRejectedValue(recusa("resource_missing"));
    await expect(buscarAssinatura("sub_1")).rejects.toBeInstanceOf(AssinaturaNaoEncontrada);
    falsa.subscriptions.retrieve.mockResolvedValue(daStripe("canceled", fatura("in_1", 9990, [pago("pi_1")])));
    falsa.paymentIntents.retrieve.mockRejectedValue(foraDoAr());
    await expect(buscarAssinatura("sub_1")).rejects.toThrow("[stripe]");
  });
});

describe("de que assinatura é o pagamento (o aviso de dinheiro devolvido)", () => {
  it("pagamento → fatura → assinatura", async () => {
    falsa.invoicePayments.list.mockResolvedValue({ data: [{ invoice: { id: "in_1", parent: { subscription_details: { subscription: "sub_1" } } } }] });
    expect(await assinaturaDoPagamento("pi_1")).toBe("sub_1");
    expect(falsa.invoicePayments.list.mock.calls).toEqual([[{ payment: { type: "payment_intent", payment_intent: "pi_1" }, limit: 1, expand: ["data.invoice"] }]]);
  });

  it("pagamento que não é de fatura de assinatura, ou fatura que veio só com o id: nenhuma", async () => {
    falsa.invoicePayments.list.mockResolvedValue({ data: [] });
    expect(await assinaturaDoPagamento("pi_1")).toBeNull();
    falsa.invoicePayments.list.mockResolvedValue({ data: [{ invoice: "in_so_o_id" }] });
    expect(await assinaturaDoPagamento("pi_1")).toBeNull();
    falsa.invoicePayments.list.mockResolvedValue({ data: [{ invoice: { id: "in_1", parent: null } }] });
    expect(await assinaturaDoPagamento("pi_1")).toBeNull();
  });

  it("a Stripe fora do ar: sobe — o aviso não fica marcado, e ela entrega de novo", async () => {
    falsa.invoicePayments.list.mockRejectedValue(foraDoAr());
    await expect(assinaturaDoPagamento("pi_1")).rejects.toThrow("[stripe] a busca da assinatura do pagamento falhou: StripeConnectionError");
  });
});
