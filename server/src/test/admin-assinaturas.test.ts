import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import type { AssinaturaNaStripe, AssinaturaNoCheckout } from "../lib/stripe.js";

// A Stripe na NOSSA fronteira: só o que iria à rede vira dublê — a lista de assinaturas do
// cliente e a busca de uma assinatura. A rotina da sincronia (a trava, o espelho, a sessão)
// roda de verdade, contra o banco.
const assinaturasDoCliente = vi.fn<(clienteId: string) => Promise<AssinaturaNoCheckout[]>>();
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  assinaturasDoCliente: (clienteId: string) => assinaturasDoCliente(clienteId),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { temAcessoAtivo } from "../lib/acesso.js";
import { AssinaturaNaoEncontrada } from "../lib/stripe.js";
import { sincronizarConta } from "../lib/assinaturas.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";

// FORÇAR A SINCRONIA PELO ADMIN (Fase 4, etapa 4.4 — CLAUDE.md → Membership Gating). O que
// estes testes protegem — é a recuperação do aviso que se perdeu, e não pode virar um desvio
// da cobrança:
//   - SÓ ADMIN: sem login 401, aluno comum 403 (casos 13 e 14 da matriz do plano) — e a Stripe
//     nem é consultada;
//   - o corpo diz só DE QUEM (o e-mail): quais assinaturas conferir é o servidor que acha — as
//     do cliente DESTA conta na Stripe e as que o espelho já conhece dela;
//   - serve aos dois lados: libera quem pagou e ficou trancado; tira o acesso (e a sessão) de
//     quem a Stripe já encerrou;
//   - a assinatura que a Stripe não conhece é relatada, e o espelho dela NUNCA é apagado;
//   - a Stripe fora do ar é falha (500), nunca "conferido".

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const aluno = `sincronia-${S}`;
const emailDoAluno = `${aluno}@teste.local`;
const CLIENTE = `cus_${S}`;
const ANTES = process.env.STRIPE_SECRET_KEY;
let admin: string[] = [];
let member: string[] = [];

async function entrar(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  const cookies = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(cookies.length).toBeGreaterThan(0);
  return cookies;
}
const sincronizar = (corpo: object, cookies: string[] = []) => request(servidor).post("/api/admin/assinaturas/sincronizar").set("Cookie", cookies).send(corpo);
const espelho = (id: string) => prisma.subscription.findUnique({ where: { stripeSubscriptionId: id } });

/** O que a Stripe diz de cada assinatura, por id: a que não estiver aqui, ela não conhece. */
let naStripe: Record<string, Partial<AssinaturaNaStripe>> = {};
const listada = (id: string, status = "active"): AssinaturaNoCheckout => ({ id, status, precoId: "price_mensal", codigoId: null, segredoDoPagamento: null, segredoDoCartao: null });

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  await prisma.user.create({ data: { id: aluno, email: emailDoAluno } });
});

beforeEach(() => {
  naStripe = {};
  assinaturasDoCliente.mockReset().mockResolvedValue([]);
  buscarAssinatura.mockReset().mockImplementation(async (id) => {
    const dados = naStripe[id];
    if (!dados) throw new AssinaturaNaoEncontrada(id);
    return { id, status: "active", pagoAte: new Date(Date.now() + 30 * DIA), clienteId: CLIENTE, userId: aluno, livemode: false, ...dados };
  });
});

afterEach(async () => {
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.stripeCustomer.deleteMany({ where: { userId: aluno } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: aluno } });
  if (ANTES === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ANTES;
});

describe("forçar a sincronia — quem entra", () => {
  it("sem login: 401; aluno comum: 403 — e a Stripe nem é consultada (rota aberta seria um desvio da cobrança)", async () => {
    expect((await sincronizar({ email: emailDoAluno })).status).toBe(401);
    expect((await sincronizar({ email: emailDoAluno }, member)).status).toBe(403);
    expect(assinaturasDoCliente).not.toHaveBeenCalled();
    expect(buscarAssinatura).not.toHaveBeenCalled();
  });

  it("abrir o endereço (GET) não sincroniza nada: nem com login de admin, nem com o e-mail no endereço", async () => {
    // O que se afirma é o que protege em QUALQUER ambiente: a Stripe não é consultada e o espelho
    // não muda. O status não entra — sem rota de GET, o pedido cai no que vem depois de `/api`,
    // e isso muda com o ambiente (aqui, o desvio para o Vite; em produção, a página do site).
    const sub = `sub_${S}_por_get`;
    await prisma.subscription.create({ data: { ownerUserId: aluno, status: "past_due", currentPeriodEnd: null, stripeSubscriptionId: sub } });
    naStripe[sub] = { status: "canceled", pagoAte: null };
    await request(servidor).get(`/api/admin/assinaturas/sincronizar?email=${encodeURIComponent(emailDoAluno)}`).set("Cookie", admin);
    expect(assinaturasDoCliente).not.toHaveBeenCalled();
    expect(buscarAssinatura).not.toHaveBeenCalled();
    expect((await espelho(sub))?.status).toBe("past_due");
  });

  it("sem e-mail, ou com algo que não é e-mail: 400, sem ir à Stripe", async () => {
    for (const corpo of [{}, { email: "" }, { email: "   " }, { email: "nao-e-email" }, { email: 7 }]) {
      const res = await sincronizar(corpo, admin);
      expect(res.status).toBe(400);
    }
    expect(buscarAssinatura).not.toHaveBeenCalled();
  });

  it("e-mail de conta que não existe: 404 ContaNaoEncontrada", async () => {
    const res = await sincronizar({ email: `ninguem-${S}@teste.local` }, admin);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "ContaNaoEncontrada" });
    expect(assinaturasDoCliente).not.toHaveBeenCalled();
  });

  it("sem a chave secreta: 503, sem ir à Stripe", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    try {
      const res = await sincronizar({ email: emailDoAluno }, admin);
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: "NaoConfigurado" });
    } finally {
      process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
    }
    expect(assinaturasDoCliente).not.toHaveBeenCalled();
  });
});

describe("forçar a sincronia — o que ela faz", () => {
  it("o aviso se perdeu: libera quem pagou — o espelho nasce do que a Stripe diz, e a resposta conta o que foi conferido", async () => {
    const sub = `sub_${S}_paga`;
    const pagoAte = new Date(Date.now() + 20 * DIA);
    await prisma.stripeCustomer.create({ data: { userId: aluno, stripeCustomerId: CLIENTE, livemode: false } });
    assinaturasDoCliente.mockResolvedValue([listada(sub)]);
    naStripe[sub] = { pagoAte };
    expect(await temAcessoAtivo(aluno)).toBe(false);

    const res = await sincronizar({ email: emailDoAluno }, admin);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ temAcesso: true, assinaturas: [{ id: sub, resultado: "atualizada", status: "active", pagoAte: pagoAte.toISOString() }] });
    expect(res.headers["cache-control"]).toBe("private, no-store");
    // As assinaturas conferidas são as do cliente DESTA conta — e de mais ninguém.
    expect(assinaturasDoCliente).toHaveBeenCalledTimes(1);
    expect(assinaturasDoCliente).toHaveBeenCalledWith(CLIENTE);
    expect(await espelho(sub)).toMatchObject({ ownerUserId: aluno, status: "active" });
    expect(await temAcessoAtivo(aluno)).toBe(true);
  });

  it("a Stripe já encerrou e o aviso se perdeu: tira o acesso — o espelho que dizia ativa passa a cancelada", async () => {
    const sub = `sub_${S}_encerrada`;
    await prisma.subscription.create({ data: { ownerUserId: aluno, status: "active", currentPeriodEnd: new Date(Date.now() + 5 * DIA), stripeSubscriptionId: sub } });
    naStripe[sub] = { status: "canceled", pagoAte: new Date(Date.now() - DIA) };
    expect(await temAcessoAtivo(aluno)).toBe(true);

    const res = await sincronizar({ email: emailDoAluno }, admin);
    expect(res.status).toBe(200);
    expect(res.body.temAcesso).toBe(false);
    expect(res.body.assinaturas).toMatchObject([{ id: sub, resultado: "atualizada", status: "canceled" }]);
    expect((await espelho(sub))?.status).toBe("canceled");
    expect(await temAcessoAtivo(aluno)).toBe(false);
  });

  it("quem perde o acesso pela sincronia do admin sai da conta: o cookie de antes deixa de valer", async () => {
    // A conta com sessão de verdade é a do member@; a assinatura de teste dele sai do caminho.
    const memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL }, select: { id: true } })).id;
    const sub = `sub_${S}_do_member`;
    await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "canceled", currentPeriodEnd: new Date("2020-01-01T00:00:00Z") } });
    try {
      await prisma.subscription.create({ data: { ownerUserId: memberId, status: "active", currentPeriodEnd: new Date(Date.now() + 5 * DIA), stripeSubscriptionId: sub } });
      const cookies = await entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
      expect((await request(servidor).get("/api/me").set("Cookie", cookies)).status).toBe(200);
      naStripe[sub] = { status: "canceled", pagoAte: new Date(Date.now() - DIA), userId: memberId };

      const res = await sincronizar({ email: process.env.SEED_MEMBER_EMAIL }, admin);
      expect(res.body.temAcesso).toBe(false);
      // A assinatura de teste do seed não existe na Stripe: relatada, e continua no banco.
      expect(res.body.assinaturas).toEqual(expect.arrayContaining([{ id: ASSINATURA_DE_TESTE, resultado: "nao-encontrada", status: null, pagoAte: null }]));
      expect(await espelho(ASSINATURA_DE_TESTE)).not.toBeNull();
      expect((await request(servidor).get("/api/me").set("Cookie", cookies)).status).toBe(401);
      // Quem pediu a sincronia continua logado.
      expect((await request(servidor).get("/api/me").set("Cookie", admin)).status).toBe(200);
    } finally {
      await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "active", currentPeriodEnd: new Date("2100-01-01T00:00:00Z") } });
      member = await entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
    }
  });

  it("confere as da Stripe E as do espelho, sem repetir: a que a Stripe não conhece é relatada, o espelho dela fica, e as outras seguem", async () => {
    const [nova, conhecida, sumida] = [`sub_${S}_nova`, `sub_${S}_conhecida`, `sub_${S}_sumida`];
    await prisma.stripeCustomer.create({ data: { userId: aluno, stripeCustomerId: CLIENTE, livemode: false } });
    await prisma.subscription.create({ data: { ownerUserId: aluno, status: "past_due", currentPeriodEnd: null, stripeSubscriptionId: conhecida } });
    await prisma.subscription.create({ data: { ownerUserId: aluno, status: "active", currentPeriodEnd: null, stripeSubscriptionId: sumida } });
    assinaturasDoCliente.mockResolvedValue([listada(nova, "incomplete"), listada(conhecida, "canceled")]);
    naStripe[nova] = { status: "incomplete", pagoAte: null };
    naStripe[conhecida] = { status: "canceled", pagoAte: new Date(Date.now() - DIA) };

    const res = await sincronizar({ email: emailDoAluno }, admin);
    expect(res.status).toBe(200);
    const porId = Object.fromEntries((res.body.assinaturas as { id: string; resultado: string; status: string | null }[]).map((a) => [a.id, a]));
    expect(Object.keys(porId).sort()).toEqual([conhecida, nova, sumida].sort());
    expect(buscarAssinatura).toHaveBeenCalledTimes(3);
    expect(porId[nova]).toMatchObject({ resultado: "atualizada", status: "incomplete" });
    expect(porId[conhecida]).toMatchObject({ resultado: "atualizada", status: "canceled" });
    expect(porId[sumida]).toEqual({ id: sumida, resultado: "nao-encontrada", status: null, pagoAte: null });
    // Relatada, NUNCA apagada: a linha continua como estava.
    expect((await espelho(sumida))?.status).toBe("active");
  });

  it("a Stripe não diz de que conta é a assinatura: sem-conta — o espelho não nasce, e a conta não ganha acesso", async () => {
    const sub = `sub_${S}_sem_dono`;
    await prisma.stripeCustomer.create({ data: { userId: aluno, stripeCustomerId: CLIENTE, livemode: false } });
    assinaturasDoCliente.mockResolvedValue([listada(sub)]);
    naStripe[sub] = { userId: null };
    const res = await sincronizar({ email: emailDoAluno }, admin);
    expect(res.body).toMatchObject({ temAcesso: false, assinaturas: [{ id: sub, resultado: "sem-conta", status: "active" }] });
    expect(await espelho(sub)).toBeNull();
  });

  it("conta que nunca passou pela Stripe (sem cliente e sem espelho): lista vazia, e a Stripe nem é consultada", async () => {
    const res = await sincronizar({ email: emailDoAluno }, admin);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ temAcesso: false, assinaturas: [] });
    expect(assinaturasDoCliente).not.toHaveBeenCalled();
    expect(buscarAssinatura).not.toHaveBeenCalled();
  });

  it("o e-mail colado com espaço nas pontas e em MAIÚSCULAS acha a mesma conta", async () => {
    const sub = `sub_${S}_maiuscula`;
    await prisma.subscription.create({ data: { ownerUserId: aluno, status: "incomplete", currentPeriodEnd: null, stripeSubscriptionId: sub } });
    naStripe[sub] = {};
    const res = await sincronizar({ email: `  ${emailDoAluno.toUpperCase()} ` }, admin);
    expect(res.status).toBe(200);
    expect(res.body.temAcesso).toBe(true);
  });

  it("o e-mail vale AO PÉ DA LETRA: o \"_\" não é curinga — um e-mail parecido não confere a conta de outra pessoa", async () => {
    // Achado da revisão de segurança da etapa 4.4: na busca "sem diferenciar maiúsculas" do
    // banco, o "_" vale por qualquer caractere — `sincronia_…` acharia a conta `sincronia-…`, e o
    // admin leria "esta conta tem acesso" de outra pessoa.
    const sub = `sub_${S}_parecida`;
    await prisma.subscription.create({ data: { ownerUserId: aluno, status: "incomplete", currentPeriodEnd: null, stripeSubscriptionId: sub } });
    naStripe[sub] = {};
    const parecido = emailDoAluno.replace("sincronia-", "sincronia_");
    expect(parecido).not.toBe(emailDoAluno);
    const res = await sincronizar({ email: parecido }, admin);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "ContaNaoEncontrada" });
    expect(buscarAssinatura).not.toHaveBeenCalled();
    expect((await espelho(sub))?.status).toBe("incomplete");
  });

  it("o corpo diz só DE QUEM: uma assinatura apontada no corpo não é conferida nem ligada à conta", async () => {
    naStripe.sub_de_outra_pessoa = { userId: aluno };
    const res = await sincronizar({ email: emailDoAluno, assinaturaId: "sub_de_outra_pessoa", userId: "outro" }, admin);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ temAcesso: false, assinaturas: [] });
    expect(buscarAssinatura).not.toHaveBeenCalled();
  });

  it("a Stripe fora do ar: 500 — nunca \"conferido\" —, e o espelho fica como estava", async () => {
    const sub = `sub_${S}_fora_do_ar`;
    await prisma.subscription.create({ data: { ownerUserId: aluno, status: "past_due", currentPeriodEnd: null, stripeSubscriptionId: sub } });
    buscarAssinatura.mockRejectedValue(new Error("a Stripe não respondeu"));
    const res = await sincronizar({ email: emailDoAluno }, admin);
    expect(res.status).toBe(500);
    expect(res.body.temAcesso).toBeUndefined();
    expect((await espelho(sub))?.status).toBe("past_due");
  });

  it("chamada sem a conta: recusa (fecha na dúvida) — um filtro vazio conferiria as assinaturas de todo mundo", async () => {
    await prisma.subscription.create({ data: { ownerUserId: aluno, status: "incomplete", currentPeriodEnd: null, stripeSubscriptionId: `sub_${S}_de_alguem` } });
    await expect(sincronizarConta("")).rejects.toThrow("sem a conta");
    await expect(sincronizarConta(undefined as unknown as string)).rejects.toThrow("sem a conta");
    expect(buscarAssinatura).not.toHaveBeenCalled();
  });

  it("o registro leva ids e status — nunca o e-mail digitado", async () => {
    const sub = `sub_${S}_registro`;
    await prisma.subscription.create({ data: { ownerUserId: aluno, status: "incomplete", currentPeriodEnd: null, stripeSubscriptionId: sub } });
    naStripe[sub] = {};
    const registro = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      await sincronizar({ email: emailDoAluno }, admin);
      const linhas = registro.mock.calls.flat().join(" ");
      expect(linhas).toContain("sincronia pelo admin");
      expect(linhas).toContain(aluno);
      expect(linhas).toContain(sub);
      expect(linhas).not.toContain(emailDoAluno);
    } finally {
      registro.mockRestore();
    }
  });
});
