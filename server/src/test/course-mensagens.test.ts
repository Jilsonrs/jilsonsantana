import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { LIMITES_DO_CURSO } from "@jilson/core";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// AS MENSAGENS DO CURSO (passo Mensagens — decisões do operador, 04/10/2026): a
// de boas-vindas e a de parabéns, que chegam ao aluno pelo sino. `null` apaga;
// acima do limite, 400. São do admin: a página pública do curso não as mostra.

const S = `-mensagens-${Date.now()}`;
let admin: string[] = [];
let cursoId = 0;

beforeAll(async () => {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  admin = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  cursoId = (await prisma.course.create({ data: { slug: `curso${S}`, title: "Curso", language: "PT", status: "PUBLISHED" } })).id;
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

const salvar = (corpo: object) => request(servidor).patch(`/api/courses/${cursoId}`).set("Cookie", admin).send(corpo);
const gravado = () =>
  prisma.course.findUniqueOrThrow({ where: { id: cursoId }, select: { welcomeMessage: true, congratsMessage: true } });

describe("mensagens do curso — o passo Mensagens", () => {
  it("grava as duas, e o admin lê de volta", async () => {
    const res = await salvar({ welcomeMessage: "Bem-vindo **ao curso**!", congratsMessage: "Parabéns!" });
    expect(res.status).toBe(200);
    expect(await gravado()).toEqual({ welcomeMessage: "Bem-vindo **ao curso**!", congratsMessage: "Parabéns!" });
    const lido = await request(servidor).get(`/api/admin/courses/${cursoId}`).set("Cookie", admin);
    expect(lido.body.welcomeMessage).toBe("Bem-vindo **ao curso**!");
    expect(lido.body.congratsMessage).toBe("Parabéns!");
  });

  it("null apaga só a que veio; a ausente não muda", async () => {
    expect((await salvar({ congratsMessage: null })).status).toBe(200);
    expect(await gravado()).toEqual({ welcomeMessage: "Bem-vindo **ao curso**!", congratsMessage: null });
  });

  it("acima do limite: 400, e nada muda", async () => {
    const longa = "a".repeat(LIMITES_DO_CURSO.mensagem + 1);
    expect((await salvar({ welcomeMessage: longa })).status).toBe(400);
    expect((await gravado()).welcomeMessage).toBe("Bem-vindo **ao curso**!");
  });

  it("a página pública do curso não leva as mensagens", async () => {
    const res = await request(servidor).get(`/api/courses/curso${S}`);
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("welcomeMessage");
    expect(res.body).not.toHaveProperty("congratsMessage");
  });
});
