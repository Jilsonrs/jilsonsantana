import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// O ✓ DO PASSO LEGENDAS (decisão do operador, 05/10/2026): TODAS as aulas de
// vídeo publicadas, em módulo publicado, com legenda em dia — a mesma conta do
// "x de y aulas publicadas com legenda" da tela. A apresentação não conta; sem
// aula de vídeo publicada, não há ✓.

const S = `-legendas-ok-${Date.now()}`;
let admin: string[] = [];
let cursoId = 0;
let semVideoId = 0;
const ids = { video1: 0, video2: 0 };

beforeAll(async () => {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  admin = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  const curso = await prisma.course.create({
    data: {
      slug: `curso${S}`,
      title: "Curso",
      language: "PT",
      modules: {
        create: [
          {
            title: "Publicado",
            status: "PUBLISHED",
            lessons: {
              create: [
                { title: "Vídeo 1", kind: "VIDEO", status: "PUBLISHED", displayOrder: 0 },
                { title: "Vídeo 2", kind: "VIDEO", status: "PUBLISHED", displayOrder: 1 },
                { title: "Texto", kind: "TEXT", status: "PUBLISHED", displayOrder: 2 },
                { title: "Vídeo rascunho", kind: "VIDEO", status: "DRAFT", displayOrder: 3 },
              ],
            },
          },
          { title: "Módulo rascunho", status: "DRAFT", lessons: { create: { title: "Vídeo escondido", kind: "VIDEO", status: "PUBLISHED" } } },
        ],
      },
    },
    include: { modules: { include: { lessons: { orderBy: { displayOrder: "asc" } } }, orderBy: { id: "asc" } } },
  });
  cursoId = curso.id;
  Object.assign(ids, { video1: curso.modules[0].lessons[0].id, video2: curso.modules[0].lessons[1].id });
  semVideoId = (
    await prisma.course.create({
      data: {
        slug: `sem-video${S}`,
        title: "Só texto",
        language: "PT",
        modules: { create: { title: "M", status: "PUBLISHED", lessons: { create: { title: "Texto", kind: "TEXT", status: "PUBLISHED" } } } },
      },
    })
  ).id;
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

const completas = async (id = cursoId) =>
  (await request(servidor).get(`/api/admin/courses/${id}`).set("Cookie", admin)).body.legendasCompletas;
const legenda = (lessonId: number) =>
  prisma.caption.create({ data: { lessonId, language: "PT", content: "WEBVTT\n", originalName: "a.vtt" } });

describe("o ✓ do passo Legendas", () => {
  it("uma aula de vídeo publicada sem legenda: sem ✓", async () => {
    await legenda(ids.video1);
    expect(await completas()).toBe(false);
  });

  it("todas as publicadas com legenda: ✓ — o rascunho, o módulo em rascunho e a aula de texto não contam", async () => {
    await legenda(ids.video2);
    expect(await completas()).toBe(true);
  });

  it("legenda que precisa ser reenviada tira o ✓", async () => {
    await prisma.caption.update({ where: { lessonId: ids.video2 }, data: { needsResend: true } });
    expect(await completas()).toBe(false);
  });

  it("curso sem aula de vídeo publicada: sem ✓", async () => {
    expect(await completas(semVideoId)).toBe(false);
  });
});
