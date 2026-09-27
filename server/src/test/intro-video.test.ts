import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";

// O CI não fala com o Bunny: só o `iniciarEnvio` (que chama a API) vira dublê,
// na NOSSA fronteira. O endereço do player continua o de verdade.
const iniciarEnvio = vi.fn();
vi.mock("../lib/bunny-stream.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/bunny-stream.js")>()),
  iniciarEnvio: (...args: unknown[]) => iniciarEnvio(...args),
}));

import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// VÍDEO DE APRESENTAÇÃO (Bloco U, etapa 2 — plano aprovado pelo operador em
// 27/09/2026). O que estes testes protegem:
//   - só o admin começa um envio, e a resposta tem a assinatura, nunca a chave;
//   - o id do vídeo precisa ter o formato do Bunny (vai para dentro de um endereço);
//   - o vídeo de apresentação sai para VISITANTE SEM LOGIN — é ativo de venda, a
//     única exceção ao portão de vídeo. Sem este teste, quem fechar buracos de
//     acesso "conserta" a exceção e quebra a página de vendas.

const SLUG = `apresentacao-${Date.now()}`;
const GUID = "eb1c4f77-0cda-46be-b47d-1118ad7c2ffe";
let cursoId = 0;
let admin: string[] = [];
let member: string[] = [];

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(app).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

const envAntes = { id: process.env.BUNNY_STREAM_INTRO_LIBRARY_ID, chave: process.env.BUNNY_STREAM_INTRO_API_KEY };

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  const curso = await prisma.course.create({
    data: { slug: SLUG, title: "Curso com apresentação", language: "PT", status: "PUBLISHED" },
  });
  cursoId = curso.id;
  process.env.BUNNY_STREAM_INTRO_LIBRARY_ID = "999";
  process.env.BUNNY_STREAM_INTRO_API_KEY = "chave-que-nunca-sai";
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: SLUG } });
  process.env.BUNNY_STREAM_INTRO_LIBRARY_ID = envAntes.id;
  process.env.BUNNY_STREAM_INTRO_API_KEY = envAntes.chave;
});

beforeEach(() => {
  iniciarEnvio.mockReset();
  iniciarEnvio.mockResolvedValue({
    ok: true,
    credenciais: {
      videoId: GUID,
      libraryId: "999",
      expirationTime: 1790000000,
      signature: "assinatura",
      embedUrl: `https://iframe.mediadelivery.net/embed/999/${GUID}`,
    },
  });
});

const iniciar = (cookies: string[], id = cursoId) =>
  request(app).post(`/api/admin/courses/${id}/intro-video`).set("Cookie", cookies);

describe("vídeo de apresentação — começar o envio", () => {
  it("sem login: 401, e nada é criado no Bunny", async () => {
    expect((await request(app).post(`/api/admin/courses/${cursoId}/intro-video`)).status).toBe(401);
    expect(iniciarEnvio).not.toHaveBeenCalled();
  });

  it("aluno: 403, e nada é criado no Bunny", async () => {
    expect((await iniciar(member)).status).toBe(403);
    expect(iniciarEnvio).not.toHaveBeenCalled();
  });

  it("curso que não existe: 404", async () => {
    expect((await iniciar(admin, 99_999_999)).status).toBe(404);
  });

  it("admin: 200 com a assinatura, o vídeo nomeado pelo slug, e a chave nunca na resposta", async () => {
    const res = await iniciar(admin);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ videoId: GUID, libraryId: "999", signature: "assinatura" });
    expect(iniciarEnvio).toHaveBeenCalledWith("apresentacao", `${SLUG} — apresentação`);
    expect(JSON.stringify(res.body)).not.toContain("chave-que-nunca-sai");
  });

  it("começar o envio NÃO grava o vídeo no curso (só depois que o envio termina)", async () => {
    await iniciar(admin);
    expect((await prisma.course.findUnique({ where: { id: cursoId } }))?.introVideoId).toBeNull();
  });

  it("Stream sem configuração: 503; Bunny recusou: 502", async () => {
    iniciarEnvio.mockResolvedValueOnce({ ok: false, motivo: "NaoConfigurado" });
    expect((await iniciar(admin)).status).toBe(503);
    iniciarEnvio.mockResolvedValueOnce({ ok: false, motivo: "Falhou" });
    expect((await iniciar(admin)).status).toBe(502);
  });
});

describe("vídeo de apresentação — gravar e mostrar", () => {
  it("id fora do formato do Bunny é recusado, e o curso não muda", async () => {
    for (const valor of ["qualquer-coisa", `${GUID}/../../outro`, `${GUID}?autoplay=1`]) {
      const res = await request(app).patch(`/api/courses/${cursoId}`).set("Cookie", admin).send({ introVideoId: valor });
      expect(res.status, valor).toBe(400);
    }
    expect((await prisma.course.findUnique({ where: { id: cursoId } }))?.introVideoId).toBeNull();
  });

  it("id do Bunny é gravado", async () => {
    const res = await request(app).patch(`/api/courses/${cursoId}`).set("Cookie", admin).send({ introVideoId: GUID });
    expect(res.status).toBe(200);
    expect((await prisma.course.findUnique({ where: { id: cursoId } }))?.introVideoId).toBe(GUID);
  });

  it("a página do curso entrega o player para VISITANTE SEM LOGIN (ativo de venda)", async () => {
    await prisma.course.update({ where: { id: cursoId }, data: { introVideoId: GUID } });

    const res = await request(app).get(`/api/courses/${SLUG}`);

    expect(res.status).toBe(200);
    expect(res.body.introVideoEmbedUrl).toBe(`https://iframe.mediadelivery.net/embed/999/${GUID}`);
  });

  it("curso sem vídeo: nenhum endereço de player", async () => {
    await prisma.course.update({ where: { id: cursoId }, data: { introVideoId: null } });
    const res = await request(app).get(`/api/courses/${SLUG}`);
    expect(res.body.introVideoEmbedUrl).toBeNull();
  });
});
