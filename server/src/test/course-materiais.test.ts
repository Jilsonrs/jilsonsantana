import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// OS MATERIAIS EXCLUSIVOS do curso (decisão do operador, 04/10/2026): lista FIXA,
// marcada no passo Publicar, para o quadro "Este curso inclui". O banco recusa
// valor fora da lista (enum), e o servidor também, antes dele.

const S = `-materiais-${Date.now()}`;
let admin: string[] = [];
let cursoId = 0;

beforeAll(async () => {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  admin = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  cursoId = (await prisma.course.create({ data: { slug: `curso${S}`, title: "Curso", language: "PT" } })).id;
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

const salvar = (materiais: unknown) => request(servidor).patch(`/api/courses/${cursoId}`).set("Cookie", admin).send({ materiais });
const gravado = async () => (await prisma.course.findUniqueOrThrow({ where: { id: cursoId } })).materiais;

describe("materiais exclusivos — o passo Publicar", () => {
  it("grava os marcados, e o admin lê de volta", async () => {
    expect((await salvar(["APOSTILA", "BIBLIOTECA_DE_PROMPTS"])).status).toBe(200);
    expect([...(await gravado())].sort()).toEqual(["APOSTILA", "BIBLIOTECA_DE_PROMPTS"]);
    const res = await request(servidor).get(`/api/admin/courses/${cursoId}`).set("Cookie", admin);
    expect([...res.body.materiais].sort()).toEqual(["APOSTILA", "BIBLIOTECA_DE_PROMPTS"]);
  });

  it("desmarcar tudo limpa a lista", async () => {
    expect((await salvar([])).status).toBe(200);
    expect(await gravado()).toEqual([]);
  });

  it("material fora da lista: 400, e nada muda", async () => {
    await salvar(["APOSTILA"]);
    expect((await salvar(["CURSO_GRATIS"])).status).toBe(400);
    expect(await gravado()).toEqual(["APOSTILA"]);
  });
});

// O QUADRO "ESTE CURSO INCLUI" na leitura pública (decisões do operador,
// 04/10/2026): os materiais marcados e `inclui.arquivos` — que só conta arquivo de
// aula PUBLICADA em módulo publicado, e não diz nome nem quantidade.
describe("o quadro na página do curso", () => {
  const PUB = `pub${S}`;
  let aulaPublicada = 0;
  let aulaRascunho = 0;
  let aulaModuloRascunho = 0;

  beforeAll(async () => {
    const curso = await prisma.course.create({
      data: {
        slug: PUB,
        title: "Publicado",
        language: "PT",
        status: "PUBLISHED",
        materiais: ["APOSTILA"],
        modules: {
          create: [
            { title: "M1", status: "PUBLISHED", lessons: { create: [{ title: "Pub", status: "PUBLISHED" }, { title: "Rasc", status: "DRAFT" }] } },
            { title: "M2", status: "DRAFT", lessons: { create: { title: "No módulo rascunho", status: "PUBLISHED" } } },
          ],
        },
      },
      include: { modules: { include: { lessons: { orderBy: { id: "asc" } } }, orderBy: { id: "asc" } } },
    });
    aulaPublicada = curso.modules[0].lessons[0].id;
    aulaRascunho = curso.modules[0].lessons[1].id;
    aulaModuloRascunho = curso.modules[1].lessons[0].id;
  });

  const arquivo = (lessonId: number, n: string) =>
    prisma.lessonFile.create({ data: { lessonId, originalName: `${n}.zip`, storagePath: `aulas/${lessonId}/${n.padEnd(24, "x")}.zip`, sizeBytes: 1 } });
  const pagina = () => request(servidor).get(`/api/courses/${PUB}`);

  it("sem arquivo nenhum: inclui.arquivos é false; os materiais saem", async () => {
    const res = await pagina();
    expect(res.status).toBe(200);
    expect(res.body.inclui.arquivos).toBe(false);
    expect(res.body.materiais).toEqual(["APOSTILA"]);
  });

  it("arquivo só em aula ou módulo em rascunho não conta", async () => {
    await arquivo(aulaRascunho, "rascunho");
    await arquivo(aulaModuloRascunho, "modulorascunho");
    expect((await pagina()).body.inclui.arquivos).toBe(false);
  });

  it("a página da aula também traz os materiais (o quadro no \"Sobre o curso\")", async () => {
    const res = await request(servidor).get(`/api/lessons/${aulaPublicada}/aula`);
    expect(res.status).toBe(200);
    expect(res.body.curso.materiais).toEqual(["APOSTILA"]);
  });

  it("arquivo em aula publicada: true — e nem o nome nem a quantidade saem", async () => {
    await arquivo(aulaPublicada, "planilha");
    const res = await pagina();
    expect(res.body.inclui.arquivos).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain("planilha");
  });
});
