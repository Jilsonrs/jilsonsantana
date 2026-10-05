import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// A NOTIFICAÇÃO É EFEITO SECUNDÁRIO (achado P2 da revisão de segurança,
// 04/10/2026): se criar a notificação falhar, a aula abre e a conclusão grava do
// mesmo jeito, e o log leva só ids e o código. Arquivo próprio: o spy no Prisma
// não volta ao normal com `mockRestore` (o delegate é um proxy — medido), e o
// Vitest isola cada arquivo.

const S = `-notif-falha-${Date.now()}`;
let member: string[] = [];
let memberId = "";
let ids = { gratis: 0, paga: 0 };

beforeAll(async () => {
  const res = await request(app).post("/api/auth/sign-in/email").send({
    email: process.env.SEED_MEMBER_EMAIL,
    password: process.env.SEED_MEMBER_PASSWORD,
  });
  member = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL } })).id;
  const c = await prisma.course.create({
    data: {
      slug: `curso${S}`,
      title: "Curso",
      language: "PT",
      status: "PUBLISHED",
      welcomeMessage: "Oi",
      congratsMessage: "Fim",
      modules: {
        create: {
          title: "M",
          status: "PUBLISHED",
          lessons: {
            create: [
              { title: "Grátis", status: "PUBLISHED", isFreePreview: true, displayOrder: 0 },
              { title: "Paga", status: "PUBLISHED", displayOrder: 1 },
            ],
          },
        },
      },
    },
    include: { modules: { include: { lessons: { orderBy: { displayOrder: "asc" } } } } },
  });
  const [gratis, paga] = c.modules[0].lessons;
  ids = { gratis: gratis.id, paga: paga.id };
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

describe("falha ao criar a notificação não derruba nada", () => {
  it("a aula abre (200), a conclusão grava (204), e o log leva o código", async () => {
    const falha = vi.spyOn(prisma.notification, "createMany").mockRejectedValue(Object.assign(new Error("x"), { code: "P2003" }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await request(app).get(`/api/lessons/${ids.paga}/aula`).set("Cookie", member)).status).toBe(200);
    await request(app).put(`/api/lessons/${ids.gratis}/concluida`).set("Cookie", member);
    expect((await request(app).put(`/api/lessons/${ids.paga}/concluida`).set("Cookie", member)).status).toBe(204);
    expect(await prisma.lessonProgress.count({ where: { userId: memberId, lessonId: ids.paga, completed: true } })).toBe(1);
    expect(falha).toHaveBeenCalledTimes(2);
    const linhas = log.mock.calls.flat().join("\n");
    expect(linhas).toContain("[notificacao] boas-vindas falhou");
    expect(linhas).toContain("[notificacao] parabéns falhou");
    expect(linhas).toContain("P2003");
    log.mockRestore();
  });
});
