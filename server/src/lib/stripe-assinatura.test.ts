import { describe, it, expect } from "vitest";
import type Stripe from "stripe";
import { paraCartao, paraDetalhesDaAssinatura } from "./stripe-assinatura.js";
import { planoDoPreco } from "./stripe.js";

// A ASSINATURA DA STRIPE NO FORMATO DA TELA (Fase 4, etapa 4.6) — funções puras, teste unitário
// (CLAUDE.md → Testing: só função pura, sem I/O). O que protege: a tela de Faturamento e
// Assinatura nunca mostra o plano errado, a data errada de fim nem o cartão que não é o cobrado —
// e do cartão só saem a bandeira, os 4 últimos e a validade.

const DIA = 24 * 60 * 60;
const inicio = 1_800_000_000;
const fim = inicio + 30 * DIA;

function preco({ intervalo = "month", cada = 1, centavos = 9990 as number | null, chave = "assinatura_mensal" as string | null } = {}): Stripe.Price {
  // Seguro: o objeto de teste tem só os campos que a função lê; a forma completa é da Stripe.
  return { id: "price_1", lookup_key: chave, unit_amount: centavos, currency: "brl", recurring: { interval: intervalo, interval_count: cada } } as unknown as Stripe.Price;
}

const VISA = { id: "pm_visa", card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2028 } };
const MASTER = { id: "pm_master", card: { brand: "mastercard", last4: "4444", exp_month: 1, exp_year: 2030 } };

function assinatura({
  status = "active",
  doPreco = preco(),
  acabaNoFim = false,
  acabaEm = null as number | null,
  cartao = VISA as object | string | null,
  cliente = { id: "cus_1", metadata: {}, invoice_settings: { default_payment_method: null as object | string | null } } as object | string,
  pausa = null as { behavior: string } | null,
  itens = undefined as object[] | undefined,
} = {}): Stripe.Subscription {
  // Seguro: o objeto de teste tem só os campos que a função lê; a forma completa é da Stripe.
  return {
    id: "sub_1",
    status,
    latest_invoice: { status: "paid" },
    items: { data: itens ?? [{ current_period_start: inicio, current_period_end: fim, price: doPreco }] },
    metadata: {},
    customer: cliente,
    pause_collection: pausa,
    livemode: false,
    cancel_at_period_end: acabaNoFim,
    cancel_at: acabaEm,
    default_payment_method: cartao,
  } as unknown as Stripe.Subscription;
}

describe("de que plano é o preço", () => {
  it("pelo intervalo da cobrança: por mês é o mensal, por ano é o anual", () => {
    expect(planoDoPreco(preco())).toBe("mensal");
    expect(planoDoPreco(preco({ intervalo: "year" }))).toBe("anual");
  });

  it("o preço ANTIGO, que perdeu a lookup key quando o valor mudou, continua sendo do plano dele", () => {
    expect(planoDoPreco(preco({ chave: null }))).toBe("mensal");
    // E a chave nunca decide: a do mensal num preço que renova por ano é o anual.
    expect(planoDoPreco(preco({ intervalo: "year", chave: "assinatura_mensal" }))).toBe("anual");
  });

  it("preço que renova a cada 3 meses, por semana, ou que nem renova: nenhum plano", () => {
    expect(planoDoPreco(preco({ cada: 3 }))).toBeNull();
    expect(planoDoPreco(preco({ intervalo: "week" }))).toBeNull();
    // Seguro: preço avulso, sem `recurring` — só o campo que a função lê.
    expect(planoDoPreco({ id: "price_avulso", recurring: null } as unknown as Stripe.Price)).toBeNull();
  });
});

describe("a assinatura da Stripe no formato da tela", () => {
  it("o plano, o preço cheio e o fim do período", () => {
    const detalhes = paraDetalhesDaAssinatura(assinatura({ doPreco: preco({ intervalo: "year", centavos: 99500 }) }));
    expect(detalhes.plano).toBe("anual");
    expect(detalhes.preco).toEqual({ centavos: 99500, moeda: "brl" });
    expect(detalhes.fimDoPeriodo?.getTime()).toBe(fim * 1000);
  });

  it("preço que não é de nenhum dos dois planos: sem plano e sem preço, em vez de um rótulo errado", () => {
    const detalhes = paraDetalhesDaAssinatura(assinatura({ doPreco: preco({ cada: 6 }) }));
    expect([detalhes.plano, detalhes.preco]).toEqual([null, null]);
  });

  it("sem item: sem plano, sem preço e sem data — não quebra", () => {
    const detalhes = paraDetalhesDaAssinatura(assinatura({ itens: [] }));
    expect([detalhes.plano, detalhes.preco, detalhes.fimDoPeriodo, detalhes.pagoAte]).toEqual([null, null, null, null]);
  });

  it("renovando: não acaba", () => {
    expect(paraDetalhesDaAssinatura(assinatura()).acabaEm).toBeNull();
  });

  it("marcada para acabar no fim do período: acaba no fim do período", () => {
    expect(paraDetalhesDaAssinatura(assinatura({ acabaNoFim: true })).acabaEm?.getTime()).toBe(fim * 1000);
  });

  it("marcada para acabar numa data: vale a data que a Stripe diz", () => {
    const data = inicio + 10 * DIA;
    expect(paraDetalhesDaAssinatura(assinatura({ acabaEm: data })).acabaEm?.getTime()).toBe(data * 1000);
    expect(paraDetalhesDaAssinatura(assinatura({ acabaNoFim: true, acabaEm: data })).acabaEm?.getTime()).toBe(data * 1000);
  });

  it("o status e o 'pago até' são os do ESPELHO: a cobrança pausada é `paused`", () => {
    const detalhes = paraDetalhesDaAssinatura(assinatura({ pausa: { behavior: "void" } }));
    expect(detalhes.status).toBe("paused");
    expect(detalhes.pagoAte?.getTime()).toBe(fim * 1000);
  });
});

describe("o cartão que a tela mostra", () => {
  it("o da assinatura: a bandeira, os 4 últimos e a validade — e mais nada", () => {
    expect(paraDetalhesDaAssinatura(assinatura()).cartao).toEqual({ bandeira: "visa", final: "4242", mes: 12, ano: 2028 });
  });

  it("assinatura sem cartão próprio: o padrão do cliente (é o que a Stripe cobra)", () => {
    const cliente = { id: "cus_1", metadata: {}, invoice_settings: { default_payment_method: MASTER } };
    expect(paraDetalhesDaAssinatura(assinatura({ cartao: null, cliente })).cartao).toEqual({ bandeira: "mastercard", final: "4444", mes: 1, ano: 2030 });
  });

  it("os dois: vale o da assinatura", () => {
    const cliente = { id: "cus_1", metadata: {}, invoice_settings: { default_payment_method: MASTER } };
    expect(paraDetalhesDaAssinatura(assinatura({ cliente })).cartao?.final).toBe("4242");
  });

  it("nenhum, cliente apagado ou só o id do cliente: sem cartão", () => {
    expect(paraDetalhesDaAssinatura(assinatura({ cartao: null })).cartao).toBeNull();
    expect(paraDetalhesDaAssinatura(assinatura({ cartao: null, cliente: { id: "cus_1", deleted: true } })).cartao).toBeNull();
    expect(paraDetalhesDaAssinatura(assinatura({ cartao: null, cliente: "cus_1" })).cartao).toBeNull();
  });

  it("forma de pagamento que veio só com o id, ou que não é cartão: sem cartão", () => {
    expect(paraCartao("pm_sem_expandir")).toBeNull();
    // Seguro: uma forma de pagamento que não é cartão — só os campos que a função lê.
    expect(paraCartao({ id: "pm_pix", type: "pix" } as unknown as Stripe.PaymentMethod)).toBeNull();
    expect(paraCartao(null)).toBeNull();
  });
});
