import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// A PRÉ-VISUALIZAÇÃO DO CURSO COMO ALUNO (passo Publicar — decisão do operador,
// 04/10/2026): só o admin, em qualquer status, com o que o curso já tem. O aluno
// não alcança rascunho por aqui.

const S = `-previa-${Date.now()}`;
let admin: string[] = [];
let member: string[] = [];
let semAulas = 0;
let arquivado = 0;

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(app).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  semAulas = (
    await prisma.course.create({
      data: { slug: `vazio${S}`, title: "Curso em preenchimento", language: "PT", status: "DRAFT", description: "Ainda sem aulas.", learnTags: ["PROCX"] },
    })
  ).id;
  arquivado = (
    await prisma.course.create({
      data: {
        slug: `arquivado${S}`,
        title: "Curso arquivado",
        language: "PT",
        status: "ARCHIVED",
        modules: { create: { title: "Módulo rascunho", status: "DRAFT", lessons: { create: { title: "Aula rascunho", status: "DRAFT" } } } },
      },
    })
  ).id;
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

const pagina = (id: number | string, cookies: string[] = []) => request(app).get(`/api/admin/courses/${id}/pagina`).set("Cookie", cookies);

describe("pré-visualização do curso — quem entra", () => {
  it("visitante 401, aluno 403", async () => {
    expect((await pagina(semAulas)).status).toBe(401);
    expect((await pagina(semAulas, member)).status).toBe(403);
  });

  it("curso que não existe: 404; id inválido: 400", async () => {
    expect((await pagina(999999999, admin)).status).toBe(404);
    expect((await pagina("abc", admin)).status).toBe(400);
  });
});

describe("pré-visualização do curso — o que o admin vê", () => {
  it("rascunho sem aulas: os detalhes já preenchidos e a lista vazia, sem cache", async () => {
    const res = await pagina(semAulas, admin);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("private, no-store");
    expect(res.body.curso).toMatchObject({ title: "Curso em preenchimento", status: "DRAFT", description: "Ainda sem aulas.", learnTags: ["PROCX"], modulos: [] });
  });

  it("arquivado: entra, com módulo e aula em rascunho", async () => {
    const res = await pagina(arquivado, admin);
    expect(res.status).toBe(200);
    expect(res.body.curso.status).toBe("ARCHIVED");
    expect(res.body.curso.modulos).toHaveLength(1);
    expect(res.body.curso.modulos[0]).toMatchObject({ status: "DRAFT", aulas: [{ title: "Aula rascunho", status: "DRAFT" }] });
  });
});
