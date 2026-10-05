import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
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
    const res = await request(servidor).get("/api/courses?lang=pt");

    expect(res.status).toBe(200);
    const cartao = (res.body as Cartao[]).find((c) => c.slug === COM_VIDEO);
    expect(cartao?.videoSeconds).toBe(3900);
  });

  it("curso sem vídeo devolve 0", async () => {
    const res = await request(servidor).get("/api/courses?lang=pt");
    expect((res.body as Cartao[]).find((c) => c.slug === SEM_VIDEO)?.videoSeconds).toBe(0);
  });
});

describe("a página do curso", () => {
  it("devolve a mesma soma, sem a duração de cada aula", async () => {
    const res = await request(servidor).get(`/api/courses/${COM_VIDEO}`);

    expect(res.status).toBe(200);
    expect(res.body.videoSeconds).toBe(3900);
    const aulas = (res.body.modules as { lessons: Record<string, unknown>[] }[]).flatMap((m) => m.lessons);
    expect(aulas.length).toBeGreaterThan(0);
    for (const aula of aulas) expect(aula).not.toHaveProperty("videoDurationSeconds");
  });

  it("curso sem vídeo devolve 0", async () => {
    const res = await request(servidor).get(`/api/courses/${SEM_VIDEO}`);
    expect(res.body.videoSeconds).toBe(0);
  });
});

// A LISTA DO ADMIN (operador, 30/09/2026: "2 módulos · 5 aulas · 1h 05min" também
// ali): soma TODO vídeo enviado, inclusive rascunho, como o topo do editor e como
// o "5 aulas" da mesma linha. Aula de texto e aula sem vídeo não contam.
describe("a lista de cursos do admin", () => {
  const ADMIN_SLUG = `admin${S}`;
  const V = "aaaaaaaa-2cda-46be-b47d-1118ad7c2ffe";

  it("soma todo vídeo enviado, inclusive de aula e módulo em rascunho", async () => {
    await prisma.course.create({
      data: {
        slug: ADMIN_SLUG,
        title: "Admin",
        language: "PT",
        modules: {
          create: [
            {
              title: "Publicado",
              status: "PUBLISHED",
              lessons: {
                create: [
                  { title: "publicada", status: "PUBLISHED", bunnyVideoId: V, videoDurationSeconds: 600 },
                  { title: "rascunho", status: "DRAFT", bunnyVideoId: V, videoDurationSeconds: 300 },
                  { title: "texto", kind: "TEXT", videoDurationSeconds: 999 },
                  { title: "sem vídeo", videoDurationSeconds: 999 },
                ],
              },
            },
            {
              title: "Rascunho",
              lessons: { create: [{ title: "em módulo rascunho", bunnyVideoId: V, videoDurationSeconds: 3000 }] },
            },
          ],
        },
      },
    });
    const login = await request(servidor).post("/api/auth/sign-in/email").send({
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
    });
    const cookies = (login.headers["set-cookie"] as unknown as string[] | undefined) ?? [];

    const res = await request(servidor).get("/api/admin/courses").set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect((res.body as Cartao[]).find((c) => c.slug === ADMIN_SLUG)?.videoSeconds).toBe(3900);
  });
});

// A PÁGINA DA AULA ("Sobre o curso", acabamento do Antigravity de 30/09/2026): a
// mesma regra das outras leituras. O aluno soma só o vídeo da lista que ele vê; o
// admin soma a lista inteira, com rascunho. Aula de TEXTO nunca soma, nem com uma
// duração antiga guardada.
describe("a página da aula", () => {
  async function umaAulaPublicada(): Promise<number> {
    const aula = await prisma.lesson.findFirstOrThrow({ where: { title: "vídeo publicado", module: { course: { slug: COM_VIDEO } } } });
    return aula.id;
  }

  it("para o aluno, soma só o vídeo publicado em módulo publicado; texto não entra", async () => {
    const res = await request(servidor).get(`/api/lessons/${await umaAulaPublicada()}/aula`);

    expect(res.status).toBe(200);
    expect(res.body.curso.videoSeconds).toBe(3900);
  });

  it("para o admin, soma também o rascunho, e o texto continua de fora", async () => {
    const login = await request(servidor).post("/api/auth/sign-in/email").send({
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
    });
    const cookies = (login.headers["set-cookie"] as unknown as string[] | undefined) ?? [];

    const res = await request(servidor).get(`/api/admin/lessons/${await umaAulaPublicada()}/aula`).set("Cookie", cookies);

    expect(res.status).toBe(200);
    // 600 + 3300 publicados, 300 da aula em rascunho, 1200 do módulo em rascunho.
    expect(res.body.curso.videoSeconds).toBe(5400);
  });

  it("não devolve a duração de cada aula, só o total", async () => {
    const res = await request(servidor).get(`/api/lessons/${await umaAulaPublicada()}/aula`);

    const aulas = (res.body.curso.modulos as { aulas: Record<string, unknown>[] }[]).flatMap((m) => m.aulas);
    expect(aulas.length).toBeGreaterThan(0);
    for (const aula of aulas) expect(aula).not.toHaveProperty("videoDurationSeconds");
  });
});
