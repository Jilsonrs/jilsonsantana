import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// LIMITES DAS INFORMAÇÕES BÁSICAS (decisão do operador, 27/09/2026): Título 60 ·
// Subtítulo 120 · Slug 80 · Descrição 5.000; e cada item das três listas, 160
// (28/09/2026). A tela trava no número, mas quem
// garante é o SERVIDOR: um envio que não passa pela tela também é recusado.

const S = `-lim-${Date.now()}`;
const criados: string[] = [];
let admin: string[] = [];

beforeAll(async () => {
  const res = await request(app).post("/api/auth/sign-in/email").send({
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  admin = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { in: criados } } });
});

/** Um slug de exatamente `tamanho` caracteres, único nesta execução. */
function slugCom(tamanho: number): string {
  const base = `c${criados.length}${S}-`;
  const slug = base + "a".repeat(tamanho - base.length);
  criados.push(slug);
  return slug;
}

function criar(campos: Record<string, string>) {
  return request(app)
    .post("/api/courses")
    .set("Cookie", admin)
    .send({ slug: slugCom(30), title: "Curso", language: "pt", ...campos });
}

describe("limites do curso", () => {
  it("exatamente no limite, o curso é aceito", async () => {
    const res = await criar({
      slug: slugCom(80),
      title: "t".repeat(60),
      subtitle: "s".repeat(120),
      description: "d".repeat(5000),
    });

    expect(res.status).toBe(201);
  });

  for (const [campo, valor] of [
    ["title", "t".repeat(61)],
    ["subtitle", "s".repeat(121)],
    ["description", "d".repeat(5001)],
  ] as const) {
    it(`${campo} acima do limite: 400 e nada é gravado`, async () => {
      const res = await criar({ [campo]: valor });

      expect(res.status).toBe(400);
      expect(await prisma.course.count({ where: { slug: criados.at(-1) } })).toBe(0);
    });
  }

  it("slug acima do limite: 400", async () => {
    const res = await criar({ slug: slugCom(81) });

    expect(res.status).toBe(400);
  });

  // As três listas (operador, 28/09/2026): até 160 caracteres POR ITEM.
  it("item das listas com 160 caracteres é aceito", async () => {
    const res = await request(app)
      .post("/api/courses")
      .set("Cookie", admin)
      .send({
        slug: slugCom(30),
        title: "Curso",
        language: "pt",
        learnTags: ["a".repeat(160)],
        requirements: ["r".repeat(160)],
        personas: ["p".repeat(160)],
      });

    expect(res.status).toBe(201);
  });

  for (const lista of ["learnTags", "requirements", "personas"] as const) {
    it(`${lista} com um item de 161 caracteres: 400 e a lista antiga fica`, async () => {
      const criado = await criar({});
      const edicao = await request(app)
        .patch(`/api/courses/${criado.body.id as number}`)
        .set("Cookie", admin)
        .send({ [lista]: ["curto", "x".repeat(161)] });

      expect(edicao.status).toBe(400);
      expect((await prisma.course.findUnique({ where: { id: criado.body.id } }))?.[lista]).toEqual([]);
    });
  }

  it("na edição também: o título longo é recusado e o antigo fica", async () => {
    const criado = await criar({});
    const edicao = await request(app)
      .patch(`/api/courses/${criado.body.id as number}`)
      .set("Cookie", admin)
      .send({ title: "t".repeat(61) });

    expect(edicao.status).toBe(400);
    expect((await prisma.course.findUnique({ where: { id: criado.body.id } }))?.title).toBe("Curso");
  });
});
