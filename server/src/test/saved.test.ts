import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// "SALVOS" (decisão do operador, 03/10/2026, "como no LinkedIn"). O que estes
// testes protegem:
//   - tudo exige login, e cada pessoa só mexe e só vê o que é DELA;
//   - salvar confere a cadeia publicada inteira: rascunho é 404, igual ao que não
//     existe, e nada é gravado (não vira oráculo do catálogo não publicado);
//   - salvar de novo não duplica; tirar o que não está salvo também é 204;
//   - a lista mostra só o que continua publicado, do mais novo para o mais antigo;
//   - o banco recusa uma linha sem curso nem aula, ou com os dois (CHECK).

const S = `-salvos-${Date.now()}`;
const ids = { curso: 0, outroCurso: 0, cursoRascunho: 0, aula: 0, aulaRascunho: 0, aulaModuloRascunho: 0, aulaCursoRascunho: 0 };
let admin: string[] = [];
let member: string[] = [];
let memberId = "";

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL } })).id;

  const curso = await prisma.course.create({
    data: {
      slug: `curso${S}`,
      title: "Curso salvo",
      subtitle: "Um subtítulo",
      language: "PT",
      status: "PUBLISHED",
      modules: {
        create: [
          {
            title: "Publicado",
            status: "PUBLISHED",
            lessons: { create: [{ title: "Aula publicada", status: "PUBLISHED" }, { title: "Aula rascunho", status: "DRAFT" }] },
          },
          { title: "Módulo rascunho", status: "DRAFT", lessons: { create: { title: "No módulo rascunho", status: "PUBLISHED" } } },
        ],
      },
    },
    include: { modules: { include: { lessons: { orderBy: { id: "asc" } } }, orderBy: { id: "asc" } } },
  });
  Object.assign(ids, {
    curso: curso.id,
    aula: curso.modules[0].lessons[0].id,
    aulaRascunho: curso.modules[0].lessons[1].id,
    aulaModuloRascunho: curso.modules[1].lessons[0].id,
  });
  ids.outroCurso = (await prisma.course.create({ data: { slug: `outro${S}`, title: "Outro curso", language: "EN", status: "PUBLISHED" } })).id;
  const rascunho = await prisma.course.create({
    data: {
      slug: `rascunho${S}`,
      title: "Curso rascunho",
      language: "PT",
      status: "DRAFT",
      modules: { create: { title: "M", status: "PUBLISHED", lessons: { create: { title: "Aula", status: "PUBLISHED" } } } },
    },
    include: { modules: { include: { lessons: true } } },
  });
  ids.cursoRascunho = rascunho.id;
  ids.aulaCursoRascunho = rascunho.modules[0].lessons[0].id;
});

afterAll(async () => {
  // Apagar o curso apaga o que foi salvo dele (a linha é presa ao curso e à aula).
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

type Salvos = { cursos: { id: number; slug: string; title: string }[]; aulas: { id: number; title: string; curso: { slug: string; title: string } }[] };
const lista = (cookies: string[] = []) => request(servidor).get("/api/salvos").set("Cookie", cookies);
const salvar = (tipo: "cursos" | "aulas", id: number, cookies: string[] = []) => request(servidor).put(`/api/salvos/${tipo}/${id}`).set("Cookie", cookies);
const tirar = (tipo: "cursos" | "aulas", id: number, cookies: string[] = []) => request(servidor).delete(`/api/salvos/${tipo}/${id}`).set("Cookie", cookies);
const linhasDoMember = () => prisma.savedItem.count({ where: { userId: memberId } });

describe("salvos — sem login", () => {
  it("visitante: 401 em tudo", async () => {
    expect((await lista()).status).toBe(401);
    expect((await salvar("cursos", ids.curso)).status).toBe(401);
    expect((await tirar("aulas", ids.aula)).status).toBe(401);
  });
});

describe("salvos — salvar", () => {
  it("salva o curso e a aula, e a lista mostra os dois", async () => {
    expect((await salvar("cursos", ids.curso, member)).status).toBe(204);
    expect((await salvar("aulas", ids.aula, member)).status).toBe(204);

    const res = await lista(member);

    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("private, no-store");
    const corpo = res.body as Salvos;
    expect(corpo.cursos.map((c) => c.slug)).toEqual([`curso${S}`]);
    expect(corpo.aulas).toEqual([{ id: ids.aula, title: "Aula publicada", kind: "VIDEO", curso: { slug: `curso${S}`, title: "Curso salvo" } }]);
  });

  it("salvar de novo não duplica", async () => {
    const antes = await linhasDoMember();
    expect((await salvar("cursos", ids.curso, member)).status).toBe(204);
    expect((await salvar("aulas", ids.aula, member)).status).toBe(204);
    expect(await linhasDoMember()).toBe(antes);
  });

  it.each([
    ["aula em rascunho", "aulas", (): number => ids.aulaRascunho],
    ["aula em módulo rascunho", "aulas", (): number => ids.aulaModuloRascunho],
    ["aula em curso rascunho", "aulas", (): number => ids.aulaCursoRascunho],
    ["curso em rascunho", "cursos", (): number => ids.cursoRascunho],
    ["curso que não existe", "cursos", (): number => 999_999_999],
  ] as const)("%s: 404, e nada gravado", async (_nome, tipo, id) => {
    const antes = await linhasDoMember();
    const res = await salvar(tipo, id(), member);
    expect(res.status).toBe(404);
    expect(await linhasDoMember()).toBe(antes);
  });

  it("o mais novo vem primeiro, e curso de outro idioma também aparece", async () => {
    await new Promise((r) => setTimeout(r, 20));
    await salvar("cursos", ids.outroCurso, member);

    const corpo = (await lista(member)).body as Salvos;

    expect(corpo.cursos.map((c) => c.id)).toEqual([ids.outroCurso, ids.curso]);
  });
});

describe("salvos — o que voltou a rascunho", () => {
  /** Muda o status de algo, roda o bloco e devolve o status ao fim. */
  async function comStatus(onde: "course" | "module", id: number, status: "DRAFT" | "ARCHIVED", fn: () => Promise<void>) {
    if (onde === "course") await prisma.course.update({ where: { id }, data: { status } });
    else await prisma.module.update({ where: { id }, data: { status } });
    try {
      await fn();
    } finally {
      if (onde === "course") await prisma.course.update({ where: { id }, data: { status: "PUBLISHED" } });
      else await prisma.module.update({ where: { id }, data: { status: "PUBLISHED" } });
    }
  }
  const moduloDaAula = async () => (await prisma.lesson.findUniqueOrThrow({ where: { id: ids.aula } })).moduleId;

  it("curso salvo que foi arquivado some da lista, e a linha fica", async () => {
    await comStatus("course", ids.curso, "ARCHIVED", async () => {
      const corpo = (await lista(member)).body as Salvos;
      expect(corpo.cursos.map((c) => c.id)).not.toContain(ids.curso);
      expect(await prisma.savedItem.count({ where: { userId: memberId, courseId: ids.curso } })).toBe(1);
    });
  });

  it("aula salva cujo MÓDULO voltou a rascunho some da lista", async () => {
    await comStatus("module", await moduloDaAula(), "DRAFT", async () => {
      expect(((await lista(member)).body as Salvos).aulas).toEqual([]);
    });
  });

  it("aula salva cujo CURSO foi arquivado some da lista", async () => {
    await comStatus("course", ids.curso, "ARCHIVED", async () => {
      expect(((await lista(member)).body as Salvos).aulas).toEqual([]);
    });
  });

  it("some da lista, e a linha fica guardada", async () => {
    await prisma.lesson.update({ where: { id: ids.aula }, data: { status: "DRAFT" } });
    try {
      const corpo = (await lista(member)).body as Salvos;
      expect(corpo.aulas).toEqual([]);
      expect(await prisma.savedItem.count({ where: { userId: memberId, lessonId: ids.aula } })).toBe(1);
    } finally {
      await prisma.lesson.update({ where: { id: ids.aula }, data: { status: "PUBLISHED" } });
    }
  });
});

describe("salvos — cada um o seu", () => {
  it("o admin não vê os salvos do aluno", async () => {
    const corpo = (await lista(admin)).body as Salvos;
    expect(corpo).toEqual({ cursos: [], aulas: [] });
  });

  it("tirar dos salvos do admin não mexe nos do aluno (curso e aula)", async () => {
    expect((await tirar("cursos", ids.curso, admin)).status).toBe(204);
    expect((await tirar("aulas", ids.aula, admin)).status).toBe(204);
    const corpo = (await lista(member)).body as Salvos;
    expect(corpo.cursos.map((c) => c.id)).toContain(ids.curso);
    expect(corpo.aulas.map((a) => a.id)).toContain(ids.aula);
  });
});

describe("salvos — tirar", () => {
  it("tira a aula e o curso; tirar de novo também é 204", async () => {
    expect((await tirar("aulas", ids.aula, member)).status).toBe(204);
    expect((await tirar("cursos", ids.curso, member)).status).toBe(204);
    expect((await tirar("cursos", ids.curso, member)).status).toBe(204);

    const corpo = (await lista(member)).body as Salvos;
    expect(corpo.aulas).toEqual([]);
    expect(corpo.cursos.map((c) => c.id)).toEqual([ids.outroCurso]);
  });
});

describe("salvos — o banco", () => {
  it("recusa uma linha sem curso nem aula, ou com os dois", async () => {
    await expect(prisma.savedItem.create({ data: { userId: memberId } })).rejects.toThrow();
    await expect(prisma.savedItem.create({ data: { userId: memberId, courseId: ids.curso, lessonId: ids.aula } })).rejects.toThrow();
  });
});
