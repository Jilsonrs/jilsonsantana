import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";

// A CONTESTAÇÃO SEM O PAINEL DA STRIPE (etapa 4.7b, bloco 5). Só a rede da Stripe vira dublê; os casos e o registro rodam de
// verdade. O que protege (passo 5a): "Aceitar a perda" só na contestação ABERTA, lida na Stripe agora (o inquérito se
// resolve devolvendo; a decidida não muda); aceita, o caso fecha com quem fez — e o registro leva o valor perdido; o caso traz
// os dois consertos. A conferência do revisor do bloco 4: o clique duplo (a outra aba fechou no meio) é 409, não 500; e o
// que a Stripe devolve fora do "perdida" não fecha o caso.
const statusDaContestacao = vi.fn<(id: string) => Promise<string | null>>();
const aceitarContestacao = vi.fn<(id: string) => Promise<string>>();
const lerContestacao = vi.fn<(id: string) => Promise<ContestacaoLida | null>>();
const enviarProvasDaContestacao = vi.fn<(id: string, provas: Record<string, string>) => Promise<string>>();
vi.mock("../lib/stripe-reembolso.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-reembolso.js")>()),
  statusDaContestacao: (id: string) => statusDaContestacao(id),
  aceitarContestacao: (id: string) => aceitarContestacao(id),
  lerContestacao: (id: string) => lerContestacao(id),
  enviarProvasDaContestacao: (id: string, provas: Record<string, string>) => enviarProvasDaContestacao(id, provas),
}));
import type { ContestacaoLida } from "../lib/stripe-reembolso.js";

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
  lerContestacao.mockReset().mockResolvedValue({ status: "needs_response", motivo: "fraudulent", centavos: 9990, prazo: new Date("2026-11-20T23:59:59Z"), cobradaEm: new Date("2026-10-30T15:00:00Z") });
  enviarProvasDaContestacao.mockReset().mockResolvedValue("under_review");
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
    expect(await prisma.billingLog.findFirst({ where: { action: "aceitar-contestacao", actorUserId: adminId }, orderBy: { id: "desc" } })).toMatchObject({ who: "OPERADOR", stripeSubscriptionId: `sub_${S}_contestada`, amount: 9990 });
  });

  it("o clique duplo: a outra aba fechou no meio (a Stripe recusa o segundo fechamento) — 409, e nada mais", async () => {
    const { id } = await casoDe();
    statusDaContestacao.mockResolvedValueOnce("needs_response").mockResolvedValueOnce("lost");
    aceitarContestacao.mockRejectedValueOnce(new Error("[stripe] o aceite da contestação falhou: invalid_request_error, status 400"));
    expect((await resolver(id, "aceitar-contestacao")).body).toEqual({ error: "ContestacaoNaoAberta" });
  });

  it("a Stripe devolve outra coisa que não 'perdida': o caso fica aberto, e é erro (o alerta avisa)", async () => {
    const { id } = await casoDe();
    aceitarContestacao.mockResolvedValueOnce("won");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await resolver(id, "aceitar-contestacao")).status).toBe(500);
    expect((await prisma.billingCase.findUniqueOrThrow({ where: { id } })).open).toBe(true);
    vi.restoreAllMocks();
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

  it("o caso da contestação traz os três consertos: responder com provas, aceitar a perda e liberar de novo", async () => {
    await casoDe();
    const res = await request(servidor).get("/api/admin/cobranca/casos?situacao=abertos&pagina=1").set("Cookie", admin);
    const doTeste = (res.body as { casos: { tipo: string; consertos: string[]; detalhe: string | null }[] }).casos.filter((c) => c.tipo === "CONTESTACAO" && c.detalhe?.includes("2026-11-20"));
    expect(doTeste.length).toBeGreaterThan(0);
    expect(doTeste.every((c) => JSON.stringify(c.consertos) === JSON.stringify(["enviar-provas", "aceitar-contestacao", "liberar-de-novo"]))).toBe(true);
  });
});

// RESPONDER COM PROVAS (passo 5b — decisão do operador, P140): o painel MONTA as provas — a data da compra, o nome e o e-mail, as
// aulas assistidas e as horas, os e-mails enviados e a política de reembolso —, a prévia mostra o texto EXATO, e o envio vai uma
// vez só, com a contestação aberta lida agora. O caso fica aberto (sem urgência) até o banco decidir; o registro guarda o envio.
describe("responder com provas (passo 5b)", () => {
  const aluna = `provas-${S}`;
  const SUB = `sub_${S}_provas`;
  let licao = 0;
  let curso = 0;
  const casoDaAluna = async () => {
    const chave = `du:du_${S}_provas_${++n}`;
    await abrirCaso({ tipo: TipoDeCaso.CONTESTACAO, chave, urgente: true, assinatura: SUB, centavos: 9990, detalhe: "dinheiro-saiu · fraudulent · prazo 2026-11-20" });
    return { id: (await prisma.billingCase.findUniqueOrThrow({ where: { kind_key: { kind: TipoDeCaso.CONTESTACAO, key: chave } } })).id, contestacao: chave.slice(3) };
  };
  const previa = (casoId: number, cookies: string[] = admin) => request(servidor).get(`/api/admin/cobranca/casos/${casoId}/provas`).set("Cookie", cookies);
  const campo = (corpo: { campos: { campo: string; texto: string }[] }, nome: string) => corpo.campos.find((c) => c.campo === nome)?.texto ?? null;

  beforeAll(async () => {
    await prisma.user.create({ data: { id: aluna, email: `${aluna}@teste.local`, name: "Ana Souza" } });
    const sub = await prisma.subscription.create({ data: { stripeSubscriptionId: SUB, ownerUserId: aluna, status: "canceled", currentPeriodEnd: new Date(Date.now() - 1000), plan: "mensal", createdAt: new Date("2026-10-01T15:00:00Z") } });
    curso = (await prisma.course.create({ data: { slug: `provas${S}`, title: "Power BI do zero", status: "PUBLISHED" } })).id;
    const modulo = await prisma.module.create({ data: { courseId: curso, title: "Começo", status: "PUBLISHED" } });
    licao = (await prisma.lesson.create({ data: { title: "Primeiro painel", status: "PUBLISHED", videoDurationSeconds: 1800, moduleId: modulo.id } })).id;
    await prisma.lessonProgress.create({ data: { userId: aluna, lessonId: licao, createdAt: new Date("2026-10-02T13:00:00Z"), completed: true, completedAt: new Date("2026-10-02T13:30:00Z") } });
    await prisma.lessonEvent.createMany({ data: [
      { userId: aluna, lessonId: licao, type: "PLAY", positionSeconds: 0, createdAt: new Date("2026-10-02T13:00:00Z") },
      { userId: aluna, lessonId: licao, type: "ENDED", positionSeconds: 1500, createdAt: new Date("2026-10-02T13:25:00Z") },
    ] });
    await prisma.subscriptionEmail.create({ data: { subscriptionId: sub.id, kind: "CONFIRMADA", reference: `ref-${S}`, sentAt: new Date("2026-10-01T15:01:00Z") } });
  });
  afterAll(async () => {
    await prisma.lessonEvent.deleteMany({ where: { userId: aluna } });
    await prisma.lessonProgress.deleteMany({ where: { userId: aluna } });
    await prisma.course.deleteMany({ where: { slug: `provas${S}` } });
    await prisma.billingLog.deleteMany({ where: { OR: [{ userId: aluna }, { stripeSubscriptionId: SUB }] } });
    await prisma.subscriptionEmail.deleteMany({ where: { subscription: { ownerUserId: aluna } } });
    await prisma.subscription.deleteMany({ where: { ownerUserId: aluna } });
    await prisma.user.deleteMany({ where: { id: aluna } });
  });

  it("só admin vê a prévia: sem login 401, aluno 403 — e nada vai à Stripe", async () => {
    const { id } = await casoDaAluna();
    const member = (await request(servidor).post("/api/auth/sign-in/email").send({ email: process.env.SEED_MEMBER_EMAIL, password: process.env.SEED_MEMBER_PASSWORD })).headers["set-cookie"] as unknown as string[];
    expect((await previa(id, [])).status).toBe(401);
    expect((await previa(id, member)).status).toBe(403);
    expect(lerContestacao).not.toHaveBeenCalled();
  });

  it("a prévia: o texto EXATO de cada campo — o nome, o e-mail, desde quando, o que comprou, as aulas e as horas, a política e os e-mails", async () => {
    const { id } = await casoDaAluna();
    const res = await previa(id);
    expect(res.status).toBe(200);
    const corpo = res.body as { prazo: string; motivo: string; centavos: number; campos: { campo: string; texto: string }[] };
    expect([corpo.prazo, corpo.motivo, corpo.centavos]).toEqual(["2026-11-20T23:59:59.000Z", "fraudulent", 9990]);
    expect(corpo.campos.map((c) => c.campo)).toEqual(["customer_name", "customer_email_address", "service_date", "product_description", "access_activity_log", "refund_policy_disclosure", "uncategorized_text"]);
    expect(campo(corpo, "customer_name")).toBe("Ana Souza");
    expect(campo(corpo, "customer_email_address")).toBe(`${aluna}@teste.local`);
    expect(campo(corpo, "service_date")).toBe("01/10/2026");
    expect(campo(corpo, "product_description")).toContain("Assinatura mensal da escola online Jilson Santana");
    expect(campo(corpo, "access_activity_log")).toContain("Aulas abertas: 1; concluídas: 1; tempo assistido: 25 min.");
    expect(campo(corpo, "access_activity_log")).toContain("02/10/2026, 10:00 — Power BI do zero › Primeiro painel: 25 min assistidos; concluída em 02/10/2026, 10:30");
    expect(campo(corpo, "refund_policy_disclosure")).toContain("art. 49");
    expect(campo(corpo, "uncategorized_text")).toContain("Valor contestado: R$ 99,90, cobrado em 30/10/2026. Assinante desde 01/10/2026.");
    expect(campo(corpo, "uncategorized_text")).toContain("01/10/2026 — confirmação da assinatura");
    expect(enviarProvasDaContestacao).not.toHaveBeenCalled();
  });

  it("a contestação que não está aberta (já respondida, decidida, ou o inquérito): 409 na prévia e no envio — nada vai", async () => {
    const { id } = await casoDaAluna();
    for (const status of ["under_review", "won", "lost", "warning_needs_response"]) {
      lerContestacao.mockResolvedValueOnce({ status, motivo: "fraudulent", centavos: 9990, prazo: null, cobradaEm: null }).mockResolvedValueOnce({ status, motivo: "fraudulent", centavos: 9990, prazo: null, cobradaEm: null });
      expect((await previa(id)).body).toEqual({ error: "ContestacaoNaoAberta" });
      expect((await resolver(id, "enviar-provas")).body).toEqual({ error: "ContestacaoNaoAberta" });
    }
    expect(enviarProvasDaContestacao).not.toHaveBeenCalled();
  });

  it("enviar: as MESMAS provas da prévia vão ao banco, uma vez; o caso fica aberto, sem urgência; o registro guarda o envio e o valor", async () => {
    const { id, contestacao } = await casoDaAluna();
    const daPrevia = (await previa(id)).body as { campos: { campo: string; texto: string }[] };
    const res = await resolver(id, "enviar-provas");
    expect([res.status, res.body]).toEqual([200, { detalhe: "as provas foram ao banco; agora é a decisão dele (a ficha mostra a situação da contestação)" }]);
    expect(enviarProvasDaContestacao.mock.calls).toEqual([[contestacao, Object.fromEntries(daPrevia.campos.map((c) => [c.campo, c.texto]))]]);
    expect(await prisma.billingCase.findUniqueOrThrow({ where: { id } })).toMatchObject({ open: true, urgent: false });
    expect((await prisma.billingCase.findUniqueOrThrow({ where: { id } })).detail).toMatch(/^provas enviadas em \d{2}\/\d{2}\/\d{4} · fraudulent$/);
    expect(await prisma.billingLog.findFirst({ where: { action: "enviar-provas", stripeSubscriptionId: SUB }, orderBy: { id: "desc" } })).toMatchObject({ who: "OPERADOR", actorUserId: adminId, userId: aluna, amount: 9990, detail: "provas enviadas ao banco; a contestação ficou under_review" });
  });

  it("o clique duplo: a outra aba já enviou (a Stripe recusa) — 409; a Stripe fora do ar com ela ainda aberta — 500", async () => {
    const { id } = await casoDaAluna();
    enviarProvasDaContestacao.mockRejectedValueOnce(new Error("[stripe] o envio das provas da contestação falhou: invalid_request_error, status 400"));
    statusDaContestacao.mockResolvedValueOnce("under_review");
    expect((await resolver(id, "enviar-provas")).body).toEqual({ error: "ContestacaoNaoAberta" });
    enviarProvasDaContestacao.mockRejectedValueOnce(new Error("[stripe] o envio das provas da contestação falhou: api_error, status 500"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await resolver(id, "enviar-provas")).status).toBe(500);
    vi.restoreAllMocks();
  });

  it("a conta que não abriu nenhuma aula: o registro de acesso diz isso (o operador decide se aceita a perda)", async () => {
    const { registroDeAcesso } = await import("../lib/provas-da-contestacao.js");
    expect(registroDeAcesso("ana@exemplo.com", [], null)).toBe("A conta ana@exemplo.com não abriu nenhuma aula da escola.");
  });
});
