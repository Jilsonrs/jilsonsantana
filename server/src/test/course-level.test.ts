import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// "TODOS OS NÍVEIS" (decisão do operador, 28/09/2026). O valor é do enum do
// Prisma: quem recusa valor fora da lista é o BANCO. Este teste roda contra um
// banco criado do zero pelas migrations, então ele prova que a migration nova
// existe e replica — não só que o schema.prisma mudou.

const slug = `nivel-todos-${Date.now()}`;
let admin: string[] = [];

beforeAll(async () => {
  const res = await request(app).post("/api/auth/sign-in/email").send({
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  admin = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug } });
});

describe("nível do curso", () => {
  it("aceita e grava Todos os níveis", async () => {
    const res = await request(app)
      .post("/api/courses")
      .set("Cookie", admin)
      .send({ slug, title: "Para todos", language: "pt", level: "TODOS_OS_NIVEIS" });

    expect(res.status).toBe(201);
    expect((await prisma.course.findUnique({ where: { slug } }))?.level).toBe("TODOS_OS_NIVEIS");
  });

  it("valor fora da lista: 400", async () => {
    const res = await request(app)
      .post("/api/courses")
      .set("Cookie", admin)
      .send({ slug: `${slug}-x`, title: "X", language: "pt", level: "EXPERT" });

    expect(res.status).toBe(400);
  });
});
