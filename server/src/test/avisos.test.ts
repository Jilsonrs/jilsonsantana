import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// COMUNICAÇÃO → NOTIFICAÇÕES (bloco C1 — decisões do operador, 06/10/2026): o aviso
// que o operador escreve. O que estes testes protegem:
//   - só o admin cria, envia, edita e apaga;
//   - rascunho não chega a ninguém; enviar é uma vez só;
//   - TODOS = todo mundo com conta; CURSO = só quem já começou o curso (abrir uma
//     aula com acesso registra o começo);
//   - editar muda o que o aluno vê; apagar tira do sino de todos;
//   - o aviso não leva link de curso.

const S = `-aviso-${Date.now()}`;
let admin: string[] = [];
let member: string[] = [];

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

const criar = (corpo: object, cookies = admin) => request(servidor).post("/api/admin/announcements").set("Cookie", cookies).send(corpo);
const enviar = (id: number, cookies = admin) => request(servidor).post(`/api/admin/announcements/${id}/enviar`).set("Cookie", cookies);
const sino = (cookies: string[]) => request(servidor).get("/api/notificacoes").set("Cookie", cookies);
type Item = { tipo: string; titulo: string | null; texto: string; curso: unknown };
const avisoNoSino = async (cookies: string[], titulo: string) =>
  ((await sino(cookies)).body.itens as Item[]).find((n) => n.tipo === "AVISO" && n.titulo === titulo);

let contador = 0;
/** Um curso publicado com uma aula paga; devolve o id do curso e o da aula. */
async function curso() {
  contador += 1;
  const c = await prisma.course.create({
    data: {
      slug: `c${contador}${S}`,
      title: `Curso ${contador}${S}`,
      language: "PT",
      status: "PUBLISHED",
      modules: { create: { title: "M", status: "PUBLISHED", lessons: { create: { title: "Aula", status: "PUBLISHED" } } } },
    },
    include: { modules: { include: { lessons: true } } },
  });
  return { id: c.id, aula: c.modules[0].lessons[0].id };
}

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
});

afterAll(async () => {
  await prisma.announcement.deleteMany({ where: { title: { endsWith: S } } });
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

describe("a porta do admin", () => {
  it("sem login 401, aluno 403 — em listar, criar e enviar", async () => {
    const corpo = { title: `x${S}`, body: "y", audience: "TODOS" };
    expect((await request(servidor).get("/api/admin/announcements")).status).toBe(401);
    expect((await request(servidor).get("/api/admin/announcements").set("Cookie", member)).status).toBe(403);
    expect((await criar(corpo, member)).status).toBe(403);
    const { body } = await criar(corpo);
    expect((await enviar(body.id, member)).status).toBe(403);
  });

  it("título e texto obrigatórios; para um curso, o curso tem que existir", async () => {
    expect((await criar({ title: " ", body: "y", audience: "TODOS" })).status).toBe(400);
    expect((await criar({ title: `t${S}`, body: "y", audience: "CURSO" })).status).toBe(400);
    const res = await criar({ title: `t${S}`, body: "y", audience: "CURSO", courseId: 999_999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("CourseNotFound");
  });
});

describe("rascunho e envio", () => {
  it("o rascunho não chega a ninguém", async () => {
    const titulo = `Rascunho${S}`;
    await criar({ title: titulo, body: "Ainda não", audience: "TODOS" });
    expect(await avisoNoSino(member, titulo)).toBeUndefined();
  });

  it("para TODOS: chega a todo mundo com conta, com o título e o texto, sem link de curso", async () => {
    const titulo = `Aula ao vivo${S}`;
    const { body } = await criar({ title: titulo, body: "Hoje às **20h**.", audience: "TODOS" });
    const res = await enviar(body.id);
    expect(res.status).toBe(200);
    expect(res.body.enviadas).toBe(await prisma.user.count({ where: { deletedAt: null } }));
    expect(await avisoNoSino(member, titulo)).toMatchObject({ texto: "Hoje às **20h**.", curso: null });
    expect(await avisoNoSino(admin, titulo)).toBeTruthy();
  });

  it("enviar de novo: 409, e ninguém recebe duas vezes", async () => {
    const titulo = `Uma vez${S}`;
    const { body } = await criar({ title: titulo, body: "Só uma", audience: "TODOS" });
    await enviar(body.id);
    expect((await enviar(body.id)).status).toBe(409);
    const memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL } })).id;
    expect(await prisma.notification.count({ where: { announcementId: body.id, userId: memberId } })).toBe(1);
  });
});

describe("para os alunos de um curso", () => {
  it("abrir uma aula com acesso registra o começo; o aviso chega só a quem começou", async () => {
    const c = await curso();
    const memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL } })).id;
    await request(servidor).get(`/api/lessons/${c.aula}/aula`).set("Cookie", member);
    expect(await prisma.courseStart.count({ where: { userId: memberId, courseId: c.id } })).toBe(1);

    const quantos = await request(servidor).get(`/api/admin/announcements/destinatarios?audience=CURSO&courseId=${c.id}`).set("Cookie", admin);
    expect(quantos.body.quantos).toBe(1);

    const titulo = `Para quem começou${S}`;
    const { body } = await criar({ title: titulo, body: "Material novo", audience: "CURSO", courseId: c.id });
    expect((await enviar(body.id)).body.enviadas).toBe(1);
    expect(await avisoNoSino(member, titulo)).toBeTruthy();
    expect(await avisoNoSino(admin, titulo)).toBeUndefined();
  });

  it("o visitante abrindo a aula não registra nada", async () => {
    const c = await curso();
    await request(servidor).get(`/api/lessons/${c.aula}/aula`);
    expect(await prisma.courseStart.count({ where: { courseId: c.id } })).toBe(0);
  });
});

describe("depois de enviado", () => {
  it("editar: o aluno passa a ver o título e o texto novos; trocar o 'para quem' dá 409", async () => {
    const { body } = await criar({ title: `Antes${S}`, body: "Texto antigo", audience: "TODOS" });
    await enviar(body.id);
    const res = await request(servidor)
      .put(`/api/admin/announcements/${body.id}`)
      .set("Cookie", admin)
      .send({ title: `Depois${S}`, body: "Texto novo", audience: "TODOS" });
    expect(res.status).toBe(200);
    expect(await avisoNoSino(member, `Antes${S}`)).toBeUndefined();
    expect(await avisoNoSino(member, `Depois${S}`)).toMatchObject({ texto: "Texto novo" });

    const c = await curso();
    const trocar = await request(servidor)
      .put(`/api/admin/announcements/${body.id}`)
      .set("Cookie", admin)
      .send({ title: `Depois${S}`, body: "Texto novo", audience: "CURSO", courseId: c.id });
    expect(trocar.status).toBe(409);
  });

  it("apagar: some do sino de todos", async () => {
    const titulo = `Vai sair${S}`;
    const { body } = await criar({ title: titulo, body: "x", audience: "TODOS" });
    await enviar(body.id);
    expect(await avisoNoSino(member, titulo)).toBeTruthy();
    expect((await request(servidor).delete(`/api/admin/announcements/${body.id}`).set("Cookie", admin)).status).toBe(204);
    expect(await avisoNoSino(member, titulo)).toBeUndefined();
    expect(await prisma.notification.count({ where: { announcementId: body.id } })).toBe(0);
  });

  it("a lista do admin diz quantos receberam e quantos leram", async () => {
    const { body } = await criar({ title: `Contagem${S}`, body: "x", audience: "TODOS" });
    await enviar(body.id);
    const memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL } })).id;
    await prisma.notification.updateMany({ where: { announcementId: body.id, userId: memberId }, data: { readAt: new Date() } });
    const lista = (await request(servidor).get("/api/admin/announcements").set("Cookie", admin)).body as { id: number; recebidas: number; lidas: number }[];
    const item = lista.find((a) => a.id === body.id);
    expect(item?.recebidas).toBe(await prisma.user.count({ where: { deletedAt: null } }));
    expect(item?.lidas).toBe(1);
  });
});

describe("as mensagens automáticas", () => {
  it("a lista traz a boas-vindas e os parabéns de cada curso, e só para o admin", async () => {
    const c = await curso();
    await prisma.course.update({ where: { id: c.id }, data: { welcomeMessage: "Bem-vindo!", congratsMessage: "  " } });
    expect((await request(servidor).get("/api/admin/course-messages").set("Cookie", member)).status).toBe(403);
    const lista = (await request(servidor).get("/api/admin/course-messages").set("Cookie", admin)).body as { courseId: number; boasVindas: string | null; parabens: string | null }[];
    expect(lista.find((m) => m.courseId === c.id)).toMatchObject({ boasVindas: "Bem-vindo!", parabens: null });
  });
});
