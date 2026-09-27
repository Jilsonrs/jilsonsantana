import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// IMAGEM DO CURSO (C4, etapa 1 — plano aprovado pelo operador em 23/09/2026).
// O campo aceitava `javascript:` e recusava `/img/curso.jpg`, que é exatamente o
// formato das imagens da home. O que estes testes protegem: o caminho do site e
// o endereço https passam; tudo o que o navegador leria como outro site ou como
// código é recusado pelo SERVIDOR, não só pela tela.

const S = `-img-${Date.now()}`;
const criados: string[] = [];
let admin: string[] = [];

beforeAll(async () => {
  const res = await request(app).post("/api/auth/sign-in/email").send({
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  admin = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
});

async function criar(thumbnailUrl: string) {
  const slug = `curso${S}-${criados.length}`;
  criados.push(slug);
  const res = await request(app)
    .post("/api/courses")
    .set("Cookie", admin)
    .send({ slug, title: "Curso", language: "pt", thumbnailUrl });
  return { res, slug };
}

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { in: criados } } });
});

describe("imagem do curso — o que passa", () => {
  for (const valor of [
    "/img/power-bi-basico-avancado-formacao-especialista.jpg",
    "https://img.jilsonsantana.com/cursos/power-bi.webp",
  ]) {
    it(`aceita ${valor}`, async () => {
      const { res, slug } = await criar(valor);

      expect(res.status).toBe(201);
      expect((await prisma.course.findUnique({ where: { slug } }))?.thumbnailUrl).toBe(valor);
    });
  }
});

describe("imagem do curso — o que o servidor recusa", () => {
  for (const [motivo, valor] of [
    ["código no lugar da imagem", "javascript:alert(1)"],
    ["código com espaço na frente", " javascript:alert(1)"],
    ["página embutida", "data:text/html,<script>alert(1)</script>"],
    ["outro site, com duas barras", "//outro-site.com/x.jpg"],
    ["outro site, com barra invertida", "/\\outro-site.com/x.jpg"],
    ["outro site, com tabulação no meio", "/\t/outro-site.com/x.jpg"],
    ["caminho sem a barra do começo", "img/curso.jpg"],
    ["protocolo que não é de página", "ftp://outro-site.com/x.jpg"],
  ] as const) {
    it(`recusa: ${motivo}`, async () => {
      const { res, slug } = await criar(valor);

      expect(res.status).toBe(400);
      expect(await prisma.course.findUnique({ where: { slug } })).toBeNull();
    });
  }

  it("na edição também: a imagem que já estava continua", async () => {
    const { res } = await criar("/img/original.jpg");
    const id = res.body.id as number;

    const edicao = await request(app)
      .patch(`/api/courses/${id}`)
      .set("Cookie", admin)
      .send({ thumbnailUrl: "javascript:alert(1)" });

    expect(edicao.status).toBe(400);
    expect((await prisma.course.findUnique({ where: { id } }))?.thumbnailUrl).toBe("/img/original.jpg");
  });
});
