import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";
import { aulasConcluidas } from "../lib/progresso.js";

// CONCLUIR UMA AULA (Fase 5 — plano aprovado pelo operador em 03/10/2026). O que
// estes testes protegem:
//   - só conclui quem está logado, e só a aula que pode ver: prévia grátis ou
//     assinatura (sem acesso, 403 e nada gravado);
//   - o aluno só alcança a cadeia publicada; o admin conclui em qualquer status,
//     pela rota de admin, e o aluno não entra nela;
//   - concluir de novo guarda a data da PRIMEIRA vez;
//   - a página da aula devolve as aulas concluídas de QUEM PEDE, só entre as que
//     ele vê; o visitante recebe a lista vazia;
//   - churn não apaga: sem assinatura, o que foi concluído continua lá.

const S = `-progresso-${Date.now()}`;
const ids = { paga: 0, gratis: 0, rascunho: 0, moduloRascunho: 0, cursoRascunho: 0, outraPaga: 0 };
let admin: string[] = [];
let member: string[] = [];
let memberId = "";
let adminId = "";

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(app).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL } })).id;
  adminId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_ADMIN_EMAIL } })).id;

  const curso = await prisma.course.create({
    data: {
      slug: `curso${S}`,
      title: "Curso",
      language: "PT",
      status: "PUBLISHED",
      modules: {
        create: [
          {
            title: "Publicado",
            status: "PUBLISHED",
            lessons: {
              create: [
                { title: "Paga", status: "PUBLISHED", displayOrder: 0 },
                { title: "Grátis", status: "PUBLISHED", isFreePreview: true, displayOrder: 1 },
                { title: "Rascunho", status: "DRAFT", displayOrder: 2 },
                { title: "Outra paga", status: "PUBLISHED", displayOrder: 3 },
              ],
            },
          },
          { title: "Módulo rascunho", status: "DRAFT", lessons: { create: { title: "No módulo rascunho", status: "PUBLISHED" } } },
        ],
      },
    },
    include: { modules: { include: { lessons: { orderBy: { displayOrder: "asc" } } }, orderBy: { id: "asc" } } },
  });
  const [paga, gratis, rascunho, outraPaga] = curso.modules[0].lessons;
  Object.assign(ids, { paga: paga.id, gratis: gratis.id, rascunho: rascunho.id, outraPaga: outraPaga.id, moduloRascunho: curso.modules[1].lessons[0].id });
  const emRascunho = await prisma.course.create({
    data: {
      slug: `rascunho${S}`,
      title: "Curso rascunho",
      language: "PT",
      status: "DRAFT",
      modules: { create: { title: "M", status: "PUBLISHED", lessons: { create: { title: "Aula", status: "PUBLISHED" } } } },
    },
    include: { modules: { include: { lessons: true } } },
  });
  ids.cursoRascunho = emRascunho.modules[0].lessons[0].id;
});

afterAll(async () => {
  // Apagar o curso apaga o progresso junto (a linha é presa à aula).
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

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

const concluir = (id: number, cookies: string[] = []) => request(app).put(`/api/lessons/${id}/concluida`).set("Cookie", cookies);
const concluirComoAdmin = (id: number, cookies: string[] = []) => request(app).put(`/api/admin/lessons/${id}/concluida`).set("Cookie", cookies);
const linha = (userId: string, lessonId: number) => prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
const pagina = (id: number, cookies: string[] = []) => request(app).get(`/api/lessons/${id}/aula`).set("Cookie", cookies);

describe("concluir uma aula — o aluno", () => {
  it("visitante: 401, nada gravado", async () => {
    const res = await concluir(ids.gratis);
    expect(res.status).toBe(401);
  });

  it("aula paga sem assinatura: 403, nada gravado", async () => {
    await semAssinatura(async () => {
      const res = await concluir(ids.outraPaga, member);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("AssinaturaNecessaria");
    });
    expect(await linha(memberId, ids.outraPaga)).toBeNull();
  });

  it("prévia grátis, logado e sem assinatura: concluída", async () => {
    await semAssinatura(async () => {
      expect((await concluir(ids.gratis, member)).status).toBe(204);
    });
    const progresso = await linha(memberId, ids.gratis);
    expect(progresso?.completed).toBe(true);
    expect(progresso?.completedAt).toBeInstanceOf(Date);
  });

  it("aula paga com assinatura: concluída", async () => {
    expect((await concluir(ids.paga, member)).status).toBe(204);
    expect((await linha(memberId, ids.paga))?.completed).toBe(true);
  });

  it.each([
    ["aula em rascunho", () => ids.rascunho],
    ["aula em módulo rascunho", () => ids.moduloRascunho],
    ["aula em curso rascunho", () => ids.cursoRascunho],
  ])("%s: 404 pela rota do aluno", async (_nome, id) => {
    const res = await concluir(id(), member);
    expect(res.status).toBe(404);
    expect(await linha(memberId, id())).toBeNull();
  });

  it("concluir de novo guarda a data da PRIMEIRA vez", async () => {
    const primeira = (await linha(memberId, ids.paga))?.completedAt;
    expect(primeira).toBeInstanceOf(Date);
    await new Promise((r) => setTimeout(r, 20));

    expect((await concluir(ids.paga, member)).status).toBe(204);

    expect((await linha(memberId, ids.paga))?.completedAt?.getTime()).toBe(primeira?.getTime());
    expect(await prisma.lessonProgress.count({ where: { userId: memberId, lessonId: ids.paga } })).toBe(1);
  });

  it("id que não é número: 400", async () => {
    expect((await concluir(Number.NaN, member)).status).toBe(400);
  });
});

describe("concluir uma aula — o admin", () => {
  it("conclui a aula em rascunho, pela rota de admin", async () => {
    expect((await concluirComoAdmin(ids.rascunho, admin)).status).toBe(204);
    expect((await linha(adminId, ids.rascunho))?.completed).toBe(true);
  });

  it("o aluno não entra na rota de admin", async () => {
    expect((await concluirComoAdmin(ids.rascunho, member)).status).toBe(403);
    expect(await linha(memberId, ids.rascunho)).toBeNull();
  });

  it("aula que não existe: 404", async () => {
    expect((await concluirComoAdmin(999_999_999, admin)).status).toBe(404);
  });
});

describe("a página da aula devolve o que QUEM PEDE concluiu", () => {
  it("o aluno vê as dele, e não as do admin", async () => {
    await concluirComoAdmin(ids.outraPaga, admin);

    const res = await pagina(ids.paga, member);

    expect(res.body.concluidas).toEqual([ids.paga, ids.gratis].sort((a, b) => a - b));
  });

  it("o admin vê as dele, e não as do aluno", async () => {
    const res = await request(app).get(`/api/admin/lessons/${ids.paga}/aula`).set("Cookie", admin);

    expect(res.body.concluidas).toEqual([ids.rascunho, ids.outraPaga].sort((a, b) => a - b));
  });

  it("aula fora da lista do aluno não aparece, mesmo concluída antes", async () => {
    // Uma aula concluída quando estava publicada e que depois voltou a rascunho.
    await prisma.lessonProgress.create({ data: { userId: memberId, lessonId: ids.rascunho, completed: true, completedAt: new Date() } });

    const res = await pagina(ids.paga, member);

    expect(res.body.concluidas).not.toContain(ids.rascunho);
  });

  it("visitante: lista vazia", async () => {
    const res = await pagina(ids.gratis);
    expect(res.body.concluidas).toEqual([]);
  });

  it("churn não apaga: sem assinatura, o que foi concluído continua", async () => {
    await semAssinatura(async () => {
      const res = await pagina(ids.paga, member);
      expect(res.body.aula.liberada).toBe(false);
      expect(res.body.concluidas).toContain(ids.paga);
    });
  });
});

// Sem pessoa, nada (achado P2 da revisão de segurança, 03/10/2026): no Prisma, um
// `userId` indefinido vira "sem filtro" e alcançaria o progresso de todo mundo.
describe("sem pessoa, o progresso não responde", () => {
  it("a leitura devolve nada, mesmo havendo conclusões de outros", async () => {
    expect(await aulasConcluidas("", [ids.paga, ids.gratis])).toEqual([]);
    // Cast: simula o dia em que um chamador passar `undefined` sem o tipo ver.
    expect(await aulasConcluidas(undefined as unknown as string, [ids.paga])).toEqual([]);
  });
});

// A BARRA NO CARTÃO DO CURSO (pedido do operador, 30/09/2026): o progresso em cada
// curso começado, contando só a cadeia publicada.
describe("o progresso por curso", () => {
  type Linha = { courseId: number; concluidas: number; total: number };
  const progressoDosCursos = (cookies: string[] = []) => request(app).get("/api/progresso/cursos").set("Cookie", cookies);
  const cursoDe = async (lessonId: number) =>
    (await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId }, select: { module: { select: { courseId: true } } } })).module.courseId;

  it("visitante: 401", async () => {
    expect((await progressoDosCursos()).status).toBe(401);
  });

  it("só o curso começado, com concluídas ÷ aulas publicadas; rascunho não conta em nenhum lado", async () => {
    const res = await progressoDosCursos(member);

    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("private, no-store");
    // O member concluiu "Paga" e "Grátis"; tem uma conclusão antiga em "Rascunho",
    // que não conta. O curso tem 3 aulas publicadas em módulo publicado.
    expect(res.body).toEqual([{ courseId: await cursoDe(ids.paga), concluidas: 2, total: 3 }]);
  });

  it("um aluno não vê o progresso do outro", async () => {
    const res = await progressoDosCursos(admin);

    // O admin concluiu "Outra paga" (publicada) e "Rascunho" (não conta).
    expect(res.body).toEqual([{ courseId: await cursoDe(ids.paga), concluidas: 1, total: 3 }]);
  });
});
