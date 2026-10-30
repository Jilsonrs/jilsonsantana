import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Stripe from "stripe";

// A STRIPE NA LIMPEZA DE QUEM NÃO TERMINOU DE ASSINAR (etapa 4.7, passo 9), com a biblioteca trocada por um dublê do
// tamanho do que as funções usam (só a rede é falsa; as funções rodam de verdade). O que protege: o cliente apagado (ou
// que a Stripe não conhece) é "não existe", sem ir às listas; as listas leem TUDO do cliente (assinaturas de qualquer
// status, e os pagamentos), e a lista cortada diz que não está completa — a regra não apaga sem ver tudo; apagar o que
// já não existe não é erro; e nenhum erro leva a mensagem crua da Stripe.
const falsa = {
  customers: { retrieve: vi.fn(), del: vi.fn() },
  subscriptions: { list: vi.fn() },
  paymentIntents: { list: vi.fn(), cancel: vi.fn() },
};
vi.mock("./stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import { apagarClienteNaStripe, cancelarPagamentoAberto, lerClienteNaStripe } from "./stripe-limpeza.js";

const crua = (code?: string) => new Stripe.errors.StripeInvalidRequestError({ message: "mensagem crua da Stripe, com sk_test_abc", type: "invalid_request_error", statusCode: 400, ...(code ? { code } : {}) });
const lista = <T>(data: T[], has_more = false) => ({ data, has_more });

beforeEach(() => {
  for (const grupo of Object.values(falsa)) for (const f of Object.values(grupo)) f.mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe("ler o cliente para a limpeza", () => {
  it("o cliente apagado, ou que a Stripe não conhece: 'não existe' — e as listas nem são pedidas", async () => {
    falsa.customers.retrieve.mockResolvedValueOnce({ id: "cus_1", deleted: true });
    expect(await lerClienteNaStripe("cus_1")).toBe("nao-existe");
    falsa.customers.retrieve.mockRejectedValueOnce(crua("resource_missing"));
    expect(await lerClienteNaStripe("cus_2")).toBe("nao-existe");
    expect(falsa.subscriptions.list).not.toHaveBeenCalled();
    expect(falsa.paymentIntents.list).not.toHaveBeenCalled();
  });

  it("lê TODAS as assinaturas (qualquer status) e os pagamentos do cliente; inteiro, 'completo'", async () => {
    falsa.customers.retrieve.mockResolvedValue({ id: "cus_1" });
    falsa.subscriptions.list.mockResolvedValue(lista([{ status: "incomplete_expired" }, { status: "active" }]));
    falsa.paymentIntents.list.mockResolvedValue(lista([{ id: "pi_1", status: "canceled" }, { id: "pi_2", status: "succeeded" }]));
    expect(await lerClienteNaStripe("cus_1")).toEqual({
      assinaturas: ["incomplete_expired", "active"],
      pagamentos: [
        { id: "pi_1", status: "canceled" },
        { id: "pi_2", status: "succeeded" },
      ],
      completo: true,
    });
    expect(falsa.subscriptions.list).toHaveBeenCalledWith({ customer: "cus_1", status: "all", limit: 100 });
    expect(falsa.paymentIntents.list).toHaveBeenCalledWith({ customer: "cus_1", limit: 100 });
  });

  it("a lista cortada (mais do que a limpeza lê), de assinaturas ou de pagamentos: NÃO está completa", async () => {
    falsa.customers.retrieve.mockResolvedValue({ id: "cus_1" });
    falsa.subscriptions.list.mockResolvedValueOnce(lista([], true)).mockResolvedValueOnce(lista([]));
    falsa.paymentIntents.list.mockResolvedValueOnce(lista([])).mockResolvedValueOnce(lista([], true));
    expect(await lerClienteNaStripe("cus_1")).toMatchObject({ completo: false });
    expect(await lerClienteNaStripe("cus_1")).toMatchObject({ completo: false });
  });

  it("outro erro sobe — sem a mensagem crua da Stripe", async () => {
    falsa.customers.retrieve.mockRejectedValue(crua());
    const erro = await lerClienteNaStripe("cus_1").catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(Error);
    expect(String((erro as Error).message)).not.toContain("sk_test_abc");
    expect(String((erro as Error).message)).toContain("a leitura do cliente para a limpeza");
  });
});

describe("apagar o cliente e cancelar o pagamento aberto", () => {
  it("apagar: 'apagado'; o que a Stripe já não conhece, 'não existe'; outro erro sobe sem a mensagem crua", async () => {
    falsa.customers.del.mockResolvedValueOnce({ id: "cus_1", deleted: true });
    expect(await apagarClienteNaStripe("cus_1")).toBe("apagado");
    expect(falsa.customers.del).toHaveBeenCalledWith("cus_1");
    falsa.customers.del.mockRejectedValueOnce(crua("resource_missing"));
    expect(await apagarClienteNaStripe("cus_2")).toBe("nao-existe");
    falsa.customers.del.mockRejectedValueOnce(crua());
    const erro = await apagarClienteNaStripe("cus_3").catch((e: unknown) => e);
    expect(String((erro as Error).message)).not.toContain("sk_test_abc");
  });

  it("cancelar o pagamento aberto: o pedido à Stripe; o erro sobe sem a mensagem crua", async () => {
    falsa.paymentIntents.cancel.mockResolvedValueOnce({ id: "pi_1", status: "canceled" });
    await cancelarPagamentoAberto("pi_1");
    expect(falsa.paymentIntents.cancel).toHaveBeenCalledWith("pi_1");
    falsa.paymentIntents.cancel.mockRejectedValueOnce(crua());
    const erro = await cancelarPagamentoAberto("pi_2").catch((e: unknown) => e);
    expect(String((erro as Error).message)).not.toContain("sk_test_abc");
  });
});
