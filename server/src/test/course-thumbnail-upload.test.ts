import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";

// O CI não fala com o Bunny: o dublê fica na NOSSA fronteira (o módulo que
// chama o Storage), nunca no `fetch` do fornecedor (CLAUDE.md → Testing).
const enviarParaOStorage = vi.fn();
vi.mock("../lib/bunny-storage.js", () => ({
  enviarParaOStorage: (...args: unknown[]) => enviarParaOStorage(...args),
}));

import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// CAPA DO CURSO ENVIADA PELO ADMIN (bloco de envio, etapa 1 — plano aprovado
// pelo operador em 27/09/2026). O que estes testes protegem:
//   - só o admin envia;
//   - só entra WebP, JPG ou PNG, conferidos pelo CONTEÚDO (um .png que é texto
//     é recusado);
//   - o nome segue a pasta decidida (`cursos/<slug>-<código>.<ext>`) e muda a
//     cada envio, por causa do cache de 1 mês da CDN;
//   - o endereço devolvido pelo Storage vai para o curso.

const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 "), Buffer.alloc(16)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);

const SLUG = `capa-${Date.now()}`;
let cursoId = 0;
let admin: string[] = [];
let member: string[] = [];

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(app).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

beforeAll(async () => {
  admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  const curso = await prisma.course.create({ data: { slug: SLUG, title: "Curso da capa", language: "PT" } });
  cursoId = curso.id;
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: SLUG } });
});

beforeEach(() => {
  enviarParaOStorage.mockReset();
  enviarParaOStorage.mockImplementation(async (caminho: string) => ({
    ok: true,
    endereco: `https://img.jilsonsantana.com/${caminho}`,
  }));
});

const enviar = (cookies: string[], tipo: string, corpo: Buffer, id = cursoId) =>
  request(app).post(`/api/admin/courses/${id}/thumbnail`).set("Cookie", cookies).set("Content-Type", tipo).send(corpo);

const capaGravada = async () => (await prisma.course.findUnique({ where: { id: cursoId } }))?.thumbnailUrl;

describe("capa do curso — quem pode enviar", () => {
  it("sem login: 401, e nada vai para o Storage", async () => {
    const res = await request(app)
      .post(`/api/admin/courses/${cursoId}/thumbnail`)
      .set("Content-Type", "image/webp")
      .send(WEBP);

    expect(res.status).toBe(401);
    expect(enviarParaOStorage).not.toHaveBeenCalled();
  });

  it("aluno: 403, e nada vai para o Storage", async () => {
    const res = await enviar(member, "image/webp", WEBP);

    expect(res.status).toBe(403);
    expect(enviarParaOStorage).not.toHaveBeenCalled();
  });

  it("curso que não existe: 404", async () => {
    const res = await enviar(admin, "image/webp", WEBP, 99_999_999);
    expect(res.status).toBe(404);
  });
});

describe("capa do curso — o que entra", () => {
  it.each([
    ["WebP", "image/webp", WEBP, "webp"],
    ["JPG", "image/jpeg", JPG, "jpg"],
    ["PNG", "image/png", PNG, "png"],
  ] as const)("%s: vai para cursos/<slug>-<código> e o endereço fica no curso", async (_nome, tipo, corpo, ext) => {
    const res = await enviar(admin, tipo, corpo);

    expect(res.status).toBe(200);
    const [caminho, conteudo] = enviarParaOStorage.mock.calls[0] as [string, Buffer];
    expect(caminho).toMatch(new RegExp(`^cursos/${SLUG}-[0-9a-f]{12}\\.${ext}$`));
    expect(Buffer.compare(conteudo, corpo)).toBe(0);
    expect(res.body.thumbnailUrl).toBe(`https://img.jilsonsantana.com/${caminho}`);
    expect(await capaGravada()).toBe(res.body.thumbnailUrl);
  });

  it("dois envios nunca repetem o nome (a CDN guarda 1 mês)", async () => {
    await enviar(admin, "image/webp", WEBP);
    await enviar(admin, "image/webp", WEBP);

    const [primeiro, segundo] = enviarParaOStorage.mock.calls.map((c) => c[0]);
    expect(primeiro).not.toBe(segundo);
  });
});

describe("capa do curso — o que é recusado", () => {
  it("arquivo disfarçado (diz que é PNG, mas é texto): 400, e nada muda", async () => {
    const antes = await capaGravada();
    const res = await enviar(admin, "image/png", Buffer.from("<svg onload=alert(1)>"));

    expect(res.status).toBe(400);
    expect(enviarParaOStorage).not.toHaveBeenCalled();
    expect(await capaGravada()).toBe(antes);
  });

  it("tipo fora da lista (GIF, SVG): 400", async () => {
    for (const tipo of ["image/gif", "image/svg+xml"]) {
      const res = await enviar(admin, tipo, WEBP);
      expect(res.status, tipo).toBe(400);
    }
    expect(enviarParaOStorage).not.toHaveBeenCalled();
  });

  it("maior que 5 MB: 413", async () => {
    const grande = Buffer.concat([WEBP, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await enviar(admin, "image/webp", grande);

    expect(res.status).toBe(413);
    expect(enviarParaOStorage).not.toHaveBeenCalled();
  });

  it("Storage sem configuração: 503, e o curso não muda", async () => {
    const antes = await capaGravada();
    enviarParaOStorage.mockResolvedValueOnce({ ok: false, motivo: "NaoConfigurado" });

    const res = await enviar(admin, "image/webp", WEBP);
    expect(res.status).toBe(503);
    expect(await capaGravada()).toBe(antes);
  });

  it("Storage recusou: 502, e o curso não muda", async () => {
    const antes = await capaGravada();
    enviarParaOStorage.mockResolvedValueOnce({ ok: false, motivo: "Falhou" });

    const res = await enviar(admin, "image/webp", WEBP);
    expect(res.status).toBe(502);
    expect(await capaGravada()).toBe(antes);
  });
});
