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
  invoices: { list: vi.fn(), voidInvoice: vi.fn(), retrieve: vi.fn() },
  invoicePayments: { list: vi.fn() },
  paymentIntents: { retrieve: vi.fn() },
  refunds: { create: vi.fn() },
  disputes: { retrieve: vi.fn() },
};
// A biblioteca falsa entra pela fábrica do cliente: é dela que saem TODAS as idas à Stripe,
// inclusive as do próprio `stripe.ts` (a busca da assinatura que alimenta o espelho).
vi.mock("./stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import { AssinaturaNaoEncontrada, buscarAssinatura } from "./stripe.js";
import { cobrancaDoPagamento, faturaDevolvida, periodoDevolvido, pixDevolvido } from "./stripe-devolucao.js";
import { aDevolver, assinaturaDoPagamento, buscarOQueFoiPago, buscarOQueFoiPagoNoPix, cancelarNaHora, cancelarPorContestacao, chaveDaDevolucao, devolver, encerrarParaOPix, idsDaMarca, juntarNaMarca, paraPedidoDeDevolucao, tirarMarcaDeContestacao } from "./stripe-reembolso.js";

const DONO = { userId: "u-1", assinaturaId: "sub_1" };
const recusa = (code: string) => new Stripe.errors.StripeInvalidRequestError({ message: "mensagem crua da Stripe, com sk_test_abc", type: "invalid_request_error", code, statusCode: 400 });
const foraDoAr = () => new Stripe.errors.StripeConnectionError({ message: "mensagem crua da Stripe, com sk_test_abc", type: "api_error" });
const pago = (pi: string) => ({ status: "paid", payment: { type: "payment_intent", payment_intent: pi } });
const fatura = (id: string, amount_paid: number, pagamentos: object[], status = "paid", created = 0) => ({ id, status, amount_paid, currency: "brl", created, payments: { data: pagamentos } });
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
  it("as faturas PAGAS desta assinatura, com a cobrança de cada pagamento — DA MAIS ANTIGA PARA A MAIS NOVA, que é a ordem de devolver", async () => {
    // A Stripe lista da mais nova para a mais antiga.
    falsa.invoices.list.mockResolvedValue({ data: [fatura("in_2", 89800, [pago("pi_2")], "paid", 200), fatura("in_1", 9990, [pago("pi_1")], "paid", 100)] });
    comCobrancas({ pi_1: { amount: 9990, amount_refunded: 0 }, pi_2: { amount: 89800, amount_refunded: 1000 } });
    expect(await buscarOQueFoiPago("sub_1")).toEqual({ moeda: "brl", pagamentos: [{ pagamentoId: "pi_1", centavos: 9990, devolvido: 0 }, { pagamentoId: "pi_2", centavos: 89800, devolvido: 1000 }] });
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

// A CONTESTAÇÃO (E7 da revisão ampla da cobrança, 30/10/2026): a marca ANTES do cancelamento (sem ela, a cancelada daria
// acesso até o fim do período), na hora, uma vez só pela mesma contestação (a marca, e a encerrada que não se cancela de
// novo), SEM chave de repetição (medido na prova do E14: com ela, a marca repetida devolvia a resposta guardada e o
// cancelamento repetido dava 404), e a fatura em aberto anulada depois.
describe("cancelar a assinatura contestada", () => {
  beforeEach(() => {
    falsa.subscriptions.retrieve.mockResolvedValue({ id: "sub_1", status: "active", metadata: {} });
  });

  it("primeiro a marca, depois o cancelamento NA HORA — sem crédito nem fatura nova, e sem chave de repetição", async () => {
    falsa.subscriptions.update.mockResolvedValue({ id: "sub_1", status: "active", latest_invoice: { id: "in_1", status: "paid" } });
    falsa.subscriptions.cancel.mockResolvedValue({ id: "sub_1", status: "canceled" });
    await cancelarPorContestacao("sub_1", "dp_1");
    expect(falsa.subscriptions.update.mock.calls).toEqual([["sub_1", { metadata: { contestacao: "dp_1" }, expand: ["latest_invoice"] }]]);
    expect(falsa.subscriptions.cancel.mock.calls).toEqual([["sub_1", { prorate: false, invoice_now: false, cancellation_details: { comment: "Contestação dp_1" } }]]);
    expect(falsa.subscriptions.update.mock.invocationCallOrder[0]).toBeLessThan(falsa.subscriptions.cancel.mock.invocationCallOrder[0] ?? 0);
    expect(falsa.invoices.voidInvoice).not.toHaveBeenCalled();
  });

  it("o aviso que volta depois de uma falha no meio: a marca de novo, com a resposta de AGORA — a já cancelada não se cancela de novo", async () => {
    falsa.subscriptions.update.mockResolvedValueOnce({ id: "sub_1", status: "active", latest_invoice: { id: "in_1", status: "paid" } }).mockResolvedValueOnce({ id: "sub_1", status: "canceled", latest_invoice: { id: "in_1", status: "paid" } });
    falsa.subscriptions.cancel.mockResolvedValue({ id: "sub_1", status: "canceled" });
    await cancelarPorContestacao("sub_1", "dp_1");
    await cancelarPorContestacao("sub_1", "dp_1");
    expect(falsa.subscriptions.update.mock.calls[0]).toEqual(falsa.subscriptions.update.mock.calls[1]);
    expect(falsa.subscriptions.cancel).toHaveBeenCalledTimes(1);
  });

  // A revisão de segurança do bloco 4 (P1): a marca guardava só a última — a segunda contestação apagava a primeira.
  it("a SEGUNDA contestação se junta à marca, sem apagar a primeira (e a mesma não se repete)", async () => {
    falsa.subscriptions.retrieve.mockResolvedValue({ id: "sub_1", status: "canceled", metadata: { contestacao: "dp_1" } });
    falsa.subscriptions.update.mockResolvedValue({ id: "sub_1", status: "canceled" });
    await cancelarPorContestacao("sub_1", "dp_2");
    await cancelarPorContestacao("sub_1", "dp_1");
    expect(falsa.subscriptions.update.mock.calls.map(([, pedido]) => (pedido as { metadata: { contestacao: string } }).metadata.contestacao)).toEqual(["dp_1,dp_2", "dp_1"]);
  });

  it("a já encerrada (a reentrega do aviso): só a marca, sem cancelar de novo", async () => {
    for (const status of ["canceled", "incomplete_expired"]) {
      falsa.subscriptions.update.mockResolvedValue({ id: "sub_1", status });
      await cancelarPorContestacao("sub_1", "dp_1");
    }
    expect(falsa.subscriptions.update).toHaveBeenCalledTimes(2);
    expect(falsa.subscriptions.cancel).not.toHaveBeenCalled();
  });

  it("a marca não foi gravada: nada se cancela, e a falha sobe sem a mensagem da Stripe", async () => {
    falsa.subscriptions.update.mockRejectedValue(foraDoAr());
    await expect(cancelarPorContestacao("sub_1", "dp_1")).rejects.toThrow(/o cancelamento da assinatura contestada/);
    await expect(cancelarPorContestacao("sub_1", "dp_1")).rejects.not.toThrow(/sk_test_abc/);
    expect(falsa.subscriptions.cancel).not.toHaveBeenCalled();
  });

  it("a marca gravou e o cancelamento falhou: a falha SOBE (o aviso volta), sem a mensagem da Stripe", async () => {
    falsa.subscriptions.update.mockResolvedValue({ id: "sub_1", status: "active", latest_invoice: { id: "in_1", status: "open" } });
    falsa.subscriptions.cancel.mockRejectedValue(foraDoAr());
    const falha: unknown = await cancelarPorContestacao("sub_1", "dp_1").catch((erro: unknown) => erro);
    if (!(falha instanceof Error)) throw new Error("o cancelamento devia falhar");
    expect(falha.message).toContain("o cancelamento da assinatura contestada");
    expect(falha.message).not.toContain("sk_test_abc");
    expect(falsa.invoices.voidInvoice).not.toHaveBeenCalled();
  });

  it("a atrasada: depois de cancelar, a fatura em aberto é anulada; se não der, é alerta — e o cancelamento vale", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    falsa.subscriptions.update.mockResolvedValue({ id: "sub_1", status: "past_due", latest_invoice: { id: "in_aberta", status: "open" } });
    falsa.subscriptions.cancel.mockResolvedValue({ id: "sub_1", status: "canceled" });
    falsa.invoices.voidInvoice.mockResolvedValue({ id: "in_aberta", status: "void" });
    await cancelarPorContestacao("sub_1", "dp_1");
    expect(falsa.invoices.voidInvoice).toHaveBeenCalledWith("in_aberta");
    expect(falsa.subscriptions.cancel.mock.invocationCallOrder[0]).toBeLessThan(falsa.invoices.voidInvoice.mock.invocationCallOrder[0] ?? 0);
    expect(erro).not.toHaveBeenCalled();

    falsa.invoices.voidInvoice.mockRejectedValue(foraDoAr());
    await expect(cancelarPorContestacao("sub_1", "dp_2")).resolves.toBeUndefined();
    expect(erro.mock.calls.flat().join(" ")).toContain("a cobrança em aberto NÃO foi anulada");
    erro.mockRestore();
  });
});

describe("a marca das contestações (revisão de segurança do bloco 4)", () => {
  it("juntar e ler: os ids separados por vírgula, sem repetir e sem vazio", () => {
    expect(juntarNaMarca(undefined, "dp_1")).toBe("dp_1");
    expect(juntarNaMarca("", "dp_1")).toBe("dp_1");
    expect(juntarNaMarca("dp_1", "dp_2")).toBe("dp_1,dp_2");
    expect(juntarNaMarca("dp_1,dp_2", "dp_1")).toBe("dp_1,dp_2");
    expect(idsDaMarca("dp_1,dp_2")).toEqual(["dp_1", "dp_2"]);
    expect(idsDaMarca("")).toEqual([]);
    expect(idsDaMarca(undefined)).toEqual([]);
  });

  it("liberar de novo: a marca SÓ sai com TODAS as contestações ganhas — com uma perdida ou sem decisão, nada muda", async () => {
    falsa.subscriptions.retrieve.mockResolvedValue({ id: "sub_1", status: "canceled", metadata: { contestacao: "dp_1,dp_2" } });
    falsa.disputes.retrieve.mockImplementation(async (id: string) => ({ id, status: id === "dp_1" ? "won" : "lost" }));
    expect(await tirarMarcaDeContestacao("sub_1")).toBe("outra-nao-ganha");
    falsa.disputes.retrieve.mockImplementation(async (id: string) => ({ id, status: id === "dp_1" ? "won" : "needs_response" }));
    expect(await tirarMarcaDeContestacao("sub_1")).toBe("outra-nao-ganha");
    expect(falsa.subscriptions.update).not.toHaveBeenCalled();
    falsa.disputes.retrieve.mockImplementation(async (id: string) => ({ id, status: "won" }));
    falsa.subscriptions.update.mockResolvedValue({ id: "sub_1" });
    expect(await tirarMarcaDeContestacao("sub_1")).toBe("tirada");
    expect(falsa.subscriptions.update.mock.calls).toEqual([["sub_1", { metadata: { contestacao: "" } }]]);
  });

  it("a leitura da marca falhou: sobe, sem a mensagem da Stripe, e nada muda", async () => {
    falsa.subscriptions.retrieve.mockRejectedValue(foraDoAr());
    await expect(tirarMarcaDeContestacao("sub_1")).rejects.toThrow(/a leitura da marca da contestação/);
    await expect(tirarMarcaDeContestacao("sub_1")).rejects.not.toThrow(/sk_test_abc/);
    expect(falsa.subscriptions.update).not.toHaveBeenCalled();
  });
});

// O PIX NA COBRANÇA ATRASADA (E14 da revisão ampla da cobrança, 30/10/2026): encerra NA HORA, sem crédito nem fatura nova,
// com o comentário que cala o "terminou" no MESMO pedido (achado P2 da revisão do grupo 4: nada de marca gravada antes).
describe("encerrar a atrasada para pagar com Pix", () => {
  it("um pedido só: o encerramento na hora, com o comentário — sem marca antes, sem chave de repetição, e a cobrança em aberto fica para quem chama", async () => {
    falsa.subscriptions.cancel.mockResolvedValue({ id: "sub_1", status: "canceled" });
    await encerrarParaOPix("sub_1");
    expect(falsa.subscriptions.cancel).toHaveBeenCalledWith("sub_1", { prorate: false, invoice_now: false, cancellation_details: { comment: "Trocada pelo Pix" } });
    expect(falsa.subscriptions.cancel.mock.calls[0]).toHaveLength(2);
    expect(falsa.subscriptions.update).not.toHaveBeenCalled();
    expect(falsa.invoices.voidInvoice).not.toHaveBeenCalled();
  });

  it("a Stripe falhou: a falha sobe sem a mensagem dela", async () => {
    falsa.subscriptions.cancel.mockRejectedValue(foraDoAr());
    await expect(encerrarParaOPix("sub_1")).rejects.toThrow(/o encerramento da assinatura atrasada para o Pix/);
    await expect(encerrarParaOPix("sub_1")).rejects.not.toThrow(/sk_test_abc/);
  });
});

describe("devolver um pagamento", () => {
  it("o pedido: o que FALTA voltar deste pagamento, a pedido do cliente, com de quem é", () => {
    expect(paraPedidoDeDevolucao({ pagamentoId: "pi_1", centavos: 9990, devolvido: 1000 }, DONO)).toEqual({ payment_intent: "pi_1", amount: 8990, reason: "requested_by_customer", metadata: { para: "reembolso", userId: "u-1", assinatura: "sub_1" } });
  });

  it("vai à Stripe com o pedido e a chave de repetição", async () => {
    falsa.refunds.create.mockResolvedValue({ id: "re_1", status: "succeeded" });
    const pagamento = { pagamentoId: "pi_1", centavos: 9990, devolvido: 0 };
    await devolver(pagamento, DONO);
    const [pedido, opcoes] = falsa.refunds.create.mock.calls[0] ?? [];
    expect(pedido).toEqual({ payment_intent: "pi_1", amount: 9990, reason: "requested_by_customer", metadata: { para: "reembolso", userId: "u-1", assinatura: "sub_1" } });
    expect(opcoes.idempotencyKey).toMatch(/^reembolso-pi_1-0-\d+$/);
  });

  it("a chave de repetição: a mesma para o pedido repetido em seguida; outra depois de 5 minutos (a Stripe guarda a FALHA de uma chave por um dia), para outro pagamento, ou com outro tanto já devolvido", () => {
    const pagamento = { pagamentoId: "pi_1", centavos: 9990, devolvido: 0 };
    const ao = new Date("2026-10-11T12:00:00Z");
    const chave = chaveDaDevolucao(pagamento, ao);
    expect(chaveDaDevolucao(pagamento, new Date(ao.getTime() + 4 * 60_000))).toBe(chave);
    expect(chaveDaDevolucao(pagamento, new Date(ao.getTime() + 5 * 60_000))).not.toBe(chave);
    expect(chaveDaDevolucao({ ...pagamento, pagamentoId: "pi_2" }, ao)).not.toBe(chave);
    expect(chaveDaDevolucao({ ...pagamento, devolvido: 1000 }, ao)).not.toBe(chave);
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
    // O código promocional também (o painel da cobrança, 4.7b — `stripe-espelho-rede.test.ts`).
    expect(falsa.subscriptions.retrieve.mock.calls).toEqual([["sub_1", { expand: ["customer", "latest_invoice.payments", "discounts.promotion_code"] }]]);
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

  // A PRÉ-PAGA (etapa 4.9, passo 3): a fatura dela foi paga POR FORA (sem pagamento para ler); quem diz se o
  // período foi devolvido é o PIX dos metadados.
  it("a PRÉ-PAGA: o período devolvido é o do Pix de que ela nasceu — a fatura paga por fora não tem pagamento", async () => {
    const prePaga = (status: string) => ({ ...daStripe(status, fatura("in_1", 9990, [])), metadata: { userId: "u-1", pix_payment_intent: "pi_pix" } });
    falsa.subscriptions.retrieve.mockResolvedValue(prePaga("canceled"));
    comCobrancas({ pi_pix: { amount: 9990, amount_refunded: 9990 } });
    const devolvida = await buscarAssinatura("sub_1");
    expect([devolvida.status, devolvida.pagoAte?.getTime(), devolvida.pixPaymentIntentId]).toEqual(["canceled", inicio * 1000, "pi_pix"]);
    expect(falsa.paymentIntents.retrieve.mock.calls).toEqual([["pi_pix", { expand: ["latest_charge"] }]]);

    falsa.subscriptions.retrieve.mockResolvedValue(prePaga("active"));
    comCobrancas({ pi_pix: { amount: 9990, amount_refunded: 0 } });
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

// A PRÉ-PAGA (etapa 4.9, passo 3): o que foi pago é o Pix de que ela nasceu — é dele que o reembolso devolve.
describe("o que foi pago numa pré-paga (o Pix)", () => {
  it("o Pix: quanto cobrou, quanto já voltou e a moeda — um pagamento só", async () => {
    falsa.paymentIntents.retrieve.mockResolvedValue({ id: "pi_pix", latest_charge: { amount: 9990, amount_refunded: 1000, currency: "brl" } });
    expect(await buscarOQueFoiPagoNoPix("pi_pix")).toEqual({ moeda: "brl", pagamentos: [{ pagamentoId: "pi_pix", centavos: 9990, devolvido: 1000 }] });
    expect(falsa.paymentIntents.retrieve.mock.calls).toEqual([["pi_pix", { expand: ["latest_charge"] }]]);
  });

  it("sem cobrança (o Pix não caiu): nada foi pago; a leitura que falha sobe, sem a mensagem da Stripe", async () => {
    falsa.paymentIntents.retrieve.mockResolvedValue({ id: "pi_pix", latest_charge: null });
    expect(await buscarOQueFoiPagoNoPix("pi_pix")).toEqual({ moeda: null, pagamentos: [] });
    falsa.paymentIntents.retrieve.mockRejectedValue(foraDoAr());
    await expect(buscarOQueFoiPagoNoPix("pi_pix")).rejects.toThrow("[stripe] a leitura da cobrança do Pix falhou: StripeConnectionError");
  });

  it("o Pix devolvido por inteiro — e só por inteiro — deixa de contar como pago; o período da recorrente continua pela fatura", async () => {
    comCobrancas({ pi_pix: { amount: 9990, amount_refunded: 9990 }, pi_meio: { amount: 9990, amount_refunded: 5000 }, pi_1: { amount: 9990, amount_refunded: 9990 } });
    expect(await pixDevolvido("pi_pix")).toBe(true);
    expect(await pixDevolvido("pi_meio")).toBe(false);
    // Seguro: só a última fatura é lida aqui (o dublê tem o formato que `faturaDevolvida` usa).
    const comFatura = { latest_invoice: fatura("in_1", 9990, [pago("pi_1")]) } as unknown as Stripe.Subscription;
    expect(await periodoDevolvido(comFatura, "pi_meio")).toBe(false);
    expect(await periodoDevolvido(comFatura, null)).toBe(true);
  });
});
