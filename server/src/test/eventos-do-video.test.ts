import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";
import { EVENTOS_POR_DIA, EVENTOS_POR_MINUTO } from "../routes/progress.js";

// OS EVENTOS DO VÍDEO (Fase 5, Bloco MEDIR, etapa 1 — pedido do operador, 09/10/2026):
// tocou, pausou, terminou, guardados para as horas assistidas do cartão do admin. O que
// estes testes protegem:
//   - só guarda quem está logado, e só na aula que pode assistir (prévia grátis ou
//     assinatura) — a MESMA trava do ponto; o aluno só alcança a cadeia publicada;
//   - só aula de VÍDEO; o corpo errado é recusado e nada é guardado;
//   - o evento fica com a pessoa da SESSÃO, a aula, o tipo e o segundo inteiro, na ordem;
//   - o TETO por pessoa (achado P1 da revisão de segurança, 09/10/2026): a tabela só
//     cresce, e um script não pode encher o banco — passou do teto, 429 e nada gravado.

const S = `-eventos-${Date.now()}`;
let member: string[] = [];
let memberId = "";
const ids = { video: 0, gratis: 0, texto: 0, rascunho: 0, moduloRascunho: 0, cursoRascunho: 0 };

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

const guardar = (id: number, corpo: unknown, cookies: string[] = member) =>
  request(servidor).post(`/api/lessons/${id}/eventos`).set("Cookie", cookies).send(corpo as object);
const eventos = (lessonId: number) => prisma.lessonEvent.findMany({ where: { lessonId }, orderBy: { id: "asc" } });

/** Roda o bloco com a assinatura de teste do member@ vencida, e devolve ela ao fim. */
async function semAssinatura(fn: () => Promise<void>) {
  await prisma.subscription.update({
    where: { stripeSubscriptionId: ASSINATURA_DE_TESTE },
    data: { status: "canceled", currentPeriodEnd: new Date("2020-01-01T00:00:00Z") },
  });
  try {
    await fn();
  } finally {
    await prisma.subscription.update({
      where: { stripeSubscriptionId: ASSINATURA_DE_TESTE },
      data: { status: "active", currentPeriodEnd: new Date("2100-01-01T00:00:00Z") },
    });
  }
}

beforeAll(async () => {
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL } })).id;

  const curso = await prisma.course.create({ data: { slug: `curso${S}`, title: "Curso", language: "PT", status: "PUBLISHED" } });
  const modulo = await prisma.module.create({ data: { courseId: curso.id, title: "M", status: "PUBLISHED" } });
  const aula = (dados: { title: string; status?: "PUBLISHED" | "DRAFT"; kind?: "VIDEO" | "TEXT"; isFreePreview?: boolean }) =>
    prisma.lesson.create({ data: { status: "PUBLISHED", ...dados, module: { connect: { id: modulo.id } } } }).then((a) => a.id);
  ids.video = await aula({ title: "Vídeo" });
  ids.gratis = await aula({ title: "Grátis", isFreePreview: true });
  ids.texto = await aula({ title: "Texto", kind: "TEXT" });
  ids.rascunho = await aula({ title: "Rascunho", status: "DRAFT" });

  const moduloRascunho = await prisma.module.create({ data: { courseId: curso.id, title: "Escondido", status: "DRAFT" } });
  ids.moduloRascunho = (await prisma.lesson.create({ data: { title: "No módulo escondido", status: "PUBLISHED", moduleId: moduloRascunho.id } })).id;

  const cursoRascunho = await prisma.course.create({ data: { slug: `rascunho${S}`, title: "Rascunho", language: "PT", status: "DRAFT" } });
  const m = await prisma.module.create({ data: { courseId: cursoRascunho.id, title: "M", status: "PUBLISHED" } });
  ids.cursoRascunho = (await prisma.lesson.create({ data: { title: "No curso rascunho", status: "PUBLISHED", moduleId: m.id } })).id;
});

afterAll(async () => {
  // Apagar o curso apaga as aulas, e com elas os eventos (a linha é presa à aula).
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

describe("os eventos do vídeo — quem guarda", () => {
  it("sem login: 401, e nada é guardado", async () => {
    expect((await guardar(ids.video, { tipo: "PLAY", segundos: 3 }, [])).status).toBe(401);
    expect(await eventos(ids.video)).toEqual([]);
  });

  it("fora da cadeia publicada (aula, módulo ou curso em rascunho): 404", async () => {
    for (const id of [ids.rascunho, ids.moduloRascunho, ids.cursoRascunho]) {
      expect((await guardar(id, { tipo: "PLAY", segundos: 0 })).status).toBe(404);
      expect(await eventos(id)).toEqual([]);
    }
  });

  it("aula de texto não tem vídeo: 400", async () => {
    const res = await guardar(ids.texto, { tipo: "PLAY", segundos: 0 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "AulaSemVideo" });
    expect(await eventos(ids.texto)).toEqual([]);
  });

  it("sem assinatura: a aula paga é 403 e nada é guardado; a prévia grátis guarda", async () => {
    await semAssinatura(async () => {
      expect((await guardar(ids.video, { tipo: "PLAY", segundos: 1 })).status).toBe(403);
      expect(await eventos(ids.video)).toEqual([]);
      expect((await guardar(ids.gratis, { tipo: "PLAY", segundos: 1 })).status).toBe(204);
      expect((await eventos(ids.gratis)).map((e) => e.type)).toEqual(["PLAY"]);
    });
  });

  it.each([
    ["sem o tipo", { segundos: 3 }],
    ["tipo que não existe", { tipo: "SEEK", segundos: 3 }],
    ["sem o segundo", { tipo: "PLAY" }],
    ["segundo negativo", { tipo: "PLAY", segundos: -1 }],
    ["segundo em texto", { tipo: "PLAY", segundos: "3" }],
    ["segundo vazio", { tipo: "PLAY", segundos: null }],
  ])("corpo errado (%s): 400, e nada é guardado", async (_nome, corpo) => {
    const antes = (await eventos(ids.video)).length;
    expect((await guardar(ids.video, corpo)).status).toBe(400);
    expect((await eventos(ids.video)).length).toBe(antes);
  });
});

describe("os eventos do vídeo — o que fica guardado", () => {
  it("tocou, pausou, terminou: na ordem, da pessoa da sessão, no segundo inteiro (o player manda fração)", async () => {
    expect((await guardar(ids.video, { tipo: "PLAY", segundos: 12.73 })).status).toBe(204);
    expect((await guardar(ids.video, { tipo: "PAUSE", segundos: 47.2 })).status).toBe(204);
    expect((await guardar(ids.video, { tipo: "ENDED", segundos: 59.9 })).status).toBe(204);

    const guardados = await eventos(ids.video);
    expect(guardados.map((e) => [e.type, e.positionSeconds, e.userId])).toEqual([
      ["PLAY", 12, memberId],
      ["PAUSE", 47, memberId],
      ["ENDED", 59, memberId],
    ]);
    // A hora é a do servidor, na ordem em que chegaram.
    expect(guardados[0].createdAt.getTime()).toBeLessThanOrEqual(guardados[2].createdAt.getTime());
  });

  it("o corpo dizendo outra conta não muda de quem é o evento", async () => {
    await guardar(ids.gratis, { tipo: "PAUSE", segundos: 5, userId: "outra-pessoa" });
    const ultimo = (await eventos(ids.gratis)).at(-1);
    expect(ultimo?.userId).toBe(memberId);
  });
});

describe("os eventos do vídeo — o teto por pessoa", () => {
  /** Eventos já gravados para o member@, na hora dada (direto no banco). */
  const jaGravados = (quantos: number, quando: Date) =>
    prisma.lessonEvent.createMany({
      data: Array.from({ length: quantos }, () => ({ userId: memberId, lessonId: ids.gratis, type: "PLAY" as const, positionSeconds: 0, createdAt: quando })),
    });
  const doMember = () => prisma.lessonEvent.count({ where: { userId: memberId } });
  const limpar = () => prisma.lessonEvent.deleteMany({ where: { userId: memberId } });

  it("abaixo do teto do minuto, grava; no teto, 429 e nada é gravado", async () => {
    await limpar();
    await jaGravados(EVENTOS_POR_MINUTO - 1, new Date());
    expect((await guardar(ids.video, { tipo: "PLAY", segundos: 1 })).status).toBe(204);
    expect(await doMember()).toBe(EVENTOS_POR_MINUTO);

    const res = await guardar(ids.video, { tipo: "PAUSE", segundos: 2 });
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: "MuitosEventos" });
    expect(await doMember()).toBe(EVENTOS_POR_MINUTO);
    await limpar();
  });

  it("o teto do dia vale mesmo com o minuto livre; o que passou de 24 h não conta", async () => {
    await limpar();
    await jaGravados(EVENTOS_POR_DIA, new Date(Date.now() - 2 * 60 * 60_000));
    expect((await guardar(ids.video, { tipo: "PLAY", segundos: 1 })).status).toBe(429);

    await limpar();
    await jaGravados(EVENTOS_POR_DIA, new Date(Date.now() - 25 * 60 * 60_000));
    expect((await guardar(ids.video, { tipo: "PLAY", segundos: 1 })).status).toBe(204);
    await limpar();
  });
});
