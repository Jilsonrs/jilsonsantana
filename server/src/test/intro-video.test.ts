import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";

// O CI não fala com o Bunny: só as funções que chamam a API (`iniciarEnvio`,
// `apagarVideo`) viram dublê, na NOSSA fronteira. O endereço do player continua
// o de verdade.
const iniciarEnvio = vi.fn();
const apagarVideo = vi.fn();
const estadoDoVideo = vi.fn();
vi.mock("../lib/bunny-stream.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/bunny-stream.js")>()),
  iniciarEnvio: (...args: unknown[]) => iniciarEnvio(...args),
  apagarVideo: (...args: unknown[]) => apagarVideo(...args),
  estadoDoVideo: (...args: unknown[]) => estadoDoVideo(...args),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// VÍDEO DE APRESENTAÇÃO (Bloco U, etapa 2 — plano aprovado pelo operador em
// 27/09/2026, com a limpeza que ele pediu no mesmo dia). O que estes testes
// protegem:
//   - só o admin envia, e a resposta tem a assinatura, nunca a chave;
//   - o vídeo só vira o vídeo do curso quando o envio TERMINA;
//   - reenviar apaga no Bunny o envio que ficou pela metade, e terminar apaga o
//     vídeo substituído — e NUNCA o vídeo em uso;
//   - o id precisa ter o formato do Bunny (vai para dentro de um endereço);
//   - o vídeo de apresentação sai para VISITANTE SEM LOGIN (ativo de venda, a
//     única exceção ao portão de vídeo), e o envio em andamento não sai nunca.

const SLUG = `apresentacao-${Date.now()}`;
const A = "aaaaaaaa-0cda-46be-b47d-1118ad7c2ffe";
const B = "bbbbbbbb-0cda-46be-b47d-1118ad7c2ffe";
const C = "cccccccc-0cda-46be-b47d-1118ad7c2ffe";
let cursoId = 0;
let admin: string[] = [];
let member: string[] = [];

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

// UMA BIBLIOTECA SÓ, com token (operador, 28/09/2026): a apresentação usa as
// variáveis das aulas e sai ASSINADA, com a validade de 24 h.
const ENV = ["BUNNY_STREAM_LESSONS_LIBRARY_ID", "BUNNY_STREAM_LESSONS_API_KEY", "BUNNY_STREAM_LESSONS_TOKEN_KEY"] as const;
const envAntes = Object.fromEntries(ENV.map((n) => [n, process.env[n]]));
// A apresentação abre pausada (`autoplay=false` — decisão do operador, 03/10/2026).
const ASSINADO = (videoId: string) =>
  new RegExp(`^https://iframe\\.mediadelivery\\.net/embed/999/${videoId}\\?token=[0-9a-f]{64}&expires=(\\d+)&autoplay=false$`);

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  const curso = await prisma.course.create({
    data: { slug: SLUG, title: "Curso com apresentação", language: "PT", status: "PUBLISHED" },
  });
  cursoId = curso.id;
  process.env.BUNNY_STREAM_LESSONS_LIBRARY_ID = "999";
  process.env.BUNNY_STREAM_LESSONS_API_KEY = "chave-que-nunca-sai";
  process.env.BUNNY_STREAM_LESSONS_TOKEN_KEY = "token-que-nunca-sai";
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: SLUG } });
  // Apagar o que não existia antes: `process.env.X = undefined` grava o TEXTO.
  for (const n of ENV) {
    if (envAntes[n] === undefined) delete process.env[n];
    else process.env[n] = envAntes[n];
  }
});

const credenciais = (videoId: string) => ({
  ok: true,
  credenciais: {
    videoId,
    titulo: "Curso com apresentação",
    libraryId: "999",
    expirationTime: 1790000000,
    signature: "assinatura",
  },
});

beforeEach(async () => {
  iniciarEnvio.mockReset().mockResolvedValue(credenciais(A));
  apagarVideo.mockReset().mockResolvedValue(true);
  await prisma.course.update({ where: { id: cursoId }, data: { introVideoId: null, introVideoPendingId: null } });
});

const ARQUIVO = "apresentacao-power-bi.mp4";
const iniciar = (cookies: string[], id = cursoId, corpo: object = { titulo: ARQUIVO }) =>
  request(servidor).post(`/api/admin/courses/${id}/intro-video`).set("Cookie", cookies).send(corpo);
const concluir = (cookies: string[], videoId: unknown, id = cursoId) =>
  request(servidor).post(`/api/admin/courses/${id}/intro-video/complete`).set("Cookie", cookies).send({ videoId });
const curso = () => prisma.course.findUniqueOrThrow({ where: { id: cursoId } });

describe("vídeo de apresentação — quem pode enviar", () => {
  it("sem login: 401 nas duas rotas, e nada é criado nem apagado no Bunny", async () => {
    expect((await request(servidor).post(`/api/admin/courses/${cursoId}/intro-video`)).status).toBe(401);
    expect((await request(servidor).post(`/api/admin/courses/${cursoId}/intro-video/complete`).send({ videoId: A })).status).toBe(401);
    expect(iniciarEnvio).not.toHaveBeenCalled();
    expect(apagarVideo).not.toHaveBeenCalled();
  });

  it("aluno: 403 nas duas rotas", async () => {
    expect((await iniciar(member)).status).toBe(403);
    expect((await concluir(member, A)).status).toBe(403);
    expect(iniciarEnvio).not.toHaveBeenCalled();
  });

  it("curso que não existe: 404", async () => {
    expect((await iniciar(admin, 99_999_999)).status).toBe(404);
  });
});

describe("vídeo de apresentação — o envio", () => {
  it("começar: 200 com a assinatura, o vídeo com o NOME DO ARQUIVO, e a chave nunca na resposta", async () => {
    const res = await iniciar(admin);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ videoId: A, libraryId: "999", signature: "assinatura" });
    // O nome no Bunny é o nome do arquivo enviado (operador, 27/09/2026).
    expect(iniciarEnvio).toHaveBeenCalledWith("aulas", ARQUIVO);
    expect(JSON.stringify(res.body)).not.toContain("chave-que-nunca-sai");
  });

  it("sem nome de arquivo (ou só espaços): 400, e nada é criado no Bunny", async () => {
    expect((await iniciar(admin, cursoId, {})).status).toBe(400);
    expect((await iniciar(admin, cursoId, { titulo: "   " })).status).toBe(400);
    expect(iniciarEnvio).not.toHaveBeenCalled();
  });

  it("começar deixa o vídeo EM ANDAMENTO, não como o vídeo do curso", async () => {
    await iniciar(admin);
    expect(await curso()).toMatchObject({ introVideoId: null, introVideoPendingId: A });
  });

  it("terminar: o vídeo em andamento vira o vídeo do curso", async () => {
    await iniciar(admin);
    const res = await concluir(admin, A);

    expect(res.status).toBe(200);
    expect(res.body.introVideoEmbedUrl).toMatch(ASSINADO(A));
    expect(await curso()).toMatchObject({ introVideoId: A, introVideoPendingId: null });
  });

  it("terminar com um id que não é o envio em andamento: 409, e o curso não muda", async () => {
    await iniciar(admin);
    const res = await concluir(admin, C);

    expect(res.status).toBe(409);
    expect(await curso()).toMatchObject({ introVideoId: null, introVideoPendingId: A });
  });

  it("id fora do formato do Bunny: 400", async () => {
    await iniciar(admin);
    for (const valor of ["qualquer-coisa", `${A}/../outro`, 42]) {
      expect((await concluir(admin, valor)).status, String(valor)).toBe(400);
    }
  });

  it("Stream sem configuração: 503; Bunny recusou: 502 — e nada fica em andamento", async () => {
    iniciarEnvio.mockResolvedValueOnce({ ok: false, motivo: "NaoConfigurado" });
    expect((await iniciar(admin)).status).toBe(503);
    iniciarEnvio.mockResolvedValueOnce({ ok: false, motivo: "Falhou" });
    expect((await iniciar(admin)).status).toBe(502);
    expect((await curso()).introVideoPendingId).toBeNull();
  });
});

describe("vídeo de apresentação — a limpeza no Bunny (operador, 27/09)", () => {
  it("reenviar apaga o envio que ficou pela metade", async () => {
    await iniciar(admin); // A ficou pela metade
    iniciarEnvio.mockResolvedValueOnce(credenciais(B));
    await iniciar(admin);

    expect(apagarVideo).toHaveBeenCalledWith("aulas", A);
    expect((await curso()).introVideoPendingId).toBe(B);
  });

  it("terminar um envio novo apaga o vídeo que ele substituiu", async () => {
    await iniciar(admin);
    await concluir(admin, A); // A é o vídeo do curso
    iniciarEnvio.mockResolvedValueOnce(credenciais(B));
    await iniciar(admin);

    // Começar o envio novo NÃO apaga o vídeo em uso.
    expect(apagarVideo).not.toHaveBeenCalled();

    await concluir(admin, B);
    expect(apagarVideo).toHaveBeenCalledWith("aulas", A);
    expect(await curso()).toMatchObject({ introVideoId: B, introVideoPendingId: null });
  });

  it("primeiro envio do curso: nada a apagar", async () => {
    await iniciar(admin);
    await concluir(admin, A);
    expect(apagarVideo).not.toHaveBeenCalled();
  });

  it("se o Bunny recusar apagar, o envio continua valendo (a limpeza é arrumação)", async () => {
    apagarVideo.mockResolvedValue(false);
    await iniciar(admin);
    iniciarEnvio.mockResolvedValueOnce(credenciais(B));

    const res = await iniciar(admin);
    expect(res.status).toBe(200);
    expect((await curso()).introVideoPendingId).toBe(B);
  });
});

describe("vídeo de apresentação — na página pública", () => {
  it("o player sai para VISITANTE SEM LOGIN (ativo de venda)", async () => {
    await prisma.course.update({ where: { id: cursoId }, data: { introVideoId: A } });

    const res = await request(servidor).get(`/api/courses/${SLUG}`);

    expect(res.status).toBe(200);
    expect(res.body.introVideoEmbedUrl).toMatch(ASSINADO(A));
    // Assinado, com a validade de 24 h: a apresentação é vídeo de venda.
    const expira = Number(ASSINADO(A).exec(res.body.introVideoEmbedUrl)?.[1]);
    expect(expira - Math.floor(Date.now() / 1000)).toBeGreaterThan(23 * 3600);
    expect(res.body.introVideoEmbedUrl).not.toContain("token-que-nunca-sai");
  });

  it("o envio em andamento NUNCA sai na resposta pública", async () => {
    await prisma.course.update({ where: { id: cursoId }, data: { introVideoId: A, introVideoPendingId: B } });

    const res = await request(servidor).get(`/api/courses/${SLUG}`);

    expect(res.body).not.toHaveProperty("introVideoPendingId");
    expect(JSON.stringify(res.body)).not.toContain(B);
  });

  it("curso sem vídeo: nenhum player", async () => {
    const res = await request(servidor).get(`/api/courses/${SLUG}`);
    expect(res.body.introVideoEmbedUrl).toBeNull();
  });

  it("id colado à mão fora do formato do Bunny é recusado pelo PATCH do curso", async () => {
    const res = await request(servidor).patch(`/api/courses/${cursoId}`).set("Cookie", admin).send({ introVideoId: "meu-video" });
    expect(res.status).toBe(400);
  });
});

describe("vídeo de apresentação — o admin pergunta se o Bunny terminou", () => {
  const estado = (cookies: string[], videoId: string) =>
    request(servidor).get(`/api/admin/intro-video/${videoId}/status`).set("Cookie", cookies);

  beforeEach(() => estadoDoVideo.mockReset().mockResolvedValue({ pronto: true, falhou: false }));

  it("sem login 401, aluno 403 — e o Bunny nem é consultado", async () => {
    expect((await request(servidor).get(`/api/admin/intro-video/${A}/status`)).status).toBe(401);
    expect((await estado(member, A)).status).toBe(403);
    expect(estadoDoVideo).not.toHaveBeenCalled();
  });

  it("id fora do formato do Bunny: 400", async () => {
    expect((await estado(admin, "qualquer-coisa")).status).toBe(400);
    expect(estadoDoVideo).not.toHaveBeenCalled();
  });

  it("admin: devolve o estado lido do Bunny, na biblioteca de apresentação", async () => {
    estadoDoVideo.mockResolvedValueOnce({ pronto: false, falhou: false });
    const res = await estado(admin, A);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pronto: false, falhou: false });
    expect(estadoDoVideo).toHaveBeenCalledWith("aulas", A);
  });

  it("o Bunny não respondeu: 502", async () => {
    estadoDoVideo.mockResolvedValueOnce(null);
    expect((await estado(admin, A)).status).toBe(502);
  });
});
