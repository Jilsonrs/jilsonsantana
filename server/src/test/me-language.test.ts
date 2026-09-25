import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// O idioma do app do aluno fica na CONTA (decisão do operador, 24/09/2026).
// O que estes testes protegem: só quem está logado grava, só nos dois idiomas
// da escola, e sempre na PRÓPRIA conta.

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(app).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

const sessaoMember = () => sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);

async function idiomaDe(email?: string) {
  const user = await prisma.user.findUnique({ where: { email: email ?? "" } });
  return user?.preferredLanguage;
}

afterEach(async () => {
  // A suíte compartilha UM banco: idioma esquecido em "en" mudaria o que outro
  // teste espera da sessão.
  await prisma.user.updateMany({ data: { preferredLanguage: "pt" } });
});

describe("idioma do app — PATCH /api/me/language", () => {
  it("sem sessão, recusa e não grava nada", async () => {
    const res = await request(app).patch("/api/me/language").send({ language: "en" });

    expect(res.status).toBe(401);
    expect(await idiomaDe(process.env.SEED_MEMBER_EMAIL)).toBe("pt");
  });

  it("grava na conta de quem está logado", async () => {
    const cookies = await sessaoMember();
    const res = await request(app).patch("/api/me/language").set("Cookie", cookies).send({ language: "en" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ language: "en" });
    expect(await idiomaDe(process.env.SEED_MEMBER_EMAIL)).toBe("en");
  });

  it("não mexe na conta de mais ninguém", async () => {
    const cookies = await sessaoMember();
    await request(app).patch("/api/me/language").set("Cookie", cookies).send({ language: "en" });

    expect(await idiomaDe(process.env.SEED_ADMIN_EMAIL)).toBe("pt");
  });

  it("a sessão devolve o idioma novo — é daí que o app lê", async () => {
    const cookies = await sessaoMember();
    await request(app).patch("/api/me/language").set("Cookie", cookies).send({ language: "en" });

    const res = await request(app).get("/api/auth/get-session").set("Cookie", cookies);
    expect(res.body.user.preferredLanguage).toBe("en");
  });

  it("idioma fora dos dois da escola é recusado, e a conta não muda", async () => {
    const cookies = await sessaoMember();
    const res = await request(app).patch("/api/me/language").set("Cookie", cookies).send({ language: "es" });

    expect(res.status).toBe(400);
    expect(await idiomaDe(process.env.SEED_MEMBER_EMAIL)).toBe("pt");
  });
});
