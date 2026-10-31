import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";

// A CONTESTAÇÃO SEM O PAINEL DA STRIPE (etapa 4.7b, bloco 5). Só a rede da Stripe vira dublê; os casos e o registro rodam de
// verdade. O que protege (passo 5a): "Aceitar a perda" só na contestação ABERTA, lida na Stripe agora (o inquérito se
// resolve devolvendo; a decidida não muda); aceita, o caso fecha com quem fez; o caso traz os dois consertos.
const statusDaContestacao = vi.fn<(id: string) => Promise<string | null>>();
const aceitarContestacao = vi.fn<(id: string) => Promise<string>>();
vi.mock("../lib/stripe-reembolso.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-reembolso.js")>()),
  statusDaContestacao: (id: string) => statusDaContestacao(id),
  aceitarContestacao: (id: string) => aceitarContestacao(id),
}));

import servidor from "./servidor.js";
import { prisma, TipoDeCaso } from "../lib/prisma.js";
import { abrirCaso } from "../lib/casos.js";

const S = `${Date.now()}`;
const ANTES = process.env.STRIPE_SECRET_KEY;
let admin: string[] = [];
let adminId = "";
let n = 0;
const casoDe = async () => {
  const chave = `du:du_${S}_${++n}`;
  await abrirCaso({ tipo: TipoDeCaso.CONTESTACAO, chave, urgente: true, assinatura: `sub_${S}_contestada`, centavos: 9990, detalhe: "dinheiro-saiu · fraudulent · prazo 2026-11-20" });
  return { id: (await prisma.billingCase.findUniqueOrThrow({ where: { kind_key: { kind: TipoDeCaso.CONTESTACAO, key: chave } } })).id, contestacao: chave.slice(3) };
};
const resolver = (casoId: number, acao: string) => request(servidor).post(`/api/admin/cobranca/casos/${casoId}/resolver`).set("Cookie", admin).send({ acao });

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD });
  admin = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  adminId = (await prisma.user.findUniqueOrThrow({ where: { email: (process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase() } })).id;
});

beforeEach(() => {
  statusDaContestacao.mockReset().mockResolvedValue("needs_response");
  aceitarContestacao.mockReset().mockResolvedValue("lost");
});

afterAll(async () => {
  await prisma.billingLog.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.billingCase.deleteMany({ where: { key: { contains: S } } });
  if (ANTES === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ANTES;
});

describe("aceitar a perda (passo 5a)", () => {
  it("a contestação aberta: o banco a encerra como perdida, e o caso fecha com quem aceitou — no registro também", async () => {
    const { id, contestacao } = await casoDe();
    const res = await resolver(id, "aceitar-contestacao");
    expect([res.status, res.body]).toEqual([200, { detalhe: "a escola aceitou a perda: o dinheiro fica com a pessoa" }]);
    expect(aceitarContestacao.mock.calls).toEqual([[contestacao]]);
    expect(await prisma.billingCase.findUniqueOrThrow({ where: { id } })).toMatchObject({ open: false, closedBy: "OPERADOR", closedByUserId: adminId });
    expect(await prisma.billingLog.findFirst({ where: { action: "aceitar-contestacao", actorUserId: adminId }, orderBy: { id: "desc" } })).toMatchObject({ who: "OPERADOR", stripeSubscriptionId: `sub_${S}_contestada` });
  });

  it("o inquérito, a já decidida e a que a Stripe não conhece: 409 — nada é aceito, e o caso fica", async () => {
    const { id } = await casoDe();
    for (const status of ["warning_needs_response", "under_review", "won", "lost", null]) {
      statusDaContestacao.mockResolvedValueOnce(status);
      expect((await resolver(id, "aceitar-contestacao")).body).toEqual({ error: "ContestacaoNaoAberta" });
    }
    expect(aceitarContestacao).not.toHaveBeenCalled();
    expect((await prisma.billingCase.findUniqueOrThrow({ where: { id } })).open).toBe(true);
  });

  it("o caso da contestação traz os dois consertos: aceitar a perda e liberar de novo", async () => {
    await casoDe();
    const res = await request(servidor).get("/api/admin/cobranca/casos?situacao=abertos&pagina=1").set("Cookie", admin);
    const doTeste = (res.body as { casos: { tipo: string; consertos: string[]; detalhe: string | null }[] }).casos.filter((c) => c.tipo === "CONTESTACAO" && c.detalhe?.includes("2026-11-20"));
    expect(doTeste.length).toBeGreaterThan(0);
    expect(doTeste.every((c) => JSON.stringify(c.consertos) === JSON.stringify(["aceitar-contestacao", "liberar-de-novo"]))).toBe(true);
  });
});
