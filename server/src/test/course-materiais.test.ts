import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// OS MATERIAIS EXCLUSIVOS do curso (decisão do operador, 04/10/2026): lista FIXA,
// marcada no passo Publicar, para o quadro "Este curso inclui". O banco recusa
// valor fora da lista (enum), e o servidor também, antes dele.

const S = `-materiais-${Date.now()}`;
let admin: string[] = [];
let cursoId = 0;

beforeAll(async () => {
  const res = await request(app).post("/api/auth/sign-in/email").send({
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  admin = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  cursoId = (await prisma.course.create({ data: { slug: `curso${S}`, title: "Curso", language: "PT" } })).id;
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

const salvar = (materiais: unknown) => request(app).patch(`/api/courses/${cursoId}`).set("Cookie", admin).send({ materiais });
const gravado = async () => (await prisma.course.findUniqueOrThrow({ where: { id: cursoId } })).materiais;

describe("materiais exclusivos — o passo Publicar", () => {
  it("grava os marcados, e o admin lê de volta", async () => {
    expect((await salvar(["APOSTILA", "BIBLIOTECA_DE_PROMPTS"])).status).toBe(200);
    expect([...(await gravado())].sort()).toEqual(["APOSTILA", "BIBLIOTECA_DE_PROMPTS"]);
    const res = await request(app).get(`/api/admin/courses/${cursoId}`).set("Cookie", admin);
    expect([...res.body.materiais].sort()).toEqual(["APOSTILA", "BIBLIOTECA_DE_PROMPTS"]);
  });

  it("desmarcar tudo limpa a lista", async () => {
    expect((await salvar([])).status).toBe(200);
    expect(await gravado()).toEqual([]);
  });

  it("material fora da lista: 400, e nada muda", async () => {
    await salvar(["APOSTILA"]);
    expect((await salvar(["CURSO_GRATIS"])).status).toBe(400);
    expect(await gravado()).toEqual(["APOSTILA"]);
  });
});
