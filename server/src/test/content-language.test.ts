import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// IDIOMA NO CONTEÚDO (app do aluno em inglês, etapa 3 — decisões do operador de
// 14 e 24/09/2026). O que estes testes protegem:
//   - as listas de DESCOBERTA (catálogo, trilhas, busca) mostram só o idioma pedido;
//   - o que é DO ALUNO (minhas trilhas) aparece nos dois idiomas — idioma é
//     filtro, não portão, como no LinkedIn Learning;
//   - a trilha não mistura idiomas, e quem recusa é o servidor;
//   - o idioma do curso só troca enquanto ele é rascunho.

const S = `-lang-${Date.now()}`;
const TERMO = `idiomalab${Date.now()}`; // aparece nos dois cursos, para a busca

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(app).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}
const sessaoAdmin = () => sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
const sessaoMember = () => sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);

function cursoPublicado(language: "PT" | "EN", slug: string, aula: string) {
  return prisma.course.create({
    data: {
      slug,
      language,
      title: `Curso ${language} ${TERMO}`,
      status: "PUBLISHED",
      modules: {
        create: {
          title: "Módulo",
          status: "PUBLISHED",
          lessons: { create: { title: `${aula} ${TERMO}`, status: "PUBLISHED" } },
        },
      },
    },
    include: { modules: { include: { lessons: true } } },
  });
}

function trilhaPublicada(language: "PT" | "EN", slug: string) {
  return prisma.learningPlan.create({
    data: {
      slug,
      language,
      name: `Trilha ${language}`,
      isTemplate: true,
      status: "PUBLISHED",
      planModules: { create: { title: "M1" } },
    },
  });
}

let cursoPt = { id: 0, slug: "", aulaId: 0 };
let cursoEn = { id: 0, slug: "", aulaId: 0 };
let trilhaPt = { id: 0, slug: "" };
let trilhaEn = { id: 0, slug: "" };
let rascunhoId = 0;
const slugsCriados: string[] = [];

beforeAll(async () => {
  const pt = await cursoPublicado("PT", `curso-pt${S}`, "Aula PT");
  const en = await cursoPublicado("EN", `curso-en${S}`, "Aula EN");
  cursoPt = { id: pt.id, slug: pt.slug, aulaId: pt.modules[0].lessons[0].id };
  cursoEn = { id: en.id, slug: en.slug, aulaId: en.modules[0].lessons[0].id };
  const tPt = await trilhaPublicada("PT", `trilha-pt${S}`);
  const tEn = await trilhaPublicada("EN", `trilha-en${S}`);
  trilhaPt = { id: tPt.id, slug: tPt.slug! };
  trilhaEn = { id: tEn.id, slug: tEn.slug! };
  const rascunho = await prisma.course.create({
    data: { slug: `rascunho${S}`, language: "PT", title: "Rascunho", status: "DRAFT" },
  });
  rascunhoId = rascunho.id;
});

afterAll(async () => {
  const member = await prisma.user.findUnique({ where: { email: process.env.SEED_MEMBER_EMAIL ?? "" } });
  await prisma.learningPlan.deleteMany({
    where: { OR: [{ slug: { endsWith: S } }, { ownerUserId: member?.id, sourcePlanId: { in: [trilhaPt.id, trilhaEn.id] } }] },
  });
  await prisma.course.deleteMany({ where: { OR: [{ slug: { endsWith: S } }, { slug: { in: slugsCriados } }] } });
});

const slugs = (lista: { slug: string | null }[]) => lista.map((x) => x.slug);

describe("listas de descoberta filtram pelo idioma", () => {
  it("catálogo: sem ?lang é português; com ?lang=en é só inglês", async () => {
    const padrao = await request(app).get("/api/courses");
    const emIngles = await request(app).get("/api/courses?lang=en");

    expect(slugs(padrao.body)).toContain(cursoPt.slug);
    expect(slugs(padrao.body)).not.toContain(cursoEn.slug);
    expect(slugs(emIngles.body)).toContain(cursoEn.slug);
    expect(slugs(emIngles.body)).not.toContain(cursoPt.slug);
  });

  it("trilhas prontas: o mesmo filtro", async () => {
    const pt = await request(app).get("/api/trilhas?lang=pt");
    const en = await request(app).get("/api/trilhas?lang=en");

    expect(slugs(pt.body)).toContain(trilhaPt.slug);
    expect(slugs(pt.body)).not.toContain(trilhaEn.slug);
    expect(slugs(en.body)).toContain(trilhaEn.slug);
    expect(slugs(en.body)).not.toContain(trilhaPt.slug);
  });

  it("busca: cursos e aulas só do idioma pedido", async () => {
    const pt = await request(app).get(`/api/search?q=${TERMO}&lang=pt`);
    const en = await request(app).get(`/api/search?q=${TERMO}&lang=en`);

    expect(slugs(pt.body.courses)).toEqual([cursoPt.slug]);
    expect(pt.body.lessons.map((l: { id: number }) => l.id)).toEqual([cursoPt.aulaId]);
    expect(slugs(en.body.courses)).toEqual([cursoEn.slug]);
    expect(en.body.lessons.map((l: { id: number }) => l.id)).toEqual([cursoEn.aulaId]);
  });

  it("idioma fora dos dois da escola é recusado", async () => {
    expect((await request(app).get("/api/courses?lang=es")).status).toBe(400);
    expect((await request(app).get("/api/trilhas?lang=es")).status).toBe(400);
    expect((await request(app).get(`/api/search?q=${TERMO}&lang=es`)).status).toBe(400);
  });

  it("o link direto de um curso NÃO filtra: abre em qualquer idioma", async () => {
    const res = await request(app).get(`/api/courses/${cursoEn.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.language).toBe("en");
  });
});

describe("criar e trocar o idioma do curso", () => {
  it("criar sem idioma é recusado", async () => {
    const cookies = await sessaoAdmin();
    const res = await request(app).post("/api/courses").set("Cookie", cookies).send({ slug: `sem-idioma${S}`, title: "X" });
    expect(res.status).toBe(400);
  });

  it("criar com idioma grava e devolve o idioma", async () => {
    const cookies = await sessaoAdmin();
    const slug = `criado-en${S}`;
    slugsCriados.push(slug);
    const res = await request(app).post("/api/courses").set("Cookie", cookies).send({ slug, title: "Novo", language: "en" });

    expect(res.status).toBe(201);
    expect(res.body.language).toBe("en");
    expect((await prisma.course.findUnique({ where: { slug } }))?.language).toBe("EN");
  });

  it("em RASCUNHO o idioma troca", async () => {
    const cookies = await sessaoAdmin();
    const res = await request(app).patch(`/api/courses/${rascunhoId}`).set("Cookie", cookies).send({ language: "en" });

    expect(res.status).toBe(200);
    expect(res.body.language).toBe("en");
  });

  it("PUBLICADO o idioma trava", async () => {
    const cookies = await sessaoAdmin();
    const res = await request(app).patch(`/api/courses/${cursoPt.id}`).set("Cookie", cookies).send({ language: "en" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("LanguageLocked");
    expect((await prisma.course.findUnique({ where: { id: cursoPt.id } }))?.language).toBe("PT");
  });

  it("de volta a rascunho, mas numa trilha do outro idioma: também trava", async () => {
    // O curso que foi publicado, entrou numa trilha PT e voltou a rascunho.
    const curso = await cursoPublicado("PT", `voltou-rascunho${S}`, "Aula");
    const modulo = await prisma.planModule.findFirstOrThrow({ where: { planId: trilhaPt.id } });
    await prisma.planItem.create({ data: { planModuleId: modulo.id, itemType: "COURSE", courseId: curso.id } });
    await prisma.course.update({ where: { id: curso.id }, data: { status: "DRAFT" } });

    const cookies = await sessaoAdmin();
    const res = await request(app).patch(`/api/courses/${curso.id}`).set("Cookie", cookies).send({ language: "en" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("LanguageInUse");
  });

  it("trilha publicada também trava o idioma", async () => {
    const cookies = await sessaoAdmin();
    const res = await request(app).patch(`/api/trilhas/${trilhaEn.id}`).set("Cookie", cookies).send({ language: "pt" });

    expect(res.status).toBe(409);
    expect((await prisma.learningPlan.findUnique({ where: { id: trilhaEn.id } }))?.language).toBe("EN");
  });
});

describe("a trilha não mistura idiomas — e o que é do aluno aparece nos dois", () => {
  it("salvar uma trilha do OUTRO idioma é permitido, e a cópia herda o idioma dela", async () => {
    // A conta do membro está em português: o idioma da conta não barra nada.
    const cookies = await sessaoMember();
    const res = await request(app).post(`/api/trilhas/${trilhaEn.id}/save`).set("Cookie", cookies);

    expect([200, 201]).toContain(res.status);
    expect(res.body.language).toBe("en");
  });

  it("minhas trilhas mostra as salvas dos DOIS idiomas", async () => {
    const cookies = await sessaoMember();
    await request(app).post(`/api/trilhas/${trilhaPt.id}/save`).set("Cookie", cookies);
    await request(app).post(`/api/trilhas/${trilhaEn.id}/save`).set("Cookie", cookies);

    const res = await request(app).get("/api/trilhas/mine").set("Cookie", cookies);
    const origens = res.body.map((t: { sourcePlanId: number }) => t.sourcePlanId);
    expect(origens).toContain(trilhaPt.id);
    expect(origens).toContain(trilhaEn.id);
  });

  it("curso ou aula de outro idioma numa trilha é recusado; do mesmo idioma entra", async () => {
    const cookies = await sessaoMember();
    const salvo = await request(app).post(`/api/trilhas/${trilhaPt.id}/save`).set("Cookie", cookies);
    const modulo = await prisma.planModule.findFirstOrThrow({ where: { planId: salvo.body.id } });
    const adicionar = (corpo: object) =>
      request(app).post("/api/plan-items").set("Cookie", cookies).send({ planModuleId: modulo.id, ...corpo });

    const cursoIngles = await adicionar({ itemType: "COURSE", courseId: cursoEn.id });
    expect(cursoIngles.status).toBe(400);
    expect(cursoIngles.body.error).toBe("LanguageMismatch");

    const aulaIngles = await adicionar({ itemType: "LESSON", lessonId: cursoEn.aulaId });
    expect(aulaIngles.status).toBe(400);

    const cursoPortugues = await adicionar({ itemType: "COURSE", courseId: cursoPt.id });
    expect(cursoPortugues.status).toBe(201);
  });
});
