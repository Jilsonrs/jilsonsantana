import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";

// TROCAR O CPF OU CNPJ NA STRIPE (etapa 4.7b, passo 3b), com a biblioteca dela trocada por um dublê do tamanho do que a
// função usa. O que protege: cria o NOVO antes de apagar os antigos (uma recusa nunca deixa o cliente sem número), apaga
// só os números do Brasil e nunca o novo, e a recusa da Stripe vira `DocumentoRecusado` — sem a mensagem dela.
const falsa = { customers: { createTaxId: vi.fn(), listTaxIds: vi.fn(), deleteTaxId: vi.fn() } };
vi.mock("./stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import { DocumentoRecusado, trocarNumeroFiscal } from "./stripe.js";

const ordem: string[] = [];
beforeEach(() => {
  ordem.length = 0;
  falsa.customers.createTaxId.mockReset().mockImplementation(async () => {
    ordem.push("cria");
    return { id: "txi_novo" };
  });
  falsa.customers.listTaxIds.mockReset().mockResolvedValue({ data: [{ id: "txi_velho", type: "br_cpf" }, { id: "txi_novo", type: "br_cpf" }, { id: "txi_eu", type: "eu_vat" }] });
  falsa.customers.deleteTaxId.mockReset().mockImplementation(async (_cliente: string, id: string) => {
    ordem.push(`apaga ${id}`);
    return { id, deleted: true };
  });
});

describe("trocar o número fiscal", () => {
  it("cria o novo e só então apaga o antigo do Brasil — nunca o novo, nem o de outro país", async () => {
    await trocarNumeroFiscal("cus_1", { tipo: "cpf", numero: "52998224725" });
    expect(falsa.customers.createTaxId.mock.calls).toEqual([["cus_1", { type: "br_cpf", value: "529.982.247-25" }]]);
    expect(ordem).toEqual(["cria", "apaga txi_velho"]);
  });

  it("a recusa da Stripe: DocumentoRecusado, e nada é apagado", async () => {
    falsa.customers.createTaxId.mockRejectedValue(new Stripe.errors.StripeInvalidRequestError({ message: "mensagem crua com sk_test_abc", type: "invalid_request_error", code: "tax_id_invalid", statusCode: 400 }));
    await expect(trocarNumeroFiscal("cus_1", { tipo: "cpf", numero: "52998224725" })).rejects.toBeInstanceOf(DocumentoRecusado);
    expect(falsa.customers.deleteTaxId).not.toHaveBeenCalled();
  });
});
