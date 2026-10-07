import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Prisma } from "@prisma/client";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";
import { esquecerPontosDaAula, gravarPonto, pontoDaAula, pontoUtil } from "../lib/onde-parou.js";

// ONDE A PESSOA PAROU (Bloco AULA, etapa 1 — plano aprovado pelo operador em
// 06/10/2026). O que estes testes protegem:
//   - só grava o ponto quem está logado, e só na aula que pode assistir (prévia
//     grátis ou assinatura) — a MESMA regra do concluir; o aluno só alcança a
//     cadeia publicada; o admin grava em qualquer status, pela rota dele;
//   - gravar não mexe na conclusão, e o corpo errado é recusado;
//   - a página da aula devolve o ponto de QUEM PEDE, só com a aula liberada; o
//     começo e o fim do vídeo contam como "do começo";
//   - a ENTRADA no curso: visitante e quem nunca abriu → a primeira aula; quem já
//     abriu → a última em que esteve (a que saiu do ar é pulada; o histórico de
//     outra pessoa não conta); quem terminou o curso → a primeira não concluída
//     (decisão do operador, 06/10/2026); só a cadeia publicada, na ordem do Conteúdo.

const S = `-onde-parou-${Date.now()}`;
let admin: string[] = [];
let member: string[] = [];
let memberId = "";
let adminId = "";
const ids = {
  primeira: 0,
  texto: 0,
  rascunho: 0,
  gratis: 0,
  ultima: 0,
  moduloRascunho: 0,
  cursoRascunho: 0,
  // O curso que se termina: vídeo, texto, vídeo (a última).
  fim1: 0,
  fim2: 0,
  fim3: 0,
  // O curso que termina numa aula de TEXTO.
  textoNoFim1: 0,
  textoNoFim2: 0,
  ingles: 0,
  ordemPrimeira: 0,
  // O curso com mensagem de parabéns: a linha do ponto NÃO é conclusão.
  parabens1: 0,
  parabens2: 0,
  cursoParabens: 0,
};

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

type Modulo = { title: string; status: "PUBLISHED" | "DRAFT"; displayOrder?: number; lessons: Prisma.LessonCreateWithoutModuleInput[] };

/** Cria o curso com os módulos NA ORDEM dada (o id cresce na mesma ordem) e devolve as aulas por título. */
async function curso(slug: string, status: "PUBLISHED" | "DRAFT", modulos: Modulo[], language: "PT" | "EN" = "PT") {
  const criado = await prisma.course.create({ data: { slug: `${slug}${S}`, title: slug, language, status } });
  const aulas = new Map<string, number>();
  for (const m of modulos) {
    const modulo = await prisma.module.create({
      data: { courseId: criado.id, title: m.title, status: m.status, displayOrder: m.displayOrder ?? 0 },
    });
    for (const aula of m.lessons) {
      const criada = await prisma.lesson.create({ data: { ...aula, module: { connect: { id: modulo.id } } } });
      aulas.set(aula.title, criada.id);
    }
  }
  return (titulo: string) => aulas.get(titulo) ?? 0;
}

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL } })).id;
  adminId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_ADMIN_EMAIL } })).id;

  // O curso principal. Um módulo em RASCUNHO vem antes de tudo na ordem, e uma aula
  // em rascunho abre o primeiro módulo: a primeira aula PUBLICADA é "Primeira".
  const a = await curso("curso", "PUBLISHED", [
    { title: "Módulo escondido", status: "DRAFT", displayOrder: -1, lessons: [{ title: "No módulo escondido", status: "PUBLISHED" }] },
    {
      title: "M1",
      status: "PUBLISHED",
      displayOrder: 0,
      lessons: [
        { title: "Rascunho", status: "DRAFT", displayOrder: -1, videoDurationSeconds: 60 },
        { title: "Primeira", status: "PUBLISHED", displayOrder: 0, videoDurationSeconds: 120 },
        { title: "Texto", status: "PUBLISHED", displayOrder: 1, kind: "TEXT", content: "Leitura." },
        { title: "Grátis", status: "PUBLISHED", displayOrder: 2, isFreePreview: true, videoDurationSeconds: 60 },
      ],
    },
    { title: "M2", status: "PUBLISHED", displayOrder: 1, lessons: [{ title: "Última", status: "PUBLISHED", videoDurationSeconds: 100 }] },
  ]);
  Object.assign(ids, {
    primeira: a("Primeira"),
    texto: a("Texto"),
    rascunho: a("Rascunho"),
    gratis: a("Grátis"),
    ultima: a("Última"),
    moduloRascunho: a("No módulo escondido"),
  });

  ids.cursoRascunho = (await curso("rascunho", "DRAFT", [{ title: "M", status: "PUBLISHED", lessons: [{ title: "Aula", status: "PUBLISHED" }] }]))("Aula");
  await curso("vazio", "PUBLISHED", [{ title: "M", status: "PUBLISHED", lessons: [{ title: "Só rascunho", status: "DRAFT" }] }]);
  ids.ingles = (await curso("ingles", "PUBLISHED", [{ title: "M", status: "PUBLISHED", lessons: [{ title: "Lesson", status: "PUBLISHED" }] }], "EN"))("Lesson");

  const fim = await curso("fim", "PUBLISHED", [
    {
      title: "M",
      status: "PUBLISHED",
      lessons: [
        { title: "Vídeo 1", status: "PUBLISHED", displayOrder: 0 },
        { title: "Texto 2", status: "PUBLISHED", displayOrder: 1, kind: "TEXT", content: "x" },
        { title: "Vídeo 3", status: "PUBLISHED", displayOrder: 2 },
      ],
    },
  ]);
  Object.assign(ids, { fim1: fim("Vídeo 1"), fim2: fim("Texto 2"), fim3: fim("Vídeo 3") });

  const textoNoFim = await curso("texto-no-fim", "PUBLISHED", [
    {
      title: "M",
      status: "PUBLISHED",
      lessons: [
        { title: "Vídeo", status: "PUBLISHED", displayOrder: 0 },
        { title: "Texto final", status: "PUBLISHED", displayOrder: 1, kind: "TEXT", content: "x" },
      ],
    },
  ]);
  Object.assign(ids, { textoNoFim1: textoNoFim("Vídeo"), textoNoFim2: textoNoFim("Texto final") });

  // A ordem é a do Conteúdo, não a de criação: o módulo e a aula criados depois vêm antes.
  const ordem = await curso("ordem", "PUBLISHED", [
    { title: "Criado primeiro", status: "PUBLISHED", displayOrder: 1, lessons: [{ title: "Do segundo módulo", status: "PUBLISHED" }] },
    {
      title: "Criado depois",
      status: "PUBLISHED",
      displayOrder: 0,
      lessons: [
        { title: "Segunda na ordem", status: "PUBLISHED", displayOrder: 1 },
        { title: "Primeira na ordem", status: "PUBLISHED", displayOrder: 0 },
      ],
    },
  ]);
  ids.ordemPrimeira = ordem("Primeira na ordem");

  const parabens = await curso("parabens", "PUBLISHED", [
    {
      title: "M",
      status: "PUBLISHED",
      lessons: [
        { title: "Concluída", status: "PUBLISHED", displayOrder: 0 },
        { title: "Só aberta", status: "PUBLISHED", displayOrder: 1 },
      ],
    },
  ]);
  Object.assign(ids, { parabens1: parabens("Concluída"), parabens2: parabens("Só aberta") });
  ids.cursoParabens = (await prisma.course.update({ where: { slug: `parabens${S}` }, data: { congratsMessage: "Parabéns, você concluiu!" } })).id;
});

afterAll(async () => {
  // Apagar o curso apaga junto as aulas e o progresso (a linha é presa à aula).
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

const gravar = (id: number, corpo: unknown, cookies: string[] = []) => request(servidor).post(`/api/lessons/${id}/ponto`).set("Cookie", cookies).send(corpo as object);
const gravarComoAdmin = (id: number, corpo: unknown, cookies: string[] = []) =>
  request(servidor).post(`/api/admin/lessons/${id}/ponto`).set("Cookie", cookies).send(corpo as object);
const pagina = (id: number, cookies: string[] = []) => request(servidor).get(`/api/lessons/${id}/aula`).set("Cookie", cookies);
const paginaDoAdmin = (id: number) => request(servidor).get(`/api/admin/lessons/${id}/aula`).set("Cookie", admin);
const entrada = (slug: string, cookies: string[] = []) => request(servidor).get(`/api/cursos/${slug}${S}/entrada`).set("Cookie", cookies);
const linha = (userId: string, lessonId: number) => prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });

/** Marca que a pessoa esteve na aula numa hora EXATA (a ordem dos testes não depende do relógio). */
async function esteveEm(userId: string, lessonId: number, minuto: number, extra: { positionSeconds?: number | null; completed?: boolean } = {}) {
  const lastSeenAt = new Date(Date.UTC(2026, 9, 6, 12, minuto));
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, lastSeenAt, ...extra },
    update: { lastSeenAt, ...extra },
  });
}

describe("gravar o ponto — o aluno", () => {
  it("visitante: 401", async () => {
    expect((await gravar(ids.gratis, { segundos: 30 })).status).toBe(401);
  });

  it("aula paga sem assinatura: 403, nada gravado", async () => {
    await semAssinatura(async () => {
      const res = await gravar(ids.primeira, { segundos: 30 }, member);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("AssinaturaNecessaria");
    });
    expect(await linha(memberId, ids.primeira)).toBeNull();
  });

  it("prévia grátis, logado e sem assinatura: grava", async () => {
    await semAssinatura(async () => {
      expect((await gravar(ids.gratis, { segundos: 12 }, member)).status).toBe(204);
    });
    expect((await linha(memberId, ids.gratis))?.positionSeconds).toBe(12);
  });

  it("com assinatura: grava o segundo e a hora, sem concluir a aula", async () => {
    expect((await gravar(ids.primeira, { segundos: 47 }, member)).status).toBe(204);

    const gravado = await linha(memberId, ids.primeira);
    expect(gravado?.positionSeconds).toBe(47);
    expect(gravado?.lastSeenAt).toBeInstanceOf(Date);
    expect(gravado?.completed).toBe(false);
    expect(gravado?.completedAt).toBeNull();
  });

  it("gravar de novo troca o ponto e a hora, numa linha só", async () => {
    const antes = (await linha(memberId, ids.primeira))?.lastSeenAt?.getTime() ?? 0;
    await new Promise((r) => setTimeout(r, 20));

    expect((await gravar(ids.primeira, { segundos: 80 }, member)).status).toBe(204);

    const gravado = await linha(memberId, ids.primeira);
    expect(gravado?.positionSeconds).toBe(80);
    expect(gravado?.lastSeenAt?.getTime()).toBeGreaterThan(antes);
    expect(await prisma.lessonProgress.count({ where: { userId: memberId, lessonId: ids.primeira } })).toBe(1);
  });

  it("não mexe na conclusão: a aula concluída continua concluída, com a data da primeira vez", async () => {
    expect((await request(servidor).put(`/api/lessons/${ids.primeira}/concluida`).set("Cookie", member)).status).toBe(204);
    const concluidaEm = (await linha(memberId, ids.primeira))?.completedAt?.getTime();

    expect((await gravar(ids.primeira, { segundos: 90 }, member)).status).toBe(204);

    const gravado = await linha(memberId, ids.primeira);
    expect(gravado?.completed).toBe(true);
    expect(gravado?.completedAt?.getTime()).toBe(concluidaEm);
    expect(gravado?.positionSeconds).toBe(90);
  });

  it("vazio (viu até o fim) é aceito", async () => {
    expect((await gravar(ids.gratis, { segundos: null }, member)).status).toBe(204);
    expect((await linha(memberId, ids.gratis))?.positionSeconds).toBeNull();
  });

  it.each([
    ["negativo", { segundos: -1 }],
    ["fração", { segundos: 1.5 }],
    ["mais de 24 h", { segundos: 86_401 }],
    ["texto", { segundos: "10" }],
    ["sem o campo", {}],
  ])("corpo errado (%s): 400, o ponto não muda", async (_nome, corpo) => {
    const res = await gravar(ids.primeira, corpo, member);
    expect(res.status).toBe(400);
    expect((await linha(memberId, ids.primeira))?.positionSeconds).toBe(90);
  });

  it("id que não é número: 400", async () => {
    expect((await gravar(Number.NaN, { segundos: 1 }, member)).status).toBe(400);
  });

  it.each([
    ["aula em rascunho", () => ids.rascunho],
    ["aula em módulo rascunho", () => ids.moduloRascunho],
    ["aula em curso rascunho", () => ids.cursoRascunho],
  ])("%s: 404 pela rota do aluno, nada gravado", async (_nome, id) => {
    expect((await gravar(id(), { segundos: 10 }, member)).status).toBe(404);
    expect(await linha(memberId, id())).toBeNull();
  });
});

describe("gravar o ponto — o admin", () => {
  it("sem login 401, aluno 403", async () => {
    expect((await gravarComoAdmin(ids.rascunho, { segundos: 10 })).status).toBe(401);
    expect((await gravarComoAdmin(ids.rascunho, { segundos: 10 }, member)).status).toBe(403);
    expect(await linha(memberId, ids.rascunho)).toBeNull();
  });

  it("o admin grava na aula em rascunho", async () => {
    expect((await gravarComoAdmin(ids.rascunho, { segundos: 33 }, admin)).status).toBe(204);
    expect((await linha(adminId, ids.rascunho))?.positionSeconds).toBe(33);
  });

  it("corpo errado: 400; aula que não existe: 404", async () => {
    expect((await gravarComoAdmin(ids.rascunho, { segundos: -5 }, admin)).status).toBe(400);
    expect((await gravarComoAdmin(999_999_999, { segundos: 5 }, admin)).status).toBe(404);
  });
});

describe("a página da aula devolve o ponto de QUEM PEDE", () => {
  it("o aluno recebe o dele; o admin, o dele", async () => {
    await gravar(ids.primeira, { segundos: 47 }, member);
    await gravarComoAdmin(ids.primeira, { segundos: 70 }, admin);

    expect((await pagina(ids.primeira, member)).body.aula.ponto).toBe(47);
    expect((await paginaDoAdmin(ids.primeira)).body.aula.ponto).toBe(70);
  });

  it("visitante: a aula paga vem sem ponto; a prévia grátis, do começo", async () => {
    const paga = await pagina(ids.primeira);
    expect(paga.body.aula.liberada).toBe(false);
    expect(paga.body.aula).not.toHaveProperty("ponto");

    expect((await pagina(ids.gratis)).body.aula.ponto).toBeNull();
  });

  it("sem assinatura, a aula paga vem bloqueada e sem o ponto (que continua guardado)", async () => {
    await semAssinatura(async () => {
      const res = await pagina(ids.primeira, member);
      expect(res.body.aula.liberada).toBe(false);
      expect(res.body.aula).not.toHaveProperty("ponto");
    });
    expect((await linha(memberId, ids.primeira))?.positionSeconds).toBe(47);
  });

  it("o começo e o fim do vídeo contam como do começo", async () => {
    // "Primeira" tem 120 s: abaixo de 5 s é o começo; a partir de 115 s, o fim.
    await gravar(ids.primeira, { segundos: 4 }, member);
    expect((await pagina(ids.primeira, member)).body.aula.ponto).toBeNull();
    await gravar(ids.primeira, { segundos: 115 }, member);
    expect((await pagina(ids.primeira, member)).body.aula.ponto).toBeNull();
    await gravar(ids.primeira, { segundos: 114 }, member);
    expect((await pagina(ids.primeira, member)).body.aula.ponto).toBe(114);
  });

  it("aula de texto: sempre do começo", async () => {
    await gravar(ids.texto, { segundos: 30 }, member);
    expect((await pagina(ids.texto, member)).body.aula.ponto).toBeNull();
  });
});

describe("o ponto que vale (função pura)", () => {
  it("começo, fim e vídeo ainda sem duração", () => {
    expect(pontoUtil(null, 120)).toBeNull();
    expect(pontoUtil(4, 120)).toBeNull();
    expect(pontoUtil(5, 120)).toBe(5);
    expect(pontoUtil(114, 120)).toBe(114);
    expect(pontoUtil(115, 120)).toBeNull();
    // Vídeo processando (sem duração): vale o que foi guardado.
    expect(pontoUtil(500, null)).toBe(500);
  });
});

// Sem pessoa, nada (a mesma trava do `concluirAula`, achado P2 de 03/10/2026): no
// Prisma, um `userId` indefinido vira "sem filtro" e alcançaria o ponto de todo mundo.
describe("sem pessoa, ou sem aula, o ponto não responde", () => {
  it("gravar recusa; ler devolve do começo, mesmo havendo pontos de outros", async () => {
    await expect(gravarPonto("", ids.primeira, 10)).rejects.toThrow();
    // Cast: simula o dia em que um chamador passar `undefined` sem o tipo ver.
    await expect(gravarPonto(undefined as unknown as string, ids.primeira, 10)).rejects.toThrow();
    expect(await prisma.lessonProgress.count({ where: { lessonId: ids.primeira, positionSeconds: 10 } })).toBe(0);
    expect(await pontoDaAula(undefined, ids.primeira, 120)).toBeNull();
  });

  // Achado P2 da revisão de segurança (06/10/2026): sem a trava, `lessonId`
  // indefinido zeraria o ponto de todo mundo, em todas as aulas.
  it("zerar sem aula recusa, e o ponto das outras aulas continua", async () => {
    expect((await linha(memberId, ids.primeira))?.positionSeconds).toBe(114);
    // Cast: simula o dia em que um chamador passar `undefined` sem o tipo ver.
    await expect(esquecerPontosDaAula(undefined as unknown as number)).rejects.toThrow();
    await expect(esquecerPontosDaAula(0)).rejects.toThrow();
    expect((await linha(memberId, ids.primeira))?.positionSeconds).toBe(114);
  });
});

// A LINHA DO PONTO NÃO É CONCLUSÃO (achado P2 da revisão de segurança, 06/10/2026):
// abrir a aula cria a linha com `completed = false`, e só o filtro `completed: true`
// impede "abrir" de contar como "concluir" — nas concluídas da página, no % do
// curso, nos parabéns e, na Fase 6.5, no certificado.
describe("abrir a aula (gravar o ponto) não conta como concluir", () => {
  it("nem nas concluídas da página, nem no % do curso, nem nos parabéns", async () => {
    const parabens = () => prisma.notification.count({ where: { userId: memberId, courseId: ids.cursoParabens, kind: "PARABENS" } });
    expect((await gravar(ids.parabens2, { segundos: 30 }, member)).status).toBe(204);
    expect((await request(servidor).put(`/api/lessons/${ids.parabens1}/concluida`).set("Cookie", member)).status).toBe(204);

    expect((await pagina(ids.parabens1, member)).body.concluidas).toEqual([ids.parabens1]);
    const progresso = await request(servidor).get("/api/progresso/cursos").set("Cookie", member);
    expect(progresso.body).toContainEqual({ courseId: ids.cursoParabens, concluidas: 1, total: 2 });
    expect(await parabens()).toBe(0);

    // Controle: concluir de verdade a última aula manda os parabéns (o teste enxerga a notificação).
    expect((await request(servidor).put(`/api/lessons/${ids.parabens2}/concluida`).set("Cookie", member)).status).toBe(204);
    expect(await parabens()).toBe(1);
  });
});

describe("entrar no curso", () => {
  // Os testes acima gravaram com a hora REAL; aqui a ordem das visitas é marcada à
  // mão (`esteveEm`), então o histórico do curso principal começa limpo.
  beforeAll(async () => {
    const doCurso = [ids.primeira, ids.texto, ids.rascunho, ids.gratis, ids.ultima, ids.moduloRascunho];
    await prisma.lessonProgress.deleteMany({ where: { userId: { in: [memberId, adminId] }, lessonId: { in: doCurso } } });
  });

  it("curso que não existe, ou em rascunho: 404", async () => {
    expect((await entrada("nao-existe", member)).status).toBe(404);
    expect((await entrada("rascunho", member)).status).toBe(404);
  });

  it("visitante: a primeira aula PUBLICADA, nunca em cache", async () => {
    const res = await entrada("curso");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("private, no-store");
    expect(res.body).toEqual({ aulaId: ids.primeira });
  });

  it("a ordem é a do Conteúdo, não a de criação", async () => {
    expect((await entrada("ordem", member)).body).toEqual({ aulaId: ids.ordemPrimeira });
  });

  it("logado sem histórico no curso: a primeira; idioma não filtra", async () => {
    expect((await entrada("ingles", member)).body).toEqual({ aulaId: ids.ingles });
  });

  it("curso sem aula publicada: nenhuma aula", async () => {
    expect((await entrada("vazio", member)).body).toEqual({ aulaId: null });
    expect((await entrada("vazio")).body).toEqual({ aulaId: null });
  });

  it("a última aula em que esteve — vídeo ou texto", async () => {
    await esteveEm(memberId, ids.primeira, 1);
    await esteveEm(memberId, ids.gratis, 2);
    expect((await entrada("curso", member)).body).toEqual({ aulaId: ids.gratis });

    await esteveEm(memberId, ids.texto, 3);
    expect((await entrada("curso", member)).body).toEqual({ aulaId: ids.texto });
  });

  it("a aula que saiu do ar é pulada", async () => {
    // Linhas de quando elas estavam publicadas, mais recentes que a do texto.
    await esteveEm(memberId, ids.rascunho, 4);
    await esteveEm(memberId, ids.moduloRascunho, 5);
    expect((await entrada("curso", member)).body).toEqual({ aulaId: ids.texto });
  });

  it("o histórico de outra pessoa não conta", async () => {
    await esteveEm(adminId, ids.ultima, 6);
    expect((await entrada("curso", member)).body).toEqual({ aulaId: ids.texto });
    expect((await entrada("curso", admin)).body).toEqual({ aulaId: ids.ultima });
  });

  it("gravar o ponto conta como estar na aula", async () => {
    expect((await gravar(ids.ultima, { segundos: 20 }, member)).status).toBe(204);
    expect((await entrada("curso", member)).body).toEqual({ aulaId: ids.ultima });
  });

  it("viu até o fim a ÚLTIMA aula do curso: a primeira que não concluiu — aberta não é concluída", async () => {
    // "Texto 2" foi ABERTA antes (tem linha), mas não concluída: continua sendo a que falta.
    await esteveEm(memberId, ids.fim2, 0, { completed: false, positionSeconds: null });
    await esteveEm(memberId, ids.fim1, 1, { completed: true });
    await esteveEm(memberId, ids.fim3, 2, { completed: true, positionSeconds: null });
    expect((await entrada("fim", member)).body).toEqual({ aulaId: ids.fim2 });
  });

  it("e concluiu todas: a primeira do curso", async () => {
    await esteveEm(memberId, ids.fim2, 0, { completed: true });
    expect((await entrada("fim", member)).body).toEqual({ aulaId: ids.fim1 });
  });

  it("na última aula, mas no meio do vídeo (ou sem ter concluído): fica nela", async () => {
    await esteveEm(memberId, ids.fim3, 3, { completed: true, positionSeconds: 40 });
    expect((await entrada("fim", member)).body).toEqual({ aulaId: ids.fim3 });

    await esteveEm(memberId, ids.fim3, 4, { completed: false, positionSeconds: null });
    expect((await entrada("fim", member)).body).toEqual({ aulaId: ids.fim3 });
  });

  it("a última aula do curso é de TEXTO: quem estava nela continua nela", async () => {
    await esteveEm(memberId, ids.textoNoFim1, 1, { completed: true, positionSeconds: null });
    await esteveEm(memberId, ids.textoNoFim2, 2, { completed: true, positionSeconds: null });
    expect((await entrada("texto-no-fim", member)).body).toEqual({ aulaId: ids.textoNoFim2 });
  });
});
