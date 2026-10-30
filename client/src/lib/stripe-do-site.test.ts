import { describe, expect, it, vi } from "vitest";
import { comoMostrarOQr, falhou, OPCOES_DO_STRIPE, opcoesDoCampo, opcoesDoElemento, type PedidoDeCartao } from "./stripe-do-site";

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

describe("comoMostrarOQr (P115; achado 8 da segunda revisão do passo 6)", () => {
  /** Os preços de agora (o mensal e o anual); conta quantas vezes foram lidos. */
  const precos = (centavos: number[] = [9990, 99500]) => vi.fn(async () => centavos);

  it("à espera: reabre o MESMO QR; vencido (ou nunca confirmado) com o valor de um plano: gera outro no MESMO pagamento; pago: nada; cancelado: não há como", async () => {
    expect(await comoMostrarOQr("requires_action", 9990, precos())).toBe("reabrir");
    expect(await comoMostrarOQr("requires_payment_method", 9990, precos())).toBe("gerar-novo");
    expect(await comoMostrarOQr("requires_confirmation", 99500, precos())).toBe("gerar-novo");
    expect(await comoMostrarOQr("succeeded", 9990, precos())).toBe("pago");
    expect(await comoMostrarOQr("canceled", 9990, precos())).toBe("sem-jeito");
    expect(await comoMostrarOQr("processing", 9990, precos())).toBe("sem-jeito");
  });

  it("vencido com um valor que NÃO é mais o preço de nenhum plano (o preço mudou): não há como — pago, ficaria em conferência; a frase manda pagar de novo pelo botão", async () => {
    expect(await comoMostrarOQr("requires_payment_method", 9990, precos([10990, 99500]))).toBe("sem-jeito");
    expect(await comoMostrarOQr("requires_confirmation", 9990, precos([10990, 99500]))).toBe("sem-jeito");
  });

  it("os preços só são lidos quando o QR venceu: reabrir, pago e cancelado não vão ao servidor", async () => {
    const lidos = precos();
    for (const status of ["requires_action", "succeeded", "canceled"]) await comoMostrarOQr(status, 9990, lidos);
    expect(lidos).not.toHaveBeenCalled();
    await comoMostrarOQr("requires_payment_method", 9990, lidos);
    expect(lidos).toHaveBeenCalledTimes(1);
  });
});

// O ERRO DA STRIPE COMO A TELA O LÊ (E15 da revisão ampla da cobrança, 30/10/2026): a frase da Stripe só para o erro de
// cartão e de preenchimento; e o RECUSADO pelo banco (`card_declined`) marcado — é ele que faz a tela sugerir o Pix.
describe("falhou", () => {
  it("o cartão recusado pelo banco: a frase da Stripe e recusado; outro erro de cartão, a frase sem recusado", () => {
    expect(falhou({ type: "card_error", code: "card_declined", message: "Seu cartão foi recusado." })).toEqual({ ok: false, mensagem: "Seu cartão foi recusado.", recusado: true });
    expect(falhou({ type: "card_error", code: "incorrect_cvc", message: "O código está errado." })).toEqual({ ok: false, mensagem: "O código está errado.", recusado: false });
  });

  it("o preenchimento: a frase, sem recusado; erro que não é para o aluno ler: sem frase (a tela usa a da escola)", () => {
    expect(falhou({ type: "validation_error", code: "incomplete_number", message: "O número do cartão está incompleto." })).toEqual({ ok: false, mensagem: "O número do cartão está incompleto.", recusado: false });
    expect(falhou({ type: "api_error", code: undefined, message: "mensagem crua" })).toEqual({ ok: false, mensagem: null, recusado: false });
  });
});
