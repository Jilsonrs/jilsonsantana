import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { Readable } from "node:stream";
import request from "supertest";
import type { Prisma } from "@prisma/client";

// O CI não fala com o Bunny: só a leitura do Storage vira dublê, na NOSSA
// fronteira. A assinatura do player continua a de verdade.
const lerArquivoDaAula = vi.fn();
vi.mock("../lib/bunny-storage.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/bunny-storage.js")>()),
  lerArquivoDaAula: (...args: unknown[]) => lerArquivoDaAula(...args),
}));

import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";
import { nomeParaDownload } from "../lib/nome-do-download.js";

// A PÁGINA DA AULA (etapa 4 do Bloco U — plano aprovado pelo operador em
// 29/09/2026). O que estes testes protegem:
//   - a aula paga só abre para quem tem acesso; a PRÉVIA GRÁTIS abre para
//     qualquer visitante, e desligar a prévia volta a trancar;
//   - bloqueada, a resposta NÃO carrega o vídeo, o token nem o texto;
//   - o aluno só enxerga a cadeia publicada; o admin vê tudo, por rota de admin;
//   - o download segue a mesma regra e sai com o NOME ORIGINAL, limpo;
//   - idioma não é portão: a mesma assinatura abre curso em inglês.

const S = `-aula-${Date.now()}`;
const VIDEO_PAGO = "aaaaaaaa-2cda-46be-b47d-1118ad7c2ffe";
const VIDEO_GRATIS = "bbbbbbbb-2cda-46be-b47d-1118ad7c2ffe";
const SEGREDO = "Texto só para assinantes";
let admin: string[] = [];
let member: string[] = [];
const ids = { paga: 0, gratis: 0, texto: 0, rascunho: 0, cursoRascunho: 0, ingles: 0, arquivo: 0, arquivoGratis: 0 };

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(app).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

const ENV = ["BUNNY_STREAM_LESSONS_LIBRARY_ID", "BUNNY_STREAM_LESSONS_API_KEY", "BUNNY_STREAM_LESSONS_TOKEN_KEY"] as const;
const envAntes = Object.fromEntries(ENV.map((n) => [n, process.env[n]]));

async function curso(slug: string, status: "PUBLISHED" | "DRAFT", language: "PT" | "EN", aulas: Prisma.LessonCreateWithoutModuleInput[]) {
  return prisma.course.create({
    data: { slug: `${slug}${S}`, title: slug, language, status, modules: { create: { title: "M", status: "PUBLISHED", lessons: { create: aulas } } } },
    include: { modules: { include: { lessons: { orderBy: { id: "asc" } } } } },
  });
}

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  process.env.BUNNY_STREAM_LESSONS_LIBRARY_ID = "762605";
  process.env.BUNNY_STREAM_LESSONS_API_KEY = "api-de-teste";
  process.env.BUNNY_STREAM_LESSONS_TOKEN_KEY = "token-de-teste";

  const pt = await curso("curso", "PUBLISHED", "PT", [
    { title: "Paga", status: "PUBLISHED", bunnyVideoId: VIDEO_PAGO, displayOrder: 0 },
    { title: "Grátis", status: "PUBLISHED", bunnyVideoId: VIDEO_GRATIS, isFreePreview: true, displayOrder: 1 },
    { title: "Texto", status: "PUBLISHED", kind: "TEXT", content: SEGREDO, displayOrder: 2 },
    { title: "Rascunho", status: "DRAFT", displayOrder: 3 },
  ]);
  const [paga, gratis, texto, rascunho] = pt.modules[0].lessons;
  Object.assign(ids, { paga: paga.id, gratis: gratis.id, texto: texto.id, rascunho: rascunho.id });
  const emRascunho = await curso("rascunho", "DRAFT", "PT", [{ title: "Publicada em curso rascunho", status: "PUBLISHED" }]);
  ids.cursoRascunho = emRascunho.modules[0].lessons[0].id;
  const en = await curso("ingles", "PUBLISHED", "EN", [{ title: "English", status: "PUBLISHED", bunnyVideoId: VIDEO_PAGO }]);
  ids.ingles = en.modules[0].lessons[0].id;

  ids.arquivo = (await prisma.lessonFile.create({
    data: { lessonId: paga.id, originalName: "Planilha de Vendas.zip", storagePath: `aulas/${paga.id}/${"a".repeat(24)}.zip`, sizeBytes: 5 },
  })).id;
  ids.arquivoGratis = (await prisma.lessonFile.create({
    data: { lessonId: gratis.id, originalName: "brinde.pdf", storagePath: `aulas/${gratis.id}/${"b".repeat(24)}.pdf`, sizeBytes: 3 },
  })).id;
});

afterAll(async () => {
  for (const n of ENV) {
    if (envAntes[n] === undefined) delete process.env[n];
    else process.env[n] = envAntes[n];
  }
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

beforeEach(() => {
  lerArquivoDaAula.mockReset().mockImplementation(async () => ({ ok: true, corpo: Readable.from([Buffer.from("zip!!")]), tamanho: "5" }));
});

/** Roda o bloco com a assinatura de teste do member@ vencida, e devolve ela ao fim. */
async function semAssinatura(fn: () => Promise<void>) {
  await prisma.subscription.update({
    where: { stripeSubscriptionId: ASSINATURA_DE_TESTE },
    data: { status: "canceled", currentPeriodEnd: new Date("2020-01-01T00:00:00Z") },
  });
  try {
    await fn();
  } finally {
    await prisma.subscription.update({
      where: { stripeSubscriptionId: ASSINATURA_DE_TESTE },
      data: { status: "active", currentPeriodEnd: new Date("2100-01-01T00:00:00Z") },
    });
  }
}

const pagina = (id: number, cookies: string[] = []) => request(app).get(`/api/lessons/${id}/aula`).set("Cookie", cookies);
// O corpo do download como bytes (o supertest não lê .zip sozinho).
const bytes = (res: request.Response, pronto: (erro: Error | null, corpo: unknown) => void) => {
  // Cast: no Node, o superagent entrega aqui a própria resposta HTTP, que é um fluxo.
  const fluxo = res as unknown as NodeJS.ReadableStream;
  const partes: Buffer[] = [];
  fluxo.on("data", (parte: Buffer) => partes.push(parte));
  fluxo.on("end", () => pronto(null, Buffer.concat(partes)));
};
const baixar = (aula: number, arquivo: number, cookies: string[] = []) =>
  request(app).get(`/api/lessons/${aula}/files/${arquivo}`).set("Cookie", cookies).buffer(true).parse(bytes);

/** Bloqueada: a resposta não pode carregar nada do conteúdo. */
function semConteudo(corpo: unknown) {
  const texto = JSON.stringify(corpo);
  expect(texto).not.toContain(VIDEO_PAGO);
  expect(texto).not.toContain("token=");
  expect(texto).not.toContain(SEGREDO);
  expect(texto).not.toContain("Planilha");
}

describe("a aula paga", () => {
  it("visitante: bloqueada, com a lista do curso e sem nada do conteúdo", async () => {
    const res = await pagina(ids.paga);
    expect(res.status).toBe(200);
    expect(res.body.aula.liberada).toBe(false);
    expect(res.body.curso.modulos[0].aulas.map((a: { title: string }) => a.title)).toEqual(["Paga", "Grátis", "Texto"]);
    semConteudo(res.body);
  });

  it("aluno com assinatura: o player ASSINADO e os arquivos", async () => {
    const res = await pagina(ids.paga, member);
    expect(res.body.aula.liberada).toBe(true);
    expect(res.body.aula.playerUrl).toMatch(new RegExp(`/embed/762605/${VIDEO_PAGO}\\?token=[0-9a-f]{64}&expires=\\d+$`));
    expect(res.body.aula.arquivos).toEqual([{ id: ids.arquivo, originalName: "Planilha de Vendas.zip", sizeBytes: 5 }]);
    expect(res.headers["cache-control"]).toBe("private, no-store");
  });

  it("aluno sem assinatura: bloqueada", async () => {
    await semAssinatura(async () => {
      const res = await pagina(ids.paga, member);
      expect(res.body.aula.liberada).toBe(false);
      semConteudo(res.body);
    });
  });

  it("aula de texto: o texto só sai para quem tem acesso", async () => {
    semConteudo((await pagina(ids.texto)).body);
    const res = await pagina(ids.texto, member);
    expect(res.body.aula.texto).toBe(SEGREDO);
    expect(res.body.aula.playerUrl).toBeNull();
  });

  it("curso em INGLÊS abre com a mesma assinatura (idioma é filtro, não portão)", async () => {
    const res = await pagina(ids.ingles, member);
    expect(res.body.aula.liberada).toBe(true);
    expect(res.body.curso.language).toBe("en");
  });
});

describe("a prévia grátis", () => {
  it("toca para qualquer visitante, sem login", async () => {
    const res = await pagina(ids.gratis);
    expect(res.body.aula.liberada).toBe(true);
    expect(res.body.aula.playerUrl).toContain(`/${VIDEO_GRATIS}?token=`);
  });

  it("desligar a prévia volta a trancar a aula", async () => {
    await prisma.lesson.update({ where: { id: ids.gratis }, data: { isFreePreview: false } });
    try {
      const res = await pagina(ids.gratis);
      expect(res.body.aula.liberada).toBe(false);
      expect(JSON.stringify(res.body)).not.toContain(VIDEO_GRATIS);
    } finally {
      await prisma.lesson.update({ where: { id: ids.gratis }, data: { isFreePreview: true } });
    }
  });
});

describe("o aluno só enxerga o publicado", () => {
  it("aula em rascunho: 404", async () => {
    expect((await pagina(ids.rascunho, member)).status).toBe(404);
  });

  it("aula publicada dentro de curso em rascunho: 404", async () => {
    expect((await pagina(ids.cursoRascunho, member)).status).toBe(404);
  });

  it("a lista do curso não mostra a aula em rascunho", async () => {
    const res = await pagina(ids.paga, member);
    expect(JSON.stringify(res.body.curso)).not.toContain("Rascunho");
  });
});

describe("o download", () => {
  it("visitante na aula paga: 403, e o Storage nem é lido", async () => {
    const res = await baixar(ids.paga, ids.arquivo);
    expect(res.status).toBe(403);
    expect(lerArquivoDaAula).not.toHaveBeenCalled();
  });

  it("aluno com assinatura: o arquivo, com o NOME ORIGINAL", async () => {
    const res = await baixar(ids.paga, ids.arquivo, member);
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toContain('filename="Planilha de Vendas.zip"');
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect((res.body as Buffer).toString()).toBe("zip!!");
  });

  it("aluno sem assinatura: 403", async () => {
    await semAssinatura(async () => {
      expect((await baixar(ids.paga, ids.arquivo, member)).status).toBe(403);
    });
  });

  it("o arquivo de OUTRA aula não sai por esta: 404", async () => {
    expect((await baixar(ids.paga, ids.arquivoGratis, member)).status).toBe(404);
  });

  it("prévia grátis: o arquivo sai para o visitante", async () => {
    expect((await baixar(ids.gratis, ids.arquivoGratis)).status).toBe(200);
  });

  it("nome com caractere invisível de direção de texto sai limpo", () => {
    expect(nomeParaDownload("relatorio\u202Efdp.exe")).toBe("relatoriofdp.exe");
    expect(nomeParaDownload("a/b\\c\u0000.zip")).toBe("a_b_c.zip");
    expect(nomeParaDownload("\u200B\u200F")).toBe("arquivo");
  });
});

describe("a porta do admin", () => {
  it("sem login 401, aluno 403", async () => {
    for (const rota of [`/api/admin/lessons/${ids.paga}/aula`, `/api/admin/lesson-files/${ids.arquivo}/download`]) {
      expect((await request(app).get(rota)).status).toBe(401);
      expect((await request(app).get(rota).set("Cookie", member)).status).toBe(403);
    }
  });

  it("o admin vê a aula em RASCUNHO, com o status, e o player", async () => {
    const res = await request(app).get(`/api/admin/lessons/${ids.rascunho}/aula`).set("Cookie", admin);
    expect(res.status).toBe(200);
    expect(res.body.aula).toMatchObject({ status: "DRAFT", liberada: true });
    const rascunho = res.body.curso.modulos[0].aulas.find((a: { id: number }) => a.id === ids.rascunho);
    expect(rascunho.status).toBe("DRAFT");
  });

  it("o admin baixa o arquivo", async () => {
    const res = await request(app).get(`/api/admin/lesson-files/${ids.arquivo}/download`).set("Cookie", admin).buffer(true).parse(bytes);
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toContain("Planilha de Vendas.zip");
  });
});
