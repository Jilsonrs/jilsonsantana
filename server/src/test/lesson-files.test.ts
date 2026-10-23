import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";

// O CI não fala com o Bunny: só as funções que chamam o Storage viram dublê, na
// NOSSA fronteira. A trava do caminho (`caminhoDeArquivoDaAula`) continua a de
// verdade — ela é testada à parte, abaixo.
const enviarArquivoDaAula = vi.fn();
const apagarArquivoDaAula = vi.fn();
vi.mock("../lib/bunny-storage.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/bunny-storage.js")>()),
  enviarArquivoDaAula: (...args: unknown[]) => enviarArquivoDaAula(...args),
  apagarArquivoDaAula: (...args: unknown[]) => apagarArquivoDaAula(...args),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { caminhoDaParte, caminhoDeArquivoDaAula } from "../lib/bunny-storage.js";
import { TAMANHO_MAXIMO_DA_PARTE } from "../routes/admin-lesson-files.js";

// ARQUIVOS PARA BAIXAR de cada aula (Bloco E, etapa 2, parte 2e — plano aprovado
// pelo operador em 28/09/2026). O que estes testes protegem: só o admin envia e
// apaga; só as extensões combinadas, SEM limite de tamanho e EM FLUXO (operador,
// 29/09/2026); o nome no Storage é ALEATÓRIO
// (o do operador fica só no banco); a tela nunca recebe o caminho; e apagar nunca
// alcança uma PASTA no Bunny (lá, apagar pasta apaga tudo dentro).

const S = `-arquivos-${Date.now()}`;
let admin: string[] = [];
let member: string[] = [];
let aulaId = 0;

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  const curso = await prisma.course.create({
    data: { slug: `curso${S}`, title: "Curso", modules: { create: { title: "M", lessons: { create: { title: "Aula" } } } } },
    include: { modules: { include: { lessons: true } } },
  });
  aulaId = curso.modules[0].lessons[0].id;
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

// O que o "Bunny" recebeu: o dublê lê o fluxo inteiro de cada chamada, como o fetch leria.
let recebido = Buffer.alloc(0);
let tamanhoInformado = 0;
let objetosNoStorage = new Map<string, Buffer>();
async function lerFluxo(caminho: string, corpo: AsyncIterable<Buffer>, tamanho: number) {
  const partes: Buffer[] = [];
  for await (const parte of corpo) partes.push(parte);
  recebido = Buffer.concat(partes);
  tamanhoInformado = tamanho;
  objetosNoStorage.set(caminho, recebido);
  return { ok: true };
}

beforeEach(() => {
  recebido = Buffer.alloc(0);
  tamanhoInformado = 0;
  objetosNoStorage = new Map();
  enviarArquivoDaAula.mockReset().mockImplementation(lerFluxo);
  apagarArquivoDaAula.mockReset().mockResolvedValue({ ok: true });
});

const enviar = (cookies: string[], nome: string, conteudo = Buffer.from("conteúdo"), aula = aulaId) =>
  request(servidor)
    .post(`/api/admin/lessons/${aula}/files`)
    .set("Cookie", cookies)
    .set("Content-Type", "application/octet-stream")
    .set("X-Nome-Do-Arquivo", encodeURIComponent(nome))
    .send(conteudo);

describe("quem pode", () => {
  it("sem login 401 e aluno 403, nas quatro rotas", async () => {
    const rotas = [
      () => request(servidor).get(`/api/admin/lessons/${aulaId}/files`),
      () => request(servidor).post(`/api/admin/lessons/${aulaId}/files`),
      () => request(servidor).put(`/api/admin/lesson-files/1/partes/2`),
      () => request(servidor).delete(`/api/admin/lesson-files/1`),
    ];
    for (const rota of rotas) {
      expect((await rota()).status).toBe(401);
      expect((await rota().set("Cookie", member)).status).toBe(403);
    }
  });

  it("aula que não existe: 404", async () => {
    expect((await enviar(admin, "a.pdf", undefined, 999999)).status).toBe(404);
  });
});

describe("enviar", () => {
  it("guarda com nome ALEATÓRIO no Storage, e o nome do operador só no banco", async () => {
    const res = await enviar(admin, "Planilha de Vendas.xlsx", Buffer.from("xlsx!"));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ originalName: "Planilha de Vendas.xlsx", sizeBytes: 5 });
    expect(res.body).not.toHaveProperty("storagePath");
    const [caminho] = enviarArquivoDaAula.mock.calls[0] as [string];
    expect(caminho).toMatch(new RegExp(`^aulas/${aulaId}/[0-9a-f]{24}\\.xlsx$`));
    expect(caminho).not.toContain("Planilha");
    // O arquivo chegou inteiro, pelo fluxo, com o tamanho no cabeçalho.
    expect(recebido.toString()).toBe("xlsx!");
    expect(tamanhoInformado).toBe(5);
  });

  it("a lista traz os arquivos da aula, sem o caminho no Storage", async () => {
    const res = await request(servidor).get(`/api/admin/lessons/${aulaId}/files`).set("Cookie", admin);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const arquivo of res.body) expect(arquivo).not.toHaveProperty("storagePath");
  });

  it.each(["virus.exe", "pagina.html", "sem-extensao", "script.js"])("extensão fora da lista (%s): 400, nada enviado", async (nome) => {
    const res = await enviar(admin, nome);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("TipoNaoAceito");
    expect(enviarArquivoDaAula).not.toHaveBeenCalled();
  });

  // O nome é o que o aluno vê: sem pasta e sem caractere de controle.
  it("nome com pasta vira só o nome", async () => {
    const res = await enviar(admin, "../../etc/relatorio.PDF");
    expect(res.status).toBe(201);
    expect(res.body.originalName).toBe("relatorio.PDF");
  });

  it("sem nome: 400; arquivo vazio: 400", async () => {
    const semNome = await request(servidor)
      .post(`/api/admin/lessons/${aulaId}/files`)
      .set("Cookie", admin)
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("x"));
    expect(semNome.status).toBe(400);
    expect((await enviar(admin, "a.pdf", Buffer.alloc(0))).status).toBe(400);
  });

  // Sem limite para o arquivo (operador, 29/09/2026), enviado em partes de até
  // 30 MB (Bloco G, etapa G2): cada parte vira um objeto no Bunny Storage, e o
  // arquivo só fica visível quando todas as partes chegaram.
  it("acima dos 50 MB de antes: chega inteiro em partes de até 30 MB, e só aparece quando completo", async () => {
    const grande = Buffer.alloc(50 * 1024 * 1024 + 1);
    grande.fill(0x41, 0, TAMANHO_MAXIMO_DA_PARTE);
    grande.fill(0x42, TAMANHO_MAXIMO_DA_PARTE);
    const parte1 = grande.subarray(0, TAMANHO_MAXIMO_DA_PARTE);
    const parte2 = grande.subarray(TAMANHO_MAXIMO_DA_PARTE);

    const inicio = await request(servidor)
      .post(`/api/admin/lessons/${aulaId}/files`)
      .set("Cookie", admin)
      .set("Content-Type", "application/octet-stream")
      .set("X-Nome-Do-Arquivo", encodeURIComponent("curso.zip"))
      .set("X-Total-De-Partes", "2")
      .send(parte1);
    expect(inicio.status).toBe(201);
    const fileId = inicio.body.id as number;

    // Enquanto falta a 2ª parte, o arquivo não aparece na lista da aula.
    const listaAntes = await request(servidor).get(`/api/admin/lessons/${aulaId}/files`).set("Cookie", admin);
    expect((listaAntes.body as { id: number }[]).some((a) => a.id === fileId)).toBe(false);

    const fim = await request(servidor)
      .put(`/api/admin/lesson-files/${fileId}/partes/2`)
      .set("Cookie", admin)
      .set("Content-Type", "application/octet-stream")
      .send(parte2);
    expect(fim.status).toBe(200);
    expect(fim.body.sizeBytes).toBe(grande.length);

    const noBanco = await prisma.lessonFile.findUniqueOrThrow({ where: { id: fileId } });
    expect(noBanco.partes).toBe(2);
    expect(noBanco.partesEnviadas).toBe(2);
    expect(noBanco.completo).toBe(true);

    const juntado = Buffer.concat([
      objetosNoStorage.get(caminhoDaParte(noBanco.storagePath, 0)) ?? Buffer.alloc(0),
      objetosNoStorage.get(caminhoDaParte(noBanco.storagePath, 1)) ?? Buffer.alloc(0),
    ]);
    expect(juntado.equals(grande)).toBe(true);

    const listaDepois = await request(servidor).get(`/api/admin/lessons/${aulaId}/files`).set("Cookie", admin);
    expect((listaDepois.body as { id: number }[]).some((a) => a.id === fileId)).toBe(true);
  });

  it("uma parte sozinha acima de 30 MB: 413, nada enviado ao Bunny", async () => {
    const excesso = Buffer.alloc(TAMANHO_MAXIMO_DA_PARTE + 1, 7);
    const res = await enviar(admin, "grande-demais.zip", excesso);
    expect(res.status).toBe(413);
    expect(res.body.error).toBe("ParteMuitoGrande");
    expect(enviarArquivoDaAula).not.toHaveBeenCalled();
  });

  it("pular parte (mandar a 3 antes da 2): 400", async () => {
    const inicio = await request(servidor)
      .post(`/api/admin/lessons/${aulaId}/files`)
      .set("Cookie", admin)
      .set("Content-Type", "application/octet-stream")
      .set("X-Nome-Do-Arquivo", encodeURIComponent("tres-partes.zip"))
      .set("X-Total-De-Partes", "3")
      .send(Buffer.from("parte-1"));
    expect(inicio.status).toBe(201);

    const pulou = await request(servidor)
      .put(`/api/admin/lesson-files/${inicio.body.id}/partes/3`)
      .set("Cookie", admin)
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("parte-3"));
    expect(pulou.status).toBe(400);
    expect(pulou.body.error).toBe("ParteInvalida");
  });

  it("corpo que não é arquivo (JSON): 400, nada enviado", async () => {
    const res = await request(servidor)
      .post(`/api/admin/lessons/${aulaId}/files`)
      .set("Cookie", admin)
      .set("X-Nome-Do-Arquivo", "a.pdf")
      .send({ x: 1 });
    expect(res.status).toBe(400);
    expect(enviarArquivoDaAula).not.toHaveBeenCalled();
  });

  it("zona não configurada: 503; Bunny recusou: 502; nada gravado", async () => {
    const antes = await prisma.lessonFile.count({ where: { lessonId: aulaId } });
    enviarArquivoDaAula.mockResolvedValue({ ok: false, motivo: "NaoConfigurado" });
    expect((await enviar(admin, "a.pdf")).status).toBe(503);
    enviarArquivoDaAula.mockResolvedValue({ ok: false, motivo: "Falhou" });
    expect((await enviar(admin, "a.pdf")).status).toBe(502);
    expect(await prisma.lessonFile.count({ where: { lessonId: aulaId } })).toBe(antes);
  });
});

describe("excluir", () => {
  it("apaga no Bunny pelo caminho guardado, e depois no banco", async () => {
    const criado = await enviar(admin, "apagar.csv");
    const caminho = (await prisma.lessonFile.findUnique({ where: { id: criado.body.id } }))?.storagePath;

    const res = await request(servidor).delete(`/api/admin/lesson-files/${criado.body.id}`).set("Cookie", admin);

    expect(res.status).toBe(204);
    expect(apagarArquivoDaAula).toHaveBeenCalledWith(caminho);
    expect(await prisma.lessonFile.findUnique({ where: { id: criado.body.id } })).toBeNull();
  });

  it("arquivo em várias partes: apaga TODAS as partes no Bunny, e só depois no banco", async () => {
    const inicio = await request(servidor)
      .post(`/api/admin/lessons/${aulaId}/files`)
      .set("Cookie", admin)
      .set("Content-Type", "application/octet-stream")
      .set("X-Nome-Do-Arquivo", encodeURIComponent("em-tres-partes.zip"))
      .set("X-Total-De-Partes", "3")
      .send(Buffer.from("p1"));
    const id = inicio.body.id as number;
    await request(servidor).put(`/api/admin/lesson-files/${id}/partes/2`).set("Cookie", admin).set("Content-Type", "application/octet-stream").send(Buffer.from("p2"));
    await request(servidor).put(`/api/admin/lesson-files/${id}/partes/3`).set("Cookie", admin).set("Content-Type", "application/octet-stream").send(Buffer.from("p3"));
    const noBanco = await prisma.lessonFile.findUniqueOrThrow({ where: { id } });

    const res = await request(servidor).delete(`/api/admin/lesson-files/${id}`).set("Cookie", admin);

    expect(res.status).toBe(204);
    expect(apagarArquivoDaAula).toHaveBeenCalledTimes(3);
    expect(apagarArquivoDaAula).toHaveBeenNthCalledWith(1, noBanco.storagePath);
    expect(apagarArquivoDaAula).toHaveBeenNthCalledWith(2, caminhoDaParte(noBanco.storagePath, 1));
    expect(apagarArquivoDaAula).toHaveBeenNthCalledWith(3, caminhoDaParte(noBanco.storagePath, 2));
    expect(await prisma.lessonFile.findUnique({ where: { id } })).toBeNull();
  });

  it("o Bunny recusou: 502, e o registro FICA", async () => {
    const criado = await enviar(admin, "fica.csv");
    apagarArquivoDaAula.mockResolvedValue({ ok: false, motivo: "Falhou" });

    expect((await request(servidor).delete(`/api/admin/lesson-files/${criado.body.id}`).set("Cookie", admin)).status).toBe(502);
    expect(await prisma.lessonFile.findUnique({ where: { id: criado.body.id } })).not.toBeNull();
  });

  it("arquivo que não existe: 404", async () => {
    expect((await request(servidor).delete(`/api/admin/lesson-files/999999`).set("Cookie", admin)).status).toBe(404);
  });
});

// A TRAVA contra o apagar recursivo do Bunny (doc via context7, 28/09/2026):
// só caminho de ARQUIVO de aula passa. Unidade genuína: função pura.
describe("caminho de arquivo de aula", () => {
  it("aceita o formato que o envio gera (1ª parte e partes seguintes)", () => {
    expect(caminhoDeArquivoDaAula("aulas/12/0123456789abcdef01234567.pdf")).toBe(true);
    expect(caminhoDeArquivoDaAula("aulas/12/0123456789abcdef01234567.parte-2.pdf")).toBe(true);
    expect(caminhoDeArquivoDaAula("aulas/12/0123456789abcdef01234567.parte-15.zip")).toBe(true);
  });

  it.each([
    "",
    "aulas/12/",
    "aulas/12",
    "aulas/",
    "cursos/capa.webp",
    "aulas/12/../0123456789abcdef01234567.pdf",
    "aulas/12/0123456789abcdef01234567",
    "/aulas/12/0123456789abcdef01234567.pdf",
    "aulas/12/0123456789abcdef01234567.parte-0.pdf",
    "aulas/12/0123456789abcdef01234567.parte-1.pdf",
    "aulas/12/0123456789abcdef01234567.parte-02.pdf",
  ])(
    "recusa %j (pasta, vazio, fora da zona, parte inválida ou com ..)",
    (caminho) => {
      expect(caminhoDeArquivoDaAula(caminho)).toBe(false);
    },
  );
});
