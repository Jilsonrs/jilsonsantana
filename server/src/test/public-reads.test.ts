import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// Fecha os QUATRO achados P1 do `security-vulnerability-reviewer` (Ago 2026).
//
// A regra que os une, e que o repo agora escreve em CLAUDE.md → Server:
//   1. leitura pública confere a CADEIA inteira, nunca só o próprio registro;
//   2. escrita confere o STATUS do que referencia, não só a existência;
//   3. CHECAGEM DE DONO NÃO SUBSTITUI CHECAGEM DE STATUS.
//
// Os dados nascem aqui e morrem aqui (`afterAll`): a suíte compartilha um banco
// e roda em série, então deixar lixo quebraria os testes seguintes de um jeito
// que pareceria bug de outra coisa.

const SUFIXO = "-p1-fixture";
let cursoArquivadoId = 0;
let aulaOrfaId = 0;
let cursoDraftId = 0;
let trilhaDraftId = 0;
let trilhaPublicadaId = 0;

beforeAll(async () => {
  // Curso ARQUIVADO com módulo e aula PUBLICADOS dentro — exatamente o estado
  // que o operador cria ao tirar um curso do ar sem mexer nas aulas.
  const arquivado = await prisma.course.create({
    data: {
      slug: `arquivado${SUFIXO}`,
      language: "PT",
      title: "Curso arquivado",
      status: "ARCHIVED",
      modules: {
        create: {
          title: "Módulo publicado",
          displayOrder: 1,
          status: "PUBLISHED",
          lessons: {
            create: { title: "Aula publicada", displayOrder: 1, status: "PUBLISHED" },
          },
        },
      },
    },
    include: { modules: { include: { lessons: true } } },
  });
  cursoArquivadoId = arquivado.id;
  aulaOrfaId = arquivado.modules[0].lessons[0].id;

  const draft = await prisma.course.create({
    data: { slug: `draft${SUFIXO}`, language: "PT", title: "Curso não lançado", status: "DRAFT" },
  });
  cursoDraftId = draft.id;

  const trilha = await prisma.learningPlan.create({
    data: {
      slug: `trilha-draft${SUFIXO}`,
      language: "PT",
      name: "Trilha em construção",
      isTemplate: true,
      status: "DRAFT",
    },
  });
  trilhaDraftId = trilha.id;

  // Template PUBLICADO com um módulo — é o único caminho pelo qual um membro
  // ganha um plano PRÓPRIO (`POST /trilhas` é admin-only, porque cria template
  // curado). É esse plano que torna a checagem de dono inútil como defesa.
  const publicada = await prisma.learningPlan.create({
    data: {
      slug: `trilha-ok${SUFIXO}`,
      language: "PT",
      name: "Trilha publicada",
      isTemplate: true,
      status: "PUBLISHED",
      planModules: { create: { title: "M1", displayOrder: 1 } },
    },
  });
  trilhaPublicadaId = publicada.id;
});

afterAll(async () => {
  // Clones do membro primeiro: eles apontam para os templates via sourcePlanId.
  await prisma.learningPlan.deleteMany({ where: { sourcePlan: { slug: { endsWith: SUFIXO } } } });
  await prisma.learningPlan.deleteMany({ where: { slug: { endsWith: SUFIXO } } });
  await prisma.course.deleteMany({ where: { slug: { endsWith: SUFIXO } } });
});

async function sessaoMember(): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({
    email: process.env.SEED_MEMBER_EMAIL,
    password: process.env.SEED_MEMBER_PASSWORD,
  });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

// `select` EXPLÍCITO na árvore da trilha (trava da Fase 3, Bloco E etapa 2,
// 28/09/2026): coluna nova da trilha não sai na resposta pública sem alguém
// decidir. Voltar ao `include` faz dono, status e `isTemplate` aparecerem aqui.
describe("a trilha pública só devolve os campos escolhidos", () => {
  it("GET /api/trilhas/:slug", async () => {
    const res = await request(servidor).get(`/api/trilhas/trilha-ok${SUFIXO}`);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual([
      "description",
      "id",
      "language",
      "name",
      "planModules",
      "skillsCovered",
      "slug",
    ]);
    expect(Object.keys(res.body.planModules[0]).sort()).toEqual(["displayOrder", "id", "items", "title"]);
  });
});

// Caso 11 da matriz de testes da Fase 4 (plano, etapa 4.4): a leitura pública não devolve
// rascunho — nem pelo endereço direto de quem adivinhar o slug.
describe("a trilha em rascunho não sai pelo endereço", () => {
  it("GET /api/trilhas/:slug de trilha em DRAFT: 404, sem o nome dela na resposta", async () => {
    const res = await request(servidor).get(`/api/trilhas/trilha-draft${SUFIXO}`);
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain("trilha-draft");
    // E com login de aluno também: rascunho não é de quem assina, é de ninguém.
    const comLogin = await request(servidor).get(`/api/trilhas/trilha-draft${SUFIXO}`).set("Cookie", await sessaoMember());
    expect(comLogin.status).toBe(404);
  });
});

describe("P1-a — aula publicada em curso arquivado não vaza", () => {
  it("GET /api/lessons/:id devolve 404, não os dados do curso fora do ar", async () => {
    const res = await request(servidor).get(`/api/lessons/${aulaOrfaId}`);

    // Antes: 200, com o slug e o título do curso que saiu do ar embutidos.
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain(`arquivado${SUFIXO}`);
  });
});

describe("P1-c — salvar trilha não publicada", () => {
  it("POST /api/trilhas/:id/save recusa trilha em DRAFT", async () => {
    const cookies = await sessaoMember();
    const res = await request(servidor).post(`/api/trilhas/${trilhaDraftId}/save`).set("Cookie", cookies);

    // O save era o desvio em volta do gate que `GET /trilhas/:slug` já aplicava.
    expect(res.status).toBe(404);
  });

  it("e nada foi clonado para a conta do membro", async () => {
    const clones = await prisma.learningPlan.count({ where: { sourcePlanId: trilhaDraftId } });
    expect(clones).toBe(0);
  });
});

/** Clona a trilha publicada para o membro e devolve o id do módulo do plano DELE. */
async function moduloDoMembro(cookies: string[]): Promise<number> {
  const save = await request(servidor)
    .post(`/api/trilhas/${trilhaPublicadaId}/save`)
    .set("Cookie", cookies);
  expect([200, 201]).toContain(save.status);

  const meu = await request(servidor).get(`/api/trilhas/mine/${save.body.id}`).set("Cookie", cookies);
  expect(meu.status).toBe(200);
  return meu.body.planModules[0].id;
}

describe("P1-b — o oráculo de enumeração está fechado", () => {
  it("POST /api/plan-items recusa curso não publicado, mesmo no plano do próprio membro", async () => {
    const cookies = await sessaoMember();
    // O plano é DELE — daí em diante toda checagem de dono passa. Só a checagem
    // de STATUS pode barrar, e é exatamente ela que faltava.
    const planModuleId = await moduloDoMembro(cookies);

    const item = await request(servidor)
      .post("/api/plan-items")
      .set("Cookie", cookies)
      .send({ planModuleId, itemType: "COURSE", courseId: cursoDraftId, order: 1 });

    // Antes: 201 — e o membro lia os metadados do curso não lançado de volta
    // pela rota de leitura do próprio plano.
    expect(item.status).toBe(404);
  });

  it("curso ARQUIVADO também é recusado, não só DRAFT", async () => {
    const cookies = await sessaoMember();
    const planModuleId = await moduloDoMembro(cookies);

    const item = await request(servidor)
      .post("/api/plan-items")
      .set("Cookie", cookies)
      .send({ planModuleId, itemType: "COURSE", courseId: cursoArquivadoId, order: 1 });

    expect(item.status).toBe(404);
  });
});
