import { describe, it, expect, vi, beforeEach } from "vitest";

// A BUSCA DA ASSINATURA QUE ALIMENTA O ESPELHO (etapa 4.7b, passo 1a — o painel da cobrança), com a biblioteca da
// Stripe trocada por um dublê do tamanho do que a função usa (só a rede é falsa; a função roda de verdade). Existe
// porque os testes de rota simulam `buscarAssinatura` inteira: sem isto, tirar a expansão do código promocional
// passaria a suíte, e o painel mostraria "sem código" em toda assinatura.
const falsa = { subscriptions: { retrieve: vi.fn() } };
vi.mock("./stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import { buscarAssinatura } from "./stripe.js";

const FIM = 1_800_000_000;

beforeEach(() => {
  falsa.subscriptions.retrieve.mockReset();
});

describe("buscar a assinatura para o espelho", () => {
  it("pede o cliente, os pagamentos da última fatura e o código promocional — e devolve o plano, o fim marcado e o código", async () => {
    falsa.subscriptions.retrieve.mockResolvedValue({
      id: "sub_1",
      status: "active",
      livemode: false,
      metadata: {},
      customer: { id: "cus_1", metadata: { userId: "u-1" } },
      latest_invoice: { status: "paid", amount_paid: 0, payments: { data: [] } },
      items: { data: [{ current_period_start: FIM - 30 * 86_400, current_period_end: FIM, price: { recurring: { interval: "year", interval_count: 1 } } }] },
      cancel_at: null,
      cancel_at_period_end: true,
      pause_collection: null,
      discounts: [{ id: "di_1", promotion_code: { id: "promo_1", code: "TESTE100" } }],
    });
    const agora = await buscarAssinatura("sub_1");
    expect(falsa.subscriptions.retrieve.mock.calls).toEqual([["sub_1", { expand: ["customer", "latest_invoice.payments", "discounts.promotion_code"] }]]);
    expect(agora.planoAtual).toBe("anual");
    expect(agora.acabaEm?.getTime()).toBe(FIM * 1000);
    expect(agora.codigoPromocional).toBe("TESTE100");
  });
});
