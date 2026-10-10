import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { Role } from "@jilson/core";
import servidor from "./servidor.js";

// A MATRIZ HTTP (casos 7–10 da matriz de testes da Fase 4 — plano, etapa 4.4): quem entra em
// quê, nas duas rotas que só existem para dizer "quem é você": `/api/me` (qualquer conta) e
// `/api/admin/ping` (só admin). Três pessoas — sem login, aluno, admin — e a resposta de cada
// uma. É a fronteira de acesso provada pelo servidor: o E2E não a prova (CLAUDE.md → Testing).

let admin: string[] = [];
let member: string[] = [];

async function entrar(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  const cookies = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(cookies.length).toBeGreaterThan(0);
  return cookies;
}
const pedir = (rota: string, cookies: string[] = []) => request(servidor).get(rota).set("Cookie", cookies);

beforeAll(async () => {
  admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
});

describe("a matriz 401 / 403 / 200", () => {
  it("/api/me — sem login: 401; aluno: 200, como aluno; admin: 200, como admin", async () => {
    const semLogin = await pedir("/api/me");
    expect(semLogin.status).toBe(401);
    expect(semLogin.body.user).toBeUndefined();

    const comoAluno = await pedir("/api/me", member);
    expect(comoAluno.status).toBe(200);
    expect(comoAluno.body.user).toMatchObject({ email: process.env.SEED_MEMBER_EMAIL, role: Role.MEMBER });

    const comoAdmin = await pedir("/api/me", admin);
    expect(comoAdmin.status).toBe(200);
    expect(comoAdmin.body.user).toMatchObject({ email: process.env.SEED_ADMIN_EMAIL, role: Role.ADMIN });
  });

  it("/api/admin/ping — sem login: 401; aluno: 403, sem nada da conta na resposta; admin: 200", async () => {
    const semLogin = await pedir("/api/admin/ping");
    expect(semLogin.status).toBe(401);

    const comoAluno = await pedir("/api/admin/ping", member);
    expect(comoAluno.status).toBe(403);
    expect(comoAluno.body).toEqual({ error: "Forbidden" });

    const comoAdmin = await pedir("/api/admin/ping", admin);
    expect(comoAdmin.status).toBe(200);
    expect(comoAdmin.body.user.role).toBe(Role.ADMIN);
  });

  it("um cookie inventado não é uma sessão: 401 nas duas", async () => {
    const falso = ["better-auth.session_token=nao-e-uma-sessao.assinatura-inventada"];
    expect((await pedir("/api/me", falso)).status).toBe(401);
    expect((await pedir("/api/admin/ping", falso)).status).toBe(401);
  });
});
