import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";

// O CI não fala com o Bunny: só as funções que chamam a API viram dublê, na NOSSA
// fronteira.
const estadoDoVideo = vi.fn();
const resumoDoVideo = vi.fn();
const apagarVideo = vi.fn();
vi.mock("../lib/bunny-stream.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/bunny-stream.js")>()),
  estadoDoVideo: (...args: unknown[]) => estadoDoVideo(...args),
  resumoDoVideo: (...args: unknown[]) => resumoDoVideo(...args),
  apagarVideo: (...args: unknown[]) => apagarVideo(...args),
}));

import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// O VÍDEO JÁ FICOU PRONTO? (decisão do operador, 29/09/2026: ao voltar para o
// editor, a aula com o vídeo pronto volta recolhida; a que ainda processa volta
// aberta). O que estes testes protegem: o "pronto" é lembrado quando o Bunny
// confirma, esquecido quando entra um vídeo novo, e o editor só pergunta ao
// Bunny pelas aulas ainda não confirmadas.

const S = `-pronto-${Date.now()}`;
const A = "aaaaaaaa-1cda-46be-b47d-1118ad7c2ffe";
const B = "bbbbbbbb-1cda-46be-b47d-1118ad7c2ffe";
const C = "cccccccc-1cda-46be-b47d-1118ad7c2ffe";
let admin: string[] = [];
let n = 0;

beforeAll(async () => {
  const res = await request(app).post("/api/auth/sign-in/email").send({
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  admin = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

beforeEach(() => {
  estadoDoVideo.mockReset().mockResolvedValue({ pronto: true, falhou: false });
  resumoDoVideo.mockReset();
  apagarVideo.mockReset().mockResolvedValue(true);
});

/** Um curso com: vídeo não confirmado (A), vídeo já confirmado (B), aula sem vídeo e aula de texto. */
async function curso() {
  n += 1;
  const c = await prisma.course.create({
    data: {
      slug: `c${n}${S}`,
      title: "Curso",
      language: "PT",
      modules: {
        create: {
          title: "M",
          lessons: {
            create: [
              { title: "não confirmado", bunnyVideoId: A },
              { title: "confirmado", bunnyVideoId: B, bunnyVideoReady: true },
              { title: "sem vídeo" },
              { title: "texto", kind: "TEXT" },
            ],
          },
        },
      },
    },
    include: { modules: { include: { lessons: true } } },
  });
  const [naoConfirmada, confirmada] = c.modules[0].lessons;
  return { cursoId: c.id, naoConfirmada, confirmada };
}

type AulaDaResposta = { id: number; bunnyVideoReady: boolean };
const aulasDa = (corpo: { modules: { lessons: AulaDaResposta[] }[] }) => corpo.modules.flatMap((m) => m.lessons);

describe("o curso no editor", () => {
  it("pergunta ao Bunny SÓ pelo vídeo não confirmado, e já devolve confirmado", async () => {
    const { cursoId, naoConfirmada } = await curso();

    const res = await request(app).get(`/api/admin/courses/${cursoId}`).set("Cookie", admin);

    expect(res.status).toBe(200);
    expect(estadoDoVideo).toHaveBeenCalledTimes(1);
    expect(estadoDoVideo).toHaveBeenCalledWith("aulas", A);
    expect(aulasDa(res.body).find((l) => l.id === naoConfirmada.id)?.bunnyVideoReady).toBe(true);
    expect((await prisma.lesson.findUnique({ where: { id: naoConfirmada.id } }))?.bunnyVideoReady).toBe(true);
  });

  it("ainda processando: continua não confirmado", async () => {
    estadoDoVideo.mockResolvedValue({ pronto: false, falhou: false });
    const { cursoId, naoConfirmada } = await curso();

    const res = await request(app).get(`/api/admin/courses/${cursoId}`).set("Cookie", admin);

    expect(aulasDa(res.body).find((l) => l.id === naoConfirmada.id)?.bunnyVideoReady).toBe(false);
  });

  it("Bunny fora do ar (ou sem configuração): o curso carrega igual", async () => {
    estadoDoVideo.mockResolvedValue(null);
    const { cursoId, naoConfirmada } = await curso();

    const res = await request(app).get(`/api/admin/courses/${cursoId}`).set("Cookie", admin);

    expect(res.status).toBe(200);
    expect(aulasDa(res.body).find((l) => l.id === naoConfirmada.id)?.bunnyVideoReady).toBe(false);
  });
});

describe("o resumo e o fim do envio", () => {
  it("o resumo pronto deixa o vídeo confirmado", async () => {
    const { naoConfirmada } = await curso();
    resumoDoVideo.mockResolvedValue({
      ok: true,
      resumo: { pronto: true, falhou: false, nome: "a.mp4", duracaoEmSegundos: 1, miniaturaUrl: null },
    });

    await request(app).get(`/api/admin/lessons/${naoConfirmada.id}/video`).set("Cookie", admin);

    expect((await prisma.lesson.findUnique({ where: { id: naoConfirmada.id } }))?.bunnyVideoReady).toBe(true);
  });

  it("o resumo ainda processando não confirma", async () => {
    const { naoConfirmada } = await curso();
    resumoDoVideo.mockResolvedValue({
      ok: true,
      resumo: { pronto: false, falhou: false, nome: "a.mp4", duracaoEmSegundos: null, miniaturaUrl: null },
    });

    await request(app).get(`/api/admin/lessons/${naoConfirmada.id}/video`).set("Cookie", admin);

    expect((await prisma.lesson.findUnique({ where: { id: naoConfirmada.id } }))?.bunnyVideoReady).toBe(false);
  });

  it("terminar o envio de um vídeo novo desfaz o confirmado", async () => {
    const { confirmada } = await curso();
    await prisma.lesson.update({ where: { id: confirmada.id }, data: { bunnyVideoPendingId: C } });

    const res = await request(app)
      .post(`/api/admin/lessons/${confirmada.id}/video/complete`)
      .set("Cookie", admin)
      .send({ videoId: C });

    expect(res.status).toBe(200);
    expect(await prisma.lesson.findUnique({ where: { id: confirmada.id } })).toMatchObject({
      bunnyVideoId: C,
      bunnyVideoReady: false,
    });
  });
});
