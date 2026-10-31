import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { CasoDaLista, ListaDeCasos } from "@jilson/core";
import servidor from "./servidor.js";
import { prisma, TipoDeCaso } from "../lib/prisma.js";
import { abrirCaso } from "../lib/casos.js";

// "PRECISA DE ATENDENTE" — A LISTA E O FECHAR (etapa 4.7b, passo 2c). O que protege:
//   - SÓ ADMIN (401/403), e o pedido no formato (400);
//   - os abertos com os URGENTES primeiro, e dos mais novos para os mais velhos; a contagem de abertos e de urgentes;
//   - cada caso leva à ficha certa: a conta; a dona da assinatura; a assinatura sem conta; o visitante;
//   - o operador fecha com uma nota, o fechamento entra no registro com QUEM fechou, e fechar de novo é 404.

const S = `${Date.now()}`;
const HORA = 60 * 60 * 1000;
const aluna = `casos-tela-${S}`;
const dona = `casos-dona-${S}`;
let admin: string[] = [];
let member: string[] = [];
let adminId = "";
let assinaturaSemConta = 0;

async function entrar(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  const cookies = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(cookies.length).toBeGreaterThan(0);
  return cookies;
}
const listar = (consulta: Record<string, string> = {}, cookies: string[] = admin) => request(servidor).get("/api/admin/cobranca/casos").query(consulta).set("Cookie", cookies);
const fechar = (id: number | string, corpo: object, cookies: string[] = admin) => request(servidor).post(`/api/admin/cobranca/casos/${id}/fechar`).set("Cookie", cookies).send(corpo);
const meus = (lista: ListaDeCasos): CasoDaLista[] => lista.casos.filter((c) => c.detalhe?.includes(S));
const abrir = async (chave: string, urgente: boolean, horasAtras: number, extra: Partial<Parameters<typeof abrirCaso>[0]> = {}) => {
  await abrirCaso({ tipo: TipoDeCaso.PAGO_SEM_ASSINATURA, chave: `${chave}:${S}`, urgente, detalhe: `${chave} ${S}`, ...extra });
  await prisma.billingCase.update({ where: { kind_key: { kind: TipoDeCaso.PAGO_SEM_ASSINATURA, key: `${chave}:${S}` } }, data: { openedAt: new Date(Date.now() - horasAtras * HORA) } });
};

let antes: ListaDeCasos;

beforeAll(async () => {
  admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  adminId = (await prisma.user.findUniqueOrThrow({ where: { email: (process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase() } })).id;
  antes = (await listar()).body as ListaDeCasos;
  await prisma.user.createMany({ data: [{ id: aluna, email: `${aluna}@teste.local`, name: "Clara Caso" }, { id: dona, email: `${dona}@teste.local` }] });
  await prisma.subscription.create({ data: { ownerUserId: dona, status: "active", stripeSubscriptionId: `sub_${S}_dona` } });
  assinaturaSemConta = (await prisma.subscription.create({ data: { ownerUserId: null, status: "active", stripeSubscriptionId: `sub_${S}_semconta` } })).id;
  await abrir("urgente-antigo", true, 5, { conta: aluna });
  await abrir("comum-novo", false, 1, { assinatura: `sub_${S}_dona` });
  await abrir("urgente-novo", true, 2, { assinatura: `sub_${S}_semconta` });
  await abrir("ficha", false, 3);
});

afterAll(async () => {
  await prisma.billingLog.deleteMany({ where: { actorUserId: adminId, action: "caso-fechado", detail: "PAGO_SEM_ASSINATURA", createdAt: { gte: new Date(Date.now() - HORA) } } });
  await prisma.billingCase.deleteMany({ where: { key: { contains: S } } });
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.user.deleteMany({ where: { id: { in: [aluna, dona] } } });
});

describe("Precisa de atendente — quem entra", () => {
  it("sem login 401; aluno 403 — listar e fechar", async () => {
    expect((await listar({}, [])).status).toBe(401);
    expect((await listar({}, member)).status).toBe(403);
    expect((await fechar(1, {}, member)).status).toBe(403);
  });

  it("fora do formato: 400", async () => {
    expect((await listar({ situacao: "todos" })).status).toBe(400);
    expect((await fechar("abc", {})).status).toBe(400);
    expect((await fechar(1, { nota: "x".repeat(501) })).status).toBe(400);
  });
});

describe("Precisa de atendente — a lista", () => {
  it("os urgentes primeiro, e dos mais novos para os mais velhos; a contagem de abertos e de urgentes", async () => {
    const lista = (await listar()).body as ListaDeCasos;
    expect(meus(lista).map((c) => c.detalhe?.split(" ")[0])).toEqual(["urgente-novo", "urgente-antigo", "comum-novo", "ficha"]);
    expect(lista.abertos - antes.abertos).toBe(4);
    expect(lista.urgentes - antes.urgentes).toBe(2);
  });

  it("cada caso leva à ficha certa: a conta, a dona da assinatura, a assinatura sem conta, o visitante", async () => {
    const porNome = new Map(meus((await listar()).body as ListaDeCasos).map((c) => [c.detalhe?.split(" ")[0], c]));
    expect(porNome.get("urgente-antigo")).toMatchObject({ aluno: { id: aluna, nome: "Clara Caso" }, ficha: { conta: aluna, assinatura: null, visitante: null } });
    expect(porNome.get("comum-novo")?.ficha).toEqual({ conta: dona, assinatura: null, visitante: null });
    expect(porNome.get("urgente-novo")?.ficha).toEqual({ conta: null, assinatura: assinaturaSemConta, visitante: null });
    expect(porNome.get("ficha")?.ficha).toEqual({ conta: null, assinatura: null, visitante: S });
  });
});

describe("Precisa de atendente — fechar", () => {
  it("o operador fecha com a nota; entra no registro com quem fechou; fechar de novo é 404; vai para os fechados", async () => {
    const caso = meus((await listar()).body as ListaDeCasos).find((c) => c.detalhe?.startsWith("urgente-antigo"));
    expect(caso).toBeDefined();
    const res = await fechar(caso?.id ?? 0, { nota: "  devolvido pelo painel  " });
    expect([res.status, res.body]).toEqual([200, { fechado: true }]);
    expect(await prisma.billingCase.findUniqueOrThrow({ where: { id: caso?.id ?? 0 } })).toMatchObject({ open: false, closedBy: "OPERADOR", closedByUserId: adminId, note: "devolvido pelo painel" });
    expect(await prisma.billingLog.findFirst({ where: { action: "caso-fechado", actorUserId: adminId, userId: aluna } })).toMatchObject({ who: "OPERADOR", detail: "PAGO_SEM_ASSINATURA" });
    expect((await fechar(caso?.id ?? 0, {})).status).toBe(404);
    const fechados = meus((await listar({ situacao: "fechados" })).body as ListaDeCasos);
    expect(fechados.map((c) => [c.id, c.aberto, c.fechadoPor, c.nota])).toEqual([[caso?.id, false, "OPERADOR", "devolvido pelo painel"]]);
    expect(meus((await listar()).body as ListaDeCasos).some((c) => c.id === caso?.id)).toBe(false);
  });
});
