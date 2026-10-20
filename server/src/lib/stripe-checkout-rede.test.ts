import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";

// CRIAR A ASSINATURA, com a biblioteca da Stripe trocada por um dublê do tamanho do que a função
// usa (só a rede é falsa; a função roda de verdade). O que protege: a recusa do DESCONTO vira
// "o código não vale" (400 na rota), e não um erro 500 — que diria ao navegador que o código
// existe. `[FATO — medido na área restrita, 19/10/2026]` o código ESGOTADO vem com
// `param: "promotion_code"` (e sem `code`), não com o `discounts…` das outras recusas.
const falsa = { subscriptions: { create: vi.fn() } };
vi.mock("./stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import { criarAssinatura } from "./stripe.js";

const PEDIDO = { clienteId: "cus_1", userId: "u-1", precoId: "price_mensal", plano: "mensal" as const, codigoId: "promo_1" };
const recusa = (param: string | undefined) => new Stripe.errors.StripeInvalidRequestError({ message: "mensagem crua da Stripe, com sk_test_abc", type: "invalid_request_error", param, statusCode: 400 });

beforeEach(() => {
  falsa.subscriptions.create.mockReset();
});

describe("criar a assinatura com código promocional", () => {
  it("o código ESGOTADO entre a conferência e o clique (`param: promotion_code`): nada — a rota diz 'código não vale'", async () => {
    falsa.subscriptions.create.mockRejectedValue(recusa("promotion_code"));
    expect(await criarAssinatura(PEDIDO)).toBeNull();
  });

  // Um código de campanha mal configurado passa na prévia e é recusado aqui: sem rastro, o
  // operador nunca descobriria (achado da revisão de segurança do passo 2). É aviso, não alerta.
  it("a recusa deixa UMA linha de aviso, com o id do código — sem a mensagem da Stripe", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      falsa.subscriptions.create.mockRejectedValue(recusa("promotion_code"));
      await criarAssinatura(PEDIDO);
      const linhas = aviso.mock.calls.map((chamada) => chamada.join(" "));
      expect(linhas).toEqual(["[stripe] checkout: a Stripe recusou o código promo_1 ao criar a assinatura (campo promotion_code, código -)"]);
      expect(linhas.join(" ")).not.toContain("sk_test");
    } finally {
      aviso.mockRestore();
    }
  });

  it("o desconto recusado de outro jeito (`discounts…`): nada também", async () => {
    falsa.subscriptions.create.mockRejectedValue(recusa("discounts[0][promotion_code]"));
    expect(await criarAssinatura(PEDIDO)).toBeNull();
  });

  it("outra recusa (do preço, do cliente): sobe — e sem a mensagem da Stripe", async () => {
    falsa.subscriptions.create.mockRejectedValue(recusa("items"));
    await expect(criarAssinatura(PEDIDO)).rejects.toThrow("[stripe] a criação da assinatura falhou: StripeInvalidRequestError");
    await expect(criarAssinatura(PEDIDO)).rejects.not.toThrow(/sk_test/);
  });

  it("SEM código no pedido, a recusa do campo do código sobe: não há código para dizer que não vale", async () => {
    falsa.subscriptions.create.mockRejectedValue(recusa("promotion_code"));
    await expect(criarAssinatura({ ...PEDIDO, codigoId: null })).rejects.toThrow("[stripe] a criação da assinatura falhou");
  });
});
