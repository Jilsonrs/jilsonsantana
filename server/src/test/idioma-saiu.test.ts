import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// A ESCOLA É SÓ EM PORTUGUÊS (decisão do operador, 12/10/2026 — etapa 4.6c, passo 3).
//
// O servidor não filtra mais lista por idioma nem aceita idioma em pedido. A
// versão anterior do site ainda manda `language` e `?lang=`: os dois são
// IGNORADOS (nunca recusados), e nada nasce em inglês. As sobras em inglês que
// ficam no banco até o passo 4 não aparecem para ninguém.

const MARCA = "⟦sem-idioma⟧";
const SLUG_CURSO = "curso-do-teste-sem-idioma";
const SLUG_TRILHA = "trilha-do-teste-sem-idioma";
const SLUG_PUBLICADO = "curso-publicado-do-teste-sem-idioma";

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}
const admin = () => sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
const aluno = () => sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { in: [SLUG_CURSO, SLUG_PUBLICADO] } } });
  await prisma.learningPlan.deleteMany({ where: { slug: SLUG_TRILHA } });
  await prisma.testimonial.deleteMany({ where: { name: { contains: MARCA } } });
  await prisma.faqItem.deleteMany({ where: { question: { contains: MARCA } } });
});

describe("as listas não filtram mais por idioma", () => {
  it("o catálogo, as trilhas e a busca respondem igual com ou sem ?lang — e ?lang=en não é recusado", async () => {
    for (const rota of ["/api/courses", "/api/trilhas", "/api/search?q=exemplo"]) {
      const sem = await request(servidor).get(rota);
      const com = await request(servidor).get(rota + (rota.includes("?") ? "&" : "?") + "lang=en");
      expect(sem.status, rota).toBe(200);
      expect(com.status, rota).toBe(200);
      expect(com.body, rota).toEqual(sem.body);
    }
    // Um curso publicado (em português, como todos) aparece mesmo para quem ainda pede inglês:
    // antes do passo 3, `?lang=en` devolvia a lista vazia.
    await prisma.course.create({ data: { slug: SLUG_PUBLICADO, title: "Publicado do teste", status: "PUBLISHED" } });
    const pedindoIngles = (await request(servidor).get("/api/courses?lang=en")).body as { slug: string }[];
    expect(pedindoIngles.map((c) => c.slug)).toContain(SLUG_PUBLICADO);
  });
});

describe("nada nasce em inglês: o idioma do pedido é ignorado", () => {
  it("curso", async () => {
    const res = await request(servidor).post("/api/courses").set("Cookie", await admin()).send({ slug: SLUG_CURSO, title: "Curso do teste", language: "en" });
    expect(res.status).toBe(201);
    expect((await prisma.course.findUniqueOrThrow({ where: { slug: SLUG_CURSO } })).language).toBe("PT");

    // Trocar depois também não: o campo é ignorado, e o resto do pedido vale.
    const troca = await request(servidor).patch(`/api/courses/${res.body.id}`).set("Cookie", await admin()).send({ title: "Curso do teste 2", language: "en" });
    expect(troca.status).toBe(200);
    const depois = await prisma.course.findUniqueOrThrow({ where: { slug: SLUG_CURSO } });
    expect(depois.title).toBe("Curso do teste 2");
    expect(depois.language).toBe("PT");
  });

  it("trilha", async () => {
    const res = await request(servidor).post("/api/trilhas").set("Cookie", await admin()).send({ slug: SLUG_TRILHA, name: "Trilha do teste", language: "en" });
    expect(res.status).toBe(201);
    expect((await prisma.learningPlan.findUniqueOrThrow({ where: { slug: SLUG_TRILHA } })).language).toBe("PT");
  });

  it("depoimento e pergunta", async () => {
    const cookies = await admin();
    const d = await request(servidor).post("/api/admin/testimonials").set("Cookie", cookies).send({ language: "en", text: "Texto.", name: `Fulano ${MARCA}` });
    const p = await request(servidor).post("/api/admin/faq").set("Cookie", cookies).send({ language: "en", question: `Pergunta ${MARCA}?`, answer: "Resposta." });
    expect(d.status).toBe(201);
    expect(p.status).toBe(201);
    expect((await prisma.testimonial.findUniqueOrThrow({ where: { id: d.body.id } })).language).toBe("PT");
    expect((await prisma.faqItem.findUniqueOrThrow({ where: { id: p.body.id } })).language).toBe("PT");
  });
});

describe("as sobras em inglês no banco não aparecem no admin", () => {
  it("depoimentos e perguntas: a lista do admin traz só o português", async () => {
    const sobraD = await prisma.testimonial.create({ data: { language: "EN", text: "Leftover.", name: `Sobra ${MARCA}`, status: "PUBLISHED" } });
    const sobraP = await prisma.faqItem.create({ data: { language: "EN", question: `Leftover ${MARCA}?`, answer: "Answer.", status: "PUBLISHED" } });
    const cookies = await admin();

    const depoimentos = (await request(servidor).get("/api/admin/testimonials").set("Cookie", cookies)).body as { id: number; language: string }[];
    const perguntas = (await request(servidor).get("/api/admin/faq").set("Cookie", cookies)).body as { id: number; language: string }[];

    expect(depoimentos.length).toBeGreaterThan(0);
    expect(perguntas.length).toBeGreaterThan(0);
    expect(depoimentos.map((d) => d.id)).not.toContain(sobraD.id);
    expect(perguntas.map((p) => p.id)).not.toContain(sobraP.id);
    expect(new Set([...depoimentos, ...perguntas].map((i) => i.language))).toEqual(new Set(["pt"]));
  });
});

describe("a troca de idioma da conta saiu", () => {
  it("PATCH /api/me/language não existe mais, e a conta não muda", async () => {
    const cookies = await aluno();
    const res = await request(servidor).patch("/api/me/language").set("Cookie", cookies).send({ language: "en" });
    expect(res.status).toBe(404);
    const conta = await prisma.user.findUniqueOrThrow({ where: { email: (process.env.SEED_MEMBER_EMAIL ?? "").toLowerCase() } });
    expect(conta.preferredLanguage).not.toBe("en");
  });
});
