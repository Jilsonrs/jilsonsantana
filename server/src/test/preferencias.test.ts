import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// AS PREFERÊNCIAS DO ALUNO (Bloco AULA, etapa 6 — decisão do operador, 07/10/2026):
// a legenda lembrada. O que estes testes protegem:
//   - só quem está logado lê e grava, e sempre a PRÓPRIA preferência (o corpo não
//     diz de quem é a conta);
//   - sem nada gravado, a legenda começa desligada (o padrão do operador);
//   - a escolha fica gravada (vale em qualquer aparelho) e muda quando a pessoa muda;
//   - o corpo errado é recusado, e a preferência não muda.

let admin: string[] = [];
let member: string[] = [];
let memberId = "";
let adminId = "";

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

const ler = (cookies: string[] = []) => request(servidor).get("/api/me/preferences").set("Cookie", cookies);
const gravar = (corpo: unknown, cookies: string[] = []) => request(servidor).patch("/api/me/preferences").set("Cookie", cookies).send(corpo as object);

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL } })).id;
  adminId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_ADMIN_EMAIL } })).id;
  await prisma.studentPreference.deleteMany({ where: { userId: { in: [memberId, adminId] } } });
});

afterAll(async () => {
  await prisma.studentPreference.deleteMany({ where: { userId: { in: [memberId, adminId] } } });
});

describe("as preferências do aluno — a legenda lembrada", () => {
  it("sem login: 401 para ler e para gravar", async () => {
    expect((await ler()).status).toBe(401);
    expect((await gravar({ legendas: true })).status).toBe(401);
  });

  it("sem nada gravado, a legenda começa DESLIGADA, e nunca em cache", async () => {
    const res = await ler(member);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ legendas: false });
    expect(res.headers["cache-control"]).toBe("private, no-store");
  });

  it("ligou: fica gravado na conta; desligou: também", async () => {
    expect((await gravar({ legendas: true }, member)).body).toEqual({ legendas: true });
    expect((await ler(member)).body).toEqual({ legendas: true });
    expect((await prisma.studentPreference.findUnique({ where: { userId: memberId } }))?.captionsOn).toBe(true);

    expect((await gravar({ legendas: false }, member)).status).toBe(200);
    expect((await ler(member)).body).toEqual({ legendas: false });
    // Uma linha só por pessoa, por mais que ela mude.
    expect(await prisma.studentPreference.count({ where: { userId: memberId } })).toBe(1);
  });

  it("cada um tem a sua: a escolha de um não muda a do outro", async () => {
    await gravar({ legendas: true }, admin);
    expect((await ler(admin)).body).toEqual({ legendas: true });
    expect((await ler(member)).body).toEqual({ legendas: false });
  });

  // Achado P2 da revisão de segurança (07/10/2026): a conta é SEMPRE a da sessão — um
  // `userId` vindo do cliente, no corpo ou no endereço, não muda de quem é a preferência.
  it("o corpo dizendo outra conta não grava nela", async () => {
    expect((await gravar({ legendas: true, userId: memberId }, admin)).status).toBe(200);
    expect((await ler(member)).body).toEqual({ legendas: false });
    expect((await prisma.studentPreference.findUnique({ where: { userId: memberId } }))?.captionsOn ?? false).toBe(false);
  });

  it("o endereço pedindo outra conta devolve a da sessão", async () => {
    const res = await request(servidor).get(`/api/me/preferences?userId=${adminId}`).set("Cookie", member);
    expect(res.body).toEqual({ legendas: false });
  });

  it.each([
    ["sem o campo", {}],
    ["texto", { legendas: "sim" }],
    ["número", { legendas: 1 }],
  ])("corpo errado (%s): 400, e a preferência não muda", async (_nome, corpo) => {
    expect((await gravar(corpo, admin)).status).toBe(400);
    expect((await ler(admin)).body).toEqual({ legendas: true });
  });
});
