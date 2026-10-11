import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";

// MUDAR DE PLANO NA STRIPE (Fase 4, etapa 4.6, sessão b) — com a biblioteca dela trocada por um
// dublê do tamanho exato do que estas funções usam; elas rodam de verdade, só a rede é dublê.
// O que protege, e é COBRANÇA:
//   - o valor mostrado é o cobrado: a prévia e a troca vão com o MESMO pedido e o mesmo instante;
//   - a troca na hora só vale se o pagamento passar — e só o pagamento que pede a confirmação do
//     banco fica esperando; o recusado nunca fica para ser cobrado depois;
//   - a troca marcada não muda nada até o fim do período pago, e leva o desconto junto;
//   - um agendamento pela metade nunca fica preso à assinatura.
const falsa = {
  subscriptions: { update: vi.fn() },
  invoices: { createPreview: vi.fn(), retrieve: vi.fn(), voidInvoice: vi.fn() },
  prices: { retrieve: vi.fn() },
  subscriptionSchedules: { create: vi.fn(), update: vi.fn(), release: vi.fn() },
};
vi.mock("./stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import { MARCA_DA_TROCA, agendarTroca, anularFatura, calcularTroca, paraFasesDaTroca, paraPedidoDeCobrar, paraPedidoDeTroca, segredoDaFatura, situacaoDoPagamento, soltarAgendamento, trocarAgora } from "./stripe-plano.js";

const TROCA = { assinaturaId: "sub_1", itemId: "si_1", precoId: "price_anual" };
// O PERÍODO RECOMEÇA NO DIA DA TROCA (decisão do operador, 11/10/2026): é o `billing_cycle_anchor`,
// e nesta versão da Stripe ele é um objeto. Sem `proration_date`: com o período recomeçando, a
// Stripe recusa o pedido que traz o instante da conta (medido na área restrita).
const PEDIDO = { items: [{ id: "si_1", price: "price_anual" }], proration_behavior: "always_invoice", billing_cycle_anchor: { type: "now" } };
const recusa = (code?: string) => new Stripe.errors.StripeInvalidRequestError({ message: "mensagem crua da Stripe, com sk_test_abc", type: "invalid_request_error", code, statusCode: 400 });
const cartaoRecusado = () => new Stripe.errors.StripeCardError({ message: "Your card was declined, com sk_test_abc", type: "card_error", code: "card_declined", statusCode: 402 });
const foraDoAr = () => new Stripe.errors.StripeConnectionError({ message: "mensagem crua da Stripe, com sk_test_abc", type: "api_error" });
const comPagamento = (status: string) => falsa.invoices.retrieve.mockResolvedValue({ id: "in_troca", status: "open", payments: { data: [{ payment: { type: "payment_intent", payment_intent: { id: "pi_1", status } } }] } });
const pendente = (fatura: object | string | null) => ({ id: "sub_1", pending_update: { expires_at: 1 }, latest_invoice: fatura });

beforeEach(() => {
  for (const grupo of Object.values(falsa)) for (const dublê of Object.values(grupo)) dublê.mockReset();
});

describe("a troca na hora: o pedido", () => {
  it("troca o preço do item, cobra a diferença AGORA e faz o período do plano novo começar no dia da troca — sem instante fixado", () => {
    expect(paraPedidoDeTroca(TROCA)).toEqual(PEDIDO);
  });
});

// COBRAR EXATAMENTE O VALOR MOSTRADO (decisão do operador, 11/10/2026). O plano novo entra cheio,
// SEM a conta por tempo da Stripe (que já não é a da tela), e o desconto é uma linha de crédito
// de valor fixo — fora do alcance do cupom da assinatura (medido: sem `discountable: false`, um
// cupom de 50% corta o crédito pela metade, e a cobrança sai acima do mostrado).
const CHEIO = { items: [{ id: "si_1", price: "price_anual" }], proration_behavior: "none", billing_cycle_anchor: { type: "now" } };
const CREDITO = [{ price_data: { currency: "brl", product: "prod_1", unit_amount: -9990 }, quantity: 1, discountable: false }];

describe("a troca na hora: o pedido que cobra", () => {
  it("sem crédito: o plano novo cheio, o período começando no dia da troca, e nenhuma conta por tempo", () => {
    expect(paraPedidoDeCobrar(TROCA, null)).toEqual(CHEIO);
  });

  it("com crédito: UMA linha de valor fixo e negativo, no produto dado, que o cupom não alcança", () => {
    expect(paraPedidoDeCobrar(TROCA, { centavos: 9990, moeda: "brl", produtoId: "prod_1" })).toEqual({ ...CHEIO, add_invoice_items: CREDITO });
  });
});

describe("a prévia da troca na hora", () => {
  it("a conta é da Stripe, com o MESMO pedido da troca: quanto se paga hoje e quando é a cobrança seguinte", async () => {
    falsa.invoices.createPreview.mockResolvedValue({ amount_due: 89510, total: 99500, currency: "brl", lines: { data: [{ period: { start: 1_800_000_500, end: 1_802_592_000 } }, { period: { start: 1_800_000_500, end: 1_831_536_500 } }] } });
    expect(await calcularTroca(TROCA)).toEqual({ centavosHoje: 89510, moeda: "brl", proximaEm: new Date(1_831_536_500 * 1000) });
    expect(falsa.invoices.createPreview.mock.calls).toEqual([[{ subscription: "sub_1", subscription_details: PEDIDO }]]);
  });

  it("sem linhas: sem a data da cobrança seguinte; a Stripe fora do ar sobe, sem a mensagem dela", async () => {
    falsa.invoices.createPreview.mockResolvedValue({ amount_due: 0, currency: "brl", lines: { data: [] } });
    expect((await calcularTroca(TROCA)).proximaEm).toBeNull();
    falsa.invoices.createPreview.mockRejectedValue(foraDoAr());
    await expect(calcularTroca(TROCA)).rejects.toThrow("[stripe] a prévia da troca de plano falhou: StripeConnectionError");
    await expect(calcularTroca(TROCA)).rejects.not.toThrow(/sk_test/);
  });
});

describe("trocar o plano na hora", () => {
  beforeEach(() => {
    // O plano novo cheio dá R$ 995,00 (a conta da "Stripe"), e o preço é do produto prod_1.
    falsa.invoices.createPreview.mockResolvedValue({ amount_due: 99500, currency: "brl" });
    falsa.prices.retrieve.mockResolvedValue({ id: "price_anual", product: "prod_1" });
  });

  it("cobra EXATAMENTE o valor dado: o plano novo cheio menos um crédito do tamanho da diferença — e a assinatura SÓ muda se o pagamento passar", async () => {
    falsa.subscriptions.update.mockResolvedValue({ id: "sub_1", pending_update: null, latest_invoice: { id: "in_1", status: "paid", billing_reason: "subscription_update", amount_due: 89510 } });
    expect(await trocarAgora(TROCA, 89510)).toEqual({ estado: "trocado" });
    // 995,00 − 895,10 = 99,90 de crédito.
    expect(falsa.invoices.createPreview.mock.calls).toEqual([[{ subscription: "sub_1", subscription_details: CHEIO }]]);
    expect(falsa.prices.retrieve.mock.calls).toEqual([["price_anual"]]);
    expect(falsa.subscriptions.update.mock.calls).toEqual([["sub_1", { ...CHEIO, add_invoice_items: CREDITO, payment_behavior: "pending_if_incomplete", expand: ["latest_invoice.confirmation_secret"] }]]);
    expect(falsa.invoices.retrieve).not.toHaveBeenCalled();
  });

  it("o valor a cobrar é o plano cheio (a cortesia a R$ 0, ou nada sobrando do mês): sem linha de crédito nenhuma", async () => {
    falsa.subscriptions.update.mockResolvedValue({ id: "sub_1", pending_update: null, latest_invoice: null });
    await trocarAgora(TROCA, 99500);
    falsa.invoices.createPreview.mockResolvedValue({ amount_due: 0, currency: "brl" });
    await trocarAgora(TROCA, 0);
    expect(falsa.subscriptions.update.mock.calls.map((chamada) => "add_invoice_items" in chamada[1])).toEqual([false, false]);
  });

  it("NUNCA cobra mais que o plano novo inteiro: o valor acima dele é recusado antes de ir à Stripe", async () => {
    await expect(trocarAgora(TROCA, 99501)).rejects.toThrow("o valor a cobrar (99501) é maior que o plano novo inteiro (99500)");
    expect(falsa.subscriptions.update).not.toHaveBeenCalled();
  });

  it("a Stripe fora do ar ao fazer a conta do plano novo: sobe, sem a mensagem dela — e nada é trocado", async () => {
    falsa.invoices.createPreview.mockRejectedValue(foraDoAr());
    await expect(trocarAgora(TROCA, 89510)).rejects.toThrow("[stripe] a conta do plano novo falhou: StripeConnectionError");
    expect(falsa.subscriptions.update).not.toHaveBeenCalled();
  });

  // A REDE DE SEGURANÇA: se um dia a fatura não der o valor mostrado (um imposto por cima, uma
  // regra nova da Stripe), ninguém confirma no banco um valor que não leu.
  it("a fatura da troca saiu com OUTRO valor e ainda espera o banco: é anulada, e a troca falha dizendo que nada foi cobrado", async () => {
    falsa.subscriptions.update.mockResolvedValue(pendente({ id: "in_troca", status: "open", billing_reason: "subscription_update", amount_due: 89511, confirmation_secret: { client_secret: "pi_1_secret_x" } }));
    falsa.invoices.voidInvoice.mockResolvedValue({ id: "in_troca", status: "void" });
    await expect(trocarAgora(TROCA, 89510)).rejects.toThrow("a fatura saiu com 89511 centavos e o valor mostrado era 89510 — nada foi cobrado");
    expect(falsa.invoices.voidInvoice.mock.calls).toEqual([["in_troca"]]);
  });

  it("a fatura da troca saiu com outro valor e JÁ foi cobrada: alguém é avisado, com os dois valores — e a troca valeu", async () => {
    falsa.subscriptions.update.mockResolvedValue({ id: "sub_1", pending_update: null, latest_invoice: { id: "in_1", status: "paid", billing_reason: "subscription_update", amount_due: 89511 } });
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await trocarAgora(TROCA, 89510)).toEqual({ estado: "trocado" });
      expect(erro.mock.calls.flat().join(" ")).toContain("[stripe] mudar de plano: a assinatura sub_1 foi cobrada em 89511 centavos, e o valor mostrado era 89510");
    } finally {
      erro.mockRestore();
    }
  });

  it("a fatura no valor certo, ou a última fatura que não é a da troca: ninguém é incomodado", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      falsa.subscriptions.update.mockResolvedValue({ id: "sub_1", pending_update: null, latest_invoice: { id: "in_1", status: "paid", billing_reason: "subscription_update", amount_due: 89510 } });
      await trocarAgora(TROCA, 89510);
      falsa.subscriptions.update.mockResolvedValue({ id: "sub_1", pending_update: null, latest_invoice: { id: "in_0", status: "paid", billing_reason: "subscription_cycle", amount_due: 9990 } });
      await trocarAgora(TROCA, 89510);
      expect(erro).not.toHaveBeenCalled();
      expect(falsa.invoices.voidInvoice).not.toHaveBeenCalled();
    } finally {
      erro.mockRestore();
    }
  });

  it("o banco pede confirmação: a troca fica esperando, com o segredo para o site completar", async () => {
    falsa.subscriptions.update.mockResolvedValue(pendente({ id: "in_troca", status: "open", confirmation_secret: { client_secret: "pi_1_secret_x" } }));
    comPagamento("requires_action");
    expect(await trocarAgora(TROCA, 89510)).toEqual({ estado: "confirmar", segredo: "pi_1_secret_x", faturaId: "in_troca" });
    expect(falsa.invoices.retrieve.mock.calls).toEqual([["in_troca", { expand: ["payments.data.payment.payment_intent"] }]]);
  });

  it("cartão RECUSADO (a mesma forma de resposta, com outro pagamento): recusado, com a fatura a anular", async () => {
    falsa.subscriptions.update.mockResolvedValue(pendente({ id: "in_troca", status: "open", confirmation_secret: { client_secret: "pi_1_secret_x" } }));
    comPagamento("requires_payment_method");
    expect(await trocarAgora(TROCA, 89510)).toEqual({ estado: "recusado", faturaId: "in_troca" });
  });

  it("na dúvida é recusa — sem segredo, pagamento que não se sabe, fatura que veio só com o id: nada fica esperando para ser cobrado", async () => {
    falsa.subscriptions.update.mockResolvedValue(pendente({ id: "in_troca", status: "open", confirmation_secret: null }));
    comPagamento("requires_action");
    expect(await trocarAgora(TROCA, 89510)).toEqual({ estado: "recusado", faturaId: "in_troca" });
    falsa.subscriptions.update.mockResolvedValue(pendente({ id: "in_troca", status: "open", confirmation_secret: { client_secret: "pi_1_secret_x" } }));
    falsa.invoices.retrieve.mockResolvedValue({ id: "in_troca", payments: { data: [] } });
    expect(await trocarAgora(TROCA, 89510)).toEqual({ estado: "recusado", faturaId: "in_troca" });
    falsa.subscriptions.update.mockResolvedValue(pendente("in_so_o_id"));
    expect(await trocarAgora(TROCA, 89510)).toEqual({ estado: "recusado", faturaId: "in_so_o_id" });
    falsa.subscriptions.update.mockResolvedValue(pendente(null));
    expect(await trocarAgora(TROCA, 89510)).toEqual({ estado: "recusado", faturaId: null });
  });

  it("nem ler o pagamento deu (a troca pendente e a fatura JÁ existem): é recusa, com a fatura a anular — o erro não sobe deixando a fatura em aberto", async () => {
    falsa.subscriptions.update.mockResolvedValue(pendente({ id: "in_troca", status: "open", confirmation_secret: { client_secret: "pi_1_secret_x" } }));
    falsa.invoices.retrieve.mockRejectedValue(foraDoAr());
    expect(await trocarAgora(TROCA, 89510)).toEqual({ estado: "recusado", faturaId: "in_troca" });
  });

  it("a recusa do cartão que vem como erro: o mesmo desfecho; qualquer outro erro sobe, sem a mensagem da Stripe", async () => {
    falsa.subscriptions.update.mockRejectedValue(cartaoRecusado());
    expect(await trocarAgora(TROCA, 89510)).toEqual({ estado: "recusado", faturaId: null });
    falsa.subscriptions.update.mockRejectedValue(foraDoAr());
    await expect(trocarAgora(TROCA, 89510)).rejects.toThrow("[stripe] a troca de plano falhou: StripeConnectionError");
  });

  it("a situação do pagamento: a do pagamento da fatura; sem pagamento, nada; a leitura que falha sobe", async () => {
    comPagamento("requires_action");
    expect(await situacaoDoPagamento("in_troca")).toBe("requires_action");
    falsa.invoices.retrieve.mockResolvedValue({ id: "in_troca", payments: { data: [{ payment: { type: "payment_intent", payment_intent: "pi_so_o_id" } }] } });
    expect(await situacaoDoPagamento("in_troca")).toBeNull();
    falsa.invoices.retrieve.mockRejectedValue(foraDoAr());
    await expect(situacaoDoPagamento("in_troca")).rejects.toThrow("[stripe] a leitura do pagamento da troca falhou");
  });
});

describe("anular a fatura da troca que não se completou", () => {
  it("anula a fatura certa", async () => {
    falsa.invoices.voidInvoice.mockResolvedValue({ id: "in_troca", status: "void" });
    expect(await anularFatura("in_troca")).toBe("anulada");
    expect(falsa.invoices.voidInvoice.mock.calls).toEqual([["in_troca"]]);
  });

  it("já não estava aberta: quem diz é a fatura, relida — anulada conta como feito; PAGA quer dizer que a troca se completou", async () => {
    falsa.invoices.voidInvoice.mockRejectedValue(recusa());
    falsa.invoices.retrieve.mockResolvedValue({ id: "in_troca", status: "void" });
    expect(await anularFatura("in_troca")).toBe("anulada");
    falsa.invoices.retrieve.mockResolvedValue({ id: "in_troca", status: "paid" });
    expect(await anularFatura("in_troca")).toBe("paga");
  });

  it("não anulou e a fatura segue aberta, ou a Stripe está fora do ar: sobe — nunca 'anulada'", async () => {
    falsa.invoices.voidInvoice.mockRejectedValue(recusa());
    falsa.invoices.retrieve.mockResolvedValue({ id: "in_troca", status: "open" });
    await expect(anularFatura("in_troca")).rejects.toThrow("[stripe] a anulação da fatura da troca falhou");
    falsa.invoices.voidInvoice.mockRejectedValue(foraDoAr());
    await expect(anularFatura("in_troca")).rejects.toThrow("StripeConnectionError");
  });
});

describe("o segredo da fatura em aberto (o banco pediu confirmação)", () => {
  it("o da fatura pedida — ou nenhum", async () => {
    falsa.invoices.retrieve.mockResolvedValue({ id: "in_1", confirmation_secret: { client_secret: "pi_9_secret_y" } });
    expect(await segredoDaFatura("in_1")).toBe("pi_9_secret_y");
    expect(falsa.invoices.retrieve.mock.calls).toEqual([["in_1", { expand: ["confirmation_secret"] }]]);
    falsa.invoices.retrieve.mockResolvedValue({ id: "in_1", confirmation_secret: null });
    expect(await segredoDaFatura("in_1")).toBeNull();
  });
});

describe("a troca marcada para o fim do período: as fases", () => {
  // Seguro: só os campos que a função lê; a forma completa é da Stripe.
  const fase = (extra: object = {}) => ({ start_date: 100, end_date: 200, items: [{ price: "price_anual", quantity: 1 }], discounts: [], ...extra }) as unknown as Stripe.SubscriptionSchedule.Phase;

  it("a fase de hoje, igual ao que a assinatura já é, até o fim do período pago — e a do plano novo, por um mês", () => {
    expect(paraFasesDaTroca(fase(), "price_mensal")).toEqual([
      { items: [{ price: "price_anual", quantity: 1 }], start_date: 100, end_date: 200, discounts: [] },
      { items: [{ price: "price_mensal", quantity: 1 }], duration: { interval: "month", interval_count: 1 }, discounts: [] },
    ]);
  });

  it("o DESCONTO vai nas duas fases: sem isso a cortesia viraria cobrança", () => {
    const fases = paraFasesDaTroca(fase({ discounts: [{ coupon: "cupom_100", discount: null, promotion_code: null }, { coupon: null, discount: { id: "di_1" }, promotion_code: null }, { coupon: null, discount: null, promotion_code: "promo_1" }] }), "price_mensal");
    const esperado = [{ coupon: "cupom_100" }, { discount: "di_1" }, { promotion_code: "promo_1" }];
    expect(fases.map((f) => f.discounts)).toEqual([esperado, esperado]);
  });

  it("o preço da fase que veio inteiro (e não só o id) também serve", () => {
    expect(paraFasesDaTroca(fase({ items: [{ price: { id: "price_anual" }, quantity: null }] }), "price_mensal")[0]?.items).toEqual([{ price: "price_anual", quantity: 1 }]);
  });
});

describe("marcar a troca para o fim do período", () => {
  const criado = { id: "sub_sched_1", phases: [{ start_date: 100, end_date: 200, items: [{ price: "price_anual", quantity: 1 }], discounts: [] }] };

  it("cria o agendamento A PARTIR DA ASSINATURA e põe a segunda fase — sem cobrar nada agora; devolve quando vale", async () => {
    falsa.subscriptionSchedules.create.mockResolvedValue(criado);
    falsa.subscriptionSchedules.update.mockResolvedValue({ id: "sub_sched_1" });
    expect(await agendarTroca("sub_1", "price_mensal")).toEqual(new Date(200_000));
    expect(falsa.subscriptionSchedules.create.mock.calls).toEqual([[{ from_subscription: "sub_1" }]]);
    const [id, pedido] = falsa.subscriptionSchedules.update.mock.calls[0] ?? [];
    expect(id).toBe("sub_sched_1");
    expect(pedido).toMatchObject({ end_behavior: "release", proration_behavior: "none" });
    expect(pedido.phases.map((f: { items: { price: string }[] }) => f.items[0]?.price)).toEqual(["price_anual", "price_mensal"]);
    // A MARCA de que este agendamento é da escola: só o que a leva é solto pelas operações do aluno.
    expect(pedido.metadata).toEqual({ para: MARCA_DA_TROCA });
    expect(MARCA_DA_TROCA).toBe("troca-de-plano");
  });

  it("a segunda ida falhou: o agendamento pela metade é SOLTO (ele impediria parar a renovação), e a falha sobe", async () => {
    falsa.subscriptionSchedules.create.mockResolvedValue(criado);
    falsa.subscriptionSchedules.update.mockRejectedValue(foraDoAr());
    falsa.subscriptionSchedules.release.mockResolvedValue({ id: "sub_sched_1", status: "released" });
    await expect(agendarTroca("sub_1", "price_mensal")).rejects.toThrow("[stripe] o agendamento da troca falhou: StripeConnectionError");
    expect(falsa.subscriptionSchedules.release.mock.calls).toEqual([["sub_sched_1"]]);
  });

  it("nem soltar deu: alguém é avisado, com a assinatura", async () => {
    falsa.subscriptionSchedules.create.mockResolvedValue(criado);
    falsa.subscriptionSchedules.update.mockRejectedValue(foraDoAr());
    falsa.subscriptionSchedules.release.mockRejectedValue(foraDoAr());
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(agendarTroca("sub_1", "price_mensal")).rejects.toThrow("[stripe]");
      expect(erro.mock.calls.flat().join(" ")).toContain("[stripe] mudar de plano: o agendamento pela metade da assinatura sub_1 não foi solto");
    } finally {
      erro.mockRestore();
    }
  });

  it("não criou: sobe, e nada é solto; desistir solta o agendamento certo", async () => {
    falsa.subscriptionSchedules.create.mockRejectedValue(foraDoAr());
    await expect(agendarTroca("sub_1", "price_mensal")).rejects.toThrow("[stripe] a criação do agendamento da troca falhou");
    expect(falsa.subscriptionSchedules.release).not.toHaveBeenCalled();
    falsa.subscriptionSchedules.release.mockResolvedValue({ id: "sub_sched_1", status: "released" });
    await soltarAgendamento("sub_sched_1");
    expect(falsa.subscriptionSchedules.release.mock.calls).toEqual([["sub_sched_1"]]);
    falsa.subscriptionSchedules.release.mockRejectedValue(foraDoAr());
    await expect(soltarAgendamento("sub_sched_1")).rejects.toThrow("[stripe] a soltura do agendamento da troca falhou");
  });
});
