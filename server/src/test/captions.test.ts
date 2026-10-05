import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";

// O CI não fala com o Bunny: o envio e a exclusão de legenda viram dublê na NOSSA
// fronteira (`bunny-stream.ts`), e o teste decide se o Bunny aceita.
const enviarLegenda = vi.fn();
const apagarLegenda = vi.fn();
const apagarVideo = vi.fn();
const limparCacheDaLegenda = vi.fn();
vi.mock("../lib/bunny-stream.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/bunny-stream.js")>()),
  limparCacheDaLegenda: (...args: unknown[]) => limparCacheDaLegenda(...args),
  enviarLegenda: (...args: unknown[]) => enviarLegenda(...args),
  apagarLegenda: (...args: unknown[]) => apagarLegenda(...args),
  apagarVideo: (...args: unknown[]) => apagarVideo(...args),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// AS LEGENDAS (passo Legendas do editor — decisões do operador, 04/10/2026). O
// que estes testes protegem:
//   - só o admin entra;
//   - só `.vtt` de verdade (começa com WEBVTT), até 2 MB; o resto é recusado e
//     nada é gravado;
//   - o Bunny primeiro: se ele recusar, nada é gravado (502);
//   - aula sem vídeo ou de texto não recebe legenda (409);
//   - enviar de novo substitui; baixar devolve o arquivo com o nome original;
//     excluir apaga no Bunny e aqui;
//   - a contagem "x de y aulas publicadas com legenda";
//   - o banco recusa uma legenda sem dono ou com dois.

const S = `-legendas-${Date.now()}`;
const VIDEO = "aaaaaaaa-2cda-46be-b47d-1118ad7c2ffe";
const INTRO = "bbbbbbbb-2cda-46be-b47d-1118ad7c2ffe";
const VTT = "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nOlá, turma.\n";
const ids = { curso: 0, aula: 0, outraAula: 0, semVideo: 0, texto: 0, rascunho: 0 };
let admin: string[] = [];
let member: string[] = [];

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  const curso = await prisma.course.create({
    data: {
      slug: `curso${S}`,
      title: "Curso",
      language: "PT",
      introVideoId: INTRO,
      modules: {
        create: {
          title: "M",
          status: "PUBLISHED",
          lessons: {
            create: [
              { title: "Com vídeo", status: "PUBLISHED", bunnyVideoId: VIDEO, displayOrder: 0 },
              { title: "Outra", status: "PUBLISHED", bunnyVideoId: VIDEO, displayOrder: 1 },
              { title: "Sem vídeo", status: "PUBLISHED", displayOrder: 2 },
              { title: "Texto", kind: "TEXT", status: "PUBLISHED", displayOrder: 3 },
              { title: "Rascunho", status: "DRAFT", bunnyVideoId: VIDEO, displayOrder: 4 },
            ],
          },
        },
      },
    },
    include: { modules: { include: { lessons: { orderBy: { displayOrder: "asc" } } } } },
  });
  const [aula, outraAula, semVideo, texto, rascunho] = curso.modules[0].lessons;
  Object.assign(ids, { curso: curso.id, aula: aula.id, outraAula: outraAula.id, semVideo: semVideo.id, texto: texto.id, rascunho: rascunho.id });
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

beforeEach(() => {
  enviarLegenda.mockReset().mockResolvedValue(true);
  apagarLegenda.mockReset().mockResolvedValue(true);
  apagarVideo.mockReset().mockResolvedValue(true);
  limparCacheDaLegenda.mockReset().mockResolvedValue(true);
});

const enviar = (rota: string, conteudo: string, nome = "aula.vtt", cookies = admin) =>
  request(servidor)
    .put(rota)
    .set("Cookie", cookies)
    .set("Content-Type", "text/vtt")
    .set("X-Nome-Do-Arquivo", encodeURIComponent(nome))
    .send(conteudo);
const daAula = (id: number) => `/api/admin/lessons/${id}/legenda`;
const daApresentacao = () => `/api/admin/courses/${ids.curso}/legenda-apresentacao`;
const lista = () => request(servidor).get(`/api/admin/courses/${ids.curso}/legendas`).set("Cookie", admin);
const legendaDaAula = (id: number) => prisma.caption.findUnique({ where: { lessonId: id } });

describe("legendas — quem entra", () => {
  // As 7 rotas, uma por uma (achado P2 da revisão de segurança, 04/10/2026).
  const ROTAS: [string, () => string][] = [
    ["get", () => `/api/admin/courses/${ids.curso}/legendas`],
    ["put", () => daAula(ids.aula)],
    ["get", () => daAula(ids.aula)],
    ["delete", () => daAula(ids.aula)],
    ["put", () => daApresentacao()],
    ["get", () => daApresentacao()],
    ["delete", () => daApresentacao()],
  ];

  it.each(ROTAS)("%s %s: visitante 401, aluno 403, nada muda", async (metodo, rota) => {
    for (const [cookies, esperado] of [[[], 401], [member, 403]] as const) {
      const pedido = metodo === "put" ? request(servidor).put(rota()) : metodo === "delete" ? request(servidor).delete(rota()) : request(servidor).get(rota());
      const res = await pedido.set("Cookie", [...cookies]).set("Content-Type", "text/vtt").set("X-Nome-Do-Arquivo", "a.vtt").send(metodo === "put" ? VTT : undefined);
      expect(res.status).toBe(esperado);
    }
    expect(await prisma.caption.count({ where: { OR: [{ lessonId: ids.aula }, { courseId: ids.curso }] } })).toBe(0);
    expect(enviarLegenda).not.toHaveBeenCalled();
    expect(apagarLegenda).not.toHaveBeenCalled();
  });
});

describe("legendas — o arquivo", () => {
  it.each([
    ["não é .vtt pelo nome", VTT, "aula.srt", "SoVtt"],
    ["não começa com WEBVTT", "1\n00:00:00,000 --> 00:00:02,000\nOi\n", "aula.vtt", "NaoEVtt"],
    ["tem byte nulo", "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nOi\u0000\n", "aula.vtt", "NaoEVtt"],
  ])("%s: 400, e nada gravado nem enviado", async (_nome, conteudo, arquivo, motivo) => {
    const res = await enviar(daAula(ids.aula), conteudo, arquivo);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(motivo);
    expect(await legendaDaAula(ids.aula)).toBeNull();
    expect(enviarLegenda).not.toHaveBeenCalled();
  });

  it("maior que 2 MB: 413, e nada gravado", async () => {
    const res = await enviar(daAula(ids.aula), `WEBVTT\n\n${"a".repeat(2 * 1024 * 1024 + 1)}`);
    expect(res.status).toBe(413);
    expect(await legendaDaAula(ids.aula)).toBeNull();
  });

  it("aula sem vídeo, ou de texto: 409", async () => {
    expect((await enviar(daAula(ids.semVideo), VTT)).body.error).toBe("SemVideo");
    expect((await enviar(daAula(ids.texto), VTT)).body.error).toBe("AulaDeTexto");
    expect(enviarLegenda).not.toHaveBeenCalled();
  });
});

describe("legendas — o Bunny primeiro", () => {
  it("o Bunny recusou: 502, e nada gravado", async () => {
    enviarLegenda.mockResolvedValue(false);
    const res = await enviar(daAula(ids.aula), VTT);
    expect(res.status).toBe(502);
    expect(await legendaDaAula(ids.aula)).toBeNull();
  });
});

describe("legendas — enviar, substituir, baixar e excluir", () => {
  it("envia: vai para o vídeo da aula no Bunny, no idioma do curso, e a cópia fica aqui", async () => {
    // Com o BOM do começo, que alguns editores gravam.
    expect((await enviar(daAula(ids.aula), `﻿${VTT}`, "Aula 1 - Abertura.vtt")).status).toBe(200);

    expect(enviarLegenda).toHaveBeenCalledWith(VIDEO, "pt", "Português", VTT);
    const legenda = await legendaDaAula(ids.aula);
    expect(legenda?.content).toBe(VTT);
    expect(legenda?.originalName).toBe("Aula 1 - Abertura.vtt");
    expect(legenda?.language).toBe("PT");
  });

  it("enviar de novo substitui (uma legenda por aula)", async () => {
    const nova = `${VTT}\n00:00:02.000 --> 00:00:04.000\nVamos lá.\n`;
    expect((await enviar(daAula(ids.aula), nova, "corrigida.vtt")).status).toBe(200);
    expect((await legendaDaAula(ids.aula))?.content).toBe(nova);
    expect(await prisma.caption.count({ where: { lessonId: ids.aula } })).toBe(1);
  });

  it("baixar devolve o arquivo, com o nome original", async () => {
    const res = await request(servidor).get(daAula(ids.aula)).set("Cookie", admin);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/^text\/vtt/);
    // Sempre baixar, nunca abrir no navegador (achado P2 da revisão, 04/10/2026).
    expect(res.headers["content-disposition"]).toMatch(/^attachment;/);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-disposition"]).toContain("corrigida.vtt");
    expect(res.text).toContain("Vamos lá.");
  });

  it("nome com aspas e caractere de inverter texto sai limpo no download", async () => {
    await enviar(daAula(ids.outraAula), VTT, 'aula"\u202Etxt.vtt');
    const res = await request(servidor).get(daAula(ids.outraAula)).set("Cookie", admin);
    expect(res.headers["content-disposition"]).toMatch(/^attachment;/);
    expect(res.headers["content-disposition"]).not.toContain("\u202E");
    // O nome entre aspas, com toda aspa de dentro escapada: não fecha o cabeçalho antes da hora.
    expect(res.headers["content-disposition"]?.split("filename=")[1]?.split(";")[0]).toMatch(/^"(?:[^"\\]|\\.)*"$/);
    await request(servidor).delete(daAula(ids.outraAula)).set("Cookie", admin);
  });

  it("a apresentação também: vai para o vídeo de apresentação", async () => {
    expect((await enviar(daApresentacao(), VTT, "apresentacao.vtt")).status).toBe(200);
    expect(enviarLegenda).toHaveBeenCalledWith(INTRO, "pt", "Português", VTT);
    expect((await prisma.caption.findUnique({ where: { courseId: ids.curso } }))?.originalName).toBe("apresentacao.vtt");
  });

  it("excluir: apaga no Bunny e aqui; excluir de novo também é 204", async () => {
    expect((await request(servidor).delete(daAula(ids.aula)).set("Cookie", admin)).status).toBe(200);
    expect(apagarLegenda).toHaveBeenCalledWith(VIDEO, "pt");
    expect(await legendaDaAula(ids.aula)).toBeNull();
    expect((await request(servidor).delete(daAula(ids.aula)).set("Cookie", admin)).status).toBe(204);
    expect((await request(servidor).get(daAula(ids.aula)).set("Cookie", admin)).status).toBe(404);
  });

  it("o Bunny recusou excluir: 502, e a cópia continua", async () => {
    await enviar(daAula(ids.outraAula), VTT);
    apagarLegenda.mockResolvedValue(false);
    expect((await request(servidor).delete(daAula(ids.outraAula)).set("Cookie", admin)).status).toBe(502);
    expect(await legendaDaAula(ids.outraAula)).not.toBeNull();
  });
});

describe("legendas — a tela", () => {
  it("a apresentação, as aulas de vídeo e a contagem de publicadas com legenda", async () => {
    // Estado aqui: a apresentação e "Outra" com legenda; "Com vídeo" sem.
    await enviar(daAula(ids.rascunho), VTT);
    const res = await lista();

    expect(res.status).toBe(200);
    expect(res.body.idioma).toBe("pt");
    expect(res.body.apresentacao.temVideo).toBe(true);
    expect(res.body.apresentacao.legenda.nomeDoArquivo).toBe("apresentacao.vtt");
    const aulas = res.body.modulos[0].aulas as { title: string; temVideo: boolean; legenda: unknown }[];
    // Aula de texto não entra na tela.
    expect(aulas.map((a) => a.title)).toEqual(["Com vídeo", "Outra", "Sem vídeo", "Rascunho"]);
    expect(aulas.find((a) => a.title === "Sem vídeo")?.temVideo).toBe(false);
    // Publicadas de vídeo: Com vídeo, Outra, Sem vídeo — só "Outra" com legenda.
    // A aula em rascunho tem legenda, mas não conta.
    expect(res.body.contagem).toEqual({ comLegenda: 1, total: 3 });
  });

  it("a legenda que precisa ser reenviada não conta", async () => {
    await prisma.caption.update({ where: { lessonId: ids.outraAula }, data: { needsResend: true } });
    try {
      expect((await lista()).body.contagem).toEqual({ comLegenda: 0, total: 3 });
    } finally {
      await prisma.caption.update({ where: { lessonId: ids.outraAula }, data: { needsResend: false } });
    }
  });
});

describe("legendas — o banco", () => {
  it("recusa uma legenda sem dono, ou com dois", async () => {
    const base = { language: "PT" as const, content: VTT, originalName: "x.vtt" };
    await expect(prisma.caption.create({ data: base })).rejects.toThrow();
    await expect(prisma.caption.create({ data: { ...base, lessonId: ids.semVideo, courseId: ids.curso } })).rejects.toThrow();
  });
});

// TROCAR O VÍDEO NÃO PERDE A LEGENDA (decisões do operador, 04/10/2026): no
// Bunny, a legenda é do VÍDEO; o site manda a cópia para o vídeo novo. Se o Bunny
// recusar, o vídeo troca do mesmo jeito e a legenda fica marcada para reenviar.
describe("legendas — trocar o vídeo", () => {
  const NOVO = "cccccccc-2cda-46be-b47d-1118ad7c2ffe";
  const OUTRO_NOVO = "dddddddd-2cda-46be-b47d-1118ad7c2ffe";
  const terminarTroca = (id: number, videoId: string) =>
    request(servidor).post(`/api/admin/lessons/${id}/video/complete`).set("Cookie", admin).send({ videoId });

  it("trocou o vídeo da aula: a legenda vai para o vídeo novo", async () => {
    await enviar(daAula(ids.aula), VTT);
    await prisma.lesson.update({ where: { id: ids.aula }, data: { bunnyVideoPendingId: NOVO } });
    enviarLegenda.mockClear();

    expect((await terminarTroca(ids.aula, NOVO)).status).toBe(200);

    expect(enviarLegenda).toHaveBeenCalledWith(NOVO, "pt", "Português", VTT);
    expect((await legendaDaAula(ids.aula))?.needsResend).toBe(false);
  });

  it("o Bunny recusou: o vídeo troca, e a legenda fica marcada para reenviar", async () => {
    await prisma.lesson.update({ where: { id: ids.aula }, data: { bunnyVideoPendingId: OUTRO_NOVO } });
    enviarLegenda.mockResolvedValue(false);

    expect((await terminarTroca(ids.aula, OUTRO_NOVO)).status).toBe(200);

    expect((await prisma.lesson.findUnique({ where: { id: ids.aula } }))?.bunnyVideoId).toBe(OUTRO_NOVO);
    expect((await legendaDaAula(ids.aula))?.needsResend).toBe(true);
    // E a tela mostra: a contagem não conta a legenda que precisa ser reenviada.
    const aula = ((await lista()).body.modulos[0].aulas as { title: string; legenda: { precisaReenviar: boolean } }[]).find((a) => a.title === "Com vídeo");
    expect(aula?.legenda.precisaReenviar).toBe(true);
  });

  it("enviar de novo pela tela tira a marca", async () => {
    expect((await enviar(daAula(ids.aula), VTT)).status).toBe(200);
    expect((await legendaDaAula(ids.aula))?.needsResend).toBe(false);
  });

  it("trocou o vídeo da apresentação: a legenda dela vai para o vídeo novo", async () => {
    await enviar(daApresentacao(), VTT, "apresentacao.vtt");
    await prisma.course.update({ where: { id: ids.curso }, data: { introVideoPendingId: NOVO } });
    enviarLegenda.mockClear();

    const res = await request(servidor).post(`/api/admin/courses/${ids.curso}/intro-video/complete`).set("Cookie", admin).send({ videoId: NOVO });

    expect(res.status).toBe(200);
    expect(enviarLegenda).toHaveBeenCalledWith(NOVO, "pt", "Português", VTT);
  });

  it("aula sem legenda: trocar o vídeo não manda nada", async () => {
    await prisma.lesson.update({ where: { id: ids.outraAula }, data: { bunnyVideoPendingId: NOVO } });
    await prisma.caption.deleteMany({ where: { lessonId: ids.outraAula } });
    enviarLegenda.mockClear();

    expect((await terminarTroca(ids.outraAula, NOVO)).status).toBe(200);
    expect(enviarLegenda).not.toHaveBeenCalled();
  });
});

// O CACHE DO CDN (achado no teste no ar, 04/10/2026: o "Baixar" trazia a legenda
// nova e o player mostrava a antiga). Substituir e excluir limpam o cache; se não
// der, a legenda vale assim mesmo e a resposta diz que o cache não foi limpo.
describe("legendas — o cache do Bunny", () => {
  it("enviar ou substituir limpa o cache da legenda daquele vídeo", async () => {
    const res = await enviar(daAula(ids.aula), VTT);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cacheLimpo: true });
    expect(limparCacheDaLegenda).toHaveBeenCalledWith(expect.any(String), "pt");
  });

  it("excluir limpa o cache", async () => {
    await enviar(daAula(ids.aula), VTT);
    limparCacheDaLegenda.mockClear();
    const res = await request(servidor).delete(daAula(ids.aula)).set("Cookie", admin);
    expect(res.body).toEqual({ cacheLimpo: true });
    expect(limparCacheDaLegenda).toHaveBeenCalledTimes(1);
  });

  it("não deu para limpar: a legenda vale assim mesmo, e a resposta avisa", async () => {
    limparCacheDaLegenda.mockResolvedValue(false);
    const res = await enviar(daAula(ids.aula), VTT, "nova.vtt");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cacheLimpo: false });
    expect((await legendaDaAula(ids.aula))?.originalName).toBe("nova.vtt");
  });
});
