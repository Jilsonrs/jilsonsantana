import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Stripe from "stripe";
import type { PagamentoPrePago } from "./stripe.js";

// O PIX PRÉ-PAGO NA STRIPE (etapa 4.9, passo 1), com a biblioteca trocada por um dublê do tamanho do
// que as funções usam (só a rede é falsa; as funções rodam de verdade). O que protege: o pagamento
// nasce com a configuração só-Pix, a marca e quem paga; a assinatura nasce para terminar no fim do
// período, com o id do Pix, e a primeira fatura é paga por fora — uma vez; e nenhum erro leva a
// mensagem crua da Stripe.
const falsa = {
  paymentIntents: { create: vi.fn(), list: vi.fn(), cancel: vi.fn(), retrieve: vi.fn(), update: vi.fn() },
  subscriptions: { create: vi.fn(), list: vi.fn(), retrieve: vi.fn() },
  invoices: { pay: vi.fn(), retrieve: vi.fn() },
};
vi.mock("./stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import { assinaturasDoPix, cancelarPagamentoPix, chaveDoPrePago, criarAssinaturaPagaPorFora, criarAssinaturaPrePaga, criarPagamentoPix, garantirFaturaPaga, lerPagamentoPix, listarPixDoCliente, marcarEmConferencia, paraPedidoDeAssinaturaPrePaga, paraPedidoDePix, paraPixDoCliente, pixConfigurado, VALIDADE_DO_PIX_EM_SEGUNDOS } from "./stripe-pix.js";

const recusa = () => new Stripe.errors.StripeInvalidRequestError({ message: "mensagem crua da Stripe, com sk_test_abc", type: "invalid_request_error", statusCode: 400 });
const PAGAMENTO: PagamentoPrePago = { id: "pi_1", plano: "mensal", precoId: "price_mensal", clienteId: "cus_1", livemode: false, centavos: 9990, userId: "conta-1", visitante: null };
const VISITANTE: PagamentoPrePago = { ...PAGAMENTO, id: "pi_2", userId: null, visitante: { pedido: "pedido-1", resumoDaTentativa: "resumo", escolha: { novidades: true, origem: "youtube", campanha: null } } };
const antes = process.env.STRIPE_PIX_CONFIGURATION;

beforeEach(() => {
  for (const grupo of Object.values(falsa)) for (const f of Object.values(grupo)) f.mockReset();
  process.env.STRIPE_PIX_CONFIGURATION = "pmc_so_pix";
});

afterEach(() => {
  vi.restoreAllMocks();
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
  it("é do Pix (ou da fatura) e da janela de 5 minutos: igual dentro da janela, outra depois — a Stripe repete por 24 h a primeira resposta, inclusive a falha", () => {
    const t0 = new Date("2026-10-29T10:00:00Z");
    expect(chaveDoPrePago("criar", "pi_1", t0)).toBe(chaveDoPrePago("criar", "pi_1", new Date("2026-10-29T10:04:59Z")));
    expect(chaveDoPrePago("criar", "pi_1", t0)).not.toBe(chaveDoPrePago("criar", "pi_1", new Date("2026-10-29T10:05:00Z")));
    expect(chaveDoPrePago("criar", "pi_1", t0)).not.toBe(chaveDoPrePago("fatura", "pi_1", t0));
    expect(chaveDoPrePago("criar", "pi_1", t0)).not.toBe(chaveDoPrePago("criar", "pi_2", t0));
  });
});

describe("criar a assinatura pré-paga", () => {
  it("cria com a chave do Pix (na janela) e paga a primeira fatura por fora com a chave DA FATURA; devolve o id e a fatura paga", async () => {
    falsa.subscriptions.create.mockResolvedValue({ id: "sub_1", latest_invoice: { id: "in_1", status: "open" } });
    falsa.invoices.pay.mockResolvedValue({ id: "in_1", status: "paid" });
    expect(await criarAssinaturaPrePaga(PAGAMENTO)).toEqual({ id: "sub_1", faturaPaga: true });
    expect(falsa.subscriptions.create).toHaveBeenCalledWith(expect.objectContaining({ cancel_at_period_end: true }), { idempotencyKey: chaveDoPrePago("criar", "pi_1") });
    expect(falsa.invoices.pay).toHaveBeenCalledWith("in_1", { paid_out_of_band: true }, { idempotencyKey: chaveDoPrePago("fatura", "in_1") });
    expect(falsa.subscriptions.retrieve).not.toHaveBeenCalled();
  });

  it("a do OPERADOR ('Aceitar este Pix', 4.7b, passo 4c) tem a chave própria — a do aviso devolveria a que morreu", async () => {
    falsa.subscriptions.create.mockResolvedValue({ id: "sub_2", latest_invoice: { id: "in_2", status: "paid" } });
    await criarAssinaturaPrePaga(PAGAMENTO, "operador");
    expect(falsa.subscriptions.create).toHaveBeenCalledWith(expect.anything(), { idempotencyKey: chaveDoPrePago("aceitar", "pi_1") });
    expect(chaveDoPrePago("aceitar", "pi_1")).not.toBe(chaveDoPrePago("criar", "pi_1"));
  });

  it("a criação repetida devolveu a mesma assinatura, já com a fatura paga: não paga de novo", async () => {
    falsa.subscriptions.create.mockResolvedValue({ id: "sub_1", latest_invoice: { id: "in_1", status: "paid" } });
    expect(await criarAssinaturaPrePaga(PAGAMENTO)).toEqual({ id: "sub_1", faturaPaga: true });
    expect(falsa.invoices.pay).not.toHaveBeenCalled();
  });

  it("a fatura que nasceu anulada não se paga: volta como NÃO paga, para quem chama pôr o Pix em conferência", async () => {
    falsa.subscriptions.create.mockResolvedValue({ id: "sub_1", latest_invoice: { id: "in_1", status: "void" } });
    expect(await criarAssinaturaPrePaga(PAGAMENTO)).toEqual({ id: "sub_1", faturaPaga: false });
    expect(falsa.invoices.pay).not.toHaveBeenCalled();
  });

  it("o pagar por fora falhou, mas a fatura já está paga (outro pagou no meio): segue; se não está, sobe sem a mensagem crua", async () => {
    falsa.subscriptions.create.mockResolvedValue({ id: "sub_1", latest_invoice: { id: "in_1", status: "open" } });
    falsa.invoices.pay.mockRejectedValue(recusa());
    falsa.invoices.retrieve.mockResolvedValueOnce({ id: "in_1", status: "paid" });
    expect(await criarAssinaturaPrePaga(PAGAMENTO)).toEqual({ id: "sub_1", faturaPaga: true });

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
  it("sem a fatura em mãos, busca a assinatura com a última fatura: aberta → paga por fora, com a chave da fatura na janela", async () => {
    falsa.subscriptions.retrieve.mockResolvedValue({ id: "sub_1", latest_invoice: { id: "in_1", status: "open" } });
    falsa.invoices.pay.mockResolvedValue({ id: "in_1", status: "paid" });
    expect(await garantirFaturaPaga("sub_1")).toEqual({ fatura: "in_1", status: "paid" });
    expect(falsa.subscriptions.retrieve).toHaveBeenCalledWith("sub_1", { expand: ["latest_invoice"] });
    expect(falsa.invoices.pay).toHaveBeenCalledWith("in_1", { paid_out_of_band: true }, { idempotencyKey: chaveDoPrePago("fatura", "in_1") });
  });

  it("já paga: nada a fazer; anulada ou incobrável: não se paga, e o status volta para quem chama", async () => {
    falsa.subscriptions.retrieve.mockResolvedValueOnce({ id: "sub_1", latest_invoice: { id: "in_1", status: "paid" } });
    expect(await garantirFaturaPaga("sub_1")).toEqual({ fatura: "in_1", status: "paid" });
    falsa.subscriptions.retrieve.mockResolvedValueOnce({ id: "sub_1", latest_invoice: { id: "in_1", status: "void" } });
    expect(await garantirFaturaPaga("sub_1")).toEqual({ fatura: "in_1", status: "void" });
    falsa.subscriptions.retrieve.mockResolvedValueOnce({ id: "sub_1", latest_invoice: null });
    expect(await garantirFaturaPaga("sub_1")).toEqual({ fatura: null, status: "sem-fatura" });
    expect(falsa.invoices.pay).not.toHaveBeenCalled();
  });

  it("o pagar falhou: se a fatura está paga (outro pagou no meio), segue; se não, sobe sem a mensagem crua", async () => {
    falsa.subscriptions.retrieve.mockResolvedValue({ id: "sub_1", latest_invoice: { id: "in_1", status: "open" } });
    falsa.invoices.pay.mockRejectedValue(recusa());
    falsa.invoices.retrieve.mockResolvedValueOnce({ id: "in_1", status: "paid" });
    expect(await garantirFaturaPaga("sub_1")).toEqual({ fatura: "in_1", status: "paid" });
    falsa.invoices.retrieve.mockResolvedValueOnce({ id: "in_1", status: "open" });
    const erro = await garantirFaturaPaga("sub_1").catch((e: unknown) => e);
    expect(String(erro)).toContain("[stripe] a fatura da assinatura pré-paga falhou");
    expect(String(erro)).not.toContain("sk_test");
  });
});

describe("as assinaturas que um Pix já virou (a LISTA do cliente — achado 5 da segunda revisão)", () => {
  it("pela lista consistente das assinaturas do cliente, com a primeira fatura: só as do Pix, e se a fatura está paga", async () => {
    falsa.subscriptions.list.mockResolvedValue({
      data: [
        { id: "sub_a", status: "active", metadata: { pix_payment_intent: "pi_1" }, latest_invoice: { status: "paid" } },
        { id: "sub_b", status: "incomplete", metadata: { pix_payment_intent: "pi_1" }, latest_invoice: { status: "open" } },
        { id: "sub_c", status: "active", metadata: { pix_payment_intent: "pi_outro" }, latest_invoice: { status: "paid" } },
        { id: "sub_d", status: "active", metadata: {}, latest_invoice: { status: "paid" } },
      ],
    });
    expect(await assinaturasDoPix("cus_1", "pi_1")).toEqual([
      { id: "sub_a", status: "active", faturaPaga: true },
      { id: "sub_b", status: "incomplete", faturaPaga: false },
    ]);
    expect(falsa.subscriptions.list).toHaveBeenCalledWith({ customer: "cus_1", status: "all", limit: 100, expand: ["data.latest_invoice"] });
  });

  it("a recusa sobe sem a mensagem crua", async () => {
    falsa.subscriptions.list.mockRejectedValue(recusa());
    const erro = await assinaturasDoPix("cus_1", "pi_1").catch((e: unknown) => e);
    expect(String(erro)).toContain("[stripe] a lista das assinaturas do Pix falhou");
    expect(String(erro)).not.toContain("sk_test");
  });
});

describe("os Pix de um cliente, numa ida só (achado 6 da segunda revisão)", () => {
  const avisos = () => vi.spyOn(console, "warn").mockImplementation(() => {});
  const lista = [
    { id: "pi_a", status: "requires_action", client_secret: "pi_a_secret_x", customer: "cus_1", amount: 9990, livemode: false, metadata: { prepago: "mensal", precoId: "price_mensal", tentativa: "resumo-1" } },
    { id: "pi_b", status: "requires_payment_method", client_secret: "pi_b_secret_x", customer: "cus_1", amount: 99500, livemode: false, metadata: { prepago: "anual" } },
    { id: "pi_c", status: "succeeded", client_secret: "pi_c_secret_x", customer: "cus_1", amount: 9990, livemode: false, latest_charge: { amount: 9990, amount_refunded: 0 }, metadata: { prepago: "mensal", precoId: "price_mensal", userId: "conta-1" } },
    { id: "pi_d", status: "processing", client_secret: "pi_d_secret_x", customer: "cus_1", amount: 9990, livemode: false, metadata: { prepago: "mensal", precoId: "price_mensal" } },
    { id: "pi_e", status: "requires_action", client_secret: "pi_e_secret_x", customer: "cus_1", amount: 9990, livemode: false, metadata: {} },
    { id: "pi_f", status: "canceled", client_secret: "pi_f_secret_x", customer: "cus_1", amount: 9990, livemode: false, metadata: { prepago: "mensal" } },
    { id: "pi_g", status: "succeeded", client_secret: "pi_g_secret_x", customer: "cus_1", amount: 99500, livemode: false, latest_charge: { amount: 99500, amount_refunded: 0 }, metadata: { prepago: "anual", precoId: "price_anual", pedido: "pedido-1", tentativa: "resumo", novidades: "sim", em_conferencia: "o valor não bate" } },
    { id: "pi_h", status: "succeeded", client_secret: "pi_h_secret_x", customer: "cus_1", amount: 9990, livemode: false, latest_charge: { amount: 9990, amount_refunded: 9990 }, metadata: { prepago: "mensal", precoId: "price_mensal", userId: "conta-1" } },
    { id: "pi_i", status: "succeeded", client_secret: "pi_i_secret_x", customer: "cus_1", amount: 9990, livemode: false, latest_charge: { amount: 9990, amount_refunded: 5000 }, metadata: { prepago: "mensal", precoId: "price_mensal", userId: "conta-1" } },
    { id: "pi_j", status: "succeeded", client_secret: "pi_j_secret_x", customer: "cus_1", amount: 9990, livemode: false, metadata: { prepago: "mensal" } },
  ];

  it("separa os NOSSOS: à espera (só os que ainda se pagam), e pagos (sem o devolvido por inteiro; o parcial conta; em conferência com o motivo; o sem preço ignorado com aviso)", () => {
    const aviso = avisos();
    // Seguro: o teste monta só os campos que a função lê.
    const pix = paraPixDoCliente(lista as unknown as Stripe.PaymentIntent[], "cus_1");
    expect(pix.pendentes).toEqual([
      { id: "pi_a", segredo: "pi_a_secret_x", plano: "mensal", precoId: "price_mensal", resumoDaTentativa: "resumo-1" },
      { id: "pi_b", segredo: "pi_b_secret_x", plano: "anual", precoId: null, resumoDaTentativa: null },
    ]);
    expect(pix.pagos).toEqual([
      { id: "pi_c", plano: "mensal", precoId: "price_mensal", clienteId: "cus_1", livemode: false, centavos: 9990, userId: "conta-1", visitante: null, emConferencia: null },
      { id: "pi_g", plano: "anual", precoId: "price_anual", clienteId: "cus_1", livemode: false, centavos: 99500, userId: null, visitante: { pedido: "pedido-1", resumoDaTentativa: "resumo", escolha: { novidades: true, origem: null, campanha: null } }, emConferencia: "o valor não bate" },
      { id: "pi_i", plano: "mensal", precoId: "price_mensal", clienteId: "cus_1", livemode: false, centavos: 9990, userId: "conta-1", visitante: null, emConferencia: null },
    ]);
    expect(aviso.mock.calls.some(([texto]) => String(texto).includes("pi_j") && String(texto).includes("sem preço"))).toBe(true);
  });

  it("uma ida só à Stripe, com a cobrança de cada um (para ver a devolução) — e sem o Pix configurado não vai", async () => {
    falsa.paymentIntents.list.mockResolvedValue({ data: lista });
    avisos();
    const pix = await listarPixDoCliente("cus_1");
    expect(pix.pagos.map((p) => p.id)).toEqual(["pi_c", "pi_g", "pi_i"]);
    expect(falsa.paymentIntents.list).toHaveBeenCalledTimes(1);
    expect(falsa.paymentIntents.list).toHaveBeenCalledWith({ customer: "cus_1", limit: 20, expand: ["data.latest_charge"] });
    delete process.env.STRIPE_PIX_CONFIGURATION;
    falsa.paymentIntents.list.mockClear();
    expect(await listarPixDoCliente("cus_1")).toEqual({ pagos: [], pendentes: [] });
    expect(falsa.paymentIntents.list).not.toHaveBeenCalled();
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

  it("ler um pagamento: o status e, se for nosso, o pré-pago; a recusa sobe sem a mensagem crua", async () => {
    falsa.paymentIntents.retrieve.mockResolvedValueOnce({ id: "pi_c", status: "succeeded", customer: "cus_1", amount: 9990, livemode: false, metadata: { prepago: "mensal", precoId: "price_mensal", userId: "conta-1" } });
    expect(await lerPagamentoPix("pi_c")).toEqual({ status: "succeeded", pagamento: { id: "pi_c", plano: "mensal", precoId: "price_mensal", clienteId: "cus_1", livemode: false, centavos: 9990, userId: "conta-1", visitante: null } });
    falsa.paymentIntents.retrieve.mockResolvedValueOnce({ id: "pi_x", status: "canceled", customer: "cus_1", amount: 9990, livemode: false, metadata: {} });
    expect(await lerPagamentoPix("pi_x")).toEqual({ status: "canceled", pagamento: null });
    falsa.paymentIntents.retrieve.mockRejectedValueOnce(recusa());
    const erro = await lerPagamentoPix("pi_c").catch((e: unknown) => e);
    expect(String(erro)).toContain("[stripe] a leitura do pagamento Pix falhou");
    expect(String(erro)).not.toContain("sk_test");
  });
});

describe("pôr o Pix em conferência (achado 4 da segunda revisão)", () => {
  it("a primeira vez: grava o motivo nos metadados e diz que a marca é NOVA (quem chama alerta uma vez)", async () => {
    falsa.paymentIntents.retrieve.mockResolvedValueOnce({ id: "pi_1", metadata: { prepago: "mensal" } });
    falsa.paymentIntents.update.mockResolvedValueOnce({ id: "pi_1" });
    expect(await marcarEmConferencia("pi_1", "o valor não bate")).toBe(true);
    expect(falsa.paymentIntents.update).toHaveBeenCalledWith("pi_1", { metadata: { em_conferencia: "o valor não bate" } });
  });

  it("já marcado: não grava de novo e diz que NÃO é nova (nada de alerta a cada clique)", async () => {
    falsa.paymentIntents.retrieve.mockResolvedValueOnce({ id: "pi_1", metadata: { prepago: "mensal", em_conferencia: "o valor não bate" } });
    expect(await marcarEmConferencia("pi_1", "outro motivo")).toBe(false);
    expect(falsa.paymentIntents.update).not.toHaveBeenCalled();
  });

  it("a recusa sobe sem a mensagem crua", async () => {
    falsa.paymentIntents.retrieve.mockRejectedValueOnce(recusa());
    const erro = await marcarEmConferencia("pi_1", "x").catch((e: unknown) => e);
    expect(String(erro)).toContain("[stripe] a marca de conferência do Pix falhou");
    expect(String(erro)).not.toContain("sk_test");
  });
});

// A PAGA POR FORA (o "Liberar acesso pago por fora" do painel, 4.7b, passo 4d — P120).
describe("criar a assinatura paga por fora", () => {
  it("pré-paga como a do Pix: não renova, sem cartão guardado, com a marca de quem liberou; a primeira fatura paga por fora; a chave segura o clique duplo", async () => {
    falsa.subscriptions.create.mockResolvedValue({ id: "sub_3", latest_invoice: { id: "in_3", status: "open" } });
    falsa.invoices.pay.mockResolvedValue({ id: "in_3", status: "paid" });
    const agora = new Date("2026-11-02T12:00:00Z");
    expect(await criarAssinaturaPagaPorFora({ clienteId: "cus_1", precoId: "price_anual", plano: "anual", userId: "conta-1", operador: "admin-1" }, agora)).toEqual({ id: "sub_3", faturaPaga: true });
    const [pedido, opcoes] = falsa.subscriptions.create.mock.calls[0] as [Record<string, unknown>, { idempotencyKey: string }];
    expect(pedido).toMatchObject({ customer: "cus_1", items: [{ price: "price_anual", quantity: 1 }], cancel_at_period_end: true, payment_settings: { save_default_payment_method: "off" }, metadata: { userId: "conta-1", plano: "anual", pago_por_fora: "admin-1" } });
    expect(opcoes.idempotencyKey).toMatch(/^pago-por-fora:conta-1:anual:\d+$/);
    expect(falsa.invoices.pay).toHaveBeenCalledWith("in_3", { paid_out_of_band: true }, expect.anything());
  });
});
