import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";

// OS NÚMEROS DO MÊS (etapa 4.7b, bloco 6, passo 6c — decisão do operador, P143). Só a Stripe vira dublê (as duas somas do
// dinheiro); as contas do espelho e do registro rodam de verdade, contra o banco. O que protege: só admin; os assinantes
// agora pela regra do gate, divididos em mensal, anual e pré-pagas (o Pix e a paga por fora), só com conta e do modo da chave;
// os novos e os encerrados desde o começo do mês de Brasília; os atrasados agora; o dinheiro da Stripe — e, sem ela, vazio,
// com o resto. O banco da suíte tem linhas de outros arquivos: as contas são pela DIFERENÇA, antes e depois.
const entrouDesde = vi.fn<(desde: Date) => Promise<number>>();
const devolvidoDesde = vi.fn<(desde: Date) => Promise<number>>();
vi.mock("../lib/stripe-numeros.js", () => ({
  entrouDesde: (desde: Date) => entrouDesde(desde),
  devolvidoDesde: (desde: Date) => devolvidoDesde(desde),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { inicioDoMes } from "../lib/numeros-do-mes.js";

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const aluna = `numeros-${S}`;
const ANTES = process.env.STRIPE_SECRET_KEY;
let admin: string[] = [];
let member: string[] = [];
type Corpo = { ativos: { mensal: number; anual: number; prePagas: number; total: number }; novos: number; encerradas: number; atrasados: number; entrou: number | null; devolvido: number | null; desde: string };
const ler = async (cookies: string[] = admin) => request(servidor).get("/api/admin/cobranca/numeros").set("Cookie", cookies);
let n = 0;
const assinatura = (dados: { status?: string; plan?: "mensal" | "anual"; pix?: boolean; porFora?: boolean; ate?: Date; dono?: string | null; livemode?: boolean; criada?: Date }) =>
  prisma.subscription.create({ data: { stripeSubscriptionId: `sub_${S}_numeros_${++n}`, ownerUserId: dados.dono === undefined ? aluna : dados.dono, status: dados.status ?? "active", currentPeriodEnd: dados.ate ?? new Date(Date.now() + 20 * DIA), plan: dados.plan ?? "mensal", pixPaymentIntentId: dados.pix ? `pi_${S}_numeros_${n}` : null, paidOutOfBand: dados.porFora ?? false, livemode: dados.livemode ?? false, ...(dados.criada ? { createdAt: dados.criada } : {}) } });

async function entrar(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

beforeAll(async () => {
  // Uma chave de TESTE: só as assinaturas de teste (livemode falso) entram na conta.
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  await prisma.user.create({ data: { id: aluna, email: `${aluna}@teste.local` } });
});
beforeEach(() => {
  entrouDesde.mockReset().mockResolvedValue(129870);
  devolvidoDesde.mockReset().mockResolvedValue(9990);
});
afterAll(async () => {
  await prisma.billingLog.deleteMany({ where: { stripeSubscriptionId: { contains: `${S}_numeros` } } });
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: `${S}_numeros` } } });
  await prisma.user.deleteMany({ where: { id: aluna } });
  if (ANTES === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ANTES;
});

describe("os números do mês (passo 6c)", () => {
  it("o começo do mês é o de Brasília: 00h do dia 1 lá é 03h UTC", () => {
    expect(inicioDoMes(new Date("2026-11-01T02:59:00Z")).toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(inicioDoMes(new Date("2026-11-01T03:00:00Z")).toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(inicioDoMes(new Date("2026-12-31T23:00:00Z")).toISOString()).toBe("2026-12-01T03:00:00.000Z");
  });

  it("só admin: sem login 401, aluno 403 — e nada vai à Stripe", async () => {
    expect((await ler([])).status).toBe(401);
    expect((await ler(member)).status).toBe(403);
    expect(entrouDesde).not.toHaveBeenCalled();
  });

  it("os assinantes agora pela regra do gate, divididos; os novos, os encerrados e os atrasados; o dinheiro da Stripe desde o começo do mês", async () => {
    const antes = (await ler()).body as Corpo;
    await assinatura({ plan: "mensal" });
    await assinatura({ plan: "anual" });
    await assinatura({ plan: "mensal", pix: true });
    await assinatura({ plan: "anual", porFora: true });
    // Não contam como assinantes: a atrasada há mais de 3 dias, a encerrada, a sem conta, a de outro modo (de verdade, com a chave de teste), a incompleta.
    await assinatura({ status: "past_due", ate: new Date(Date.now() - 10 * DIA) });
    await assinatura({ status: "canceled", ate: new Date(Date.now() - DIA) });
    await assinatura({ dono: null });
    await assinatura({ livemode: true });
    await assinatura({ status: "incomplete" });
    // Do mês passado: assinante, mas não "novo".
    await assinatura({ plan: "mensal", criada: new Date(inicioDoMes().getTime() - DIA) });
    // Duas linhas de encerramento da MESMA assinatura no mês contam uma; a de antes do mês, nenhuma.
    await prisma.billingLog.createMany({ data: [
      { who: "STRIPE", action: "customer.subscription.deleted", stripeSubscriptionId: `sub_${S}_numeros_enc`, detail: "canceled" },
      { who: "STRIPE", action: "customer.subscription.deleted", stripeSubscriptionId: `sub_${S}_numeros_enc`, detail: "canceled" },
      { who: "STRIPE", action: "customer.subscription.deleted", stripeSubscriptionId: `sub_${S}_numeros_velha`, detail: "canceled", createdAt: new Date(inicioDoMes().getTime() - DIA) },
    ] });
    const res = await ler();
    expect(res.status).toBe(200);
    const depois = res.body as Corpo;
    expect({
      total: depois.ativos.total - antes.ativos.total,
      mensal: depois.ativos.mensal - antes.ativos.mensal,
      anual: depois.ativos.anual - antes.ativos.anual,
      prePagas: depois.ativos.prePagas - antes.ativos.prePagas,
      novos: depois.novos - antes.novos,
      encerradas: depois.encerradas - antes.encerradas,
      atrasados: depois.atrasados - antes.atrasados,
    }).toEqual({ total: 5, mensal: 2, anual: 1, prePagas: 2, novos: 6, encerradas: 1, atrasados: 1 });
    expect([depois.entrou, depois.devolvido]).toEqual([129870, 9990]);
    expect(entrouDesde.mock.calls.at(-1)?.[0].toISOString()).toBe(inicioDoMes().toISOString());
    expect(depois.desde).toBe(inicioDoMes().toISOString());
  });

  it("a Stripe fora do ar: o dinheiro vem vazio, e o resto aparece", async () => {
    entrouDesde.mockRejectedValue(new Error("[stripe] a soma das cobranças do mês falhou: api_error, status 500"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await ler();
    expect(res.status).toBe(200);
    expect([res.body.entrou, res.body.devolvido]).toEqual([null, null]);
    expect(typeof res.body.ativos.total).toBe("number");
    vi.restoreAllMocks();
  });
});
