import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";

// O RECIBO DA ESCOLA (etapa 4.7b, bloco 6, passo 6a — decisões do operador, 31/10/2026). Só a Stripe vira dublê (as
// cobranças, a fatura de cada pagamento, o preço, o pagamento Pix e a assinatura pré-paga); a sessão, a conta e os clientes
// dela rodam de verdade, contra o banco. O que protege: sem login, 401; a chave fora do formato, 400; sem a Stripe, 503; a
// cobrança se acha SÓ entre as da conta da sessão (a de outra conta, a que não passou e a que não existe: 404, iguais); o
// cartão traz o plano e o período da linha do preço, o preço cheio e o desconto com o CÓDIGO; a troca de plano traz o
// crédito; o Pix traz o plano da marca e o período da assinatura que ele virou; a conta que não fecha com o total pago não
// mostra preço nenhum; e nenhum código da Stripe nem o CPF da fatura saem na resposta.
type CobrancaFalsa = { id: string; created: number; amount: number; currency: string; status: string; disputed: boolean; refunded: boolean; amount_refunded: number; receipt_url: string | null; outcome: null; failure_code: string | null; payment_method_details: { type: string; card?: { brand: string; last4: string } }; payment_intent: string | null; customer: string };
type FaturaFalsa = { id: string; lines: { data: { amount: number; period: { start: number; end: number }; pricing: { price_details: { price: string } } | null }[] }; discounts: { id: string; object: "discount"; promotion_code: { id: string; code: string } | null }[]; total_discount_amounts: { amount: number; discount: string }[]; customer_tax_ids: { type: string; value: string }[] };
const porCliente = new Map<string, CobrancaFalsa[]>();
const faturaDoPagamento = new Map<string, string>();
const faturas = new Map<string, FaturaFalsa>();
const precos = new Map<string, { id: string; recurring: { interval: string; interval_count: number } }>();
const pagamentos = new Map<string, { id: string; metadata: Record<string, string> }>();
const assinaturasDoCliente = new Map<string, { id: string; metadata: Record<string, string>; items: { data: { current_period_start: number; current_period_end: number }[] } }[]>();
const naoAchou = (oQue: string) => new Error(`a Stripe não conhece ${oQue}`);
const falsa = {
  charges: { list: vi.fn(async (params: { customer: string }) => ({ data: porCliente.get(params.customer) ?? [], has_more: false })) },
  invoicePayments: {
    list: vi.fn(async (params: { payment: { payment_intent: string } }) => {
      const fatura = faturaDoPagamento.get(params.payment.payment_intent);
      return { data: fatura ? [{ invoice: fatura }] : [], has_more: false };
    }),
  },
  invoices: {
    retrieve: vi.fn(async (id: string) => {
      const fatura = faturas.get(id);
      if (!fatura) throw naoAchou(id);
      return fatura;
    }),
  },
  prices: {
    retrieve: vi.fn(async (id: string) => {
      const preco = precos.get(id);
      if (!preco) throw naoAchou(id);
      return preco;
    }),
  },
  paymentIntents: { retrieve: vi.fn(async (id: string) => pagamentos.get(id) ?? { id, metadata: {} }) },
  subscriptions: { list: vi.fn(async (params: { customer: string }) => ({ data: assinaturasDoCliente.get(params.customer) ?? [], has_more: false })) },
};
vi.mock("../lib/stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { chaveDoRecibo } from "../lib/minhas-cobrancas.js";
/** A chave do recibo de uma cobrança: pelo pagamento dela. */
const chaveDe = (c: CobrancaFalsa) => chaveDoRecibo(c.payment_intent ?? c.id);

const S = `${Date.now()}`;
const ANTES = process.env.STRIPE_SECRET_KEY;
const DELA = `cus_${S}_recibo_dela`;
const DE_OUTRA = `cus_${S}_recibo_outra`;
const outra = `recibo-${S}`;
let member: string[] = [];
const DIA = 24 * 60 * 60;
const AGORA = Math.floor(Date.now() / 1000);
const INICIO = AGORA - 2 * DIA;
const FIM = INICIO + 30 * DIA;
const iso = (segundos: number) => new Date(segundos * 1000).toISOString();
let n = 0;
const cobranca = (mudanca: Partial<CobrancaFalsa>): CobrancaFalsa => {
  n++;
  return { id: `ch_${S}_${n}`, created: AGORA - n * 60, amount: 9990, currency: "brl", status: "succeeded", disputed: false, refunded: false, amount_refunded: 0, receipt_url: `https://pay.stripe.com/receipts/payment/r${n}`, outcome: null, failure_code: null, payment_method_details: { type: "card", card: { brand: "visa", last4: "4242" } }, payment_intent: `pi_${S}_${n}`, customer: DELA, ...mudanca };
};
/** Uma fatura de assinatura, com a linha do preço (e, se vier, a do crédito e o desconto com o código). */
const fatura = (pagamento: string, linhas: FaturaFalsa["lines"]["data"], desconto?: { codigo: string; centavos: number }) => {
  const id = `in_${S}_${pagamento}`;
  faturaDoPagamento.set(pagamento, id);
  faturas.set(id, {
    id,
    lines: { data: linhas },
    discounts: desconto ? [{ id: `di_${S}_${pagamento}`, object: "discount", promotion_code: { id: `promo_${S}`, code: desconto.codigo } }] : [],
    total_discount_amounts: desconto ? [{ amount: desconto.centavos, discount: `di_${S}_${pagamento}` }] : [],
    customer_tax_ids: [{ type: "br_cpf", value: "529.982.247-25" }],
  });
};
const linhaDoPreco = (centavos: number, preco: string) => ({ amount: centavos, period: { start: INICIO, end: FIM }, pricing: { price_details: { price: preco } } });

// As cobranças da aluna: o cartão com desconto, a troca de plano (com o crédito), o Pix pré-pago, a que não fecha com o
// total (o saldo do cliente pagou uma parte), e uma que não passou.
const comDesconto = cobranca({ amount: 4995 });
const daTroca = cobranca({ amount: 94900 });
const doPix = cobranca({ amount: 99900, payment_method_details: { type: "pix" } });
const naoFecha = cobranca({ amount: 5000 });
const recusada = cobranca({ status: "failed", failure_code: "card_declined", receipt_url: null });
const deOutraConta = cobranca({ customer: DE_OUTRA, amount: 77700 });
const ler = (chave: string, cookies: string[] = member) => request(servidor).get(`/api/billing/minhas-cobrancas/${chave}`).set("Cookie", cookies);

async function entrar(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  member = await entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  const conta = await prisma.user.findUniqueOrThrow({ where: { email: (process.env.SEED_MEMBER_EMAIL ?? "").toLowerCase() }, select: { id: true } });
  await prisma.user.create({ data: { id: outra, email: `${outra}@teste.local` } });
  // Uma assinatura antiga da aluna (encerrada: não muda o acesso dela) e uma de outra conta.
  await prisma.subscription.create({ data: { stripeSubscriptionId: `sub_${S}_recibo_dela`, stripeCustomerId: DELA, ownerUserId: conta.id, status: "canceled", currentPeriodEnd: new Date((AGORA - DIA) * 1000), plan: "mensal" } });
  await prisma.subscription.create({ data: { stripeSubscriptionId: `sub_${S}_recibo_outra`, stripeCustomerId: DE_OUTRA, ownerUserId: outra, status: "active", currentPeriodEnd: new Date((AGORA + 30 * DIA) * 1000), plan: "mensal" } });
  porCliente.set(DELA, [comDesconto, daTroca, doPix, naoFecha, recusada]);
  porCliente.set(DE_OUTRA, [deOutraConta]);
  precos.set("price_mensal", { id: "price_mensal", recurring: { interval: "month", interval_count: 1 } });
  precos.set("price_anual", { id: "price_anual", recurring: { interval: "year", interval_count: 1 } });
  fatura(`pi_${S}_1`, [linhaDoPreco(9990, "price_mensal")], { codigo: "BLACK50", centavos: 4995 });
  fatura(`pi_${S}_2`, [linhaDoPreco(99900, "price_anual"), { amount: -5000, period: { start: INICIO, end: INICIO }, pricing: null }]);
  pagamentos.set(`pi_${S}_3`, { id: `pi_${S}_3`, metadata: { prepago: "anual", precoId: "price_anual" } });
  assinaturasDoCliente.set(DELA, [
    { id: `sub_${S}_outra_coisa`, metadata: {}, items: { data: [{ current_period_start: 1, current_period_end: 2 }] } },
    { id: `sub_${S}_do_pix`, metadata: { pix_payment_intent: `pi_${S}_3` }, items: { data: [{ current_period_start: INICIO, current_period_end: INICIO + 365 * DIA }] } },
  ]);
  fatura(`pi_${S}_4`, [linhaDoPreco(9990, "price_mensal")]);
  fatura(`pi_${S}_6`, [linhaDoPreco(77700, "price_mensal")]);
});
afterAll(async () => {
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: `${S}_recibo` } } });
  await prisma.user.deleteMany({ where: { id: outra } });
  if (ANTES === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ANTES;
});

describe("o recibo da escola (passo 6a)", () => {
  it("sem login, 401; a chave fora do formato, 400 — e nada vai à Stripe; sem a Stripe configurada, 503", async () => {
    expect((await ler(chaveDe(comDesconto), [])).status).toBe(401);
    for (const chave of ["ch_123", "ABCDEF0123456789", "0123456789abcde"]) expect((await ler(chave)).status, chave).toBe(400);
    expect(falsa.charges.list).not.toHaveBeenCalled();
    delete process.env.STRIPE_SECRET_KEY;
    try {
      const res = await ler(chaveDe(comDesconto));
      expect([res.status, res.body]).toEqual([503, { error: "NaoConfigurado" }]);
    } finally {
      process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
    }
  });

  it("o cartão com desconto: o número, o plano e o período da linha do preço, o preço cheio e o desconto com o código — sem código da Stripe nem o CPF", async () => {
    const chave = chaveDe(comDesconto);
    const res = await ler(chave);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("private, no-store");
    expect(res.body).toEqual({
      em: iso(comDesconto.created),
      centavos: 4995,
      moeda: "brl",
      forma: "cartao",
      cartao: { bandeira: "visa", final: "4242" },
      situacao: "paga",
      devolvido: 0,
      numero: (chave.toUpperCase().match(/.{4}/g) ?? []).join("-"),
      plano: "mensal",
      periodo: { de: iso(INICIO), ate: iso(FIM) },
      detalhe: { preco: 9990, descontos: [{ codigo: "BLACK50", centavos: 4995 }], credito: 0 },
    });
    const texto = JSON.stringify(res.body);
    expect(texto).not.toMatch(/ch_|cus_|sub_|pi_|in_|price_|di_|promo_|pay[.]stripe/);
    expect(texto).not.toMatch(/529[.]?982/);
  });

  it("a troca de plano: o preço do plano novo e o crédito do plano anterior", async () => {
    const res = await ler(chaveDe(daTroca));
    expect([res.body.plano, res.body.centavos, res.body.detalhe]).toEqual(["anual", 94900, { preco: 99900, descontos: [], credito: 5000 }]);
  });

  it("o Pix pré-pago: o plano da marca do pagamento e o período da assinatura que ele virou, sem desconto", async () => {
    const res = await ler(chaveDe(doPix));
    expect([res.body.forma, res.body.plano, res.body.periodo, res.body.detalhe]).toEqual(["pix", "anual", { de: iso(INICIO), ate: iso(INICIO + 365 * DIA) }, { preco: 99900, descontos: [], credito: 0 }]);
  });

  it("a conta que não fecha com o total pago: nenhum preço — só o total, o plano e o período", async () => {
    const res = await ler(chaveDe(naoFecha));
    expect([res.body.centavos, res.body.plano, res.body.periodo, res.body.detalhe]).toEqual([5000, "mensal", { de: iso(INICIO), ate: iso(FIM) }, null]);
  });

  it("a chave de outra conta, a da cobrança que não passou e a que não existe: 404, as três iguais — e a fatura da outra conta nunca é lida", async () => {
    falsa.invoicePayments.list.mockClear();
    for (const chave of [chaveDe(deOutraConta), chaveDe(recusada), "ffffffffffffffff"]) {
      const res = await ler(chave);
      expect([res.status, res.body], chave).toEqual([404, { error: "NaoEncontrado" }]);
    }
    expect(falsa.invoicePayments.list).not.toHaveBeenCalled();
  });
});
