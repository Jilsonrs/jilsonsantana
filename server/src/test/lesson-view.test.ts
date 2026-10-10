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

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";
import { nomeParaDownload } from "../lib/nome-do-download.js";

// A PÁGINA DA AULA (etapa 4 do Bloco U — plano aprovado pelo operador em
// 29/09/2026). O que estes testes protegem:
//   - a aula paga só abre para quem tem acesso; a PRÉVIA GRÁTIS abre para
//     qualquer visitante, e desligar a prévia volta a trancar;
//   - os ARQUIVOS são só para assinante, inclusive na prévia grátis (o visitante
//     só assiste — decisão do operador, 29/09/2026);
//   - um download que cai no meio não derruba o servidor (achado P1, 29/09);
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
const ids = { paga: 0, gratis: 0, texto: 0, rascunho: 0, cursoRascunho: 0, ingles: 0, arquivo: 0, arquivoGratis: 0, moduloRascunho: 0, arquivoModuloRascunho: 0, arquivoRascunho: 0 };

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

const ENV = ["BUNNY_STREAM_LESSONS_LIBRARY_ID", "BUNNY_STREAM_LESSONS_API_KEY", "BUNNY_STREAM_LESSONS_TOKEN_KEY"] as const;
const envAntes = Object.fromEntries(ENV.map((n) => [n, process.env[n]]));

async function curso(slug: string, status: "PUBLISHED" | "DRAFT", language: "PT" | "EN", aulas: Prisma.LessonCreateWithoutModuleInput[]) {
  return prisma.course.create({
    data: {
      slug: `${slug}${S}`,
      title: slug,
      language,
      status,
      level: "INTERMEDIARIO",
      description: "Um curso **completo**.",
      learnTags: ["PROCX"],
      requirements: ["Excel instalado"],
      personas: ["Analistas"],
      highlights: [{ icon: "sparkles", title: "IA do seu lado", text: "Com o JilsonAI." }],
      faq: [{ pergunta: "Preciso do 365?", resposta: "Não." }],
      camadas: ["UNIVERSAL", "IA"],
      modules: { create: { title: "M", status: "PUBLISHED", lessons: { create: aulas } } } },
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
    { title: "Paga", status: "PUBLISHED", bunnyVideoId: VIDEO_PAGO, videoDurationSeconds: 82, displayOrder: 0 },
    { title: "Grátis", status: "PUBLISHED", bunnyVideoId: VIDEO_GRATIS, isFreePreview: true, displayOrder: 1 },
    // Era vídeo e virou texto: a duração antiga ficou no banco, e não pode aparecer.
    { title: "Texto", status: "PUBLISHED", kind: "TEXT", content: SEGREDO, videoDurationSeconds: 999, displayOrder: 2 },
    { title: "Rascunho", status: "DRAFT", displayOrder: 3 },
  ]);
  const [paga, gratis, texto, rascunho] = pt.modules[0].lessons;
  Object.assign(ids, { paga: paga.id, gratis: gratis.id, texto: texto.id, rascunho: rascunho.id });
  const emRascunho = await curso("rascunho", "DRAFT", "PT", [{ title: "Publicada em curso rascunho", status: "PUBLISHED" }]);
  ids.cursoRascunho = emRascunho.modules[0].lessons[0].id;
  const en = await curso("ingles", "PUBLISHED", "EN", [{ title: "English", status: "PUBLISHED", bunnyVideoId: VIDEO_PAGO }]);
  ids.ingles = en.modules[0].lessons[0].id;
  // Um MÓDULO em rascunho, dentro do curso publicado, com uma aula publicada e arquivo.
  const modulo = await prisma.module.create({
    data: { courseId: pt.id, title: "Módulo escondido", status: "DRAFT", lessons: { create: { title: "Aula do módulo escondido", status: "PUBLISHED" } } },
    include: { lessons: true },
  });
  ids.moduloRascunho = modulo.lessons[0].id;
  ids.arquivoModuloRascunho = (await prisma.lessonFile.create({
    data: { lessonId: modulo.lessons[0].id, originalName: "escondido.zip", storagePath: `aulas/${modulo.lessons[0].id}/${"c".repeat(24)}.zip`, sizeBytes: 1 },
  })).id;
  ids.arquivoRascunho = (await prisma.lessonFile.create({
    data: { lessonId: rascunho.id, originalName: "rascunho.zip", storagePath: `aulas/${rascunho.id}/${"d".repeat(24)}.zip`, sizeBytes: 1 },
  })).id;

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

const pagina = (id: number, cookies: string[] = []) => request(servidor).get(`/api/lessons/${id}/aula`).set("Cookie", cookies);
// O corpo do download como bytes (o supertest não lê .zip sozinho).
const bytes = (res: request.Response, pronto: (erro: Error | null, corpo: unknown) => void) => {
  // Cast: no Node, o superagent entrega aqui a própria resposta HTTP, que é um fluxo.
  const fluxo = res as unknown as NodeJS.ReadableStream;
  const partes: Buffer[] = [];
  fluxo.on("data", (parte: Buffer) => partes.push(parte));
  fluxo.on("end", () => pronto(null, Buffer.concat(partes)));
};
const baixar = (aula: number, arquivo: number, cookies: string[] = []) =>
  request(servidor).get(`/api/lessons/${aula}/files/${arquivo}`).set("Cookie", cookies).buffer(true).parse(bytes);

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
    // A aula começa a tocar sozinha, como no LinkedIn (operador, 03/10/2026).
    expect(res.body.aula.playerUrl).toMatch(new RegExp(`/embed/762605/${VIDEO_PAGO}\\?token=[0-9a-f]{64}&expires=\\d+&autoplay=true$`));
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
    // Caso 16 da matriz da Fase 4: inclusive o endereço ASSINADO do vídeo — é ele que toca.
    expect(res.body.aula.playerUrl).toMatch(new RegExp(`/${VIDEO_PAGO}\\?token=[0-9a-f]{64}&expires=\\d+`));
  });
});

// Os DETALHES do curso ficam embaixo do player em toda aula (decisão do operador,
// 29/09/2026) — inclusive na aula bloqueada, onde a pessoa decide se é para ela.
// A DURAÇÃO AO LADO DE CADA AULA, como no LinkedIn (operador, 06/10/2026).
describe("a duração de cada aula na lista", () => {
  it("vídeo leva a duração; vídeo ainda processando e aula de texto, não", async () => {
    const res = await pagina(ids.paga);
    const duracoes = Object.fromEntries(
      (res.body.curso.modulos[0].aulas as { title: string; duracaoSegundos: number | null }[]).map((a) => [a.title, a.duracaoSegundos]),
    );
    expect(duracoes).toEqual({ Paga: 82, Grátis: null, Texto: null });
  });
});

describe("os detalhes do curso", () => {
  it("vêm na página da aula, liberada ou bloqueada", async () => {
    for (const cookies of [member, []]) {
      const { curso } = (await pagina(ids.paga, cookies)).body;
      expect(curso).toMatchObject({
        level: "INTERMEDIARIO",
        description: "Um curso **completo**.",
        learnTags: ["PROCX"],
        requirements: ["Excel instalado"],
        personas: ["Analistas"],
        faq: [{ pergunta: "Preciso do 365?", resposta: "Não." }],
        camadas: ["UNIVERSAL", "IA"],
      });
      expect(curso.highlights[0].title).toBe("IA do seu lado");
    }
  });
});

describe("a prévia grátis", () => {
  it("toca para qualquer visitante, sem login — mas os arquivos não vêm", async () => {
    const res = await pagina(ids.gratis);
    expect(res.body.aula.liberada).toBe(true);
    expect(res.body.aula.playerUrl).toContain(`/${VIDEO_GRATIS}?token=`);
    expect(res.body.aula.arquivosLiberados).toBe(false);
    expect(res.body.aula).not.toHaveProperty("arquivos");
    expect(JSON.stringify(res.body)).not.toContain("brinde.pdf");
  });

  it("para o assinante, a prévia grátis traz os arquivos também", async () => {
    const res = await pagina(ids.gratis, member);
    expect(res.body.aula.arquivosLiberados).toBe(true);
    expect(res.body.aula.arquivos).toEqual([{ id: ids.arquivoGratis, originalName: "brinde.pdf", sizeBytes: 3 }]);
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

  it("aula publicada dentro de MÓDULO em rascunho: 404, e o módulo nem aparece na lista", async () => {
    expect((await pagina(ids.moduloRascunho, member)).status).toBe(404);
    expect(JSON.stringify((await pagina(ids.paga, member)).body.curso)).not.toContain("escondido");
  });
});

describe("o download", () => {
  // A TRAVA DE "LOGIN + ASSINATURA" (`requireActiveMembership`, Fase 4, etapa 4.4): o invólucro
  // HTTP de `temAcessoAtivo()`. Sem login 401; com login e sem acesso 403; com acesso, passa.
  it("visitante na aula paga: 401 (falta o login), e o Storage nem é lido", async () => {
    const res = await baixar(ids.paga, ids.arquivo);
    expect(res.status).toBe(401);
    expect(lerArquivoDaAula).not.toHaveBeenCalled();
  });

  it("a recusa vem ANTES de procurar o arquivo: quem não assina recebe a mesma resposta, exista o arquivo ou não", async () => {
    await semAssinatura(async () => {
      const existe = await baixar(ids.paga, ids.arquivo, member);
      const naoExiste = await baixar(ids.paga, 999_999, member);
      const aulaQueNaoExiste = await baixar(999_999, ids.arquivo, member);
      for (const res of [existe, naoExiste, aulaQueNaoExiste]) {
        expect(res.status).toBe(403);
        expect(JSON.parse((res.body as Buffer).toString())).toEqual({ error: "AssinaturaNecessaria" });
      }
    });
    expect((await baixar(ids.paga, 999_999)).status).toBe(401);
    expect(lerArquivoDaAula).not.toHaveBeenCalled();
  });

  it("a regra é a do GATE: pagamento atrasado (em novas tentativas) e cancelada com dias pagos baixam; cancelada e vencida, não", async () => {
    const com = (status: string, currentPeriodEnd: Date) => prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status, currentPeriodEnd } });
    try {
      await com("past_due", new Date("2020-01-01T00:00:00Z"));
      expect((await baixar(ids.paga, ids.arquivo, member)).status).toBe(200);
      await com("canceled", new Date("2100-01-01T00:00:00Z"));
      expect((await baixar(ids.paga, ids.arquivo, member)).status).toBe(200);
      await com("canceled", new Date("2020-01-01T00:00:00Z"));
      expect((await baixar(ids.paga, ids.arquivo, member)).status).toBe(403);
      await com("incomplete", new Date("2100-01-01T00:00:00Z"));
      expect((await baixar(ids.paga, ids.arquivo, member)).status).toBe(403);
    } finally {
      await com("active", new Date("2100-01-01T00:00:00Z"));
    }
  });

  it("o admin não assina: pela rota do ALUNO ele não baixa (403) — a porta dele é a rota de admin", async () => {
    expect((await baixar(ids.paga, ids.arquivo, admin)).status).toBe(403);
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

  it("prévia grátis: o visitante só assiste — o arquivo não sai (401); o assinante baixa", async () => {
    expect((await baixar(ids.gratis, ids.arquivoGratis)).status).toBe(401);
    expect(lerArquivoDaAula).not.toHaveBeenCalled();
    expect((await baixar(ids.gratis, ids.arquivoGratis, member)).status).toBe(200);
  });

  it("arquivo de aula em rascunho, ou de módulo em rascunho: 404 para o aluno", async () => {
    expect((await baixar(ids.rascunho, ids.arquivoRascunho, member)).status).toBe(404);
    expect((await baixar(ids.moduloRascunho, ids.arquivoModuloRascunho, member)).status).toBe(404);
    expect(lerArquivoDaAula).not.toHaveBeenCalled();
  });

  // Achado P1 (29/09): com `.pipe()`, o Bunny caindo no meio virava "Unhandled
  // 'error' event" e derrubava o processo. O servidor tem que continuar de pé.
  it("o Bunny cai no meio do download: a requisição termina e o servidor continua de pé", async () => {
    lerArquivoDaAula.mockImplementation(async () => {
      const quebrado = new Readable({
        read() {
          this.push(Buffer.from("parte"));
          this.destroy(new Error("reset"));
        },
      });
      return { ok: true, corpo: quebrado, tamanho: "999" };
    });
    await baixar(ids.paga, ids.arquivo, member).catch(() => undefined);
    expect((await request(servidor).get("/api/health")).status).toBe(200);
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
      expect((await request(servidor).get(rota)).status).toBe(401);
      expect((await request(servidor).get(rota).set("Cookie", member)).status).toBe(403);
    }
  });

  it("o admin vê a aula em RASCUNHO, com o status, e o player", async () => {
    const res = await request(servidor).get(`/api/admin/lessons/${ids.rascunho}/aula`).set("Cookie", admin);
    expect(res.status).toBe(200);
    expect(res.body.aula).toMatchObject({ status: "DRAFT", liberada: true });
    const rascunho = res.body.curso.modulos[0].aulas.find((a: { id: number }) => a.id === ids.rascunho);
    expect(rascunho.status).toBe("DRAFT");
  });

  it("o admin baixa o arquivo", async () => {
    const res = await request(servidor).get(`/api/admin/lesson-files/${ids.arquivo}/download`).set("Cookie", admin).buffer(true).parse(bytes);
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toContain("Planilha de Vendas.zip");
  });
});
