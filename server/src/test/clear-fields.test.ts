import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";

// O CI não fala com o Bunny: `apagarVideo` vira dublê na NOSSA fronteira, igual
// ao teste do vídeo de apresentação.
const apagarVideo = vi.fn();
vi.mock("../lib/bunny-stream.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/bunny-stream.js")>()),
  apagarVideo: (...args: unknown[]) => apagarVideo(...args),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// CAMPO JÁ SALVO VOLTA A PODER FICAR VAZIO (achado de 29/09/2026, corrigido no
// mesmo dia). Antes, apagar o subtítulo e salvar não apagava nada: o campo
// vazio chegava como AUSENTE, e ausente quer dizer "não mexe". Agora:
//   - `null` apaga; campo ausente continua não mexendo (é o que deixa cada passo
//     do editor salvar só os campos dele);
//   - apagar o ID do vídeo de apresentação apaga o vídeo no Bunny, e o Bunny vai
//     PRIMEIRO: se ele recusar, nada é gravado (decisão do operador, 29/09);
//   - a camada do módulo também volta a poder ficar vazia.

const SLUG = `campos-vazios-${Date.now()}`;
const VIDEO = "aaaaaaaa-0cda-46be-b47d-1118ad7c2ffe";
let cursoId = 0;
let moduloId = 0;
let admin: string[] = [];

const CHEIO = {
  subtitle: "Um subtítulo",
  description: "Uma descrição",
  level: "INICIANTE" as const,
  thumbnailUrl: "/img/curso.jpg",
  introVideoId: VIDEO,
};

beforeAll(async () => {
  const login = await request(servidor).post("/api/auth/sign-in/email").send({
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  admin = (login.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  const curso = await prisma.course.create({
    data: { slug: SLUG, title: "Curso para esvaziar", language: "PT", status: "DRAFT" },
  });
  cursoId = curso.id;
  const modulo = await prisma.module.create({ data: { courseId: cursoId, title: "Módulo 1", layer: "IA" } });
  moduloId = modulo.id;
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: SLUG } });
});

beforeEach(async () => {
  apagarVideo.mockReset().mockResolvedValue(true);
  await prisma.course.update({ where: { id: cursoId }, data: CHEIO });
  await prisma.module.update({ where: { id: moduloId }, data: { layer: "IA" } });
});

const salvar = (corpo: object) =>
  request(servidor).patch(`/api/courses/${cursoId}`).set("Cookie", admin).send(corpo);
const curso = () => prisma.course.findUniqueOrThrow({ where: { id: cursoId } });

describe("salvar o curso com campo vazio", () => {
  it("null APAGA o subtítulo, a descrição, o nível e a imagem", async () => {
    const res = await salvar({ subtitle: null, description: null, level: null, thumbnailUrl: null });

    expect(res.status).toBe(200);
    const depois = await curso();
    expect(depois.subtitle).toBeNull();
    expect(depois.description).toBeNull();
    expect(depois.level).toBeNull();
    expect(depois.thumbnailUrl).toBeNull();
  });

  // O outro lado da regra: cada passo manda só os campos dele. Se AUSENTE também
  // apagasse, salvar "Para quem é" apagaria o subtítulo do passo 1.
  it("campo AUSENTE não mexe no que está salvo", async () => {
    const res = await salvar({ title: "Título novo" });

    expect(res.status).toBe(200);
    const depois = await curso();
    expect(depois.subtitle).toBe(CHEIO.subtitle);
    expect(depois.description).toBe(CHEIO.description);
    expect(depois.level).toBe(CHEIO.level);
    expect(depois.thumbnailUrl).toBe(CHEIO.thumbnailUrl);
    expect(depois.introVideoId).toBe(VIDEO);
    expect(apagarVideo).not.toHaveBeenCalled();
  });

  it("a regra de formato continua valendo para o que não é vazio", async () => {
    expect((await salvar({ thumbnailUrl: "javascript:alert(1)" })).status).toBe(400);
    expect((await salvar({ level: "QUALQUER" })).status).toBe(400);
  });
});

describe("apagar o ID do vídeo de apresentação", () => {
  it("apaga o vídeo no Bunny e tira do curso", async () => {
    const res = await salvar({ introVideoId: null });

    expect(res.status).toBe(200);
    expect(apagarVideo).toHaveBeenCalledWith("aulas", VIDEO);
    expect((await curso()).introVideoId).toBeNull();
  });

  // O Bunny PRIMEIRO: se ele recusar, o curso continua apontando para o vídeo
  // que ainda existe lá — nada fica perdido no Bunny sem curso.
  it("se o Bunny recusar, responde o erro e NÃO grava nada", async () => {
    apagarVideo.mockResolvedValue(false);
    const res = await salvar({ introVideoId: null, subtitle: null });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: "BunnyNaoApagou" });
    const depois = await curso();
    expect(depois.introVideoId).toBe(VIDEO);
    expect(depois.subtitle).toBe(CHEIO.subtitle);
  });

  it("curso sem vídeo: salvar vazio não chama o Bunny", async () => {
    await prisma.course.update({ where: { id: cursoId }, data: { introVideoId: null } });
    const res = await salvar({ introVideoId: null });

    expect(res.status).toBe(200);
    expect(apagarVideo).not.toHaveBeenCalled();
  });
});

describe("salvar o módulo com a camada vazia", () => {
  it("null tira a camada; ausente não mexe", async () => {
    const tira = await request(servidor).patch(`/api/modules/${moduloId}`).set("Cookie", admin).send({ layer: null });
    expect(tira.status).toBe(200);
    expect((await prisma.module.findUniqueOrThrow({ where: { id: moduloId } })).layer).toBeNull();

    await prisma.module.update({ where: { id: moduloId }, data: { layer: "IA" } });
    const mantem = await request(servidor).patch(`/api/modules/${moduloId}`).set("Cookie", admin).send({ title: "Outro" });
    expect(mantem.status).toBe(200);
    expect((await prisma.module.findUniqueOrThrow({ where: { id: moduloId } })).layer).toBe("IA");
  });
});
