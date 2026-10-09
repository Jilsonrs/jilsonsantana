import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// O PROGRESSO NAS TRILHAS DO ALUNO (Fase 5, Bloco MEDIR, etapa 3 — 09/10/2026). O que estes
// testes protegem:
//   - só logado; só as trilhas DELE (nem a de outra pessoa, nem a pronta do catálogo);
//   - as aulas da trilha: item de curso = as aulas publicadas do curso; item de aula = a aula;
//     a aula que entra pelos dois caminhos conta UMA vez; rascunho (aula, módulo, curso) fora;
//   - concluída = aula concluída de verdade (abrir não basta);
//   - só a trilha COMEÇADA aparece; ela está CONCLUÍDA quando todas as aulas estão.

const S = `-trilhas-${Date.now()}`;
let member: string[] = [];
let memberId = "";
let adminId = "";
const ids = { a1: 0, a2: 0, aRascunho: 0, b1: 0, c1: 0, cursoA: 0, cursoC: 0, trilha: 0, soRascunho: 0, nuncaComecada: 0 };

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

async function curso(slug: string, status: "PUBLISHED" | "DRAFT", aulas: { title: string; status: "PUBLISHED" | "DRAFT" }[]) {
  const c = await prisma.course.create({ data: { slug: `${slug}${S}`, title: slug, language: "PT", status } });
  const m = await prisma.module.create({ data: { courseId: c.id, title: "M", status: "PUBLISHED" } });
  const criadas: number[] = [];
  for (const a of aulas) criadas.push((await prisma.lesson.create({ data: { ...a, moduleId: m.id } })).id);
  return { id: c.id, aulas: criadas };
}

type Item = { itemType: "COURSE" | "LESSON"; courseId?: number; lessonId?: number };
const trilha = (nome: string, ownerUserId: string | null, itens: Item[]) =>
  prisma.learningPlan
    .create({ data: { name: `${nome}${S}`, ownerUserId, language: "PT", planModules: { create: [{ title: "Etapa", items: { create: itens } }] } } })
    .then((t) => t.id);
const concluir = (lessonId: number) =>
  prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: memberId, lessonId } },
    create: { userId: memberId, lessonId, completed: true, completedAt: new Date() },
    update: { completed: true, completedAt: new Date() },
  });

beforeAll(async () => {
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL } })).id;
  adminId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_ADMIN_EMAIL } })).id;

  const a = await curso("a", "PUBLISHED", [
    { title: "A1", status: "PUBLISHED" },
    { title: "A2", status: "PUBLISHED" },
    { title: "A rascunho", status: "DRAFT" },
  ]);
  const b = await curso("b", "PUBLISHED", [{ title: "B1", status: "PUBLISHED" }]);
  const c = await curso("c", "DRAFT", [{ title: "C1", status: "PUBLISHED" }]);
  Object.assign(ids, { cursoA: a.id, a1: a.aulas[0], a2: a.aulas[1], aRascunho: a.aulas[2], b1: b.aulas[0], cursoC: c.id, c1: c.aulas[0] });

  // A trilha do member: o curso A inteiro, a aula B1 avulsa, e a A1 de novo, avulsa → {A1, A2, B1}.
  ids.trilha = await trilha("trilha", memberId, [
    { itemType: "COURSE", courseId: ids.cursoA },
    { itemType: "LESSON", lessonId: ids.b1 },
    { itemType: "LESSON", lessonId: ids.a1 },
  ]);
  // Só com o curso em rascunho: nenhuma aula conta.
  ids.soRascunho = await trilha("so-rascunho", memberId, [{ itemType: "COURSE", courseId: ids.cursoC }]);
  // Uma trilha dele só com a aula B1: começa quando a B1 for concluída.
  ids.nuncaComecada = await trilha("so-b1", memberId, [{ itemType: "LESSON", lessonId: ids.b1 }]);
  // A do admin e a pronta do catálogo: nunca aparecem para o member.
  await trilha("do-admin", adminId, [{ itemType: "COURSE", courseId: ids.cursoA }]);
  await trilha("pronta", null, [{ itemType: "COURSE", courseId: ids.cursoA }]);
});

afterAll(async () => {
  await prisma.learningPlan.deleteMany({ where: { name: { endsWith: S } } });
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

const ler = (cookies: string[] = member) => request(servidor).get("/api/progresso/trilhas").set("Cookie", cookies);
type Progresso = { planId: number; concluidas: number; total: number; concluida: boolean };
const daTrilha = async (planId: number) => ((await ler()).body as Progresso[]).find((p) => p.planId === planId);

describe("o progresso nas trilhas do aluno", () => {
  it("sem login: 401; nunca em cache", async () => {
    expect((await ler([])).status).toBe(401);
    expect((await ler()).headers["cache-control"]).toBe("private, no-store");
  });

  it("sem nenhuma aula concluída, nenhuma trilha aparece; abrir uma aula não conta", async () => {
    await prisma.lessonProgress.create({ data: { userId: memberId, lessonId: ids.b1, completed: false, lastSeenAt: new Date() } });
    const ids_ = ((await ler()).body as Progresso[]).map((p) => p.planId);
    expect(ids_).not.toContain(ids.trilha);
    expect(ids_).not.toContain(ids.nuncaComecada);
  });

  it("começou: a aula do curso e a avulsa repetida contam uma vez; rascunho fora", async () => {
    await concluir(ids.a1);
    // A aula em rascunho concluída (quando estava publicada) não entra na conta.
    await concluir(ids.aRascunho);
    expect(await daTrilha(ids.trilha)).toEqual({ planId: ids.trilha, concluidas: 1, total: 3, concluida: false });
  });

  it("só as trilhas DELE: a do admin e a pronta do catálogo não vêm; a só de rascunho não começa", async () => {
    const lista = (await ler()).body as Progresso[];
    expect(lista.map((p) => p.planId).sort()).toEqual([ids.trilha]);
    await concluir(ids.c1);
    expect(await daTrilha(ids.soRascunho)).toBeUndefined();
  });

  it("todas as aulas concluídas: a trilha está CONCLUÍDA", async () => {
    await concluir(ids.a2);
    expect((await daTrilha(ids.trilha))?.concluida).toBe(false);
    await concluir(ids.b1);
    expect(await daTrilha(ids.trilha)).toEqual({ planId: ids.trilha, concluidas: 3, total: 3, concluida: true });
    // A trilha com só a B1 também, por consequência.
    expect(await daTrilha(ids.nuncaComecada)).toEqual({ planId: ids.nuncaComecada, concluidas: 1, total: 1, concluida: true });
  });
});
