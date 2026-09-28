import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// A ORDEM DO CURSO numa gravação só (Bloco E, etapa 2 — plano aprovado pelo
// operador em 28/09/2026). O que estes testes protegem: só o admin muda; a aula
// pode mudar de módulo DENTRO do curso; e a lista enviada tem que ser exatamente
// a do curso — senão uma aula de OUTRO curso seria puxada para este.

const S = `-estrutura-${Date.now()}`;
let admin: string[] = [];
let member: string[] = [];
let cursoA = 0;
let m1 = 0;
let m2 = 0;
let l1 = 0;
let l2 = 0;
let l3 = 0;
let aulaDeOutroCurso = 0;
let moduloDeOutroCurso = 0;

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(app).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);

  const a = await prisma.course.create({
    data: {
      slug: `a${S}`,
      title: "A",
      language: "PT",
      modules: {
        create: [
          { title: "M1", displayOrder: 0, lessons: { create: [{ title: "L1", displayOrder: 0 }, { title: "L2", displayOrder: 1 }] } },
          { title: "M2", displayOrder: 1, lessons: { create: [{ title: "L3", displayOrder: 0 }] } },
        ],
      },
    },
    include: { modules: { include: { lessons: true }, orderBy: { displayOrder: "asc" } } },
  });
  cursoA = a.id;
  [m1, m2] = a.modules.map((m) => m.id);
  const aulas = a.modules.flatMap((m) => m.lessons).sort((x, y) => x.title.localeCompare(y.title));
  [l1, l2, l3] = aulas.map((l) => l.id);

  const b = await prisma.course.create({
    data: { slug: `b${S}`, title: "B", language: "PT", modules: { create: [{ title: "MB", lessons: { create: [{ title: "LB" }] } }] } },
    include: { modules: { include: { lessons: true } } },
  });
  moduloDeOutroCurso = b.modules[0].id;
  aulaDeOutroCurso = b.modules[0].lessons[0].id;
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

const enviar = (cookies: string[], modulos: { id: number; aulas: number[] }[], curso = cursoA) =>
  request(app).put(`/api/admin/courses/${curso}/estrutura`).set("Cookie", cookies).send({ modulos });

async function ordemAtual() {
  const modulos = await prisma.module.findMany({
    where: { courseId: cursoA },
    orderBy: { displayOrder: "asc" },
    include: { lessons: { orderBy: { displayOrder: "asc" } } },
  });
  return modulos.map((m) => ({ id: m.id, aulas: m.lessons.map((l) => l.id) }));
}

describe("ordem do curso", () => {
  it("sem login 401; aluno 403", async () => {
    expect((await request(app).put(`/api/admin/courses/${cursoA}/estrutura`).send({ modulos: [] })).status).toBe(401);
    expect((await enviar(member, [])).status).toBe(403);
  });

  it("curso que não existe: 404", async () => {
    expect((await enviar(admin, [], 999999)).status).toBe(404);
  });

  it("grava a ordem inteira, e a aula muda de módulo dentro do curso", async () => {
    const nova = [
      { id: m2, aulas: [l3, l2] },
      { id: m1, aulas: [l1] },
    ];
    expect((await enviar(admin, nova)).status).toBe(204);
    expect(await ordemAtual()).toEqual(nova);
  });

  // As recusas: a lista tem que ser EXATAMENTE a do curso. Nada muda quando recusa.
  it.each([
    ["aula de outro curso", () => [{ id: m1, aulas: [l1, aulaDeOutroCurso] }, { id: m2, aulas: [l2, l3] }]],
    ["módulo de outro curso", () => [{ id: m1, aulas: [l1] }, { id: m2, aulas: [l2, l3] }, { id: moduloDeOutroCurso, aulas: [] }]],
    ["aula faltando", () => [{ id: m1, aulas: [l1] }, { id: m2, aulas: [l3] }]],
    ["aula repetida", () => [{ id: m1, aulas: [l1, l2] }, { id: m2, aulas: [l2, l3] }]],
    // O mesmo TAMANHO da lista do curso, com uma aula repetida no lugar de outra:
    // só a conferência de repetição pega este.
    ["aula repetida no lugar de outra", () => [{ id: m1, aulas: [l1, l1] }, { id: m2, aulas: [l3] }]],
    ["módulo faltando", () => [{ id: m1, aulas: [l1, l2, l3] }]],
  ])("%s: 400 e nada muda", async (_nome, montar) => {
    const antes = await ordemAtual();
    const res = await enviar(admin, montar());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("EstruturaInvalida");
    expect(await ordemAtual()).toEqual(antes);
    expect((await prisma.lesson.findUnique({ where: { id: aulaDeOutroCurso } }))?.moduleId).toBe(moduloDeOutroCurso);
  });
});
