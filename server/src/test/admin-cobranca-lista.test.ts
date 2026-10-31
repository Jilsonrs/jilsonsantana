import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { ListaDeAssinaturas } from "@jilson/core";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// A LISTA DO PAINEL DA COBRANÇA (Fase 4, etapa 4.7b, passo 1b). O que estes testes protegem:
//   - SÓ ADMIN: sem login 401, aluno 403;
//   - cada filtro traz o que diz, com a situação certa — e a pré-paga do Pix (sempre com data de fim) NÃO é "vai
//     cancelar"; a tentativa que expirou sem pagar fica fora da lista;
//   - a contagem do topo é a da escola inteira (aqui, o quanto ela SOBE com as linhas do teste — o banco tem outras);
//   - a busca acha por e-mail ou nome sem diferenciar maiúsculas, e pelo código da Stripe de um alerta — mas o "_" NÃO
//     vale por qualquer caractere ("ana_souza" não acha "ana.souza": CLAUDE.md → Server);
//   - a mais recente primeiro, 50 por página;
//   - nenhum id da Stripe vai ao navegador.

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const ana = `lista-${S}-a`;
const bruno = `lista-${S}-b`;
const carla = `lista-${S}-c`;
const paginas = `pag-${S}`;
let admin: string[] = [];
let member: string[] = [];

async function entrar(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  const cookies = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(cookies.length).toBeGreaterThan(0);
  return cookies;
}
const lista = (consulta: Record<string, string | number>, cookies: string[] = admin) => request(servidor).post("/api/admin/assinaturas/lista").set("Cookie", cookies).send(consulta);
async function pegar(consulta: Record<string, string | number>): Promise<ListaDeAssinaturas> {
  const res = await lista(consulta);
  expect(res.status).toBe(200);
  return res.body as ListaDeAssinaturas;
}
/** O id do espelho de cada assinatura do teste, pelo final do id da Stripe. */
const ids: Record<string, number> = {};
const idsDe = (resposta: ListaDeAssinaturas) => resposta.assinaturas.map((a) => a.id).sort((x, y) => x - y);
const esperados = (...nomes: string[]) => nomes.map((n) => ids[n] ?? -1).sort((x, y) => x - y);

let antes: ListaDeAssinaturas["contagem"];

beforeAll(async () => {
  admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  antes = (await pegar({})).contagem;
  await prisma.user.createMany({
    data: [
      { id: ana, email: `lista-${S}-ana.souza@teste.local`, name: "Ana Lista" },
      { id: bruno, email: `lista-${S}-bruno@teste.local`, name: "Bruno" },
      { id: carla, email: `lista-${S}-carla@teste.local`, name: null },
      { id: paginas, email: `${paginas}@teste.local`, name: "Páginas" },
    ],
  });
  const agora = Date.now();
  const linhas = [
    { nome: "ativa", ownerUserId: ana, status: "active", plan: "mensal" as const, promotionCode: "TESTE100" },
    { nome: "vai", ownerUserId: bruno, status: "active", plan: "anual" as const, cancelAt: new Date(agora + 20 * DIA) },
    { nome: "pix", ownerUserId: carla, status: "active", plan: "mensal" as const, cancelAt: new Date(agora + 25 * DIA), pixPaymentIntentId: `pi_${S}` },
    { nome: "atrasada", ownerUserId: ana, status: "past_due" },
    { nome: "cancelada", ownerUserId: bruno, status: "canceled" },
    { nome: "aguardando", ownerUserId: carla, status: "incomplete" },
    { nome: "expirada", ownerUserId: carla, status: "incomplete_expired" },
    { nome: "semconta", ownerUserId: null, status: "active", stripeCustomerId: `cus_${S}_sem` },
  ];
  // Uma por minuto, na ordem acima: a "semconta" é a mais nova.
  for (const [i, { nome, ...dados }] of linhas.entries()) {
    const criada = await prisma.subscription.create({ data: { ...dados, stripeSubscriptionId: `sub_${S}_${nome}`, currentPeriodEnd: new Date(agora + 30 * DIA), createdAt: new Date(agora - (linhas.length - i) * 60_000) } });
    ids[nome] = criada.id;
  }
  await prisma.subscription.createMany({
    data: Array.from({ length: 51 }, (_, i) => ({ ownerUserId: paginas, status: "canceled", stripeSubscriptionId: `sub_${S}_pag_${i}`, createdAt: new Date(agora - 10 * DIA - i * 1000) })),
  });
});

afterAll(async () => {
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.user.deleteMany({ where: { id: { in: [ana, bruno, carla, paginas] } } });
});

describe("a lista da Cobrança — quem entra", () => {
  it("sem login: 401; aluno: 403", async () => {
    expect((await lista({}, [])).status).toBe(401);
    expect((await lista({}, member)).status).toBe(403);
  });

  it("filtro, página ou busca fora do formato: 400", async () => {
    expect((await lista({ filtro: "todas-mesmo" })).status).toBe(400);
    expect((await lista({ pagina: 0 })).status).toBe(400);
    expect((await lista({ busca: "x".repeat(121) })).status).toBe(400);
  });
});

describe("a lista da Cobrança — os filtros e a contagem", () => {
  it("a contagem do topo sobe exatamente com as linhas do teste (a expirada não conta)", async () => {
    const depois = (await pegar({})).contagem;
    expect(depois.todas - antes.todas).toBe(7 + 51);
    expect(depois.ativas - antes.ativas).toBe(4);
    expect(depois["vao-cancelar"] - antes["vao-cancelar"]).toBe(1);
    expect(depois.atrasadas - antes.atrasadas).toBe(1);
    expect(depois.canceladas - antes.canceladas).toBe(1 + 51);
    expect(depois.aguardando - antes.aguardando).toBe(1);
  });

  it("cada filtro traz o que diz — e a pré-paga do Pix é ativa, nunca 'vai cancelar'", async () => {
    const busca = `lista-${S}`;
    expect(idsDe(await pegar({ filtro: "ativas", busca }))).toEqual(esperados("ativa", "vai", "pix"));
    expect(idsDe(await pegar({ filtro: "vao-cancelar", busca }))).toEqual(esperados("vai"));
    expect(idsDe(await pegar({ filtro: "atrasadas", busca }))).toEqual(esperados("atrasada"));
    expect(idsDe(await pegar({ filtro: "canceladas", busca }))).toEqual(esperados("cancelada"));
    expect(idsDe(await pegar({ filtro: "aguardando", busca }))).toEqual(esperados("aguardando"));
    expect(idsDe(await pegar({ busca }))).toEqual(esperados("ativa", "vai", "pix", "atrasada", "cancelada", "aguardando"));
  });

  it("cada linha diz a situação, o plano, o código e o aluno — a mais recente primeiro", async () => {
    const todas = (await pegar({ busca: `lista-${S}` })).assinaturas;
    expect(todas.map((a) => a.id)).toEqual([ids.aguardando, ids.cancelada, ids.atrasada, ids.pix, ids.vai, ids.ativa]);
    const porId = new Map(todas.map((a) => [a.id, a]));
    expect(porId.get(ids.ativa ?? -1)).toMatchObject({ situacao: "ativa", plano: "mensal", codigo: "TESTE100", prePaga: false, acabaEm: null, aluno: { id: ana, nome: "Ana Lista" } });
    expect(porId.get(ids.vai ?? -1)).toMatchObject({ situacao: "vai-cancelar", plano: "anual", prePaga: false });
    expect(porId.get(ids.pix ?? -1)).toMatchObject({ situacao: "pre-paga", prePaga: true, aluno: { id: carla, nome: null } });
    expect(porId.get(ids.atrasada ?? -1)?.situacao).toBe("atrasada");
    expect(porId.get(ids.cancelada ?? -1)?.situacao).toBe("cancelada");
    // "Dá acesso" é a regra do gate, calculada no servidor: a cancelada com dias pagos dá.
    expect(porId.get(ids.cancelada ?? -1)?.daAcesso).toBe(true);
    expect(porId.get(ids.aguardando ?? -1)?.daAcesso).toBe(false);
    expect(porId.get(ids.aguardando ?? -1)?.situacao).toBe("aguardando");
  });
});

describe("a lista da Cobrança — a busca", () => {
  it("por e-mail ou nome, sem diferenciar maiúsculas", async () => {
    expect(idsDe(await pegar({ busca: `LISTA-${S}-ANA.SOUZA` }))).toEqual(esperados("ativa", "atrasada"));
    expect(idsDe(await pegar({ busca: "ana lista" })).filter((id) => Object.values(ids).includes(id))).toEqual(esperados("ativa", "atrasada"));
  });

  it("o '_' não vale por qualquer caractere: 'ana_souza' não acha 'ana.souza'", async () => {
    expect((await pegar({ busca: `lista-${S}-ana_souza` })).assinaturas).toEqual([]);
  });

  it("pelo código da Stripe de um alerta: a assinatura, o cliente ou o Pix — ao pé da letra", async () => {
    expect(idsDe(await pegar({ busca: `sub_${S}_vai` }))).toEqual(esperados("vai"));
    expect(idsDe(await pegar({ busca: `cus_${S}_sem` }))).toEqual(esperados("semconta"));
    expect(idsDe(await pegar({ busca: `pi_${S}` }))).toEqual(esperados("pix"));
    expect((await pegar({ busca: `sub_${S}_va` })).assinaturas).toEqual([]);
  });

  it("a assinatura sem conta aparece sem aluno", async () => {
    const [sem] = (await pegar({ busca: `cus_${S}_sem` })).assinaturas;
    // Ativa na Stripe, mas sem conta: não dá acesso a ninguém (a tela não escreve "acesso até").
    expect(sem).toMatchObject({ aluno: null, situacao: "ativa", daAcesso: false });
  });
});

describe("a lista da Cobrança — as páginas e o que vai ao navegador", () => {
  it("50 por página: a primeira diz que há mais; a segunda traz o resto", async () => {
    const primeira = await pegar({ busca: paginas });
    expect(primeira.assinaturas).toHaveLength(50);
    expect(primeira.temMais).toBe(true);
    const segunda = await pegar({ busca: paginas, pagina: 2 });
    expect(segunda.assinaturas).toHaveLength(1);
    expect(segunda.temMais).toBe(false);
  });

  it("nenhum id da Stripe sai na resposta (só o id do espelho)", async () => {
    const res = await lista({ busca: `lista-${S}` });
    expect(JSON.stringify(res.body)).not.toMatch(/sub_|cus_|pi_/);
  });
});
