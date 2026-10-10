import { describe, it, expect } from "vitest";
import Stripe from "stripe";
import { chavePublicavel, erroSemMensagem, paraAssinaturaNaStripe, paraAssinaturaNoCheckout, paraCodigoPromocional, paraPedidoDeAssinatura, paraPedidoDeCliente, paraPrecosDosPlanos } from "./stripe.js";

// O ESPELHO A PARTIR DA STRIPE (Fase 4, etapa 4.1) — função pura, teste unitário (CLAUDE.md →
// Testing: só função pura, sem I/O). O que protege é o "PAGO ATÉ": quando a renovação falha, a
// Stripe já avançou o período antes de cobrar, e o fim dele é um mês NÃO pago — quem tivesse a
// assinatura cancelada por falta de pagamento ficaria com acesso até lá.

const DIA = 24 * 60 * 60;
const inicio = 1_800_000_000;
const fim = inicio + 30 * DIA;

type Fatura = { status: string } | string | null;
function assinatura({
  status = "active",
  fatura = { status: "paid" } as Fatura,
  itens = [{ current_period_start: inicio, current_period_end: fim }],
  metadata = {} as Record<string, string>,
  cliente = { id: "cus_1", metadata: {} as Record<string, string> } as { id: string; metadata: Record<string, string>; deleted?: true } | string,
  pausa = null as { behavior: string } | null,
  livemode = false,
} = {}): Stripe.Subscription {
  // Seguro: o objeto de teste tem só os campos que a função lê; a forma completa é da Stripe.
  return { id: "sub_1", status, latest_invoice: fatura, items: { data: itens }, metadata, customer: cliente, pause_collection: pausa, livemode } as unknown as Stripe.Subscription;
}

describe("o espelho a partir da assinatura da Stripe", () => {
  it("última fatura paga: pago até o FIM do período", () => {
    expect(paraAssinaturaNaStripe(assinatura()).pagoAte?.getTime()).toBe(fim * 1000);
  });

  it("última fatura NÃO paga (a renovação falhou): pago só até o COMEÇO do período", () => {
    for (const fatura of [{ status: "open" }, { status: "uncollectible" }, { status: "void" }, "in_sem_expandir", null]) {
      expect(paraAssinaturaNaStripe(assinatura({ status: "past_due", fatura })).pagoAte?.getTime()).toBe(inicio * 1000);
    }
  });

  it("sem item: sem data", () => {
    expect(paraAssinaturaNaStripe(assinatura({ itens: [] })).pagoAte).toBeNull();
  });

  it("a conta: o userId da assinatura; sem ele, o do cliente; cliente apagado ou só o id, nenhum", () => {
    expect(paraAssinaturaNaStripe(assinatura({ metadata: { userId: "u-assinatura" }, cliente: { id: "cus_1", metadata: { userId: "u-cliente" } } })).userId).toBe("u-assinatura");
    expect(paraAssinaturaNaStripe(assinatura({ cliente: { id: "cus_1", metadata: { userId: "u-cliente" } } })).userId).toBe("u-cliente");
    expect(paraAssinaturaNaStripe(assinatura({ cliente: { id: "cus_1", metadata: { userId: "u" }, deleted: true } })).userId).toBeNull();
    const soOId = paraAssinaturaNaStripe(assinatura({ cliente: "cus_9" }));
    expect([soOId.userId, soOId.clienteId]).toEqual([null, "cus_9"]);
  });

  it("o status vai como a Stripe diz (texto: o gate não quebra com status novo)", () => {
    expect(paraAssinaturaNaStripe(assinatura({ status: "algum_status_novo" })).status).toBe("algum_status_novo");
  });

  // A COBRANÇA PAUSADA (achado P1 da revisão de segurança, 09/10/2026): a Stripe mantém
  // `active` durante a pausa; no espelho vira `paused`, e o gate passa a olhar o "pago até".
  it("cobrança pausada: `paused` no espelho, mesmo com a Stripe dizendo `active`", () => {
    expect(paraAssinaturaNaStripe(assinatura({ status: "active", pausa: { behavior: "void" } })).status).toBe("paused");
    expect(paraAssinaturaNaStripe(assinatura({ status: "active" })).status).toBe("active");
  });

  it("modo de teste ou de verdade: vai como a Stripe diz", () => {
    expect(paraAssinaturaNaStripe(assinatura({ livemode: true })).livemode).toBe(true);
    expect(paraAssinaturaNaStripe(assinatura()).livemode).toBe(false);
  });
});

// OS PLANOS A PARTIR DOS PREÇOS DA STRIPE (etapa 4.2). O que protege: a tela nunca mostra um
// plano com o preço de outro, e nunca abre com um preço faltando.
function preco({ chave = "assinatura_mensal", centavos = 9990 as number | null, intervalo = "month", cada = 1, ativo = true, id = "price_1" } = {}): Stripe.Price {
  // Seguro: o objeto de teste tem só os campos que a função lê; a forma completa é da Stripe.
  return { id, lookup_key: chave, unit_amount: centavos, currency: "brl", active: ativo, recurring: { interval: intervalo, interval_count: cada } } as unknown as Stripe.Price;
}
const anual = preco({ chave: "assinatura_anual", centavos: 99500, intervalo: "year", id: "price_2" });

describe("os planos a partir dos preços da Stripe", () => {
  it("devolve o mensal e o anual, cada um com o seu valor, na ordem da tela", () => {
    expect(paraPrecosDosPlanos([anual, preco()])).toEqual([
      { plano: "mensal", precoId: "price_1", centavos: 9990, moeda: "brl" },
      { plano: "anual", precoId: "price_2", centavos: 99500, moeda: "brl" },
    ]);
  });

  it("um plano faltando: lança, em vez de abrir a tela pela metade", () => {
    expect(() => paraPrecosDosPlanos([preco()])).toThrow(/anual/);
  });

  it("a chave do mensal num preço que renova por ANO: lança", () => {
    expect(() => paraPrecosDosPlanos([preco({ intervalo: "year" }), anual])).toThrow(/mensal/);
  });

  it("preço que renova a cada 3 meses, inativo ou sem valor fixo: lança", () => {
    expect(() => paraPrecosDosPlanos([preco({ cada: 3 }), anual])).toThrow(/mensal/);
    expect(() => paraPrecosDosPlanos([preco({ ativo: false }), anual])).toThrow(/mensal/);
    expect(() => paraPrecosDosPlanos([preco({ centavos: null }), anual])).toThrow(/mensal/);
  });
});

describe("o erro da Stripe sem a mensagem dela", () => {
  it("guarda o tipo, o código e o status — e NUNCA a mensagem, que pode trazer um pedaço da chave", () => {
    const daStripe = new Stripe.errors.StripeAuthenticationError({ message: "Invalid API Key provided: sk_test_abc123", type: "invalid_request_error", code: "api_key_invalid", statusCode: 401 });
    const limpo = erroSemMensagem(daStripe, "a busca dos preços");
    expect(limpo.message).toBe("[stripe] a busca dos preços falhou: StripeAuthenticationError (api_key_invalid), status 401");
    expect(limpo.message).not.toContain("sk_test");
    expect(limpo.cause).toBeUndefined();
  });

  it("erro que não é da Stripe passa como veio", () => {
    const nosso = new Error("[stripe] o preço do plano anual não existe");
    expect(erroSemMensagem(nosso, "a busca dos preços")).toBe(nosso);
  });
});

describe("a chave publicável", () => {
  const antes = process.env.STRIPE_PUBLISHABLE_KEY;
  const com = (valor: string | undefined): string | null => {
    if (valor === undefined) delete process.env.STRIPE_PUBLISHABLE_KEY;
    else process.env.STRIPE_PUBLISHABLE_KEY = valor;
    try {
      return chavePublicavel();
    } finally {
      if (antes === undefined) delete process.env.STRIPE_PUBLISHABLE_KEY;
      else process.env.STRIPE_PUBLISHABLE_KEY = antes;
    }
  };

  it("sai quando tem cara de chave publicável", () => {
    expect(com("pk_test_abc")).toBe("pk_test_abc");
  });

  it("a SECRETA colada na variável errada nunca sai; vazia ou ausente também não", () => {
    expect(com("sk_test_abc")).toBeNull();
    expect(com("rk_test_abc")).toBeNull();
    expect(com("")).toBeNull();
    expect(com(undefined)).toBeNull();
  });
});

// O CÓDIGO PROMOCIONAL NO FORMATO DA TELA (etapa 4.2). O que protege: a tela só descreve um
// desconto que a Stripe vai mesmo dar.
type Cupom = { valid?: boolean; percent_off?: number | null; amount_off?: number | null; duration?: string; duration_in_months?: number | null };
function codigo(cupom: Cupom | string | null = {}, ativo = true): Stripe.PromotionCode {
  const cheio = typeof cupom === "object" && cupom !== null ? { valid: true, percent_off: 100, amount_off: null, duration: "forever", duration_in_months: null, ...cupom } : cupom;
  // Seguro: o objeto de teste tem só os campos que a função lê; a forma completa é da Stripe.
  return { id: "promo_1", active: ativo, promotion: { type: "coupon", coupon: cheio } } as unknown as Stripe.PromotionCode;
}

describe("o código promocional no formato da tela", () => {
  it("100% para sempre", () => {
    expect(paraCodigoPromocional(codigo())).toEqual({ id: "promo_1", desconto: { percentual: 100, centavos: null, duracao: "para-sempre", meses: null } });
  });

  it("valor fixo, uma vez", () => {
    expect(paraCodigoPromocional(codigo({ percent_off: null, amount_off: 2000, duration: "once" }))?.desconto).toEqual({ percentual: null, centavos: 2000, duracao: "uma-vez", meses: null });
  });

  it("por meses: leva quantos; fora disso, os meses não saem", () => {
    expect(paraCodigoPromocional(codigo({ percent_off: 50, duration: "repeating", duration_in_months: 3 }))?.desconto).toEqual({ percentual: 50, centavos: null, duracao: "por-meses", meses: 3 });
    expect(paraCodigoPromocional(codigo({ duration: "forever", duration_in_months: 3 }))?.desconto.meses).toBeNull();
  });

  it("código inativo, cupom que não vale mais, cupom sem os dados ou sem desconto: nada", () => {
    expect(paraCodigoPromocional(codigo({}, false))).toBeNull();
    expect(paraCodigoPromocional(codigo({ valid: false }))).toBeNull();
    expect(paraCodigoPromocional(codigo("coupon_so_o_id"))).toBeNull();
    expect(paraCodigoPromocional(codigo(null))).toBeNull();
    expect(paraCodigoPromocional(codigo({ percent_off: null, amount_off: null }))).toBeNull();
  });

  it("duração que a Stripe inventar depois: nada, em vez de descrever errado", () => {
    expect(paraCodigoPromocional(codigo({ duration: "lifetime_plus" }))).toBeNull();
  });
});

// A ASSINATURA COMO O CHECKOUT A VÊ (etapa 4.2). O que protege: o segredo do pagamento só sai
// de uma fatura AINDA ABERTA, e o plano e o código são os que o nosso checkout gravou.
function doCheckout({ status = "incomplete", fatura = { status: "open", confirmation_secret: { client_secret: "pi_1_secret_x", type: "payment_intent" } } as object | string | null, cartao = null as { client_secret: string | null } | string | null, metadata = { userId: "u1", plano: "mensal" } as Record<string, string>, itens = [{ price: { id: "price_mensal" } }] as { price: { id: string } }[] } = {}): Stripe.Subscription {
  // Seguro: o objeto de teste tem só os campos que a função lê; a forma completa é da Stripe.
  return { id: "sub_1", status, latest_invoice: fatura, pending_setup_intent: cartao, metadata, items: { data: itens } } as unknown as Stripe.Subscription;
}

describe("a assinatura como o checkout a vê", () => {
  it("incompleta com a fatura aberta: o segredo do pagamento, o plano e nenhum código", () => {
    expect(paraAssinaturaNoCheckout(doCheckout())).toEqual({ id: "sub_1", status: "incomplete", precoId: "price_mensal", codigoId: null, segredoDoPagamento: "pi_1_secret_x", segredoDoCartao: null });
  });

  it("o código promocional com que foi criada", () => {
    expect(paraAssinaturaNoCheckout(doCheckout({ metadata: { userId: "u1", plano: "anual", codigo: "promo_1" } })).codigoId).toBe("promo_1");
  });

  it("fatura anulada ou paga, não expandida ou ausente: SEM segredo do pagamento", () => {
    for (const fatura of [{ status: "void", confirmation_secret: { client_secret: "pi_1_secret_x" } }, { status: "paid", confirmation_secret: { client_secret: "pi_1_secret_x" } }, { status: "open", confirmation_secret: null }, "in_so_o_id", null]) {
      expect(paraAssinaturaNoCheckout(doCheckout({ fatura })).segredoDoPagamento).toBeNull();
    }
  });

  it("o pedido de cartão, quando a Stripe manda um (nada a pagar hoje)", () => {
    expect(paraAssinaturaNoCheckout(doCheckout({ status: "active", fatura: { status: "paid" }, cartao: { client_secret: "seti_1_secret_x" } })).segredoDoCartao).toBe("seti_1_secret_x");
    expect(paraAssinaturaNoCheckout(doCheckout({ cartao: "seti_so_o_id" })).segredoDoCartao).toBeNull();
  });

  it("o preço é o do ITEM da assinatura (o de verdade), não o rótulo do plano; sem item, nenhum", () => {
    expect(paraAssinaturaNoCheckout(doCheckout({ metadata: { plano: "mensal" }, itens: [{ price: { id: "price_antigo" } }] })).precoId).toBe("price_antigo");
    expect(paraAssinaturaNoCheckout(doCheckout({ itens: [] })).precoId).toBeNull();
  });
});

// O QUE VAI À STRIPE (achado da revisão de segurança, 10/10/2026): os testes de servidor trocam
// as idas à rede inteiras, então nada via estas linhas sumirem. As duas que custam caro: o
// DESCONTO (sem ele, o aluno paga o valor cheio com o código aplicado na tela) e o `userId` (sem
// ele, quem pagou fica sem conta — trancado fora).
describe("o pedido de assinatura que vai à Stripe", () => {
  const pedido = { clienteId: "cus_1", userId: "u1", precoId: "price_anual", plano: "anual", codigoId: "promo_1" } as const;

  it("com código: o desconto vai, e a assinatura leva a conta, o plano e o código", () => {
    expect(paraPedidoDeAssinatura(pedido)).toEqual({
      customer: "cus_1",
      items: [{ price: "price_anual", quantity: 1 }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription", payment_method_types: ["card"] },
      discounts: [{ promotion_code: "promo_1" }],
      metadata: { userId: "u1", plano: "anual", codigo: "promo_1" },
      expand: ["latest_invoice.confirmation_secret", "pending_setup_intent"],
    });
  });

  it("sem código: nenhum desconto, e a metadata sem o campo do código", () => {
    const semCodigo = paraPedidoDeAssinatura({ ...pedido, codigoId: null });
    expect(semCodigo.discounts).toBeUndefined();
    expect(semCodigo.metadata).toEqual({ userId: "u1", plano: "anual" });
  });

  it("nunca cobra na criação: a assinatura nasce incompleta, até o site confirmar", () => {
    expect(paraPedidoDeAssinatura({ ...pedido, codigoId: null }).payment_behavior).toBe("default_incomplete");
  });
});

describe("o pedido de cliente que vai à Stripe", () => {
  it("leva o userId da conta — é por ele que o aviso liga a assinatura a alguém", () => {
    expect(paraPedidoDeCliente({ userId: "u1", email: "a@b.c", nome: "Ana" })).toEqual({ email: "a@b.c", name: "Ana", metadata: { userId: "u1" } });
  });

  it("conta sem nome: o cliente nasce sem nome, com o userId", () => {
    expect(paraPedidoDeCliente({ userId: "u1", email: "a@b.c", nome: null })).toEqual({ email: "a@b.c", name: undefined, metadata: { userId: "u1" } });
  });
});
