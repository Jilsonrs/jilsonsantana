import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";

// A LEITURA DA FICHA NA STRIPE (etapa 4.7b, passo 1c), com a biblioteca da Stripe trocada por um dublê do tamanho
// do que as funções usam (só a rede é falsa). O que protege: a ficha pede o cliente com o CPF e o cartão expandidos e
// as cobranças DO cliente; só pede a contestação das cobranças contestadas; o cliente apagado ou que a Stripe não
// conhece volta vazio, e a Stripe fora do ar sobe sem a mensagem dela.
const falsa = {
  customers: { retrieve: vi.fn() },
  charges: { list: vi.fn(), retrieve: vi.fn() },
  disputes: { list: vi.fn(), retrieve: vi.fn() },
  invoices: { retrieve: vi.fn() },
  paymentIntents: { retrieve: vi.fn(), list: vi.fn() },
};
vi.mock("./stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import { clienteDoCodigo, lerClienteNaStripe } from "./stripe-ficha.js";

const naoExiste = () => new Stripe.errors.StripeInvalidRequestError({ message: "mensagem crua, com sk_test_abc", type: "invalid_request_error", code: "resource_missing", statusCode: 404 });
const foraDoAr = () => new Stripe.errors.StripeConnectionError({ message: "mensagem crua, com sk_test_abc", type: "api_error" });

beforeEach(() => {
  for (const grupo of Object.values(falsa)) for (const dubl of Object.values(grupo)) dubl.mockReset();
});

describe("ler o cliente para a ficha", () => {
  it("pede o cliente (CPF e cartão expandidos), as cobranças dele e só a contestação da contestada", async () => {
    falsa.customers.retrieve.mockResolvedValue({ id: "cus_1" });
    falsa.charges.list.mockResolvedValue({ data: [{ id: "ch_1", disputed: false }, { id: "ch_2", disputed: true }], has_more: true });
    falsa.disputes.list.mockResolvedValue({ data: [{ id: "du_1" }] });
    falsa.paymentIntents.list.mockResolvedValue({ data: [] });
    const lido = await lerClienteNaStripe("cus_1");
    expect(falsa.customers.retrieve.mock.calls).toEqual([["cus_1", { expand: ["tax_ids", "invoice_settings.default_payment_method"] }]]);
    expect(falsa.charges.list.mock.calls).toEqual([[{ customer: "cus_1", limit: 100 }]]);
    expect(falsa.disputes.list.mock.calls).toEqual([[{ charge: "ch_2", limit: 1 }]]);
    expect(lido.maisCobrancas).toBe(true);
    expect(lido.contestacoes.get("ch_2")).toEqual({ id: "du_1" });
    expect(falsa.paymentIntents.list.mock.calls).toEqual([[{ customer: "cus_1", limit: 20 }]]);
  });

  it("os Pix gerados e não pagos: só o pagamento esperando com o QR aberto (nem o 3DS, nem o pago)", async () => {
    falsa.customers.retrieve.mockResolvedValue({ id: "cus_1" });
    falsa.charges.list.mockResolvedValue({ data: [], has_more: false });
    falsa.paymentIntents.list.mockResolvedValue({
      data: [
        { id: "pi_qr", status: "requires_action", next_action: { type: "pix_display_qr_code" } },
        { id: "pi_3ds", status: "requires_action", next_action: { type: "use_stripe_sdk" } },
        { id: "pi_pago", status: "succeeded", next_action: null },
        { id: "pi_vencido", status: "requires_payment_method", next_action: null },
      ],
    });
    expect((await lerClienteNaStripe("cus_1")).pixEsperando.map((p) => p.id)).toEqual(["pi_qr"]);
  });

  it("o cliente apagado, ou que a Stripe não conhece: vazio, sem pedir as cobranças", async () => {
    falsa.customers.retrieve.mockResolvedValueOnce({ id: "cus_1", deleted: true }).mockRejectedValueOnce(naoExiste());
    expect((await lerClienteNaStripe("cus_1")).cobrancas).toEqual([]);
    expect((await lerClienteNaStripe("cus_2")).cliente).toBeNull();
    expect(falsa.charges.list).not.toHaveBeenCalled();
  });

  it("a Stripe fora do ar: sobe, sem a mensagem dela", async () => {
    falsa.customers.retrieve.mockRejectedValue(foraDoAr());
    const erro = await lerClienteNaStripe("cus_1").catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(Error);
    expect(String((erro as Error).message)).not.toContain("sk_test_abc");
  });
});

describe("de quem é o código do alerta", () => {
  it("a cobrança, a fatura, o pagamento e a contestação levam ao cliente", async () => {
    falsa.charges.retrieve.mockResolvedValue({ customer: "cus_c" });
    falsa.invoices.retrieve.mockResolvedValue({ customer: { id: "cus_i" } });
    falsa.paymentIntents.retrieve.mockResolvedValue({ customer: "cus_p" });
    falsa.disputes.retrieve.mockResolvedValue({ charge: { customer: "cus_d" } });
    expect(await clienteDoCodigo("ch_1")).toBe("cus_c");
    expect(await clienteDoCodigo("in_1")).toBe("cus_i");
    expect(await clienteDoCodigo("pi_1")).toBe("cus_p");
    expect(await clienteDoCodigo("du_1")).toBe("cus_d");
    expect(falsa.disputes.retrieve.mock.calls).toEqual([["du_1", { expand: ["charge"] }]]);
  });

  it("o que a Stripe não conhece, ou sem cliente: nenhum", async () => {
    falsa.charges.retrieve.mockRejectedValueOnce(naoExiste()).mockResolvedValueOnce({ customer: null });
    expect(await clienteDoCodigo("ch_x")).toBeNull();
    expect(await clienteDoCodigo("ch_y")).toBeNull();
  });
});
