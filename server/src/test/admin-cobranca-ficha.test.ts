import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type Stripe from "stripe";
import type { FichaDaCobranca } from "@jilson/core";
import type { ClienteNaStripe } from "../lib/stripe-ficha.js";

// A FICHA DO ALUNO E O "ACHAR PELO CÓDIGO" (etapa 4.7b, passo 1c). Só a leitura na Stripe vira dublê; a montagem
// da ficha roda de verdade, contra o banco. O que protege:
//   - SÓ ADMIN (401/403), o pedido no formato (400) e o que não existe (404);
//   - a ficha junta o NOSSO banco (a conta, as assinaturas, os e-mails, o acesso) e a Stripe (as cobranças de TODOS os
//     clientes da conta, da mais nova para a mais velha; o cartão; o CPF escondido);
//   - a Stripe fora do ar não derruba a ficha: ela sai com o banco e diz isso;
//   - a assinatura SEM conta tem ficha própria (pelo cliente dela); a que tem conta leva à ficha da conta;
//   - o código de um alerta leva à conta certa — o do NOSSO banco sem ir à Stripe.
const lerClienteNaStripe = vi.fn<(clienteId: string) => Promise<ClienteNaStripe>>();
const clienteDoCodigo = vi.fn<(codigo: string) => Promise<string | null>>();
vi.mock("../lib/stripe-ficha.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-ficha.js")>()),
  lerClienteNaStripe: (clienteId: string) => lerClienteNaStripe(clienteId),
  clienteDoCodigo: (codigo: string) => clienteDoCodigo(codigo),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const aluna = `ficha-${S}`;
const CLIENTE_LOGADO = `cus_${S}_logado`;
const CLIENTE_VISITANTE = `cus_${S}_visitante`;
const CLIENTE_SEM_CONTA = `cus_${S}_semconta`;
let admin: string[] = [];
let member: string[] = [];
let assinaturaDaAluna = 0;
let assinaturaSemConta = 0;

async function entrar(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  const cookies = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(cookies.length).toBeGreaterThan(0);
  return cookies;
}
const ficha = (consulta: Record<string, string>, cookies: string[] = admin) => request(servidor).get("/api/admin/cobranca/ficha").query(consulta).set("Cookie", cookies);
const achar = (codigo: string, cookies: string[] = admin) => request(servidor).get("/api/admin/cobranca/achar").query({ codigo }).set("Cookie", cookies);

const cobranca = (id: string, segundos: number, extra: Record<string, unknown> = {}) =>
  ({ id, created: segundos, amount: 9990, currency: "brl", status: "succeeded", disputed: false, refunded: false, amount_refunded: 0, outcome: null, failure_code: null, receipt_url: null, payment_method_details: { type: "card", card: { brand: "visa", last4: "4242" } }, ...extra }) as unknown as Stripe.Charge;
const cliente = (extra: Record<string, unknown>) => ({ id: "cus_x", tax_ids: { data: [] }, invoice_settings: { default_payment_method: null }, ...extra }) as unknown as Stripe.Customer;
const naStripe = (dados: Partial<ClienteNaStripe>): ClienteNaStripe => ({ cliente: null, cobrancas: [], maisCobrancas: false, contestacoes: new Map(), ...dados });

beforeAll(async () => {
  admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  await prisma.user.create({ data: { id: aluna, email: `${aluna}@teste.local`, name: "Fernanda Ficha" } });
  await prisma.stripeCustomer.create({ data: { userId: aluna, stripeCustomerId: CLIENTE_LOGADO, livemode: false } });
  await prisma.guestCheckout.create({ data: { id: `ficha-visitante-${S}`, email: `${aluna}@teste.local`, stripeCustomerId: CLIENTE_VISITANTE, livemode: false, userId: aluna, boasVindasEnviadaEm: new Date() } });
  const sub = await prisma.subscription.create({ data: { ownerUserId: aluna, status: "active", currentPeriodEnd: new Date(Date.now() + 20 * DIA), stripeSubscriptionId: `sub_${S}_aluna`, stripeCustomerId: CLIENTE_LOGADO, plan: "mensal" } });
  assinaturaDaAluna = sub.id;
  await prisma.subscriptionEmail.create({ data: { subscriptionId: sub.id, kind: "CONFIRMADA", reference: "inicio", sentAt: new Date() } });
  const semConta = await prisma.subscription.create({ data: { ownerUserId: null, status: "active", currentPeriodEnd: new Date(Date.now() + 20 * DIA), stripeSubscriptionId: `sub_${S}_semconta`, stripeCustomerId: CLIENTE_SEM_CONTA } });
  assinaturaSemConta = semConta.id;
});

beforeEach(() => {
  lerClienteNaStripe.mockReset().mockImplementation(async (id) => {
    if (id === CLIENTE_LOGADO) return naStripe({ cliente: cliente({ tax_ids: { data: [{ type: "br_cpf", value: "52998224725" }] }, invoice_settings: { default_payment_method: { card: { brand: "visa", last4: "4242", exp_month: 1, exp_year: 2031 } } } }), cobrancas: [cobranca("ch_velha", 1_700_000_000), cobranca("ch_falhou", 1_700_900_000, { status: "failed", outcome: { reason: "insufficient_funds" } })] });
    if (id === CLIENTE_VISITANTE) return naStripe({ cobrancas: [cobranca("ch_do_visitante", 1_700_500_000, { refunded: true, amount_refunded: 9990 })], maisCobrancas: true });
    return naStripe({ cobrancas: [cobranca("ch_sem_conta", 1_700_100_000)] });
  });
  clienteDoCodigo.mockReset().mockResolvedValue(null);
});

afterAll(async () => {
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.guestCheckout.deleteMany({ where: { id: `ficha-visitante-${S}` } });
  await prisma.stripeCustomer.deleteMany({ where: { userId: aluna } });
  await prisma.user.deleteMany({ where: { id: aluna } });
});

describe("a ficha — quem entra e o formato do pedido", () => {
  it("sem login 401, aluno 403 — e a Stripe nem é consultada", async () => {
    expect((await ficha({ conta: aluna }, [])).status).toBe(401);
    expect((await ficha({ conta: aluna }, member)).status).toBe(403);
    expect((await achar("ch_1", member)).status).toBe(403);
    expect(lerClienteNaStripe).not.toHaveBeenCalled();
    expect(clienteDoCodigo).not.toHaveBeenCalled();
  });

  it("sem quem, com os dois, ou com código fora do formato: 400; o que não existe: 404", async () => {
    expect((await ficha({})).status).toBe(400);
    expect((await ficha({ conta: aluna, assinatura: "1" })).status).toBe(400);
    expect((await achar("abc_123")).status).toBe(400);
    expect((await ficha({ conta: `nao-existe-${S}` })).status).toBe(404);
    expect((await ficha({ assinatura: "999999999" })).status).toBe(404);
  });
});

describe("a ficha de uma conta", () => {
  it("junta o banco e a Stripe: a conta, a assinatura, o acesso, os e-mails, as cobranças dos dois clientes, o cartão e o CPF escondido", async () => {
    const res = await ficha({ conta: aluna });
    expect(res.status).toBe(200);
    const corpo = res.body as FichaDaCobranca;
    expect(corpo.conta).toMatchObject({ id: aluna, nome: "Fernanda Ficha", email: `${aluna}@teste.local` });
    expect(corpo.temAcesso).toBe(true);
    expect(corpo.assinaturas.map((a) => [a.id, a.situacao, a.plano])).toEqual([[assinaturaDaAluna, "ativa", "mensal"]]);
    expect(corpo.emails.map((e) => [e.tipo, e.saiu])).toEqual(expect.arrayContaining([["CONFIRMADA", true], ["BOAS_VINDAS", true]]));
    expect(corpo.cobrancas.map((c) => [c.id, c.situacao])).toEqual([["ch_falhou", "falhou"], ["ch_do_visitante", "devolvida"], ["ch_velha", "paga"]]);
    expect(corpo.cobrancas[0]?.motivoDaFalha).toBe("insufficient_funds");
    expect(corpo.maisCobrancas).toBe(true);
    expect(corpo.cartao).toEqual({ bandeira: "visa", final: "4242", mes: 1, ano: 2031 });
    expect(corpo.documento).toBe("CPF 529••••••25");
    expect(JSON.stringify(corpo)).not.toContain("52998224725");
    expect(corpo.stripeIndisponivel).toBe(false);
    expect(lerClienteNaStripe.mock.calls.map(([id]) => id).sort()).toEqual([CLIENTE_LOGADO, CLIENTE_VISITANTE].sort());
  });

  it("a Stripe fora do ar: a ficha sai com o banco e diz que a Stripe não respondeu", async () => {
    lerClienteNaStripe.mockRejectedValue(new Error("[stripe] fora do ar"));
    const res = await ficha({ conta: aluna });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ stripeIndisponivel: true, cobrancas: [], cartao: null, documento: null, temAcesso: true });
    expect((res.body as FichaDaCobranca).assinaturas).toHaveLength(1);
  });

  it("aberta por uma assinatura que tem conta: é a ficha da conta", async () => {
    const res = await ficha({ assinatura: String(assinaturaDaAluna) });
    expect((res.body as FichaDaCobranca).conta?.id).toBe(aluna);
  });
});

describe("a ficha de uma assinatura sem conta", () => {
  it("sem conta e sem acesso; só aquela assinatura e as cobranças do cliente dela", async () => {
    const res = await ficha({ assinatura: String(assinaturaSemConta) });
    expect(res.status).toBe(200);
    const corpo = res.body as FichaDaCobranca;
    expect(corpo.conta).toBeNull();
    expect(corpo.temAcesso).toBe(false);
    expect(corpo.assinaturas.map((a) => a.id)).toEqual([assinaturaSemConta]);
    expect(corpo.cobrancas.map((c) => c.id)).toEqual(["ch_sem_conta"]);
    expect(lerClienteNaStripe.mock.calls).toEqual([[CLIENTE_SEM_CONTA]]);
  });
});

describe("achar pelo código do alerta", () => {
  it("a assinatura, o cliente e o Pix pré-pago se acham no banco, sem ir à Stripe", async () => {
    expect((await achar(`sub_${S}_aluna`)).body).toEqual({ conta: aluna, assinatura: null });
    expect((await achar(`sub_${S}_semconta`)).body).toEqual({ conta: null, assinatura: assinaturaSemConta });
    expect((await achar(CLIENTE_VISITANTE)).body).toEqual({ conta: aluna, assinatura: null });
    expect(clienteDoCodigo).not.toHaveBeenCalled();
  });

  it("a cobrança vai à Stripe pelo cliente; o que ninguém da escola tem: 404", async () => {
    clienteDoCodigo.mockResolvedValueOnce(CLIENTE_LOGADO).mockResolvedValueOnce(null).mockResolvedValueOnce(`cus_${S}_de_ninguem`);
    expect((await achar("ch_123")).body).toEqual({ conta: aluna, assinatura: null });
    expect((await achar("ch_456")).status).toBe(404);
    expect((await achar("du_789")).status).toBe(404);
  });
});
