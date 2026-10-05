import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// LISTA DE CURSOS DO ADMIN (27/09/2026 — plano aprovado pelo operador). O cartão
// mostra a capa e o PREENCHIMENTO do curso. O que estes testes protegem: só o
// admin lê a lista, e os campos do preenchimento saem certos — em especial a
// contagem de aulas PUBLICADAS, que é a cadeia (aula publicada em módulo
// publicado), o vídeo como sim/não e a descrição como número de palavras, sem
// o texto inteiro.

const S = `-lista-${Date.now()}`;
let admin: string[] = [];
let member: string[] = [];

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
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
      // Markdown: o marcador de lista e o de negrito não contam como palavra.
      description: "Um **curso** inteiro.\n- com lista",
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

const lista = (cookies: string[]) => request(servidor).get("/api/admin/courses").set("Cookie", cookies);

describe("lista de cursos do admin", () => {
  it("sem login 401; aluno 403", async () => {
    expect((await request(servidor).get("/api/admin/courses")).status).toBe(401);
    expect((await lista(member)).status).toBe(403);
  });

  it("curso completo: capa, vídeo, palavras da descrição e só as aulas publicadas NA CADEIA", async () => {
    const res = await lista(admin);
    const curso = res.body.find((c: { slug: string }) => c.slug === `completo${S}`);

    expect(curso).toMatchObject({
      thumbnailUrl: "https://img.jilsonsantana.com/cursos/completo.webp",
      hasIntroVideo: true,
      descriptionWordCount: 5,
      moduleCount: 2,
      lessonCount: 3,
      publishedLessonCount: 1,
    });
    // Nunca o conteúdo: a lista não carrega a descrição nem o id do vídeo.
    expect(curso).not.toHaveProperty("description");
    expect(curso).not.toHaveProperty("introVideoId");
  });

  it("curso vazio: nada preenchido, e descrição só de espaços não conta", async () => {
    const res = await lista(admin);
    const curso = res.body.find((c: { slug: string }) => c.slug === `vazio${S}`);

    expect(curso).toMatchObject({
      thumbnailUrl: null,
      hasIntroVideo: false,
      descriptionWordCount: 0,
      publishedLessonCount: 0,
    });
  });
});
