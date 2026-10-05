import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// "ESTE CURSO INCLUI" — AS LINHAS QUE SE CALCULAM SOZINHAS (decisões do operador,
// 05/10/2026): horas de vídeo, artigos, aulas grátis, arquivos e legendas. O
// aluno e o visitante contam só a cadeia publicada; o admin (a prévia), todas.
// Legendas: só quando TODAS as aulas de vídeo têm legenda em dia.

const S = `-inclui-${Date.now()}`;
let admin: string[] = [];
let cursoId = 0;
const ids = { video1: 0, video2: 0, texto: 0, rascunhoTexto: 0, moduloRascunhoVideo: 0 };

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
      status: "PUBLISHED",
      modules: {
        create: [
          {
            title: "Publicado",
            status: "PUBLISHED",
            lessons: {
              create: [
                { title: "Vídeo 1", kind: "VIDEO", status: "PUBLISHED", isFreePreview: true, videoDurationSeconds: 600, displayOrder: 0 },
                { title: "Vídeo 2", kind: "VIDEO", status: "PUBLISHED", videoDurationSeconds: 300, displayOrder: 1 },
                { title: "Texto", kind: "TEXT", status: "PUBLISHED", videoDurationSeconds: 999, displayOrder: 2 },
                { title: "Texto rascunho", kind: "TEXT", status: "DRAFT", isFreePreview: true, displayOrder: 3 },
              ],
            },
          },
          {
            title: "Módulo rascunho",
            status: "DRAFT",
            lessons: { create: { title: "Vídeo escondido", kind: "VIDEO", status: "PUBLISHED", videoDurationSeconds: 1200 } },
          },
        ],
      },
    },
    include: { modules: { include: { lessons: { orderBy: { displayOrder: "asc" } } }, orderBy: { id: "asc" } } },
  });
  cursoId = curso.id;
  const [video1, video2, texto, rascunhoTexto] = curso.modules[0].lessons;
  Object.assign(ids, { video1: video1.id, video2: video2.id, texto: texto.id, rascunhoTexto: rascunhoTexto.id, moduloRascunhoVideo: curso.modules[1].lessons[0].id });
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

const legenda = (lessonId: number, needsResend = false) =>
  prisma.caption.create({ data: { lessonId, language: "PT", content: "WEBVTT\n", originalName: "a.vtt", needsResend } });
const venda = async () => (await request(servidor).get(`/api/courses/curso${S}`)).body.inclui;
const aulaDoAluno = async () => (await request(servidor).get(`/api/lessons/${ids.video1}/aula`)).body.curso.inclui;
const previa = async () => (await request(servidor).get(`/api/admin/courses/${cursoId}/pagina`).set("Cookie", admin)).body.curso.inclui;

describe("as contas — aluno e visitante só a cadeia publicada", () => {
  it("página de venda: vídeo só de aula de vídeo, artigos e aulas grátis do publicado; sem arquivo e sem legenda", async () => {
    expect(await venda()).toEqual({ segundosDeVideo: 900, artigos: 1, aulasGratis: 1, arquivos: false, legendas: false });
  });

  it("a página da aula (visitante, na prévia grátis) conta igual", async () => {
    expect(await aulaDoAluno()).toEqual({ segundosDeVideo: 900, artigos: 1, aulasGratis: 1, arquivos: false, legendas: false });
  });

  it("o admin, na prévia, conta todas: rascunho e módulo em rascunho entram", async () => {
    expect(await previa()).toEqual({ segundosDeVideo: 2100, artigos: 2, aulasGratis: 2, arquivos: false, legendas: false });
  });
});

describe("legendas — só quando TODAS as aulas de vídeo têm legenda em dia", () => {
  it("uma aula de vídeo sem legenda: não; a de texto não conta", async () => {
    await legenda(ids.video1);
    expect((await venda()).legendas).toBe(false);
  });

  it("todas as publicadas com legenda: sim; a do módulo em rascunho não pesa para o aluno, pesa para o admin", async () => {
    await legenda(ids.video2);
    expect((await venda()).legendas).toBe(true);
    expect((await aulaDoAluno()).legendas).toBe(true);
    expect((await previa()).legendas).toBe(false);
  });

  it("legenda que precisa ser reenviada não conta", async () => {
    await prisma.caption.update({ where: { lessonId: ids.video2 }, data: { needsResend: true } });
    expect((await venda()).legendas).toBe(false);
  });
});
