import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";

// O CI não fala com o Bunny: só as funções que chamam a API viram dublê, na NOSSA
// fronteira.
const iniciarEnvio = vi.fn();
const apagarVideo = vi.fn();
const resumoDoVideo = vi.fn();
vi.mock("../lib/bunny-stream.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/bunny-stream.js")>()),
  iniciarEnvio: (...args: unknown[]) => iniciarEnvio(...args),
  apagarVideo: (...args: unknown[]) => apagarVideo(...args),
  resumoDoVideo: (...args: unknown[]) => resumoDoVideo(...args),
}));

import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// O VÍDEO DE CADA AULA (Bloco U, etapa 3 — plano aprovado pelo operador em
// 28/09/2026). O que estes testes protegem:
//   - só o admin envia e vê o resumo; a resposta tem a assinatura, nunca a chave;
//   - o vídeo só vira o da aula quando o envio TERMINA, e só o envio em
//     andamento DESTA aula (sem reuso entre aulas — decisão do operador);
//   - reenviar apaga o incompleto; terminar apaga o substituído; NUNCA o em uso;
//   - só aula de vídeo recebe vídeo;
//   - o editor recebe o RESUMO do vídeo DAQUELA aula, sem player (como a Udemy,
//     operador 28/09/2026);
//   - NENHUMA rota pública devolve o vídeo da aula (o aluno recebe o player
//     assinado só na etapa 4, depois da trava de acesso).

const S = `-video-aula-${Date.now()}`;
const A = "aaaaaaaa-0cda-46be-b47d-1118ad7c2ffe";
const B = "bbbbbbbb-0cda-46be-b47d-1118ad7c2ffe";
const C = "cccccccc-0cda-46be-b47d-1118ad7c2ffe";
const EM_USO = "dddddddd-0cda-46be-b47d-1118ad7c2ffe";
const PENDENTE = "eeeeeeee-0cda-46be-b47d-1118ad7c2ffe";
let admin: string[] = [];
let member: string[] = [];
let moduloId = 0;

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(app).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

const ENV = ["BUNNY_STREAM_LESSONS_LIBRARY_ID", "BUNNY_STREAM_LESSONS_API_KEY", "BUNNY_STREAM_LESSONS_TOKEN_KEY"] as const;
const envAntes = Object.fromEntries(ENV.map((n) => [n, process.env[n]]));

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  process.env.BUNNY_STREAM_LESSONS_LIBRARY_ID = "762605";
  process.env.BUNNY_STREAM_LESSONS_API_KEY = "api-de-teste";
  process.env.BUNNY_STREAM_LESSONS_TOKEN_KEY = "token-de-teste";
  const curso = await prisma.course.create({
    data: {
      slug: `curso${S}`,
      title: "Curso",
      language: "PT",
      status: "PUBLISHED",
      modules: { create: { title: "M1", status: "PUBLISHED" } },
    },
    include: { modules: true },
  });
  moduloId = curso.modules[0].id;
});

afterAll(async () => {
  // Apagar o que não existia antes: `process.env.X = undefined` grava o TEXTO.
  for (const n of ENV) {
    if (envAntes[n] === undefined) delete process.env[n];
    else process.env[n] = envAntes[n];
  }
  await prisma.learningPlan.deleteMany({ where: { slug: { endsWith: S } } });
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

beforeEach(() => {
  iniciarEnvio.mockReset();
  apagarVideo.mockReset().mockResolvedValue(true);
  resumoDoVideo.mockReset();
});

async function novaAula(dados: Partial<{ kind: "VIDEO" | "TEXT"; bunnyVideoId: string; bunnyVideoPendingId: string }> = {}) {
  return prisma.lesson.create({ data: { moduleId: moduloId, title: `Aula ${Math.random()}`, ...dados } });
}

function credenciais(videoId: string) {
  return {
    ok: true,
    credenciais: {
      videoId,
      titulo: "aula.mp4",
      libraryId: "762605",
      expirationTime: 1,
      signature: "assinatura",
    },
  };
}

const comecar = (cookies: string[], aulaId: number) =>
  request(app).post(`/api/admin/lessons/${aulaId}/video`).set("Cookie", cookies).send({ titulo: "aula.mp4" });
const terminar = (cookies: string[], aulaId: number, videoId: string) =>
  request(app).post(`/api/admin/lessons/${aulaId}/video/complete`).set("Cookie", cookies).send({ videoId });

describe("quem pode", () => {
  it("sem login 401 e aluno 403, nas três rotas", async () => {
    const aula = await novaAula();
    const rotas = [
      () => request(app).post(`/api/admin/lessons/${aula.id}/video`).send({ titulo: "x" }),
      () => request(app).post(`/api/admin/lessons/${aula.id}/video/complete`).send({ videoId: A }),
      () => request(app).get(`/api/admin/lessons/${aula.id}/video`),
    ];
    for (const rota of rotas) {
      expect((await rota()).status).toBe(401);
      expect((await rota().set("Cookie", member)).status).toBe(403);
    }
  });

  it("aula que não existe: 404", async () => {
    expect((await comecar(admin, 999999)).status).toBe(404);
  });
});

describe("começar o envio", () => {
  it("devolve a assinatura, nunca a chave; o vídeo fica EM ANDAMENTO", async () => {
    iniciarEnvio.mockResolvedValue(credenciais(A));
    const aula = await novaAula({ bunnyVideoId: EM_USO });

    const res = await comecar(admin, aula.id);

    expect(res.status).toBe(200);
    expect(iniciarEnvio).toHaveBeenCalledWith("aulas", "aula.mp4");
    expect(res.body.signature).toBe("assinatura");
    expect(JSON.stringify(res.body)).not.toContain("api-de-teste");
    expect(JSON.stringify(res.body)).not.toContain("token-de-teste");
    const depois = await prisma.lesson.findUnique({ where: { id: aula.id } });
    expect(depois).toMatchObject({ bunnyVideoPendingId: A, bunnyVideoId: EM_USO });
  });

  it("aula de texto não recebe vídeo: 400", async () => {
    const aula = await novaAula({ kind: "TEXT" });
    const res = await comecar(admin, aula.id);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("AulaDeTexto");
    expect(iniciarEnvio).not.toHaveBeenCalled();
  });

  it("biblioteca não configurada: 503; Bunny recusou: 502", async () => {
    const aula = await novaAula();
    iniciarEnvio.mockResolvedValue({ ok: false, motivo: "NaoConfigurado" });
    expect((await comecar(admin, aula.id)).status).toBe(503);
    iniciarEnvio.mockResolvedValue({ ok: false, motivo: "Falhou" });
    expect((await comecar(admin, aula.id)).status).toBe(502);
  });

  it("reenviar apaga no Bunny o envio que ficou pela metade", async () => {
    iniciarEnvio.mockResolvedValue(credenciais(B));
    const aula = await novaAula({ bunnyVideoPendingId: PENDENTE, bunnyVideoId: EM_USO });

    await comecar(admin, aula.id);

    expect(apagarVideo).toHaveBeenCalledWith("aulas", PENDENTE);
    expect(apagarVideo).not.toHaveBeenCalledWith("aulas", EM_USO);
  });
});

describe("terminar o envio", () => {
  it("o envio em andamento vira o vídeo da aula, e o substituído é apagado", async () => {
    const aula = await novaAula({ bunnyVideoId: EM_USO, bunnyVideoPendingId: C });

    const res = await terminar(admin, aula.id, C);

    expect(res.status).toBe(200);
    // Sem player no editor: o fim do envio devolve só o id.
    expect(res.body).toEqual({ bunnyVideoId: C });
    expect(await prisma.lesson.findUnique({ where: { id: aula.id } })).toMatchObject({ bunnyVideoId: C, bunnyVideoPendingId: null });
    expect(apagarVideo).toHaveBeenCalledWith("aulas", EM_USO);
    expect(apagarVideo).not.toHaveBeenCalledWith("aulas", C);
  });

  it("id que não é o envio em andamento desta aula: 409, nada muda", async () => {
    const aula = await novaAula({ bunnyVideoId: EM_USO, bunnyVideoPendingId: C });
    const res = await terminar(admin, aula.id, A);
    expect(res.status).toBe(409);
    expect((await prisma.lesson.findUnique({ where: { id: aula.id } }))?.bunnyVideoId).toBe(EM_USO);
    expect(apagarVideo).not.toHaveBeenCalled();
  });

  // Sem reuso entre aulas (decisão do operador): o vídeo que está em andamento
  // em OUTRA aula não vira o vídeo desta.
  it("o vídeo em andamento de OUTRA aula não entra nesta: 409", async () => {
    const outra = await novaAula({ bunnyVideoPendingId: B });
    const esta = await novaAula();
    expect((await terminar(admin, esta.id, B)).status).toBe(409);
    expect((await prisma.lesson.findUnique({ where: { id: esta.id } }))?.bunnyVideoId).toBeNull();
    expect((await prisma.lesson.findUnique({ where: { id: outra.id } }))?.bunnyVideoPendingId).toBe(B);
  });

  it("o id do vídeo precisa ter o formato do Bunny: 400", async () => {
    const aula = await novaAula();
    expect((await terminar(admin, aula.id, "../outra-coisa")).status).toBe(400);
  });
});

describe("o resumo do vídeo no editor", () => {
  const resumo = {
    pronto: true,
    falhou: false,
    nome: "aula.mp4",
    duracaoEmSegundos: 111,
    miniaturaUrl: `https://vz-teste.b-cdn.net/${A}/thumbnail.jpg`,
  };
  const ler = (aulaId: number) => request(app).get(`/api/admin/lessons/${aulaId}/video`).set("Cookie", admin);

  it("lê no Bunny o vídeo DESTA aula (o id nunca vem de quem pede)", async () => {
    resumoDoVideo.mockResolvedValue({ ok: true, resumo });
    const aula = await novaAula({ bunnyVideoId: A, bunnyVideoPendingId: B });

    const res = await request(app).get(`/api/admin/lessons/${aula.id}/video`).query({ videoId: C }).set("Cookie", admin);

    expect(res.status).toBe(200);
    expect(resumoDoVideo).toHaveBeenCalledTimes(1);
    expect(resumoDoVideo).toHaveBeenCalledWith(A);
    expect(res.body).toEqual({ video: resumo });
  });

  it("aula sem vídeo: nenhum resumo, e o Bunny nem é chamado", async () => {
    const aula = await novaAula({ bunnyVideoPendingId: B });
    const res = await ler(aula.id);
    expect(res.body).toEqual({ video: null });
    expect(resumoDoVideo).not.toHaveBeenCalled();
  });

  it("aula que não existe: 404", async () => {
    expect((await ler(999999)).status).toBe(404);
  });

  it("biblioteca não configurada: 503; Bunny recusou: 502", async () => {
    const aula = await novaAula({ bunnyVideoId: A });
    resumoDoVideo.mockResolvedValue({ ok: false, motivo: "NaoConfigurado" });
    expect((await ler(aula.id)).status).toBe(503);
    resumoDoVideo.mockResolvedValue({ ok: false, motivo: "Falhou" });
    const res = await ler(aula.id);
    expect(res.status).toBe(502);
    expect(res.body.error).toBe("StreamFalhou");
  });

  it("o player antigo do editor não existe mais", async () => {
    const aula = await novaAula({ bunnyVideoId: A });
    // Rota que não existe cai no desvio de desenvolvimento (302), não num 200.
    expect((await request(app).get(`/api/admin/lessons/${aula.id}/player`).set("Cookie", admin)).status).not.toBe(200);
  });
});

describe("prévia grátis", () => {
  it("o admin liga e desliga; o aluno não", async () => {
    const aula = await novaAula();
    const ligar = await request(app).patch(`/api/lessons/${aula.id}`).set("Cookie", admin).send({ isFreePreview: true });
    expect(ligar.status).toBe(200);
    expect((await prisma.lesson.findUnique({ where: { id: aula.id } }))?.isFreePreview).toBe(true);
    expect((await request(app).patch(`/api/lessons/${aula.id}`).set("Cookie", member).send({ isFreePreview: false })).status).toBe(403);
  });

  // O vídeo só entra pelo envio: colar o id de outra aula pela edição não vale.
  it("o vídeo não entra pela edição da aula", async () => {
    const aula = await novaAula();
    await request(app).patch(`/api/lessons/${aula.id}`).set("Cookie", admin).send({ bunnyVideoId: EM_USO });
    expect((await prisma.lesson.findUnique({ where: { id: aula.id } }))?.bunnyVideoId).toBeNull();
  });
});

describe("o vídeo da aula não sai em rota pública", () => {
  it("nem na página do curso, nem na aula, nem na busca, nem na trilha", async () => {
    const aula = await prisma.lesson.create({
      data: {
        moduleId: moduloId,
        title: `Aula com vídeo${S}`,
        status: "PUBLISHED",
        bunnyVideoId: EM_USO,
        bunnyVideoPendingId: PENDENTE,
      },
    });
    await prisma.learningPlan.create({
      data: {
        slug: `trilha${S}`,
        name: "Trilha",
        language: "PT",
        isTemplate: true,
        status: "PUBLISHED",
        planModules: { create: { title: "E1", items: { create: { itemType: "LESSON", lessonId: aula.id } } } },
      },
    });

    const respostas = await Promise.all([
      request(app).get(`/api/courses/curso${S}`),
      request(app).get(`/api/lessons/${aula.id}`),
      request(app).get(`/api/search`).query({ q: "Aula com vídeo" }),
      request(app).get(`/api/trilhas/trilha${S}`),
    ]);
    for (const res of respostas) {
      expect(res.status).toBe(200);
      const corpo = JSON.stringify(res.body);
      expect(corpo).not.toContain(EM_USO);
      expect(corpo).not.toContain(PENDENTE);
      expect(corpo).not.toContain("token=");
    }
    // A busca e a trilha acharam a aula: o teste não passa por lista vazia.
    expect(JSON.stringify(respostas[2].body)).toContain(`Aula com vídeo${S}`);
    expect(JSON.stringify(respostas[3].body)).toContain(`Aula com vídeo${S}`);
  });
});

describe("o quinto item do preenchimento", () => {
  it("a lista do admin conta as aulas de vídeo publicadas sem vídeo", async () => {
    const curso = await prisma.course.create({
      data: {
        slug: `conta${S}`,
        title: "Conta",
        language: "PT",
        modules: {
          create: [
            {
              title: "Publicado",
              status: "PUBLISHED",
              lessons: {
                create: [
                  { title: "sem vídeo", status: "PUBLISHED" },
                  { title: "com vídeo", status: "PUBLISHED", bunnyVideoId: A },
                  { title: "texto", status: "PUBLISHED", kind: "TEXT" },
                  { title: "rascunho", status: "DRAFT" },
                ],
              },
            },
            { title: "Rascunho", status: "DRAFT", lessons: { create: [{ title: "fora da cadeia", status: "PUBLISHED" }] } },
          ],
        },
      },
    });
    const res = await request(app).get("/api/admin/courses").set("Cookie", admin);
    expect(res.body.find((c: { id: number }) => c.id === curso.id).lessonsWithoutVideo).toBe(1);
  });
});
