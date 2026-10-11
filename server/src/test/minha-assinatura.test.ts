import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import type { DetalhesDaAssinatura } from "../lib/stripe-assinatura.js";

// A Stripe na NOSSA fronteira: só o que iria à rede vira dublê — a busca dos detalhes da
// assinatura e a prévia da próxima cobrança. A regra (qual assinatura é a da conta, o que a tela
// recebe) roda de verdade, contra o banco.
const buscarDetalhes = vi.fn<(id: string) => Promise<DetalhesDaAssinatura>>();
const buscarProximaCobranca = vi.fn<(id: string) => Promise<{ centavos: number; moeda: string } | null>>();
vi.mock("../lib/stripe-assinatura.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-assinatura.js")>()),
  buscarDetalhes: (id: string) => buscarDetalhes(id),
  buscarProximaCobranca: (id: string) => buscarProximaCobranca(id),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { AssinaturaNaoEncontrada } from "../lib/stripe.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";

// MINHA ASSINATURA — LER (Fase 4, etapa 4.6). O que estes testes protegem:
//   - nada sai sem login, e sem login a Stripe nem é consultada;
//   - a assinatura é SEMPRE a da conta da sessão: o pedido não tem como apontar outra, e a de
//     outra conta nunca é buscada nem mostrada;
//   - nenhum código da Stripe (assinatura, cliente, preço, cartão) chega ao navegador;
//   - "tem acesso?" é a regra do gate: o que a tela diz nunca discorda do que a aula faz;
//   - a próxima cobrança é a conta da STRIPE, e só é pedida para a assinatura que renova;
//   - a Stripe fora do ar é falha (500), nunca um dado velho; a assinatura que ela não conhece é
//     um aviso (404), não um erro que acorda o operador.

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const [PASSADO, FUTURO] = [new Date("2020-01-01T00:00:00Z"), new Date("2100-01-01T00:00:00Z")];
const EM_30_DIAS = new Date(Date.now() + 30 * DIA);
const VISA = { bandeira: "visa", final: "4242", mes: 12, ano: 2028 };
const outro = `outra-conta-${S}`;
const ANTES = process.env.STRIPE_SECRET_KEY;
let member: string[] = [];
let memberId = "";

const ler = (cookies: string[] = []) => request(servidor).get("/api/billing/minha-assinatura").set("Cookie", cookies);
const doSeed = (status: string, currentPeriodEnd: Date | null) => prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status, currentPeriodEnd } });

/** O que a Stripe diz de cada assinatura, por id: a que não estiver aqui, ela não conhece. */
let naStripe: Record<string, Partial<DetalhesDaAssinatura>> = {};
const ativa = (): Partial<DetalhesDaAssinatura> => ({ status: "active", pagoAte: EM_30_DIAS, fimDoPeriodo: EM_30_DIAS });

beforeAll(async () => {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email: process.env.SEED_MEMBER_EMAIL, password: process.env.SEED_MEMBER_PASSWORD });
  member = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(member.length).toBeGreaterThan(0);
  memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL }, select: { id: true } })).id;
  await prisma.user.create({ data: { id: outro, email: `${outro}@teste.local` } });
});

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  naStripe = {};
  buscarDetalhes.mockReset().mockImplementation(async (id) => {
    const dados = naStripe[id];
    if (!dados) throw new AssinaturaNaoEncontrada(id);
    return { id, status: "active", pagoAte: null, plano: "mensal", preco: { centavos: 9990, moeda: "brl" }, fimDoPeriodo: null, acabaEm: null, cartao: VISA, ...dados };
  });
  buscarProximaCobranca.mockReset().mockResolvedValue({ centavos: 9990, moeda: "brl" });
});

afterEach(async () => {
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await doSeed("active", FUTURO);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: outro } });
  if (ANTES === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ANTES;
});

describe("GET /api/billing/minha-assinatura — quem entra", () => {
  it("sem login: 401, e a Stripe nem é consultada", async () => {
    expect((await ler()).status).toBe(401);
    expect(buscarDetalhes).not.toHaveBeenCalled();
    expect(buscarProximaCobranca).not.toHaveBeenCalled();
  });

  it("sem a chave da Stripe: 503, sem consultar nada", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await ler(member);
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "NaoConfigurado" });
    expect(buscarDetalhes).not.toHaveBeenCalled();
  });

  it("a resposta é por conta: nada fica em cache", async () => {
    naStripe[ASSINATURA_DE_TESTE] = ativa();
    expect((await ler(member)).headers["cache-control"]).toBe("private, no-store");
  });
});

describe("GET /api/billing/minha-assinatura — a conta sem acesso", () => {
  it("nunca assinou (só uma tentativa que não se completou): nenhuma — e a Stripe nem é consultada", async () => {
    await doSeed("incomplete_expired", PASSADO);
    const res = await ler(member);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ situacao: "nenhuma" });
    expect(buscarDetalhes).not.toHaveBeenCalled();
  });

  it("já foi assinante e o período pago venceu: terminada, com o dia em que terminou", async () => {
    await doSeed("canceled", PASSADO);
    const res = await ler(member);
    expect(res.body).toEqual({ situacao: "terminada", terminouEm: PASSADO.toISOString() });
    expect(buscarDetalhes).not.toHaveBeenCalled();
  });

  it("duas assinaturas terminadas: vale o fim mais recente; sem data nenhuma, sem data", async () => {
    const maisNova = new Date("2024-06-01T00:00:00Z");
    await doSeed("canceled", PASSADO);
    await prisma.subscription.create({ data: { ownerUserId: memberId, status: "canceled", currentPeriodEnd: maisNova, stripeSubscriptionId: `sub_${S}_velha` } });
    expect((await ler(member)).body).toEqual({ situacao: "terminada", terminouEm: maisNova.toISOString() });
    await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: `sub_${S}_velha` } });
    await doSeed("unpaid", null);
    expect((await ler(member)).body).toEqual({ situacao: "terminada", terminouEm: null });
  });
});

describe("GET /api/billing/minha-assinatura — a conta com acesso", () => {
  it("ativa e renovando: o plano, o preço, o cartão e a próxima cobrança — o valor é o que a Stripe calculou", async () => {
    naStripe[ASSINATURA_DE_TESTE] = ativa();
    // Com desconto, a renovação custa menos que o preço cheio: a tela mostra o que será cobrado.
    buscarProximaCobranca.mockResolvedValue({ centavos: 4995, moeda: "brl" });
    const res = await ler(member);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      situacao: "ativa",
      plano: "mensal",
      preco: { centavos: 9990, moeda: "brl" },
      proximaCobranca: { centavos: 4995, moeda: "brl", em: EM_30_DIAS.toISOString() },
      acessoAte: null,
      cartao: VISA,
    });
    expect(buscarProximaCobranca).toHaveBeenCalledWith(ASSINATURA_DE_TESTE);
  });

  it("nenhum código da Stripe chega ao navegador", async () => {
    naStripe[ASSINATURA_DE_TESTE] = ativa();
    const texto = JSON.stringify((await ler(member)).body);
    for (const trecho of [ASSINATURA_DE_TESTE, "sub_", "cus_", "price_", "pm_"]) expect(texto, trecho).not.toContain(trecho);
  });

  it("a renovação foi parada: vai cancelar, com acesso até a data — e a próxima cobrança nem é pedida", async () => {
    naStripe[ASSINATURA_DE_TESTE] = { ...ativa(), acabaEm: EM_30_DIAS };
    const res = await ler(member);
    expect(res.body).toMatchObject({ situacao: "vai-cancelar", acessoAte: EM_30_DIAS.toISOString(), proximaCobranca: null, plano: "mensal" });
    expect(buscarProximaCobranca).not.toHaveBeenCalled();
  });

  it("a assinatura já encerrou e ainda tem dias pagos: acesso até o fim deles", async () => {
    await doSeed("canceled", EM_30_DIAS);
    naStripe[ASSINATURA_DE_TESTE] = { status: "canceled", pagoAte: EM_30_DIAS, fimDoPeriodo: EM_30_DIAS };
    expect((await ler(member)).body).toMatchObject({ situacao: "vai-cancelar", acessoAte: EM_30_DIAS.toISOString(), proximaCobranca: null });
    expect(buscarProximaCobranca).not.toHaveBeenCalled();
  });

  it("a última cobrança falhou: atrasada, com o acesso mantido — sem próxima cobrança nem data de fim", async () => {
    await doSeed("past_due", PASSADO);
    naStripe[ASSINATURA_DE_TESTE] = { status: "past_due", pagoAte: PASSADO, fimDoPeriodo: EM_30_DIAS };
    expect((await ler(member)).body).toEqual({ situacao: "atrasada", plano: "mensal", preco: { centavos: 9990, moeda: "brl" }, proximaCobranca: null, acessoAte: null, cartao: VISA });
    expect(buscarProximaCobranca).not.toHaveBeenCalled();
  });

  it("sem cartão guardado (a assinatura de cortesia): o cartão vem vazio", async () => {
    naStripe[ASSINATURA_DE_TESTE] = { ...ativa(), cartao: null };
    buscarProximaCobranca.mockResolvedValue({ centavos: 0, moeda: "brl" });
    expect((await ler(member)).body).toMatchObject({ situacao: "ativa", cartao: null, proximaCobranca: { centavos: 0 } });
  });

  it("a Stripe já diz que acabou e o espelho ainda não soube: terminada — a tela não mostra o dado velho", async () => {
    naStripe[ASSINATURA_DE_TESTE] = { status: "canceled", pagoAte: PASSADO };
    expect((await ler(member)).body).toEqual({ situacao: "terminada", terminouEm: PASSADO.toISOString() });
  });

  it("uma assinatura antiga encerrada e uma nova ativa: a tela mostra a que dá acesso", async () => {
    await doSeed("canceled", PASSADO);
    const nova = `sub_${S}_nova`;
    await prisma.subscription.create({ data: { ownerUserId: memberId, status: "active", currentPeriodEnd: EM_30_DIAS, stripeSubscriptionId: nova } });
    naStripe[nova] = { ...ativa(), plano: "anual", preco: { centavos: 99500, moeda: "brl" } };
    expect((await ler(member)).body).toMatchObject({ situacao: "ativa", plano: "anual" });
    expect(buscarDetalhes.mock.calls.map(([id]) => id)).toEqual([nova]);
  });
});

describe("GET /api/billing/minha-assinatura — a assinatura é a da conta da sessão", () => {
  it("a de OUTRA conta nunca é buscada nem mostrada, e o pedido não tem como apontá-la", async () => {
    const alheia = `sub_${S}_alheia`;
    await prisma.subscription.create({ data: { ownerUserId: outro, status: "active", currentPeriodEnd: EM_30_DIAS, stripeSubscriptionId: alheia } });
    naStripe[alheia] = { ...ativa(), plano: "anual" };
    await doSeed("canceled", PASSADO);
    const res = await request(servidor).get(`/api/billing/minha-assinatura?assinatura=${alheia}&userId=${outro}`).set("Cookie", member);
    expect(res.body).toEqual({ situacao: "terminada", terminouEm: PASSADO.toISOString() });
    expect(buscarDetalhes).not.toHaveBeenCalled();
  });
});

describe("GET /api/billing/minha-assinatura — quando a Stripe não ajuda", () => {
  it("a Stripe não conhece a assinatura que dá acesso (a de mentira do seed): 404, sem inventar dado", async () => {
    const res = await ler(member);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "AssinaturaDesconhecida" });
  });

  it("a mais nova ela não conhece, a outra sim: mostra a que ela conhece", async () => {
    const fantasma = `sub_${S}_fantasma`;
    await prisma.subscription.create({ data: { ownerUserId: memberId, status: "active", currentPeriodEnd: EM_30_DIAS, stripeSubscriptionId: fantasma } });
    naStripe[ASSINATURA_DE_TESTE] = ativa();
    expect((await ler(member)).body).toMatchObject({ situacao: "ativa" });
    expect(buscarDetalhes.mock.calls.map(([id]) => id)).toEqual([fantasma, ASSINATURA_DE_TESTE]);
  });

  it("a Stripe fora do ar: 500, sem plano, sem cartão e sem a mensagem dela", async () => {
    buscarDetalhes.mockRejectedValue(new Error("[stripe] a busca dos detalhes da assinatura falhou: StripeConnectionError"));
    const res = await ler(member);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "ErroInterno" });
  });

  it("a prévia da próxima cobrança falha: 500 — a tela não mostra a assinatura com o valor faltando", async () => {
    naStripe[ASSINATURA_DE_TESTE] = ativa();
    buscarProximaCobranca.mockRejectedValue(new Error("[stripe] a prévia da próxima cobrança falhou: StripeAPIError"));
    expect((await ler(member)).status).toBe(500);
  });
});
