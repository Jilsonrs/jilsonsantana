import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// A ESCOLA É SÓ EM PORTUGUÊS (decisão do operador, 12/10/2026 — etapa 4.6c).
//
// O banco não tem mais a coluna de idioma (passo 4) e o servidor não lê idioma em
// lugar nenhum. O que uma versão antiga do site — ou qualquer pessoa — ainda
// mande (`language` no corpo, `?lang=` no endereço) é IGNORADO, nunca recusado:
// o pedido vale, e nenhuma resposta leva idioma.

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

describe("as listas não filtram por idioma", () => {
  it("o catálogo, as trilhas e a busca respondem igual com ou sem ?lang — e ?lang=en não é recusado", async () => {
    await prisma.course.create({ data: { slug: SLUG_PUBLICADO, title: "Publicado do teste", status: "PUBLISHED" } });
    for (const rota of ["/api/courses", "/api/trilhas", "/api/search?q=publicado"]) {
      const sem = await request(servidor).get(rota);
      const com = await request(servidor).get(rota + (rota.includes("?") ? "&" : "?") + "lang=en");
      expect(sem.status, rota).toBe(200);
      expect(com.status, rota).toBe(200);
      expect(com.body, rota).toEqual(sem.body);
    }
    // Quem ainda pede inglês recebe o catálogo de sempre — não uma lista vazia.
    const pedindoIngles = (await request(servidor).get("/api/courses?lang=en")).body as { slug: string }[];
    expect(pedindoIngles.map((c) => c.slug)).toContain(SLUG_PUBLICADO);
  });
});

describe("o idioma do pedido é ignorado, e nenhuma resposta leva idioma", () => {
  it("curso: criar e editar", async () => {
    const cookies = await admin();
    const res = await request(servidor).post("/api/courses").set("Cookie", cookies).send({ slug: SLUG_CURSO, title: "Curso do teste", language: "en" });
    expect(res.status).toBe(201);
    expect(res.body.language).toBeUndefined();

    const troca = await request(servidor).patch(`/api/courses/${res.body.id}`).set("Cookie", cookies).send({ title: "Curso do teste 2", language: "en" });
    expect(troca.status).toBe(200);
    expect(troca.body.title).toBe("Curso do teste 2");
    expect(troca.body.language).toBeUndefined();
  });

  it("trilha", async () => {
    const res = await request(servidor).post("/api/trilhas").set("Cookie", await admin()).send({ slug: SLUG_TRILHA, name: "Trilha do teste", language: "en" });
    expect(res.status).toBe(201);
    expect(res.body.language).toBeUndefined();
  });

  it("depoimento e pergunta: criar e listar", async () => {
    const cookies = await admin();
    const d = await request(servidor).post("/api/admin/testimonials").set("Cookie", cookies).send({ language: "en", text: "Texto.", name: `Fulano ${MARCA}` });
    const p = await request(servidor).post("/api/admin/faq").set("Cookie", cookies).send({ language: "en", question: `Pergunta ${MARCA}?`, answer: "Resposta." });
    expect(d.status).toBe(201);
    expect(p.status).toBe(201);

    // O que acabou de ser criado aparece na lista do admin — não some "por ser de outro idioma".
    const depoimentos = (await request(servidor).get("/api/admin/testimonials").set("Cookie", cookies)).body as Record<string, unknown>[];
    const perguntas = (await request(servidor).get("/api/admin/faq").set("Cookie", cookies)).body as Record<string, unknown>[];
    expect(depoimentos.map((x) => x.id)).toContain(d.body.id);
    expect(perguntas.map((x) => x.id)).toContain(p.body.id);
    for (const item of [...depoimentos, ...perguntas]) expect(item.language).toBeUndefined();
  });
});

describe("o banco não tem mais idioma", () => {
  it("nenhuma tabela tem coluna de idioma, a não ser a preferência da conta (passo 5 da etapa)", async () => {
    const colunas = await prisma.$queryRaw<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name ILIKE '%language%'`;
    expect(colunas.map((c) => `${c.table_name}.${c.column_name}`)).toEqual(["user.preferredLanguage"]);
  });

  it("o tipo Language não existe mais", async () => {
    const tipos = await prisma.$queryRaw<{ typname: string }[]>`SELECT typname FROM pg_type WHERE typname = 'Language'`;
    expect(tipos).toEqual([]);
  });
});

describe("a troca de idioma da conta saiu", () => {
  it("PATCH /api/me/language não existe mais, e a conta não muda", async () => {
    const res = await request(servidor).patch("/api/me/language").set("Cookie", await aluno()).send({ language: "en" });
    expect(res.status).toBe(404);
    // A coluna só sai no passo 5 da etapa; até lá, ninguém a grava.
    const conta = await prisma.user.findUniqueOrThrow({ where: { email: (process.env.SEED_MEMBER_EMAIL ?? "").toLowerCase() } });
    expect(conta.preferredLanguage).not.toBe("en");
  });
});
