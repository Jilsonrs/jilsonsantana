import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// LISTA DE CURSOS DO ADMIN (27/09/2026 — plano aprovado pelo operador). O cartão
// mostra a capa e o PREENCHIMENTO do curso. O que estes testes protegem: só o
// admin lê a lista, e os campos do preenchimento saem certos — em especial a
// contagem de aulas PUBLICADAS, que é a cadeia (aula publicada em módulo
// publicado), e descrição/vídeo como sim/não, sem o texto inteiro.

const S = `-lista-${Date.now()}`;
let admin: string[] = [];
let member: string[] = [];

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(app).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);

  await prisma.course.create({
    data: {
      slug: `completo${S}`,
      title: "Completo",
      language: "PT",
      thumbnailUrl: "https://img.jilsonsantana.com/cursos/completo.webp",
      introVideoId: "eb1c4f77-0cda-46be-b47d-1118ad7c2ffe",
      description: "Um curso inteiro.",
      modules: {
        create: [
          {
            title: "Publicado",
            status: "PUBLISHED",
            lessons: { create: [{ title: "A1", status: "PUBLISHED" }, { title: "A2", status: "DRAFT" }] },
          },
          // Aula publicada dentro de módulo em rascunho NÃO conta: a cadeia manda.
          { title: "Rascunho", status: "DRAFT", lessons: { create: [{ title: "B1", status: "PUBLISHED" }] } },
        ],
      },
    },
  });
  await prisma.course.create({
    data: { slug: `vazio${S}`, title: "Vazio", language: "PT", description: "   " },
  });
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

const lista = (cookies: string[]) => request(app).get("/api/admin/courses").set("Cookie", cookies);

describe("lista de cursos do admin", () => {
  it("sem login 401; aluno 403", async () => {
    expect((await request(app).get("/api/admin/courses")).status).toBe(401);
    expect((await lista(member)).status).toBe(403);
  });

  it("curso completo: capa, vídeo, descrição e só as aulas publicadas NA CADEIA", async () => {
    const res = await lista(admin);
    const curso = res.body.find((c: { slug: string }) => c.slug === `completo${S}`);

    expect(curso).toMatchObject({
      thumbnailUrl: "https://img.jilsonsantana.com/cursos/completo.webp",
      hasIntroVideo: true,
      hasDescription: true,
      moduleCount: 2,
      lessonCount: 3,
      publishedLessonCount: 1,
    });
    // Sim/não, nunca o conteúdo: a lista não carrega a descrição nem o id do vídeo.
    expect(curso).not.toHaveProperty("description");
    expect(curso).not.toHaveProperty("introVideoId");
  });

  it("curso vazio: nada preenchido, e descrição só de espaços não conta", async () => {
    const res = await lista(admin);
    const curso = res.body.find((c: { slug: string }) => c.slug === `vazio${S}`);

    expect(curso).toMatchObject({
      thumbnailUrl: null,
      hasIntroVideo: false,
      hasDescription: false,
      publishedLessonCount: 0,
    });
  });
});
