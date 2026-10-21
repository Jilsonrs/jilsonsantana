import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";

// O CLIENTE DO VISITANTE E O NÚMERO FISCAL (etapa 4.7, passo 4), com a biblioteca da Stripe trocada
// por um dublê do tamanho do que as funções usam (só a rede é falsa; as funções rodam de verdade).
// O que protege: o cliente nasce com o CPF/CNPJ; a recusa do número pela Stripe vira um erro com
// nome (a rota diz "confira o número" e alerta), sem a mensagem crua dela; e o número trocado
// entre um clique e outro deixa o cliente com UM número — o novo —, dizendo que mudou.
const falsa = {
  customers: { create: vi.fn(), listTaxIds: vi.fn(), createTaxId: vi.fn(), deleteTaxId: vi.fn() },
};
vi.mock("./stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import { acertarNumeroFiscal, criarClienteDoVisitante, DocumentoRecusado } from "./stripe.js";

const CPF = { tipo: "cpf" as const, numero: "52998224725" };
const CNPJ = { tipo: "cnpj" as const, numero: "12ABC34501DE35" };
const recusa = (code: string | undefined) => new Stripe.errors.StripeInvalidRequestError({ message: "mensagem crua da Stripe, com sk_test_abc", type: "invalid_request_error", code, statusCode: 400 });
const guardado = (id: string, type: string, value: string) => ({ id, type, value });

beforeEach(() => {
  for (const f of Object.values(falsa.customers)) f.mockReset();
  falsa.customers.createTaxId.mockResolvedValue({ id: "txi_novo" });
  falsa.customers.deleteTaxId.mockResolvedValue({ deleted: true });
});

describe("criar o cliente do visitante", () => {
  it("nasce com o e-mail, o número fiscal e a ficha", async () => {
    falsa.customers.create.mockResolvedValue({ id: "cus_1", livemode: false });
    expect(await criarClienteDoVisitante({ pedido: "p1", email: "ana@b.c", documento: CNPJ })).toEqual({ id: "cus_1", livemode: false });
    expect(falsa.customers.create).toHaveBeenCalledWith({ email: "ana@b.c", tax_id_data: [{ type: "br_cnpj", value: "12.ABC.345/01DE-35" }], metadata: { pedido: "p1" } });
  });

  it("a Stripe recusou o número (`tax_id_invalid`): o erro com nome, sem a mensagem dela", async () => {
    falsa.customers.create.mockRejectedValue(recusa("tax_id_invalid"));
    const erro = await criarClienteDoVisitante({ pedido: "p1", email: "ana@b.c", documento: CNPJ }).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(DocumentoRecusado);
    expect(String(erro)).not.toContain("sk_test");
  });

  it("outra recusa sobe como falha da Stripe, sem a mensagem dela", async () => {
    falsa.customers.create.mockRejectedValue(recusa("email_invalid"));
    const erro = await criarClienteDoVisitante({ pedido: "p1", email: "ana@b.c", documento: CPF }).catch((e: unknown) => e);
    expect(erro).not.toBeInstanceOf(DocumentoRecusado);
    expect(String(erro)).toContain("[stripe] a criação do cliente do visitante falhou");
    expect(String(erro)).not.toContain("sk_test");
  });
});

describe("acertar o número fiscal do cliente", () => {
  it("o mesmo número: nada muda, e diz que não mudou", async () => {
    falsa.customers.listTaxIds.mockResolvedValue({ data: [guardado("txi_1", "br_cpf", "529.982.247-25")] });
    expect(await acertarNumeroFiscal("cus_1", CPF)).toBe(false);
    expect(falsa.customers.createTaxId).not.toHaveBeenCalled();
    expect(falsa.customers.deleteTaxId).not.toHaveBeenCalled();
  });

  it("outro número: entra o novo e sai o antigo — o cliente fica com UM, e diz que mudou", async () => {
    falsa.customers.listTaxIds.mockResolvedValue({ data: [guardado("txi_1", "br_cpf", "111.444.777-35")] });
    expect(await acertarNumeroFiscal("cus_1", CPF)).toBe(true);
    expect(falsa.customers.createTaxId).toHaveBeenCalledWith("cus_1", { type: "br_cpf", value: "529.982.247-25" });
    expect(falsa.customers.deleteTaxId).toHaveBeenCalledWith("cus_1", "txi_1");
  });

  it("do CPF para o CNPJ (o mesmo e-mail, agora pela empresa): troca o tipo também", async () => {
    falsa.customers.listTaxIds.mockResolvedValue({ data: [guardado("txi_1", "br_cpf", "529.982.247-25")] });
    expect(await acertarNumeroFiscal("cus_1", CNPJ)).toBe(true);
    expect(falsa.customers.createTaxId).toHaveBeenCalledWith("cus_1", { type: "br_cnpj", value: "12.ABC.345/01DE-35" });
    expect(falsa.customers.deleteTaxId).toHaveBeenCalledWith("cus_1", "txi_1");
  });

  it("o número de outro país que alguém pôs no painel fica; os do Brasil, que sobram, saem", async () => {
    falsa.customers.listTaxIds.mockResolvedValue({ data: [guardado("txi_eu", "eu_vat", "DE123456789"), guardado("txi_1", "br_cpf", "529.982.247-25"), guardado("txi_2", "br_cnpj", "11.222.333/0001-81")] });
    expect(await acertarNumeroFiscal("cus_1", CPF)).toBe(true);
    expect(falsa.customers.deleteTaxId.mock.calls.map((c) => c[1])).toEqual(["txi_1", "txi_2"]);
  });

  it("a Stripe recusou o número novo: o erro com nome, e o antigo não sai", async () => {
    falsa.customers.listTaxIds.mockResolvedValue({ data: [guardado("txi_1", "br_cpf", "111.444.777-35")] });
    falsa.customers.createTaxId.mockRejectedValue(recusa("tax_id_invalid"));
    await expect(acertarNumeroFiscal("cus_1", CNPJ)).rejects.toBeInstanceOf(DocumentoRecusado);
    expect(falsa.customers.deleteTaxId).not.toHaveBeenCalled();
  });
});
