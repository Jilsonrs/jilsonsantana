import { describe, it, expect } from "vitest";
import type Stripe from "stripe";
import { cartaoDoCliente, documentoEscondido, paraCobrancaDaFicha } from "./ficha-da-cobranca.js";

// A FICHA DO ALUNO — as traduções da Stripe (etapa 4.7b, passo 1c). Funções puras, teste unitário (CLAUDE.md →
// Testing). O que protege: cada cobrança diz a situação certa (a contestada e a devolvida vencem a "paga"); o motivo
// da recusa sai de onde a Stripe o põe (`outcome.reason`, e só na que falhou); o recibo só da que passou; o CPF nunca
// sai inteiro; e o cartão é só bandeira e final.

const cobranca = (extra: Partial<Record<string, unknown>> = {}) =>
  ({
    id: "ch_1",
    created: 1_800_000_000,
    amount: 9990,
    currency: "brl",
    status: "succeeded",
    disputed: false,
    refunded: false,
    amount_refunded: 0,
    outcome: { reason: null },
    failure_code: null,
    receipt_url: "https://pay.stripe.com/receipts/x",
    payment_method_details: { type: "card", card: { brand: "visa", last4: "4242" } },
    ...extra,
  }) as unknown as Stripe.Charge;

describe("a cobrança na ficha", () => {
  it("paga no cartão: valor, data, bandeira e final, e o recibo", () => {
    expect(paraCobrancaDaFicha(cobranca())).toEqual({
      id: "ch_1",
      em: new Date(1_800_000_000 * 1000).toISOString(),
      centavos: 9990,
      moeda: "brl",
      forma: "cartao",
      cartao: { bandeira: "visa", final: "4242" },
      situacao: "paga",
      devolvido: 0,
      motivoDaFalha: null,
      recibo: "https://pay.stripe.com/receipts/x",
      contestacao: null,
    });
  });

  it("recusada: o motivo é o do banco (`outcome.reason`), senão o código da falha — e não há recibo", () => {
    const sem = paraCobrancaDaFicha(cobranca({ status: "failed", outcome: { reason: "insufficient_funds" }, failure_code: "card_declined" }));
    expect(sem).toMatchObject({ situacao: "falhou", motivoDaFalha: "insufficient_funds", recibo: null });
    expect(paraCobrancaDaFicha(cobranca({ status: "failed", outcome: null, failure_code: "expired_card" })).motivoDaFalha).toBe("expired_card");
    expect(paraCobrancaDaFicha(cobranca({ outcome: { reason: "elevated_risk_level" } })).motivoDaFalha).toBeNull();
  });

  it("Pix esperando: pendente, sem recibo; Pix pago: forma Pix, sem cartão", () => {
    expect(paraCobrancaDaFicha(cobranca({ status: "pending", payment_method_details: { type: "pix" } }))).toMatchObject({ situacao: "pendente", forma: "pix", cartao: null, recibo: null });
    expect(paraCobrancaDaFicha(cobranca({ payment_method_details: { type: "pix" } }))).toMatchObject({ situacao: "paga", forma: "pix", cartao: null });
  });

  it("devolvida por inteiro, em parte, e contestada (que vence as outras) — com o prazo da contestação", () => {
    expect(paraCobrancaDaFicha(cobranca({ refunded: true, amount_refunded: 9990 }))).toMatchObject({ situacao: "devolvida", devolvido: 9990 });
    expect(paraCobrancaDaFicha(cobranca({ amount_refunded: 1000 }))).toMatchObject({ situacao: "devolvida-em-parte", devolvido: 1000 });
    const contestacao = { status: "needs_response", reason: "fraudulent", evidence_details: { due_by: 1_800_500_000 } } as unknown as Stripe.Dispute;
    expect(paraCobrancaDaFicha(cobranca({ disputed: true, refunded: true }), contestacao)).toMatchObject({
      situacao: "contestada",
      contestacao: { situacao: "needs_response", motivo: "fraudulent", prazo: new Date(1_800_500_000 * 1000).toISOString() },
    });
  });
});

describe("o CPF e o cartão do cliente na ficha", () => {
  const cliente = (extra: Record<string, unknown>) => extra as unknown as Stripe.Customer;
  it("o CPF e o CNPJ saem no padrão público de máscara; formato estranho ou sem número fiscal, nenhum", () => {
    // O padrão público: só o meio — nunca o começo nem os verificadores.
    expect(documentoEscondido(cliente({ tax_ids: { data: [{ type: "br_cpf", value: "529.982.247-25" }] } }))).toBe("CPF ***.982.247-**");
    expect(documentoEscondido(cliente({ tax_ids: { data: [{ type: "br_cnpj", value: "12.ABC.345/01DE-35" }] } }))).toBe("CNPJ **.ABC.345/****-**");
    expect(documentoEscondido(cliente({ tax_ids: { data: [{ type: "br_cpf", value: "123" }] } }))).toBeNull();
    expect(documentoEscondido(cliente({ tax_ids: { data: [] } }))).toBeNull();
    expect(documentoEscondido(null)).toBeNull();
  });

  it("o cartão padrão: bandeira, final e validade — nunca o número", () => {
    const comCartao = cliente({ invoice_settings: { default_payment_method: { card: { brand: "mastercard", last4: "4444", exp_month: 5, exp_year: 2030 } } } });
    expect(cartaoDoCliente(comCartao)).toEqual({ bandeira: "mastercard", final: "4444", mes: 5, ano: 2030 });
    expect(cartaoDoCliente(cliente({ invoice_settings: { default_payment_method: null } }))).toBeNull();
  });
});
