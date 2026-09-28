import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// O "+" ENTRE ITENS e a AULA DE TEXTO (Bloco E, etapa 2, parte 2b — plano
// aprovado pelo operador em 28/09/2026). O que estes testes protegem: a aula ou
// o módulo nasce NA POSIÇÃO pedida; aula de vídeo não tem texto; e o texto da
// aula — conteúdo pago — não sai em nenhuma rota pública.

const S = `-inserir-${Date.now()}`;
const SEGREDO = `texto-pago-${Date.now()}`;
let admin: string[] = [];
let member: string[] = [];
let cursoId = 0;
let moduloId = 0;
let aulaA = 0;
let aulaB = 0;

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(app).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  const curso = await prisma.course.create({
    data: {
      slug: `curso${S}`,
      title: "Curso",
      language: "PT",
      status: "PUBLISHED",
      modules: {
        create: {
          title: "M1",
          status: "PUBLISHED",
          lessons: { create: [{ title: "A", displayOrder: 0 }, { title: "B", displayOrder: 0 }] },
        },
      },
    },
    include: { modules: { include: { lessons: { orderBy: { id: "asc" } } } } },
  });
  cursoId = curso.id;
  moduloId = curso.modules[0].id;
  [aulaA, aulaB] = curso.modules[0].lessons.map((l) => l.id);
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

const ordemDasAulas = async () =>
  (await prisma.lesson.findMany({ where: { moduleId: moduloId }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] })).map(
    (l) => l.title,
  );

const inserirAula = (cookies: string[], corpo: object, modulo = moduloId) =>
  request(app).post(`/api/admin/modules/${modulo}/lessons`).set("Cookie", cookies).send(corpo);

describe("inserir aula numa posição", () => {
  it("sem login 401; aluno 403; módulo que não existe 404", async () => {
    expect((await request(app).post(`/api/admin/modules/${moduloId}/lessons`).send({})).status).toBe(401);
    expect((await inserirAula(member, { title: "X", kind: "VIDEO", posicao: 0 })).status).toBe(403);
    expect((await inserirAula(admin, { title: "X", kind: "VIDEO", posicao: 0 }, 999999)).status).toBe(404);
  });

  // A e B nasceram EMPATADAS no 0: a inserção desempata e reescreve a ordem.
  it("nasce entre A e B, com o tipo pedido", async () => {
    const res = await inserirAula(admin, { title: "Entre", kind: "TEXT", posicao: 1 });

    expect(res.status).toBe(201);
    expect(res.body.kind).toBe("TEXT");
    expect(await ordemDasAulas()).toEqual(["A", "Entre", "B"]);
  });

  it("posição além do fim vai para o fim", async () => {
    await inserirAula(admin, { title: "Última", kind: "VIDEO", posicao: 99 });
    expect((await ordemDasAulas()).at(-1)).toBe("Última");
  });
});

describe("inserir módulo numa posição", () => {
  it("nasce no começo", async () => {
    const res = await request(app)
      .post(`/api/admin/courses/${cursoId}/modules`)
      .set("Cookie", admin)
      .send({ title: "Abertura", posicao: 0 });

    expect(res.status).toBe(201);
    const modulos = await prisma.module.findMany({ where: { courseId: cursoId }, orderBy: { displayOrder: "asc" } });
    expect(modulos.map((m) => m.title)).toEqual(["Abertura", "M1"]);
  });

  it("aluno 403", async () => {
    const res = await request(app).post(`/api/admin/courses/${cursoId}/modules`).set("Cookie", member).send({ title: "X", posicao: 0 });
    expect(res.status).toBe(403);
  });
});

describe("o texto da aula", () => {
  const editar = (id: number, corpo: object) => request(app).patch(`/api/lessons/${id}`).set("Cookie", admin).send(corpo);

  it("aula de vídeo não aceita texto: 400, nada gravado", async () => {
    const res = await editar(aulaA, { content: "texto" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("TextoSoEmAulaDeTexto");
    expect((await prisma.lesson.findUnique({ where: { id: aulaA } }))?.content).toBeNull();
  });

  it("criar aula de vídeo já com texto: 400", async () => {
    const res = await request(app).post("/api/lessons").set("Cookie", admin).send({ moduleId: moduloId, title: "V", content: "x" });
    expect(res.status).toBe(400);
  });

  it("aula de texto grava o texto; acima de 20.000 caracteres, 400", async () => {
    const texto = await inserirAula(admin, { title: "Texto", kind: "TEXT", posicao: 0 });
    expect((await editar(texto.body.id, { content: "**Olá**" })).status).toBe(200);
    expect((await prisma.lesson.findUnique({ where: { id: texto.body.id } }))?.content).toBe("**Olá**");
    expect((await editar(texto.body.id, { content: "x".repeat(20001) })).status).toBe(400);
  });

  it("o tipo não muda depois de criada", async () => {
    const res = await editar(aulaB, { kind: "TEXT" });
    // O schema de edição não conhece `kind`: o campo é ignorado, a aula continua de vídeo.
    expect([200, 400]).toContain(res.status);
    expect((await prisma.lesson.findUnique({ where: { id: aulaB } }))?.kind).toBe("VIDEO");
  });
});

// Conteúdo pago: o texto da aula não sai em rota pública nenhuma (a aula para o
// aluno, com a trava de acesso, é a etapa 4 do Bloco U).
describe("o texto da aula não vaza", () => {
  it("nem na página do curso, nem na aula, nem na busca", async () => {
    const aula = await prisma.lesson.create({
      data: { moduleId: moduloId, title: `Aula secreta${S}`, kind: "TEXT", content: SEGREDO, status: "PUBLISHED" },
    });

    const respostas = await Promise.all([
      request(app).get(`/api/courses/curso${S}`),
      request(app).get(`/api/lessons/${aula.id}`),
      request(app).get(`/api/search`).query({ q: "Aula secreta" }),
    ]);
    for (const res of respostas) {
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain(SEGREDO);
    }
  });
});
