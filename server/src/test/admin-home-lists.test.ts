import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// Rotas de admin dos depoimentos e das perguntas frequentes (Bloco C3).
//
// Como no texto do site, os testes que importam terminam lendo a HOME: gravar a
// linha não prova nada se ela não chegar (ou não sair) da página.
// Cada linha criada aqui leva a MARCA, e o afterEach apaga só as marcadas — o
// banco é compartilhado e já tem o conteúdo semeado pela migration.

const MARCA = "⟦c3-admin⟧";

afterEach(async () => {
  await prisma.testimonial.deleteMany({ where: { name: { contains: MARCA } } });
  await prisma.faqItem.deleteMany({ where: { question: { contains: MARCA } } });
});

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(app).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}
const sessaoAdmin = () => sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
const sessaoMember = () => sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);

const novoDepoimento = (extra: object = {}) => ({
  language: "pt",
  text: "Depoimento escrito pelo admin.",
  name: `Aluna Real ${MARCA}`,
  status: "PUBLISHED",
  ...extra,
});
const novaPergunta = (extra: object = {}) => ({
  language: "pt",
  question: `Pergunta escrita pelo admin? ${MARCA}`,
  answer: "Resposta escrita pelo admin.",
  status: "PUBLISHED",
  ...extra,
});

// As duas rotas têm o MESMO contrato de acesso; um laço garante que nenhuma
// ficou de fora — rota de escrita sem requireAdmin é conteúdo público editável.
const ROTAS = [
  { base: "/api/admin/testimonials", corpo: novoDepoimento },
  { base: "/api/admin/faq", corpo: novaPergunta },
];

describe("admin de depoimentos e perguntas — quem pode", () => {
  for (const { base, corpo } of ROTAS) {
    it(`${base}: sem sessão = 401 em todos os métodos`, async () => {
      expect((await request(app).get(base)).status).toBe(401);
      expect((await request(app).post(base).send(corpo())).status).toBe(401);
      expect((await request(app).patch(`${base}/1`).send({ status: "DRAFT" })).status).toBe(401);
      expect((await request(app).delete(`${base}/1`)).status).toBe(401);
    });

    it(`${base}: aluno = 403 em todos os métodos, e nada é gravado`, async () => {
      const cookies = await sessaoMember();
      expect((await request(app).get(base).set("Cookie", cookies)).status).toBe(403);
      expect((await request(app).post(base).set("Cookie", cookies).send(corpo())).status).toBe(403);
      expect(
        (await request(app).patch(`${base}/1`).set("Cookie", cookies).send({ status: "DRAFT" })).status,
      ).toBe(403);
      expect((await request(app).delete(`${base}/1`).set("Cookie", cookies)).status).toBe(403);

      const vazou =
        (await prisma.testimonial.count({ where: { name: { contains: MARCA } } })) +
        (await prisma.faqItem.count({ where: { question: { contains: MARCA } } }));
      expect(vazou).toBe(0);
    });
  }
});

describe("admin de depoimentos — o caminho do operador", () => {
  it("publicar um depoimento novo faz ele aparecer na home do idioma dele", async () => {
    const cookies = await sessaoAdmin();
    const res = await request(app).post("/api/admin/testimonials").set("Cookie", cookies).send(novoDepoimento());

    expect(res.status).toBe(201);
    expect(res.body.language).toBe("pt");
    expect((await request(app).get("/")).text).toContain("Depoimento escrito pelo admin.");
    expect((await request(app).get("/en")).text).not.toContain("Depoimento escrito pelo admin.");
  });

  it("criado como rascunho NÃO aparece na home, mas aparece na lista do admin", async () => {
    const cookies = await sessaoAdmin();
    await request(app)
      .post("/api/admin/testimonials")
      .set("Cookie", cookies)
      .send(novoDepoimento({ text: "Ainda não publiquei este.", status: "DRAFT" }));

    expect((await request(app).get("/")).text).not.toContain("Ainda não publiquei este.");
    const lista = await request(app).get("/api/admin/testimonials").set("Cookie", cookies);
    expect(lista.status).toBe(200);
    expect((lista.body as Array<{ text: string }>).map((t) => t.text)).toContain("Ainda não publiquei este.");
  });

  it("arquivar pelo PATCH tira da home sem apagar", async () => {
    const cookies = await sessaoAdmin();
    const criado = await request(app).post("/api/admin/testimonials").set("Cookie", cookies).send(novoDepoimento());

    const res = await request(app)
      .patch(`/api/admin/testimonials/${criado.body.id}`)
      .set("Cookie", cookies)
      .send({ status: "ARCHIVED" });

    expect(res.status).toBe(200);
    expect((await request(app).get("/")).text).not.toContain("Depoimento escrito pelo admin.");
    expect(await prisma.testimonial.findUnique({ where: { id: criado.body.id } })).not.toBeNull();
  });

  it("Excluir APAGA a linha — o nome some do banco, não só da tela (LGPD)", async () => {
    const cookies = await sessaoAdmin();
    const criado = await request(app).post("/api/admin/testimonials").set("Cookie", cookies).send(novoDepoimento());

    const res = await request(app).delete(`/api/admin/testimonials/${criado.body.id}`).set("Cookie", cookies);

    expect(res.status).toBe(204);
    expect(await prisma.testimonial.findUnique({ where: { id: criado.body.id } })).toBeNull();
    expect((await request(app).get("/")).text).not.toContain(`Aluna Real ${MARCA}`);
  });

  it("recusa corpo inválido com 400 e não grava nada", async () => {
    const cookies = await sessaoAdmin();
    const invalidos = [
      novoDepoimento({ name: "   " }), // só espaço = vazio, depois de aparar
      novoDepoimento({ text: "" }),
      novoDepoimento({ language: "es" }), // teto de dois idiomas
      novoDepoimento({ status: "NOVO" }),
      novoDepoimento({ displayOrder: 1.5 }),
    ];
    for (const corpo of invalidos) {
      const res = await request(app).post("/api/admin/testimonials").set("Cookie", cookies).send(corpo);
      expect(res.status, JSON.stringify(corpo)).toBe(400);
    }
    expect(await prisma.testimonial.count({ where: { name: { contains: MARCA } } })).toBe(0);
  });

  it("id inexistente = 404; id que não é número = 400", async () => {
    const cookies = await sessaoAdmin();
    expect(
      (await request(app).patch("/api/admin/testimonials/999999").set("Cookie", cookies).send({ status: "DRAFT" }))
        .status,
    ).toBe(404);
    expect((await request(app).delete("/api/admin/testimonials/999999").set("Cookie", cookies)).status).toBe(404);
    expect((await request(app).delete("/api/admin/testimonials/abc").set("Cookie", cookies)).status).toBe(400);
  });
});

describe("admin de perguntas frequentes — o caminho do operador", () => {
  it("publicar, editar e excluir uma pergunta chega na home a cada passo", async () => {
    const cookies = await sessaoAdmin();

    const criada = await request(app).post("/api/admin/faq").set("Cookie", cookies).send(novaPergunta());
    expect(criada.status).toBe(201);
    expect((await request(app).get("/")).text).toContain("Pergunta escrita pelo admin?");

    const editada = await request(app)
      .patch(`/api/admin/faq/${criada.body.id}`)
      .set("Cookie", cookies)
      .send({ answer: "Resposta corrigida pelo admin." });
    expect(editada.status).toBe(200);
    const home = (await request(app).get("/")).text;
    expect(home).toContain("Resposta corrigida pelo admin.");
    expect(home).not.toContain("Resposta escrita pelo admin.");

    const excluida = await request(app).delete(`/api/admin/faq/${criada.body.id}`).set("Cookie", cookies);
    expect(excluida.status).toBe(204);
    expect(await prisma.faqItem.findUnique({ where: { id: criada.body.id } })).toBeNull();
    expect((await request(app).get("/")).text).not.toContain("Pergunta escrita pelo admin?");
  });

  it("recusa pergunta sem resposta com 400", async () => {
    const cookies = await sessaoAdmin();
    const res = await request(app).post("/api/admin/faq").set("Cookie", cookies).send(novaPergunta({ answer: "" }));
    expect(res.status).toBe(400);
    expect(await prisma.faqItem.count({ where: { question: { contains: MARCA } } })).toBe(0);
  });
});
