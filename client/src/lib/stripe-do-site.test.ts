import { describe, expect, it } from "vitest";
import { OPCOES_DO_STRIPE, opcoesDoCampo, opcoesDoElemento, type PedidoDeCartao } from "./stripe-do-site";

// AS OPÇÕES COM QUE O CAMPO DA STRIPE ABRE (etapa 4.9, passo 6 — 29/10/2026). As telas simulam o módulo
// inteiro, então nenhum teste de tela vê estas linhas; e o Stripe.js recusa opção errada EM SILÊNCIO (o
// campo não aparece, sem erro na tela nem no console — medido duas vezes no navegador, 10/10 e 29/10).
// O que estes testes travam é a FORMA que o Stripe.js aceita; a prova de que o campo abre é no navegador.

const BASE: PedidoDeCartao = { chavePublicavel: "pk_test_da_suite", centavos: 9990, moeda: "brl", formasDePagamento: ["card"], pix: null };

describe("opcoesDoCampo", () => {
  it("no Pix: pagamento solto só com a configuração só-Pix — e NUNCA junto com a lista de formas (o Stripe.js recusa as duas juntas e o campo some)", () => {
    const opcoes = opcoesDoCampo({ ...BASE, pix: { configuracao: "pmc_so_pix" } });
    expect(opcoes).toMatchObject({ mode: "payment", amount: 9990, currency: "brl", paymentMethodConfiguration: "pmc_so_pix", locale: "pt-BR" });
    expect("allowedPaymentMethodTypes" in opcoes).toBe(false);
    expect("paymentMethodTypes" in opcoes).toBe(false);
  });

  it("no cartão que cobra hoje: assinatura com as formas que o servidor mandou, sem configuração", () => {
    const opcoes = opcoesDoCampo(BASE);
    expect(opcoes).toMatchObject({ mode: "subscription", amount: 9990, currency: "brl", allowedPaymentMethodTypes: ["card"], locale: "pt-BR" });
    expect("paymentMethodConfiguration" in opcoes).toBe(false);
    expect("paymentMethodTypes" in opcoes).toBe(false);
  });

  it("no cartão sem nada a cobrar hoje: só guarda o cartão", () => {
    const opcoes = opcoesDoCampo({ ...BASE, centavos: 0 });
    expect(opcoes).toMatchObject({ mode: "setup", currency: "brl", allowedPaymentMethodTypes: ["card"], locale: "pt-BR" });
    expect("amount" in opcoes).toBe(false);
  });

  it("o Pix vence a cobrança de hoje: com a configuração, o campo é de pagamento mesmo com valor", () => {
    expect(opcoesDoCampo({ ...BASE, centavos: 99500, pix: { configuracao: "pmc_so_pix" } }).mode).toBe("payment");
  });
});

describe("OPCOES_DO_STRIPE", () => {
  it("o Stripe.js é carregado em português: a janela do QR aberta fora do campo sairia no idioma do navegador", () => {
    expect(OPCOES_DO_STRIPE.locale).toBe("pt-BR");
  });
});

describe("opcoesDoElemento", () => {
  it("no Pix, o quadro não pede e-mail (o aluno já o deu — P113); a Stripe o exige na confirmação, que o leva", () => {
    expect(opcoesDoElemento(true)).toEqual({ fields: { billingDetails: { email: "never" } } });
  });

  it("no cartão, o campo fica como sempre", () => {
    expect(opcoesDoElemento(false)).toEqual({});
  });
});
