import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// OS NÚMEROS DO CARTÃO DO CURSO NO ADMIN (Fase 5, Bloco MEDIR, etapa 2 — 09/10/2026). O que
// estes testes protegem:
//   - só o admin lê (o aluno, 403; sem login, 401);
//   - HORAS: do "tocou" até o evento seguinte da mesma pessoa na mesma aula; o "tocou"
//     repetido não muda a conta; o trecho sem fechamento não conta; o fechamento perdido não
//     vira dias (no máximo a duração do vídeo, ou 3 h sem ela); no mês e no total;
//   - ALUNOS: quem abriu uma aula do curso, contado na primeira vez, no mês e no total;
//   - nos dois, só ALUNOS: o admin e a conta excluída não entram.

const S = `-stats-${Date.now()}`;
let admin: string[] = [];
let member: string[] = [];
let memberId = "";
let adminId = "";
const outro = `outro${S}`;
const excluido = `excluido${S}`;
const ids = { curso: 0, cursoVazio: 0, comDuracao: 0, semDuracao: 0 };

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

// As horas ficam ANCORADAS no começo do mês de Brasília, calculado pelo próprio banco: o
// teste vale em qualquer dia (no dia 1º de madrugada, "algumas horas atrás" já seria o mês
// passado). "Este mês" = duas horas depois do começo (pode ser no futuro; a conta não liga).
let inicioDoMes = 0;
const noMes = (segundos: number) => new Date(inicioDoMes + 2 * 60 * 60_000 + segundos * 1000);
const noMesPassado = (segundos: number) => new Date(inicioDoMes - 40 * 24 * 60 * 60_000 + segundos * 1000);
type Tipo = "PLAY" | "PAUSE" | "ENDED";
/** Um evento, direto no banco, na hora dada. */
const evento = (userId: string, lessonId: number, type: Tipo, createdAt: Date) =>
  prisma.lessonEvent.create({ data: { userId, lessonId, type, positionSeconds: 0, createdAt } });

beforeAll(async () => {
  const [{ inicio }] = await prisma.$queryRaw<{ inicio: Date }[]>`SELECT ((date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC') AS inicio`;
  inicioDoMes = inicio.getTime();
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL } })).id;
  adminId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_ADMIN_EMAIL } })).id;
  await prisma.user.create({ data: { id: outro, email: `${outro}@teste.local` } });
  await prisma.user.create({ data: { id: excluido, email: `${excluido}@teste.local`, deletedAt: new Date() } });

  const curso = await prisma.course.create({ data: { slug: `curso${S}`, title: "Curso", language: "PT", status: "PUBLISHED" } });
  ids.curso = curso.id;
  ids.cursoVazio = (await prisma.course.create({ data: { slug: `vazio${S}`, title: "Vazio", language: "PT", status: "PUBLISHED" } })).id;
  const modulo = await prisma.module.create({ data: { courseId: curso.id, title: "M", status: "PUBLISHED" } });
  ids.comDuracao = (await prisma.lesson.create({ data: { title: "600 s", status: "PUBLISHED", videoDurationSeconds: 600, moduleId: modulo.id } })).id;
  ids.semDuracao = (await prisma.lesson.create({ data: { title: "Sem duração", status: "PUBLISHED", moduleId: modulo.id } })).id;

  // HORAS DO MEMBER, neste mês:
  // 100 s: tocou → pausou.
  await evento(memberId, ids.comDuracao, "PLAY", noMes(0));
  await evento(memberId, ids.comDuracao, "PAUSE", noMes(100));
  // 50 s, com um "tocou" repetido no meio (10 + 40).
  await evento(memberId, ids.comDuracao, "PLAY", noMes(200));
  await evento(memberId, ids.comDuracao, "PLAY", noMes(210));
  await evento(memberId, ids.comDuracao, "PAUSE", noMes(250));
  // O fechamento perdido: o evento seguinte só uma hora e meia depois → no máximo os 600 s do vídeo.
  await evento(memberId, ids.comDuracao, "PLAY", noMes(300));
  await evento(memberId, ids.comDuracao, "ENDED", noMes(300 + 5400));
  // Sem a duração: cinco horas viram no máximo 3 h (10.800 s).
  await evento(memberId, ids.semDuracao, "PLAY", noMes(0));
  await evento(memberId, ids.semDuracao, "PAUSE", noMes(18_000));
  // O "tocou" sem nada depois: não conta.
  await evento(memberId, ids.semDuracao, "PLAY", noMes(20_000));
  // HORAS DO OUTRO ALUNO, no mês passado: 200 s, só no total.
  await evento(outro, ids.comDuracao, "PLAY", noMesPassado(0));
  await evento(outro, ids.comDuracao, "PAUSE", noMesPassado(200));
  // O admin e a conta excluída: não contam.
  for (const quem of [adminId, excluido]) {
    await evento(quem, ids.comDuracao, "PLAY", noMes(0));
    await evento(quem, ids.comDuracao, "PAUSE", noMes(400));
  }

  // ALUNOS QUE COMEÇARAM: o member neste mês (duas aulas, conta uma vez); o outro no mês
  // passado; o admin e o excluído, não.
  await prisma.lessonProgress.createMany({
    data: [
      { userId: memberId, lessonId: ids.comDuracao, createdAt: noMes(0) },
      { userId: memberId, lessonId: ids.semDuracao, createdAt: noMes(10) },
      { userId: outro, lessonId: ids.comDuracao, createdAt: noMesPassado(0) },
      { userId: adminId, lessonId: ids.comDuracao, createdAt: noMes(0) },
      { userId: excluido, lessonId: ids.comDuracao, createdAt: noMes(0) },
    ],
  });
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
  await prisma.user.deleteMany({ where: { id: { in: [outro, excluido] } } });
  await prisma.lessonEvent.deleteMany({ where: { userId: { in: [memberId, adminId] } } });
});

const ler = (cookies: string[] = []) => request(servidor).get("/api/admin/stats/cursos").set("Cookie", cookies);
type Numeros = { courseId: number; horas: { total: number; mes: number }; alunos: { total: number; mes: number } };
const doCurso = async (courseId: number) => ((await ler(admin)).body.cursos as Numeros[]).find((c) => c.courseId === courseId);

describe("os números do cartão do curso no admin", () => {
  it("só o admin lê: sem login 401, aluno 403; nunca em cache", async () => {
    expect((await ler()).status).toBe(401);
    expect((await ler(member)).status).toBe(403);
    const res = await ler(admin);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("private, no-store");
  });

  it("horas: do 'tocou' ao evento seguinte, com o teto do trecho; só alunos; no mês e no total", async () => {
    const mes = 100 + 50 + 600 + 10_800;
    expect((await doCurso(ids.curso))?.horas).toEqual({ mes, total: mes + 200 });
  });

  it("alunos que começaram: contados na primeira vez; só alunos; no mês e no total", async () => {
    expect((await doCurso(ids.curso))?.alunos).toEqual({ mes: 1, total: 2 });
  });

  it("curso sem nenhum número não vem (a tela mostra zero)", async () => {
    expect(await doCurso(ids.cursoVazio)).toBeUndefined();
  });
});

describe("o mês é o de Brasília", () => {
  it("o começo do mês é a meia-noite do dia 1º em Brasília (UTC−3)", () => {
    // Conferido por fora da conta do banco: o ano e o mês de agora em Brasília, e a
    // meia-noite de lá. (O Brasil não tem horário de verão desde 2019; se voltar, este
    // teste avisa.)
    const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
    const ano = partes.find((p) => p.type === "year")?.value;
    const mes = partes.find((p) => p.type === "month")?.value;
    expect(new Date(inicioDoMes).toISOString()).toBe(new Date(`${ano}-${mes}-01T00:00:00-03:00`).toISOString());
  });

  it("um trecho uma hora antes da meia-noite de Brasília é do mês passado", async () => {
    const antes = await doCurso(ids.curso);
    await evento(outro, ids.semDuracao, "PLAY", new Date(inicioDoMes - 60 * 60_000));
    await evento(outro, ids.semDuracao, "PAUSE", new Date(inicioDoMes - 60 * 60_000 + 30_000));
    const depois = await doCurso(ids.curso);
    expect(depois?.horas.total).toBe((antes?.horas.total ?? 0) + 30);
    expect(depois?.horas.mes).toBe(antes?.horas.mes);
  });
});
