import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Stripe from "stripe";
import type { PagamentoPrePago } from "./stripe.js";

// O PIX PRÉ-PAGO NA STRIPE (etapa 4.9, passo 1), com a biblioteca trocada por um dublê do tamanho do
// que as funções usam (só a rede é falsa; as funções rodam de verdade). O que protege: o pagamento
// nasce com a configuração só-Pix, a marca e quem paga; a assinatura nasce para terminar no fim do
// período, com o id do Pix, e a primeira fatura é paga por fora — uma vez; e nenhum erro leva a
// mensagem crua da Stripe.
const falsa = {
  paymentIntents: { create: vi.fn() },
  subscriptions: { create: vi.fn(), search: vi.fn() },
  invoices: { pay: vi.fn(), retrieve: vi.fn() },
};
vi.mock("./stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import { assinaturaDoPagamentoPrePago, criarAssinaturaPrePaga, criarPagamentoPix, paraPedidoDeAssinaturaPrePaga, paraPedidoDePix, pixConfigurado, VALIDADE_DO_PIX_EM_SEGUNDOS } from "./stripe-pix.js";

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

describe("criar a assinatura pré-paga", () => {
  it("cria com a chave de idempotência do Pix e paga a primeira fatura por fora, também com chave", async () => {
    falsa.subscriptions.create.mockResolvedValue({ id: "sub_1", latest_invoice: { id: "in_1", status: "open" } });
    falsa.invoices.pay.mockResolvedValue({ id: "in_1", status: "paid" });
    expect(await criarAssinaturaPrePaga(PAGAMENTO)).toBe("sub_1");
    expect(falsa.subscriptions.create).toHaveBeenCalledWith(expect.objectContaining({ cancel_at_period_end: true }), { idempotencyKey: "prepago:pi_1" });
    expect(falsa.invoices.pay).toHaveBeenCalledWith("in_1", { paid_out_of_band: true }, { idempotencyKey: "prepago-fatura:pi_1" });
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
    expect(String(erro)).toContain("[stripe] a assinatura pré-paga do Pix falhou");
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
