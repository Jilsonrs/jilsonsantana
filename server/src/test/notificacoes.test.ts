import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";

// AS MENSAGENS DO CURSO NO SINO (Bloco E, etapa 4 — decisões do operador,
// 04/10/2026). O que estes testes protegem:
//   - a boas-vindas chega na primeira aula que a pessoa abre, UMA vez, e só para
//     quem assina (ou o admin, que testa como aluno) — nunca na prévia grátis
//     de quem não assina;
//   - os parabéns chegam quando a última aula que a pessoa vê é concluída,
//     contando só o publicado;
//   - mensagem em branco não manda nada, e o texto é copiado no envio;
//   - cada um só lê e marca as PRÓPRIAS notificações.

const S = `-notif-${Date.now()}`;
let admin: string[] = [];
let member: string[] = [];
let memberId = "";
let adminId = "";

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

let contador = 0;
/** Um curso novo por teste (a notificação é uma por pessoa e curso). */
async function curso(mensagens: { welcomeMessage?: string; congratsMessage?: string }, status: "PUBLISHED" | "DRAFT" = "PUBLISHED") {
  contador += 1;
  const c = await prisma.course.create({
    data: {
      slug: `c${contador}${S}`,
      title: `Curso ${contador}`,
      language: "PT",
      status,
      ...mensagens,
      modules: {
        create: [
          {
            title: "Publicado",
            status: "PUBLISHED",
            lessons: {
              create: [
                { title: "Grátis", status: "PUBLISHED", isFreePreview: true, displayOrder: 0 },
                { title: "Paga", status: "PUBLISHED", displayOrder: 1 },
                { title: "Rascunho", status: "DRAFT", displayOrder: 2 },
              ],
            },
          },
          { title: "Módulo rascunho", status: "DRAFT", lessons: { create: { title: "No módulo rascunho", status: "PUBLISHED" } } },
        ],
      },
    },
    include: { modules: { include: { lessons: { orderBy: { displayOrder: "asc" } } }, orderBy: { id: "asc" } } },
  });
  const [gratis, paga, rascunho] = c.modules[0].lessons;
  return { id: c.id, slug: c.slug, gratis: gratis.id, paga: paga.id, rascunho: rascunho.id, moduloRascunho: c.modules[1].lessons[0].id };
}

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL } })).id;
  adminId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_ADMIN_EMAIL } })).id;
});

afterAll(async () => {
  // Apagar o curso apaga as notificações dele junto.
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

const abrir = (id: number, cookies: string[] = []) => request(servidor).get(`/api/lessons/${id}/aula`).set("Cookie", cookies);
const abrirComoAdmin = (id: number) => request(servidor).get(`/api/admin/lessons/${id}/aula`).set("Cookie", admin);
const concluir = (id: number) => request(servidor).put(`/api/lessons/${id}/concluida`).set("Cookie", member);
const concluirComoAdmin = (id: number) => request(servidor).put(`/api/admin/lessons/${id}/concluida`).set("Cookie", admin);
const doCurso = (userId: string, courseId: number) =>
  prisma.notification.findMany({ where: { userId, courseId }, select: { kind: true, body: true } });

describe("boas-vindas — ao abrir a primeira aula", () => {
  it("assinante: chega UMA vez, com o texto do curso, mesmo abrindo várias aulas", async () => {
    const c = await curso({ welcomeMessage: "  Bem-vindo **ao curso**!  " });
    expect((await abrir(c.paga, member)).status).toBe(200);
    expect((await abrir(c.gratis, member)).status).toBe(200);
    expect((await abrir(c.paga, member)).status).toBe(200);
    expect(await doCurso(memberId, c.id)).toEqual([{ kind: "BOAS_VINDAS", body: "Bem-vindo **ao curso**!" }]);
  });

  it("logado SEM assinatura, na prévia grátis: não chega", async () => {
    const c = await curso({ welcomeMessage: "Bem-vindo!" });
    await semAssinatura(async () => {
      const res = await abrir(c.gratis, member);
      expect(res.status).toBe(200);
      expect(res.body.aula.liberada).toBe(true);
    });
    expect(await doCurso(memberId, c.id)).toEqual([]);
  });

  it("visitante: a página abre, e nada é criado", async () => {
    const c = await curso({ welcomeMessage: "Bem-vindo!" });
    expect((await abrir(c.gratis)).status).toBe(200);
    expect(await prisma.notification.count({ where: { courseId: c.id } })).toBe(0);
  });

  it("mensagem em branco: nada", async () => {
    const c = await curso({ welcomeMessage: "   " });
    await abrir(c.paga, member);
    expect(await doCurso(memberId, c.id)).toEqual([]);
  });

  it("o texto é copiado no envio: editar a mensagem depois não muda o que chegou", async () => {
    const c = await curso({ welcomeMessage: "Primeira versão" });
    await abrir(c.paga, member);
    await prisma.course.update({ where: { id: c.id }, data: { welcomeMessage: "Segunda versão" } });
    await abrir(c.paga, member);
    expect(await doCurso(memberId, c.id)).toEqual([{ kind: "BOAS_VINDAS", body: "Primeira versão" }]);
  });

  it("o admin recebe pela rota dele, mesmo em curso rascunho (testa como aluno)", async () => {
    const c = await curso({ welcomeMessage: "Bem-vindo, admin!" }, "DRAFT");
    expect((await abrirComoAdmin(c.rascunho)).status).toBe(200);
    expect(await doCurso(adminId, c.id)).toEqual([{ kind: "BOAS_VINDAS", body: "Bem-vindo, admin!" }]);
  });
});

describe("parabéns — ao concluir a última aula", () => {
  it("aluno: só depois de TODAS as publicadas; rascunho e módulo rascunho não contam", async () => {
    const c = await curso({ congratsMessage: "Parabéns!" });
    expect((await concluir(c.gratis)).status).toBe(204);
    expect(await doCurso(memberId, c.id)).toEqual([]);
    expect((await concluir(c.paga)).status).toBe(204);
    expect(await doCurso(memberId, c.id)).toEqual([{ kind: "PARABENS", body: "Parabéns!" }]);
    // Concluir de novo não repete.
    await concluir(c.paga);
    expect(await doCurso(memberId, c.id)).toHaveLength(1);
  });

  // Achado P2 da revisão de segurança (04/10/2026): como a boas-vindas, só para
  // quem assina — quem conclui a prévia grátis por último não recebe.
  it("sem assinatura, concluindo a prévia grátis por último: nada", async () => {
    const c = await curso({ congratsMessage: "Parabéns!" });
    await concluir(c.paga);
    await semAssinatura(async () => {
      expect((await concluir(c.gratis)).status).toBe(204);
    });
    expect(await doCurso(memberId, c.id)).toEqual([]);
  });

  it("mensagem em branco: nada, mesmo concluindo tudo", async () => {
    const c = await curso({});
    await concluir(c.gratis);
    await concluir(c.paga);
    expect(await doCurso(memberId, c.id)).toEqual([]);
  });

  it("admin: conta TODAS as aulas, inclusive rascunho", async () => {
    const c = await curso({ congratsMessage: "Parabéns, admin!" });
    await concluirComoAdmin(c.gratis);
    await concluirComoAdmin(c.paga);
    expect(await doCurso(adminId, c.id)).toEqual([]);
    await concluirComoAdmin(c.rascunho);
    await concluirComoAdmin(c.moduloRascunho);
    expect(await doCurso(adminId, c.id)).toEqual([{ kind: "PARABENS", body: "Parabéns, admin!" }]);
  });
});

describe("o sino — ler e marcar como lida", () => {
  const lista = (cookies: string[] = []) => request(servidor).get("/api/notificacoes").set("Cookie", cookies);

  it("sem login: 401 nas três rotas", async () => {
    expect((await lista()).status).toBe(401);
    expect((await request(servidor).put("/api/notificacoes/lidas")).status).toBe(401);
    expect((await request(servidor).put("/api/notificacoes/1/lida")).status).toBe(401);
  });

  it("cada um vê só as suas, com o título do curso e quantas faltam ler", async () => {
    const c = await curso({ welcomeMessage: "Oi, aluno" });
    await abrir(c.paga, member);
    const outro = await curso({ welcomeMessage: "Oi, admin" });
    await abrirComoAdmin(outro.paga);

    const res = await lista(member);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("private, no-store");
    const minha = res.body.itens.find((n: { texto: string }) => n.texto === "Oi, aluno");
    expect(minha).toMatchObject({ tipo: "BOAS_VINDAS", lida: false, curso: { titulo: `Curso ${contador - 1}`, slug: `c${contador - 1}${S}` } });
    expect(res.body.itens.some((n: { texto: string }) => n.texto === "Oi, admin")).toBe(false);
    expect(res.body.naoLidas).toBe(await prisma.notification.count({ where: { userId: memberId, readAt: null } }));
  });

  // Achado P1 da revisão de segurança (04/10/2026): o título é o do ENVIO. Um
  // curso fora do ar renomeado em rascunho não vaza o nome novo pelo sino.
  it("curso que saiu do ar e foi reescrito: ficam o título e o texto do envio, sem o link", async () => {
    const c = await curso({ welcomeMessage: "Curso que vai sair" });
    await abrir(c.paga, member);
    await prisma.course.update({
      where: { id: c.id },
      data: { status: "DRAFT", title: "Lançamento secreto", welcomeMessage: "Texto secreto do rascunho" },
    });
    const res = await lista(member);
    const item = res.body.itens.find((n: { texto: string }) => n.texto === "Curso que vai sair");
    expect(item.curso).toEqual({ titulo: `Curso ${contador}`, slug: null });
    expect(JSON.stringify(res.body)).not.toContain("Lançamento secreto");
    expect(JSON.stringify(res.body)).not.toContain("Texto secreto do rascunho");
  });

  // P46 (decisão do operador, 06/10/2026): a mensagem do curso mostra o que está
  // no admin — corrigir corrige também para quem já recebeu.
  it("curso publicado: o texto e o título mostram o que está no admin agora", async () => {
    const c = await curso({ welcomeMessage: "Abraço, Jilson" });
    await abrir(c.paga, member);
    await prisma.course.update({ where: { id: c.id }, data: { welcomeMessage: "Abraço,\n\nJilson", title: "Título corrigido" } });
    const item = (await lista(member)).body.itens.find((n: { curso: { slug: string | null } | null }) => n.curso?.slug === c.slug);
    expect(item.texto).toBe("Abraço,\n\nJilson");
    expect(item.curso.titulo).toBe("Título corrigido");
  });

  it("os parabéns também mostram a mensagem de parabéns atual", async () => {
    const c = await curso({ welcomeMessage: "Oi", congratsMessage: "Parabéns!" });
    await prisma.notification.create({ data: { userId: memberId, courseId: c.id, courseTitle: "x", kind: "PARABENS", body: "Parabéns!" } });
    await prisma.course.update({ where: { id: c.id }, data: { congratsMessage: "Parabéns, corrigido!" } });
    const item = (await lista(member)).body.itens.find(
      (n: { tipo: string; curso: { slug: string | null } | null }) => n.tipo === "PARABENS" && n.curso?.slug === c.slug,
    );
    expect(item.texto).toBe("Parabéns, corrigido!");
  });

  it("mensagem apagada no admin: fica a que chegou", async () => {
    const c = await curso({ welcomeMessage: "A que chegou" });
    await abrir(c.paga, member);
    await prisma.course.update({ where: { id: c.id }, data: { welcomeMessage: "  " } });
    const item = (await lista(member)).body.itens.find((n: { curso: { slug: string | null } | null }) => n.curso?.slug === c.slug);
    expect(item.texto).toBe("A que chegou");
  });

  it("marcar uma: a própria fica lida; a de outra pessoa dá 404 e continua sem ler", async () => {
    const c = await curso({ welcomeMessage: "Para marcar" });
    await abrir(c.paga, member);
    await abrirComoAdmin(c.paga);
    const minha = await prisma.notification.findFirstOrThrow({ where: { userId: memberId, courseId: c.id } });
    const doAdmin = await prisma.notification.findFirstOrThrow({ where: { userId: adminId, courseId: c.id } });

    expect((await request(servidor).put(`/api/notificacoes/${doAdmin.id}/lida`).set("Cookie", member)).status).toBe(404);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: doAdmin.id } })).readAt).toBeNull();

    expect((await request(servidor).put(`/api/notificacoes/${minha.id}/lida`).set("Cookie", member)).status).toBe(204);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: minha.id } })).readAt).not.toBeNull();
    // Marcar de novo continua 204; id que não existe, 404; id inválido, 400.
    expect((await request(servidor).put(`/api/notificacoes/${minha.id}/lida`).set("Cookie", member)).status).toBe(204);
    expect((await request(servidor).put("/api/notificacoes/999999999/lida").set("Cookie", member)).status).toBe(404);
    expect((await request(servidor).put("/api/notificacoes/abc/lida").set("Cookie", member)).status).toBe(400);
  });

  it("marcar todas: zera as próprias e não toca nas de outra pessoa", async () => {
    const c = await curso({ welcomeMessage: "Todas" });
    await abrir(c.paga, member);
    await abrirComoAdmin(c.paga);
    expect((await request(servidor).put("/api/notificacoes/lidas").set("Cookie", member)).status).toBe(204);
    expect(await prisma.notification.count({ where: { userId: memberId, readAt: null } })).toBe(0);
    expect((await lista(member)).body.naoLidas).toBe(0);
    expect(await prisma.notification.count({ where: { userId: adminId, courseId: c.id, readAt: null } })).toBe(1);
  });
});
