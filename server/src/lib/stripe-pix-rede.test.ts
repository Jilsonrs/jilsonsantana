import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Stripe from "stripe";
import type { PagamentoPrePago } from "./stripe.js";

// O PIX PRÉ-PAGO NA STRIPE (etapa 4.9, passo 1), com a biblioteca trocada por um dublê do tamanho do
// que as funções usam (só a rede é falsa; as funções rodam de verdade). O que protege: o pagamento
// nasce com a configuração só-Pix, a marca e quem paga; a assinatura nasce para terminar no fim do
// período, com o id do Pix, e a primeira fatura é paga por fora — uma vez; e nenhum erro leva a
// mensagem crua da Stripe.
const falsa = {
  paymentIntents: { create: vi.fn(), list: vi.fn(), cancel: vi.fn() },
  subscriptions: { create: vi.fn(), search: vi.fn(), retrieve: vi.fn() },
  invoices: { pay: vi.fn(), retrieve: vi.fn() },
};
vi.mock("./stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import { assinaturaDoPagamentoPrePago, cancelarPagamentoPix, cancelarPagamentosPixPendentes, chaveDoPrePago, criarAssinaturaPrePaga, criarPagamentoPix, garantirFaturaPaga, pagamentosPixPendentes, paraPedidoDeAssinaturaPrePaga, paraPedidoDePix, pixConfigurado, VALIDADE_DO_PIX_EM_SEGUNDOS } from "./stripe-pix.js";

const recusa = () => new Stripe.errors.StripeInvalidRequestError({ message: "mensagem crua da Stripe, com sk_test_abc", type: "invalid_request_error", statusCode: 400 });
const PAGAMENTO: PagamentoPrePago = { id: "pi_1", plano: "mensal", precoId: "price_mensal", clienteId: "cus_1", livemode: false, centavos: 9990, userId: "conta-1", visitante: null };
const VISITANTE: PagamentoPrePago = { ...PAGAMENTO, id: "pi_2", userId: null, visitante: { pedido: "pedido-1", resumoDaTentativa: "resumo", escolha: { novidades: true, origem: "youtube", campanha: null } } };
const antes = process.env.STRIPE_PIX_CONFIGURATION;

beforeEach(() => {
  for (const grupo of Object.values(falsa)) for (const f of Object.values(grupo)) f.mockReset();
  process.env.STRIPE_PIX_CONFIGURATION = "pmc_so_pix";
});

afterEach(() => {
  if (antes === undefined) delete process.env.STRIPE_PIX_CONFIGURATION;
  else process.env.STRIPE_PIX_CONFIGURATION = antes;
});

describe("o pedido do pagamento Pix (função pura)", () => {
  it("leva a configuração só-Pix, o valor em reais, a validade, a marca com o plano, o preço e a conta", () => {
    const pedido = paraPedidoDePix({ clienteId: "cus_1", precoId: "price_anual", plano: "anual", centavos: 99500, userId: "conta-1" }, "pmc_so_pix");
    expect(pedido).toEqual({
      amount: 99500,
      currency: "brl",
      customer: "cus_1",
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      payment_method_configuration: "pmc_so_pix",
      payment_method_options: { pix: { expires_after_seconds: VALIDADE_DO_PIX_EM_SEGUNDOS } },
      metadata: { userId: "conta-1", prepago: "anual", precoId: "price_anual" },
    });
    expect(VALIDADE_DO_PIX_EM_SEGUNDOS).toBe(3600);
  });

  it("o do visitante leva a ficha, o resumo da tentativa e a escolha — nunca a tentativa em claro", () => {
    const pedido = paraPedidoDePix({ clienteId: "cus_1", precoId: "price_mensal", plano: "mensal", centavos: 9990, visitante: VISITANTE.visitante! }, "pmc_so_pix");
    expect(pedido.metadata).toEqual({ pedido: "pedido-1", tentativa: "resumo", novidades: "sim", origem: "youtube", prepago: "mensal", precoId: "price_mensal" });
  });
});

describe("criar o pagamento Pix", () => {
  it("devolve o id e o segredo do pagamento", async () => {
    falsa.paymentIntents.create.mockResolvedValue({ id: "pi_1", client_secret: "pi_1_secret_x", livemode: false });
    expect(await criarPagamentoPix({ clienteId: "cus_1", precoId: "price_mensal", plano: "mensal", centavos: 9990, userId: "conta-1" })).toEqual({ id: "pi_1", segredo: "pi_1_secret_x", livemode: false });
    expect(falsa.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({ payment_method_configuration: "pmc_so_pix", metadata: expect.objectContaining({ prepago: "mensal" }) }));
  });

  it("sem a configuração só-Pix no ambiente: não vai à Stripe (o campo abriria com cartão)", async () => {
    delete process.env.STRIPE_PIX_CONFIGURATION;
    expect(pixConfigurado()).toBe(false);
    await expect(criarPagamentoPix({ clienteId: "cus_1", precoId: "price_mensal", plano: "mensal", centavos: 9990, userId: "conta-1" })).rejects.toThrow("STRIPE_PIX_CONFIGURATION");
    expect(falsa.paymentIntents.create).not.toHaveBeenCalled();
  });

  it("a recusa da Stripe sobe sem a mensagem crua dela", async () => {
    falsa.paymentIntents.create.mockRejectedValue(recusa());
    const erro = await criarPagamentoPix({ clienteId: "cus_1", precoId: "price_mensal", plano: "mensal", centavos: 9990, userId: "conta-1" }).catch((e: unknown) => e);
    expect(String(erro)).toContain("[stripe] a criação do pagamento Pix falhou");
    expect(String(erro)).not.toContain("sk_test");
  });
});

describe("o pedido da assinatura pré-paga (função pura)", () => {
  it("termina no fim do período, nasce incompleta, sem guardar cartão, com o plano e o id do Pix", () => {
    expect(paraPedidoDeAssinaturaPrePaga(PAGAMENTO)).toEqual({
      customer: "cus_1",
      items: [{ price: "price_mensal", quantity: 1 }],
      payment_behavior: "default_incomplete",
      cancel_at_period_end: true,
      payment_settings: { payment_method_types: ["card"], save_default_payment_method: "off" },
      metadata: { userId: "conta-1", plano: "mensal", pix_payment_intent: "pi_1" },
      expand: ["latest_invoice"],
    });
  });

  it("a do visitante leva a ficha e a escolha, como a assinatura por cartão — é por elas que a conta nasce", () => {
    expect(paraPedidoDeAssinaturaPrePaga(VISITANTE).metadata).toEqual({ pedido: "pedido-1", tentativa: "resumo", novidades: "sim", origem: "youtube", plano: "mensal", pix_payment_intent: "pi_2" });
  });
});

describe("a chave de repetição da pré-paga (função pura)", () => {
  it("é do Pix e da janela de 5 minutos: igual dentro da janela, outra depois — a Stripe repete por 24 h a primeira resposta, inclusive a falha", () => {
    const t0 = new Date("2026-10-29T10:00:00Z");
    expect(chaveDoPrePago("criar", "pi_1", t0)).toBe(chaveDoPrePago("criar", "pi_1", new Date("2026-10-29T10:04:59Z")));
    expect(chaveDoPrePago("criar", "pi_1", t0)).not.toBe(chaveDoPrePago("criar", "pi_1", new Date("2026-10-29T10:05:00Z")));
    expect(chaveDoPrePago("criar", "pi_1", t0)).not.toBe(chaveDoPrePago("fatura", "pi_1", t0));
    expect(chaveDoPrePago("criar", "pi_1", t0)).not.toBe(chaveDoPrePago("criar", "pi_2", t0));
  });
});

describe("criar a assinatura pré-paga", () => {
  it("cria com a chave de idempotência do Pix (na janela) e paga a primeira fatura por fora, também com chave", async () => {
    falsa.subscriptions.create.mockResolvedValue({ id: "sub_1", latest_invoice: { id: "in_1", status: "open" } });
    falsa.invoices.pay.mockResolvedValue({ id: "in_1", status: "paid" });
    expect(await criarAssinaturaPrePaga(PAGAMENTO)).toBe("sub_1");
    expect(falsa.subscriptions.create).toHaveBeenCalledWith(expect.objectContaining({ cancel_at_period_end: true }), { idempotencyKey: chaveDoPrePago("criar", "pi_1") });
    expect(falsa.invoices.pay).toHaveBeenCalledWith("in_1", { paid_out_of_band: true }, { idempotencyKey: chaveDoPrePago("fatura", "pi_1") });
    // A fatura veio na criação: não vai buscar a assinatura de novo.
    expect(falsa.subscriptions.retrieve).not.toHaveBeenCalled();
  });

  it("a criação repetida devolveu a mesma assinatura, já com a fatura paga: não paga de novo", async () => {
    falsa.subscriptions.create.mockResolvedValue({ id: "sub_1", latest_invoice: { id: "in_1", status: "paid" } });
    expect(await criarAssinaturaPrePaga(PAGAMENTO)).toBe("sub_1");
    expect(falsa.invoices.pay).not.toHaveBeenCalled();
  });

  it("o pagar por fora falhou, mas a fatura já está paga (outro pagou no meio): segue; se não está, sobe sem a mensagem crua", async () => {
    falsa.subscriptions.create.mockResolvedValue({ id: "sub_1", latest_invoice: { id: "in_1", status: "open" } });
    falsa.invoices.pay.mockRejectedValue(recusa());
    falsa.invoices.retrieve.mockResolvedValueOnce({ id: "in_1", status: "paid" });
    expect(await criarAssinaturaPrePaga(PAGAMENTO)).toBe("sub_1");

    falsa.invoices.retrieve.mockResolvedValueOnce({ id: "in_1", status: "open" });
    const erro = await criarAssinaturaPrePaga(PAGAMENTO).catch((e: unknown) => e);
    expect(String(erro)).toContain("[stripe] a fatura da assinatura pré-paga falhou");
    expect(String(erro)).not.toContain("sk_test");
  });

  it("a criação recusada sobe sem a mensagem crua, e nada é pago", async () => {
    falsa.subscriptions.create.mockRejectedValue(recusa());
    const erro = await criarAssinaturaPrePaga(PAGAMENTO).catch((e: unknown) => e);
    expect(String(erro)).toContain("[stripe] a assinatura pré-paga do Pix falhou");
    expect(String(erro)).not.toContain("sk_test");
    expect(falsa.invoices.pay).not.toHaveBeenCalled();
  });
});

describe("garantir a fatura da pré-paga paga (a assinatura achada pela reentrega)", () => {
  it("sem a fatura em mãos, busca a assinatura com a última fatura: aberta → paga por fora, com a chave na janela", async () => {
    falsa.subscriptions.retrieve.mockResolvedValue({ id: "sub_1", latest_invoice: { id: "in_1", status: "open" } });
    falsa.invoices.pay.mockResolvedValue({ id: "in_1", status: "paid" });
    expect(await garantirFaturaPaga("sub_1", "pi_1")).toEqual({ fatura: "in_1", status: "paid" });
    expect(falsa.subscriptions.retrieve).toHaveBeenCalledWith("sub_1", { expand: ["latest_invoice"] });
    expect(falsa.invoices.pay).toHaveBeenCalledWith("in_1", { paid_out_of_band: true }, { idempotencyKey: chaveDoPrePago("fatura", "pi_1") });
  });

  it("já paga: nada a fazer; anulada ou incobrável: não se paga, e o status volta para quem chama alertar", async () => {
    falsa.subscriptions.retrieve.mockResolvedValueOnce({ id: "sub_1", latest_invoice: { id: "in_1", status: "paid" } });
    expect(await garantirFaturaPaga("sub_1", "pi_1")).toEqual({ fatura: "in_1", status: "paid" });
    falsa.subscriptions.retrieve.mockResolvedValueOnce({ id: "sub_1", latest_invoice: { id: "in_1", status: "void" } });
    expect(await garantirFaturaPaga("sub_1", "pi_1")).toEqual({ fatura: "in_1", status: "void" });
    falsa.subscriptions.retrieve.mockResolvedValueOnce({ id: "sub_1", latest_invoice: null });
    expect(await garantirFaturaPaga("sub_1", "pi_1")).toEqual({ fatura: null, status: "sem-fatura" });
    expect(falsa.invoices.pay).not.toHaveBeenCalled();
  });

  it("o pagar falhou: se a fatura está paga (outro pagou no meio), segue; se não, sobe sem a mensagem crua", async () => {
    falsa.subscriptions.retrieve.mockResolvedValue({ id: "sub_1", latest_invoice: { id: "in_1", status: "open" } });
    falsa.invoices.pay.mockRejectedValue(recusa());
    falsa.invoices.retrieve.mockResolvedValueOnce({ id: "in_1", status: "paid" });
    expect(await garantirFaturaPaga("sub_1", "pi_1")).toEqual({ fatura: "in_1", status: "paid" });
    falsa.invoices.retrieve.mockResolvedValueOnce({ id: "in_1", status: "open" });
    const erro = await garantirFaturaPaga("sub_1", "pi_1").catch((e: unknown) => e);
    expect(String(erro)).toContain("[stripe] a fatura da assinatura pré-paga falhou");
    expect(String(erro)).not.toContain("sk_test");
  });
});

describe("a assinatura que um Pix já virou (a busca pelos metadados)", () => {
  it("procura pelo id do Pix nos metadados e devolve o id — ou nada", async () => {
    falsa.subscriptions.search.mockResolvedValueOnce({ data: [{ id: "sub_9" }] });
    expect(await assinaturaDoPagamentoPrePago("pi_abc123")).toBe("sub_9");
    expect(falsa.subscriptions.search).toHaveBeenCalledWith({ query: "metadata['pix_payment_intent']:'pi_abc123'", limit: 1 });
    falsa.subscriptions.search.mockResolvedValueOnce({ data: [] });
    expect(await assinaturaDoPagamentoPrePago("pi_abc123")).toBeNull();
  });

  it("um id que não é de pagamento não vai à busca (nada entra na consulta sem conferir)", async () => {
    expect(await assinaturaDoPagamentoPrePago("pi_x' OR metadata['a']:'b")).toBeNull();
    expect(falsa.subscriptions.search).not.toHaveBeenCalled();
  });
});

describe("os pagamentos Pix à espera de um cliente", () => {
  it("só os NOSSOS (com a marca), só os que ainda podem ser pagos, com o segredo, o plano e o resumo da tentativa", async () => {
    falsa.paymentIntents.list.mockResolvedValue({
      data: [
        { id: "pi_a", status: "requires_action", client_secret: "pi_a_secret_x", metadata: { prepago: "mensal", tentativa: "resumo-1" } },
        { id: "pi_b", status: "requires_payment_method", client_secret: "pi_b_secret_x", metadata: { prepago: "anual" } },
        { id: "pi_c", status: "succeeded", client_secret: "pi_c_secret_x", metadata: { prepago: "mensal" } },
        { id: "pi_d", status: "processing", client_secret: "pi_d_secret_x", metadata: { prepago: "mensal" } },
        { id: "pi_e", status: "requires_action", client_secret: "pi_e_secret_x", metadata: {} },
        { id: "pi_f", status: "canceled", client_secret: "pi_f_secret_x", metadata: { prepago: "mensal" } },
      ],
    });
    expect(await pagamentosPixPendentes("cus_1")).toEqual([
      { id: "pi_a", segredo: "pi_a_secret_x", plano: "mensal", resumoDaTentativa: "resumo-1" },
      { id: "pi_b", segredo: "pi_b_secret_x", plano: "anual", resumoDaTentativa: null },
    ]);
    expect(falsa.paymentIntents.list).toHaveBeenCalledWith({ customer: "cus_1", limit: 20 });
  });

  it("cancelar um pagamento à espera; a recusa sobe sem a mensagem crua", async () => {
    falsa.paymentIntents.cancel.mockResolvedValueOnce({ id: "pi_a", status: "canceled" });
    await cancelarPagamentoPix("pi_a");
    expect(falsa.paymentIntents.cancel).toHaveBeenCalledWith("pi_a");
    falsa.paymentIntents.cancel.mockRejectedValueOnce(recusa());
    const erro = await cancelarPagamentoPix("pi_c").catch((e: unknown) => e);
    expect(String(erro)).toContain("[stripe] o cancelamento do pagamento Pix falhou");
    expect(String(erro)).not.toContain("sk_test");
  });

  it("quem segue por CARTÃO: todos os nossos à espera são cancelados (os pagos e os de outros, não) — e sem o Pix configurado não vai à Stripe", async () => {
    falsa.paymentIntents.list.mockResolvedValue({
      data: [
        { id: "pi_a", status: "requires_action", client_secret: "pi_a_secret_x", metadata: { prepago: "mensal" } },
        { id: "pi_b", status: "requires_payment_method", client_secret: "pi_b_secret_x", metadata: { prepago: "anual" } },
        { id: "pi_c", status: "succeeded", client_secret: "pi_c_secret_x", metadata: { prepago: "mensal" } },
        { id: "pi_e", status: "requires_action", client_secret: "pi_e_secret_x", metadata: {} },
      ],
    });
    falsa.paymentIntents.cancel.mockResolvedValue({ status: "canceled" });
    expect(await cancelarPagamentosPixPendentes("cus_1")).toBe(2);
    expect(falsa.paymentIntents.cancel.mock.calls).toEqual([["pi_a"], ["pi_b"]]);

    delete process.env.STRIPE_PIX_CONFIGURATION;
    falsa.paymentIntents.list.mockClear();
    expect(await cancelarPagamentosPixPendentes("cus_1")).toBe(0);
    expect(falsa.paymentIntents.list).not.toHaveBeenCalled();
  });
});
