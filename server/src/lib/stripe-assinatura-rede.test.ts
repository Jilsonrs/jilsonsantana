import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";

// AS IDAS À STRIPE PARA GERIR A ASSINATURA (Fase 4, etapa 4.6) — com a biblioteca dela trocada
// por um dublê do tamanho exato do que estas funções usam. Existe porque os testes de rota
// simulam ESTAS funções inteiras (achado da revisão de segurança, 11/10/2026): sem isto, trocar o
// corpo de uma delas — tirar o filtro do cliente, ignorar a escolha do cartão, tratar toda recusa
// como "não pagou" — passava a suíte inteira. Aqui elas rodam de verdade; só a rede é dublê.
const falsa = {
  subscriptions: { retrieve: vi.fn(), update: vi.fn() },
  invoices: { createPreview: vi.fn(), pay: vi.fn(), retrieve: vi.fn() },
  setupIntents: { create: vi.fn(), list: vi.fn() },
  paymentMethods: { detach: vi.fn() },
  customers: { listPaymentMethods: vi.fn() },
};
vi.mock("./stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stripe.js")>()),
  stripe: () => falsa,
}));

import { AssinaturaNaoEncontrada } from "./stripe.js";
import { buscarCartaoConfirmado, buscarDetalhes, buscarProximaCobranca, criarPedidoDeCartao, definirCartao, pagarFatura, pararRenovacao, retomarRenovacao, soltarOutrosCartoes } from "./stripe-assinatura.js";

const PEDIDO = { clienteId: "cus_1", userId: "u-1", assinaturaId: "sub_1" };
const recusaDoPedido = (code: string) => new Stripe.errors.StripeInvalidRequestError({ message: "mensagem crua da Stripe, com sk_test_abc", type: "invalid_request_error", code, statusCode: 400 });
const foraDoAr = () => new Stripe.errors.StripeConnectionError({ message: "mensagem crua da Stripe, com sk_test_abc", type: "api_error" });

beforeEach(() => {
  for (const grupo of Object.values(falsa)) for (const dublê of Object.values(grupo)) dublê.mockReset();
});

describe("buscar os detalhes da assinatura", () => {
  it("pede a fatura, o cartão da assinatura e o padrão do cliente — sem eles a tela não teria cartão nem 'pago até'", async () => {
    falsa.subscriptions.retrieve.mockRejectedValue(recusaDoPedido("resource_missing"));
    await expect(buscarDetalhes("sub_1")).rejects.toBeInstanceOf(AssinaturaNaoEncontrada);
    expect(falsa.subscriptions.retrieve.mock.calls).toEqual([["sub_1", { expand: ["latest_invoice", "default_payment_method", "customer.invoice_settings.default_payment_method"] }]]);
  });

  it("a Stripe fora do ar: sobe, sem a mensagem dela", async () => {
    falsa.subscriptions.retrieve.mockRejectedValue(foraDoAr());
    await expect(buscarDetalhes("sub_1")).rejects.toThrow("[stripe] a busca dos detalhes da assinatura falhou: StripeConnectionError");
    await expect(buscarDetalhes("sub_1")).rejects.not.toThrow(/sk_test/);
  });
});

describe("a próxima cobrança", () => {
  it("é o que a fatura seguinte vai COBRAR (já com o saldo), desta assinatura", async () => {
    falsa.invoices.createPreview.mockResolvedValue({ total: 9990, amount_due: 4990, currency: "brl" });
    expect(await buscarProximaCobranca("sub_1")).toEqual({ centavos: 4990, moeda: "brl" });
    expect(falsa.invoices.createPreview.mock.calls).toEqual([[{ subscription: "sub_1" }]]);
  });

  it("sem próxima fatura (não renova): nada; qualquer outra recusa sobe", async () => {
    falsa.invoices.createPreview.mockRejectedValue(recusaDoPedido("invoice_upcoming_none"));
    expect(await buscarProximaCobranca("sub_1")).toBeNull();
    falsa.invoices.createPreview.mockRejectedValue(recusaDoPedido("resource_missing"));
    await expect(buscarProximaCobranca("sub_1")).rejects.toThrow("[stripe] a prévia da próxima cobrança falhou");
  });
});

describe("o pedido de guardar cartão", () => {
  it("vai à Stripe com o cliente, a conta e a assinatura, e devolve o segredo", async () => {
    falsa.setupIntents.create.mockResolvedValue({ id: "seti_1", client_secret: "seti_1_secret_x" });
    expect(await criarPedidoDeCartao(PEDIDO)).toBe("seti_1_secret_x");
    expect(falsa.setupIntents.create.mock.calls[0]?.[0]).toMatchObject({ customer: "cus_1", metadata: { para: "trocar-cartao", userId: "u-1", assinatura: "sub_1" } });
  });

  it("veio sem segredo: falha, em vez de mandar a tela confirmar o nada", async () => {
    falsa.setupIntents.create.mockResolvedValue({ id: "seti_1", client_secret: null });
    await expect(criarPedidoDeCartao(PEDIDO)).rejects.toThrow("sem segredo");
  });
});

describe("o cartão confirmado, lido na Stripe", () => {
  const agora = Math.floor(Date.now() / 1000);
  const guardado = (forma: string, userId: string) => ({ id: `seti_${forma}`, status: "succeeded", customer: "cus_1", created: agora - 60, payment_method: forma, metadata: { para: "trocar-cartao", userId, assinatura: "sub_1" } });

  it("lista só os pedidos DESTE cliente, e a escolha passa pelo crivo da conta e da assinatura", async () => {
    // O primeiro da lista é de outra conta: "o primeiro que vier" daria o cartão errado.
    falsa.setupIntents.list.mockResolvedValue({ data: [guardado("pm_de_outra_conta", "u-outro"), guardado("pm_certo", "u-1")] });
    expect(await buscarCartaoConfirmado(PEDIDO)).toBe("pm_certo");
    expect(falsa.setupIntents.list.mock.calls).toEqual([[{ customer: "cus_1", limit: 10 }]]);
  });

  it("nenhum que sirva: nenhum cartão", async () => {
    falsa.setupIntents.list.mockResolvedValue({ data: [guardado("pm_de_outra_conta", "u-outro")] });
    expect(await buscarCartaoConfirmado(PEDIDO)).toBeNull();
  });
});

describe("pôr e tirar o cartão", () => {
  it("o cartão vai para ESTA assinatura, e a resposta é só o que a tela mostra", async () => {
    falsa.subscriptions.update.mockResolvedValue({ default_payment_method: { id: "pm_novo", card: { brand: "visa", last4: "4242", exp_month: 3, exp_year: 2028 } } });
    expect(await definirCartao("sub_1", "pm_novo")).toEqual({ bandeira: "visa", final: "4242", mes: 3, ano: 2028 });
    expect(falsa.subscriptions.update.mock.calls).toEqual([["sub_1", { default_payment_method: "pm_novo", expand: ["default_payment_method"] }]]);
  });

});

// TIRAR OS CARTÕES ANTIGOS (abertura do passo 7). O que protege: sai TUDO o que é do cliente,
// menos o cartão que acabou de entrar — tirar esse deixaria a assinatura sem ter o que cobrar.
describe("tirar da Stripe todos os cartões do cliente, menos o novo", () => {
  const cartoes = (...ids: string[]) => ({ data: ids.map((id) => ({ id })) });

  it("lista os cartões DESTE cliente e tira todos os outros — o novo fica", async () => {
    falsa.customers.listPaymentMethods.mockResolvedValue(cartoes("pm_novo", "pm_antigo", "pm_esquecido"));
    falsa.paymentMethods.detach.mockResolvedValue({});
    expect(await soltarOutrosCartoes("cus_1", "pm_novo")).toBe(2);
    expect(falsa.customers.listPaymentMethods.mock.calls).toEqual([["cus_1", { type: "card", limit: 100 }]]);
    expect(falsa.paymentMethods.detach.mock.calls).toEqual([["pm_antigo"], ["pm_esquecido"]]);
  });

  it("só existe o novo: não tira nada", async () => {
    falsa.customers.listPaymentMethods.mockResolvedValue(cartoes("pm_novo"));
    expect(await soltarOutrosCartoes("cus_1", "pm_novo")).toBe(0);
    expect(falsa.paymentMethods.detach).not.toHaveBeenCalled();
  });

  it("sem saber de quem ou qual manter: falha, sem listar nem tirar nada", async () => {
    await expect(soltarOutrosCartoes("cus_1", "")).rejects.toThrow("sem o cliente ou sem o cartão a manter");
    await expect(soltarOutrosCartoes("", "pm_novo")).rejects.toThrow("sem o cliente ou sem o cartão a manter");
    expect(falsa.customers.listPaymentMethods).not.toHaveBeenCalled();
    expect(falsa.paymentMethods.detach).not.toHaveBeenCalled();
  });

  it("um não saiu: os outros saem assim mesmo, e a falha sobe no fim (quem decide que é só aviso é a operação)", async () => {
    falsa.customers.listPaymentMethods.mockResolvedValue(cartoes("pm_a", "pm_novo", "pm_b"));
    falsa.paymentMethods.detach.mockRejectedValueOnce(foraDoAr()).mockResolvedValue({});
    await expect(soltarOutrosCartoes("cus_1", "pm_novo")).rejects.toThrow("[stripe] a remoção de um cartão antigo falhou");
    expect(falsa.paymentMethods.detach.mock.calls).toEqual([["pm_a"], ["pm_b"]]);
  });

  it("a lista falhou: sobe, sem a mensagem da Stripe, e nada é tirado", async () => {
    falsa.customers.listPaymentMethods.mockRejectedValue(foraDoAr());
    await expect(soltarOutrosCartoes("cus_1", "pm_novo")).rejects.toThrow("[stripe] a lista dos cartões do cliente falhou: StripeConnectionError");
    expect(falsa.paymentMethods.detach).not.toHaveBeenCalled();
  });
});

// PARAR A RENOVAÇÃO E VOLTAR ATRÁS (passo 7). O que protege: parar é MARCAR para acabar no fim do
// período — nunca encerrar na hora, que tiraria o acesso de quem já pagou — e a resposta da
// Stripe é a que volta para a operação.
describe("parar a renovação e voltar atrás, na Stripe", () => {
  const fim = 1_900_000_000;
  // Seguro: só os campos que `paraDetalhesDaAssinatura` lê.
  const daStripe = (marcada: boolean) => ({ id: "sub_1", status: "active", livemode: false, metadata: {}, customer: "cus_1", cancel_at: marcada ? fim : null, cancel_at_period_end: marcada, pause_collection: null, default_payment_method: null, latest_invoice: { id: "in_1", status: "paid" }, items: { data: [{ current_period_start: fim - 100, current_period_end: fim, price: { id: "price_1", unit_amount: 9990, currency: "brl", recurring: { interval: "month", interval_count: 1 } } }] } });

  it("parar: marca para acabar no fim do período, com o motivo — e devolve a assinatura como ficou", async () => {
    falsa.subscriptions.update.mockResolvedValue(daStripe(true));
    const depois = await pararRenovacao("sub_1", { motivo: "caro", comentario: "volto em janeiro" });
    expect(falsa.subscriptions.update.mock.calls).toEqual([["sub_1", { cancel_at_period_end: true, cancellation_details: { feedback: "too_expensive", comment: "volto em janeiro" }, metadata: { motivo: "caro" }, expand: ["latest_invoice", "default_payment_method", "customer.invoice_settings.default_payment_method"] }]]);
    expect([depois.status, depois.acabaEm?.getTime(), depois.acabaNoFimDoPeriodo]).toEqual(["active", fim * 1000, true]);
  });

  it("voltar atrás: tira a marca do fim do período e apaga o motivo", async () => {
    falsa.subscriptions.update.mockResolvedValue(daStripe(false));
    const depois = await retomarRenovacao("sub_1", true);
    expect(falsa.subscriptions.update.mock.calls[0]?.[1]).toMatchObject({ cancel_at_period_end: false, cancellation_details: { feedback: "", comment: "" }, metadata: { motivo: "" } });
    expect(depois.acabaEm).toBeNull();
  });

  it("a Stripe fora do ar: as duas sobem, sem a mensagem dela", async () => {
    falsa.subscriptions.update.mockRejectedValue(foraDoAr());
    await expect(pararRenovacao("sub_1", {})).rejects.toThrow("[stripe] a parada da renovação falhou: StripeConnectionError");
    await expect(retomarRenovacao("sub_1", true)).rejects.toThrow("[stripe] a retomada da renovação falhou: StripeConnectionError");
    await expect(pararRenovacao("sub_1", {})).rejects.not.toThrow(/sk_test/);
  });
});

describe("cobrar a fatura em aberto", () => {
  it("pagou: 'paga'; a Stripe respondeu sem pagar: 'recusada'", async () => {
    falsa.invoices.pay.mockResolvedValue({ status: "paid" });
    expect(await pagarFatura("in_1")).toBe("paga");
    expect(falsa.invoices.pay.mock.calls).toEqual([["in_1"]]);
    falsa.invoices.pay.mockResolvedValue({ status: "open" });
    expect(await pagarFatura("in_1")).toBe("recusada");
  });

  it("cartão recusado: 'recusada' — não é falha nossa", async () => {
    falsa.invoices.pay.mockRejectedValue(new Stripe.errors.StripeCardError({ message: "Your card was declined.", type: "card_error", code: "card_declined", statusCode: 402 }));
    expect(await pagarFatura("in_1")).toBe("recusada");
    expect(falsa.invoices.retrieve).not.toHaveBeenCalled();
  });

  it("o banco pede confirmação: 'pede-confirmacao' — é outro caso, e não 'recusada'", async () => {
    falsa.invoices.pay.mockRejectedValue(recusaDoPedido("invoice_payment_intent_requires_action"));
    expect(await pagarFatura("in_1")).toBe("pede-confirmacao");
  });

  it("outra recusa, e a fatura relida está PAGA (alguém pagou no mesmo instante): 'paga', sem erro falso", async () => {
    falsa.invoices.pay.mockRejectedValue(recusaDoPedido("invoice_already_paid_ou_o_que_a_stripe_mandar"));
    falsa.invoices.retrieve.mockResolvedValue({ status: "paid" });
    expect(await pagarFatura("in_1")).toBe("paga");
    expect(falsa.invoices.retrieve.mock.calls).toEqual([["in_1"]]);
  });

  it("outra recusa, e a fatura relida segue em aberto (ou nem reler deu): sobe — nunca 'paga'", async () => {
    falsa.invoices.pay.mockRejectedValue(recusaDoPedido("qualquer_outra"));
    falsa.invoices.retrieve.mockResolvedValue({ status: "open" });
    await expect(pagarFatura("in_1")).rejects.toThrow("[stripe] a cobrança da fatura em aberto falhou");
    falsa.invoices.retrieve.mockRejectedValue(foraDoAr());
    await expect(pagarFatura("in_1")).rejects.toThrow("[stripe] a cobrança da fatura em aberto falhou");
  });

  it("a Stripe fora do ar: sobe, sem reler e sem a mensagem dela", async () => {
    falsa.invoices.pay.mockRejectedValue(foraDoAr());
    await expect(pagarFatura("in_1")).rejects.toThrow("[stripe] a cobrança da fatura em aberto falhou: StripeConnectionError");
    expect(falsa.invoices.retrieve).not.toHaveBeenCalled();
  });
});
