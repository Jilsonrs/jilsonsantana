import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";

// MINHAS COBRANÇAS (etapa 4.7b, bloco 6, passo 6a — decisão do operador, P144). Só a Stripe vira dublê (as cobranças de
// cada cliente); a sessão, a conta e os clientes dela rodam de verdade, contra o banco. O que protege: sem login, 401; sem a
// Stripe, 503; SÓ os clientes da conta da sessão são lidos — o de outra conta, nunca; só a cobrança que passou aparece (a
// recusada e a pendente, não); a devolvida, a devolvida em parte e a contestada dizem isso; o recibo só com `https`; nenhum
// código da Stripe sai na resposta; a ordem é da mais nova à mais antiga.
type CobrancaFalsa = { id: string; created: number; amount: number; currency: string; status: string; disputed: boolean; refunded: boolean; amount_refunded: number; receipt_url: string | null; outcome: null; failure_code: string | null; payment_method_details: { type: string; card?: { brand: string; last4: string } } };
const porCliente = new Map<string, CobrancaFalsa[]>();
const lidos: string[] = [];
const falsa = {
  charges: {
    list: vi.fn(async (params: { customer: string }) => {
      lidos.push(params.customer);
      return { data: porCliente.get(params.customer) ?? [], has_more: false };
    }),
  },
};
vi.mock("../lib/stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

const S = `${Date.now()}`;
const ANTES = process.env.STRIPE_SECRET_KEY;
const DELA = `cus_${S}_minhas_dela`;
const DELA_2 = `cus_${S}_minhas_dela2`;
const DE_OUTRA = `cus_${S}_minhas_outra`;
const outra = `minhas-cobrancas-${S}`;
let member: string[] = [];
const DIA = 24 * 60 * 60;
const AGORA = Math.floor(Date.now() / 1000);
let n = 0;
const cobranca = (mudanca: Partial<CobrancaFalsa>): CobrancaFalsa => ({ id: `ch_${S}_${++n}`, created: AGORA - n * DIA, amount: 9990, currency: "brl", status: "succeeded", disputed: false, refunded: false, amount_refunded: 0, receipt_url: `https://pay.stripe.com/receipts/payment/r${n}`, outcome: null, failure_code: null, payment_method_details: { type: "card", card: { brand: "visa", last4: "4242" } }, ...mudanca });
const ler = (cookies: string[] = member) => request(servidor).get("/api/billing/minhas-cobrancas").set("Cookie", cookies);

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
  await prisma.subscription.create({ data: { stripeSubscriptionId: `sub_${S}_minhas_dela`, stripeCustomerId: DELA, ownerUserId: conta.id, status: "canceled", currentPeriodEnd: new Date(Date.now() - 30 * DIA * 1000), plan: "mensal" } });
  // Outra assinatura dela, noutro cliente da Stripe (a do Pix, por exemplo): as duas listas se juntam, na ordem das datas.
  await prisma.subscription.create({ data: { stripeSubscriptionId: `sub_${S}_minhas_dela2`, stripeCustomerId: DELA_2, ownerUserId: conta.id, status: "canceled", currentPeriodEnd: new Date(Date.now() - 60 * DIA * 1000), plan: "anual" } });
  await prisma.subscription.create({ data: { stripeSubscriptionId: `sub_${S}_minhas_outra`, stripeCustomerId: DE_OUTRA, ownerUserId: outra, status: "active", currentPeriodEnd: new Date(Date.now() + 30 * DIA * 1000), plan: "mensal" } });
  porCliente.set(DE_OUTRA, [cobranca({ amount: 77700 })]);
  porCliente.set(DELA_2, [{ ...cobranca({ amount: 89900, payment_method_details: { type: "pix" } }), created: AGORA - Math.round(2.5 * DIA) }]);
});
beforeEach(() => {
  falsa.charges.list.mockClear();
  lidos.length = 0;
  n = 0;
  porCliente.set(DELA, [
    cobranca({}),
    cobranca({ status: "failed", failure_code: "card_declined", receipt_url: null }),
    cobranca({ status: "pending", receipt_url: null }),
    cobranca({ refunded: true, amount_refunded: 9990 }),
    cobranca({ amount: 99900, amount_refunded: 2500, payment_method_details: { type: "card", card: { brand: "mastercard", last4: "5555" } } }),
    cobranca({ disputed: true }),
    cobranca({ payment_method_details: { type: "pix" } }),
    cobranca({ receipt_url: "javascript:alert(1)" }),
  ]);
});
afterAll(async () => {
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: `${S}_minhas` } } });
  await prisma.user.deleteMany({ where: { id: outra } });
  if (ANTES === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ANTES;
});

describe("minhas cobranças (passo 6a)", () => {
  it("sem login, 401 — e nada vai à Stripe; sem a Stripe configurada, 503", async () => {
    expect((await ler([])).status).toBe(401);
    expect(falsa.charges.list).not.toHaveBeenCalled();
    delete process.env.STRIPE_SECRET_KEY;
    try {
      const res = await ler();
      expect([res.status, res.body]).toEqual([503, { error: "NaoConfigurado" }]);
    } finally {
      process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
    }
  });

  it("só as cobranças que passaram, dos clientes da conta da sessão, da mais nova à mais antiga — sem código da Stripe", async () => {
    const res = await ler();
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("private, no-store");
    expect(lidos).toContain(DELA);
    expect(lidos).toContain(DELA_2);
    expect(lidos).not.toContain(DE_OUTRA);
    const minhas = (res.body as { cobrancas: { em: string; centavos: number; forma: string; cartao: unknown; situacao: string; devolvido: number; recibo: string | null }[] }).cobrancas.filter((c) => c.em >= new Date((AGORA - 9 * DIA) * 1000).toISOString());
    expect(minhas.map((c) => [c.situacao, c.forma, c.centavos, c.devolvido, c.recibo])).toEqual([
      ["paga", "cartao", 9990, 0, "https://pay.stripe.com/receipts/payment/r1"],
      ["paga", "pix", 89900, 0, expect.stringMatching(/^https:[/][/]pay[.]stripe[.]com[/]receipts[/]payment[/]r[0-9]+$/)],
      ["devolvida", "cartao", 9990, 9990, "https://pay.stripe.com/receipts/payment/r4"],
      ["devolvida-em-parte", "cartao", 99900, 2500, "https://pay.stripe.com/receipts/payment/r5"],
      ["contestada", "cartao", 9990, 0, "https://pay.stripe.com/receipts/payment/r6"],
      ["paga", "pix", 9990, 0, "https://pay.stripe.com/receipts/payment/r7"],
      ["paga", "cartao", 9990, 0, null],
    ]);
    expect(minhas[0]?.cartao).toEqual({ bandeira: "visa", final: "4242" });
    expect(minhas[5]?.cartao).toBeNull();
    expect(JSON.stringify(res.body)).not.toMatch(/ch_|cus_|sub_/);
    expect(JSON.stringify(res.body)).not.toContain("77700");
  });
});
