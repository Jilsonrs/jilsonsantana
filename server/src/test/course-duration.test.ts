import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// A DURAÇÃO NO CATÁLOGO E NA PÁGINA DO CURSO (operador, 30/09/2026: "2 módulos ·
// 4 aulas · 1h 05min", e "0min" sem vídeo). Leitura PÚBLICA: soma só o que o
// aluno vê — aula de VÍDEO publicada, em módulo publicado, de curso publicado (a
// mesma cadeia do "4 aulas"). O editor soma rascunho; a vitrine, nunca.

const S = `-duracao-${Date.now()}`;
const COM_VIDEO = `com-video${S}`;
const SEM_VIDEO = `sem-video${S}`;

beforeAll(async () => {
  await prisma.course.create({
    data: {
      slug: COM_VIDEO,
      title: "Com vídeo",
      language: "PT",
      status: "PUBLISHED",
      modules: {
        create: [
          {
            title: "Publicado",
            status: "PUBLISHED",
            lessons: {
              create: [
                { title: "vídeo publicado", status: "PUBLISHED", videoDurationSeconds: 600 },
                { title: "vídeo publicado 2", status: "PUBLISHED", videoDurationSeconds: 3300 },
                { title: "vídeo em rascunho", status: "DRAFT", videoDurationSeconds: 300 },
                { title: "texto", kind: "TEXT", status: "PUBLISHED", videoDurationSeconds: 999 },
                { title: "vídeo processando", status: "PUBLISHED", videoDurationSeconds: null },
              ],
            },
          },
          {
            title: "Rascunho",
            status: "DRAFT",
            lessons: { create: [{ title: "vídeo em módulo rascunho", status: "PUBLISHED", videoDurationSeconds: 1200 }] },
          },
        ],
      },
    },
  });
  await prisma.course.create({
    data: {
      slug: SEM_VIDEO,
      title: "Sem vídeo",
      language: "PT",
      status: "PUBLISHED",
      modules: {
        create: { title: "Só texto", status: "PUBLISHED", lessons: { create: { title: "t", kind: "TEXT", status: "PUBLISHED" } } },
      },
    },
  });
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

type Cartao = { slug: string; videoSeconds: number };

describe("a lista de cursos (cartão do catálogo)", () => {
  it("soma só o vídeo PUBLICADO em módulo publicado; rascunho e texto não entram", async () => {
    const res = await request(app).get("/api/courses?lang=pt");

    expect(res.status).toBe(200);
    const cartao = (res.body as Cartao[]).find((c) => c.slug === COM_VIDEO);
    expect(cartao?.videoSeconds).toBe(3900);
  });

  it("curso sem vídeo devolve 0", async () => {
    const res = await request(app).get("/api/courses?lang=pt");
    expect((res.body as Cartao[]).find((c) => c.slug === SEM_VIDEO)?.videoSeconds).toBe(0);
  });
});

describe("a página do curso", () => {
  it("devolve a mesma soma, sem a duração de cada aula", async () => {
    const res = await request(app).get(`/api/courses/${COM_VIDEO}`);

    expect(res.status).toBe(200);
    expect(res.body.videoSeconds).toBe(3900);
    const aulas = (res.body.modules as { lessons: Record<string, unknown>[] }[]).flatMap((m) => m.lessons);
    expect(aulas.length).toBeGreaterThan(0);
    for (const aula of aulas) expect(aula).not.toHaveProperty("videoDurationSeconds");
  });

  it("curso sem vídeo devolve 0", async () => {
    const res = await request(app).get(`/api/courses/${SEM_VIDEO}`);
    expect(res.body.videoSeconds).toBe(0);
  });
});
