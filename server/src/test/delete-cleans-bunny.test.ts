import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";

// O CI não fala com o Bunny: só as funções que apagam lá viram dublê, na NOSSA
// fronteira.
const apagarVideo = vi.fn();
const apagarArquivoDaAula = vi.fn();
vi.mock("../lib/bunny-stream.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/bunny-stream.js")>()),
  apagarVideo: (...args: unknown[]) => apagarVideo(...args),
}));
vi.mock("../lib/bunny-storage.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/bunny-storage.js")>()),
  apagarArquivoDaAula: (...args: unknown[]) => apagarArquivoDaAula(...args),
}));

import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// EXCLUIR APAGA NO BUNNY TAMBÉM (decisão do operador, 28/09/2026: "deveria
// excluir o vídeo, já que ele ficaria perdido no Bunny"). O que estes testes
// protegem: excluir aula, módulo ou curso apaga lá o vídeo, o envio pela metade e
// os arquivos (e, no curso, o vídeo de apresentação); se o Bunny recusar, a
// exclusão PARA; e tentar de novo continua de onde parou.

const S = `-excluir-${Date.now()}`;
const VIDEO = "aaaaaaaa-0cda-46be-b47d-1118ad7c2ffe";
const PENDENTE = "bbbbbbbb-0cda-46be-b47d-1118ad7c2ffe";
const APRESENTACAO = "cccccccc-0cda-46be-b47d-1118ad7c2ffe";
const APRESENTACAO_PENDENTE = "dddddddd-0cda-46be-b47d-1118ad7c2ffe";
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
  apagarVideo.mockReset().mockResolvedValue(true);
  apagarArquivoDaAula.mockReset().mockResolvedValue({ ok: true });
});

const caminho = (aula: number, i: number) => `aulas/${aula}/${String(i).padStart(24, "0")}.pdf`;

/** Um curso com um módulo e uma aula que tem vídeo, envio pela metade e dois arquivos. */
async function cursoCompleto(comApresentacao = false) {
  n += 1;
  const curso = await prisma.course.create({
    data: {
      slug: `c${n}${S}`,
      title: "Curso",
      language: "PT",
      ...(comApresentacao ? { introVideoId: APRESENTACAO, introVideoPendingId: APRESENTACAO_PENDENTE } : {}),
      modules: { create: { title: "M", lessons: { create: { title: "A", bunnyVideoId: VIDEO, bunnyVideoPendingId: PENDENTE } } } },
    },
    include: { modules: { include: { lessons: true } } },
  });
  const aula = curso.modules[0].lessons[0];
  await prisma.lessonFile.createMany({
    data: [1, 2].map((i) => ({ lessonId: aula.id, originalName: `f${i}.pdf`, storagePath: caminho(aula.id, i), sizeBytes: 1 })),
  });
  return { cursoId: curso.id, moduloId: curso.modules[0].id, aulaId: aula.id };
}

const excluir = (rota: string) => request(app).delete(rota).set("Cookie", admin);

describe("excluir aula", () => {
  it("apaga no Bunny os arquivos, o envio pela metade e o vídeo; depois a aula", async () => {
    const { aulaId } = await cursoCompleto();

    expect((await excluir(`/api/lessons/${aulaId}`)).status).toBe(204);

    expect(apagarArquivoDaAula).toHaveBeenCalledWith(caminho(aulaId, 1));
    expect(apagarArquivoDaAula).toHaveBeenCalledWith(caminho(aulaId, 2));
    expect(apagarVideo).toHaveBeenCalledWith("aulas", PENDENTE);
    expect(apagarVideo).toHaveBeenCalledWith("aulas", VIDEO);
    expect(await prisma.lesson.findUnique({ where: { id: aulaId } })).toBeNull();
  });

  it("o Bunny recusou apagar o vídeo: 502, e a aula FICA (nada perdido sem registro)", async () => {
    const { aulaId } = await cursoCompleto();
    apagarVideo.mockImplementation(async (_b: string, id: string) => id !== VIDEO);

    const res = await excluir(`/api/lessons/${aulaId}`);

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("BunnyNaoApagou");
    const aula = await prisma.lesson.findUnique({ where: { id: aulaId } });
    expect(aula?.bunnyVideoId).toBe(VIDEO);
  });

  // O que já foi apagado no Bunny saiu do banco: a segunda tentativa não repete.
  it("tentar de novo continua de onde parou", async () => {
    const { aulaId } = await cursoCompleto();
    apagarVideo.mockImplementation(async (_b: string, id: string) => id !== VIDEO);
    await excluir(`/api/lessons/${aulaId}`);
    expect(await prisma.lessonFile.count({ where: { lessonId: aulaId } })).toBe(0);
    expect((await prisma.lesson.findUnique({ where: { id: aulaId } }))?.bunnyVideoPendingId).toBeNull();

    apagarVideo.mockReset().mockResolvedValue(true);
    apagarArquivoDaAula.mockReset().mockResolvedValue({ ok: true });
    expect((await excluir(`/api/lessons/${aulaId}`)).status).toBe(204);
    expect(apagarArquivoDaAula).not.toHaveBeenCalled();
    expect(apagarVideo).toHaveBeenCalledTimes(1);
    expect(apagarVideo).toHaveBeenCalledWith("aulas", VIDEO);
  });

  it("o Bunny recusou um arquivo: 502, e a aula fica com o vídeo", async () => {
    const { aulaId } = await cursoCompleto();
    apagarArquivoDaAula.mockResolvedValue({ ok: false, motivo: "Falhou" });

    expect((await excluir(`/api/lessons/${aulaId}`)).status).toBe(502);
    expect(apagarVideo).not.toHaveBeenCalled();
    expect(await prisma.lesson.findUnique({ where: { id: aulaId } })).not.toBeNull();
  });

  it("aula sem nada no Bunny: exclui sem chamar o Bunny", async () => {
    const { moduloId } = await cursoCompleto();
    const vazia = await prisma.lesson.create({ data: { moduleId: moduloId, title: "Vazia" } });

    expect((await excluir(`/api/lessons/${vazia.id}`)).status).toBe(204);
    expect(apagarVideo).not.toHaveBeenCalled();
    expect(apagarArquivoDaAula).not.toHaveBeenCalled();
  });
});

describe("excluir módulo e curso", () => {
  it("o módulo apaga no Bunny o que as aulas dele têm", async () => {
    const { moduloId, aulaId } = await cursoCompleto();

    expect((await excluir(`/api/modules/${moduloId}`)).status).toBe(204);
    expect(apagarVideo).toHaveBeenCalledWith("aulas", VIDEO);
    expect(apagarArquivoDaAula).toHaveBeenCalledWith(caminho(aulaId, 1));
    expect(await prisma.module.findUnique({ where: { id: moduloId } })).toBeNull();
  });

  it("o módulo fica se o Bunny recusar", async () => {
    const { moduloId } = await cursoCompleto();
    apagarVideo.mockResolvedValue(false);
    expect((await excluir(`/api/modules/${moduloId}`)).status).toBe(502);
    expect(await prisma.module.findUnique({ where: { id: moduloId } })).not.toBeNull();
  });

  it("o curso apaga as aulas E o vídeo de apresentação (e o envio pela metade dele)", async () => {
    const { cursoId } = await cursoCompleto(true);

    expect((await excluir(`/api/courses/${cursoId}`)).status).toBe(204);
    expect(apagarVideo).toHaveBeenCalledWith("aulas", VIDEO);
    expect(apagarVideo).toHaveBeenCalledWith("aulas", APRESENTACAO);
    expect(apagarVideo).toHaveBeenCalledWith("aulas", APRESENTACAO_PENDENTE);
    expect(await prisma.course.findUnique({ where: { id: cursoId } })).toBeNull();
  });

  it("o curso fica se o Bunny recusar a apresentação", async () => {
    const { cursoId } = await cursoCompleto(true);
    apagarVideo.mockImplementation(async (_b: string, id: string) => id !== APRESENTACAO);
    expect((await excluir(`/api/courses/${cursoId}`)).status).toBe(502);
    expect(await prisma.course.findUnique({ where: { id: cursoId } })).not.toBeNull();
  });
});
