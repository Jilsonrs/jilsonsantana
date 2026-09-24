import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { pt } from "@jilson/core";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { invalidarCacheDeTexto } from "../lib/dict.js";

// Texto de página editável pelo operador (docs/content.md § 16).
//
// O que estes testes protegem é UM comportamento: o que o visitante lê é
// `sobrescrita do banco ?? valor de fábrica`. Por isso quase todos terminam
// lendo a HOME de verdade, e não a resposta da rota de admin — gravar a linha
// não prova nada se ela não chegar na página.

const CHAVE = "home.hero.subtitle";
const FABRICA_PT = pt.home.hero.subtitle;
const EDITADO = "Texto que o operador escreveu no painel.";

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(app).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

const sessaoAdmin = () => sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
const sessaoMember = () => sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);

// `object` e não o tipo do schema: metade dos casos manda corpo INVÁLIDO de
// propósito, e tipar como válido impediria justamente esses testes de existir.
async function editar(cookies: string[], body: object) {
  return request(app).put("/api/admin/site-text").set("Cookie", cookies).send(body);
}

afterEach(async () => {
  // A suíte compartilha UM banco. Sobrescrita esquecida aqui quebra o teste da
  // home que confere o texto de fábrica — e quebraria por ordem de execução,
  // que é o tipo de falha que ninguém consegue reproduzir.
  await prisma.siteText.deleteMany({});
  invalidarCacheDeTexto();
});

describe("texto do site — o que o visitante lê", () => {
  it("sem sobrescrita, a home mostra o valor de fábrica", async () => {
    const res = await request(app).get("/");
    expect(res.text).toContain(FABRICA_PT);
  });

  it("com sobrescrita, a home mostra o texto do operador e NÃO o de fábrica", async () => {
    const cookies = await sessaoAdmin();
    const put = await editar(cookies, { key: CHAVE, language: "pt", value: EDITADO });
    expect(put.status).toBe(200);

    const res = await request(app).get("/");
    expect(res.text).toContain(EDITADO);
    expect(res.text).not.toContain(FABRICA_PT);
  });

  it("editar o português NÃO mexe no inglês", async () => {
    const cookies = await sessaoAdmin();
    await editar(cookies, { key: CHAVE, language: "pt", value: EDITADO });

    const en = await request(app).get("/en");
    expect(en.text).not.toContain(EDITADO);
    expect(en.text).toContain("Courses and guided learning paths");
  });

  it("editar o inglês NÃO mexe no português", async () => {
    const cookies = await sessaoAdmin();
    await editar(cookies, { key: CHAVE, language: "en", value: "Operator wrote this." });

    const en = await request(app).get("/en");
    const ptRes = await request(app).get("/");
    expect(en.text).toContain("Operator wrote this.");
    expect(ptRes.text).toContain(FABRICA_PT);
    expect(ptRes.text).not.toContain("Operator wrote this.");
  });

  it("valor vazio APAGA a sobrescrita e a página volta ao valor de fábrica", async () => {
    const cookies = await sessaoAdmin();
    await editar(cookies, { key: CHAVE, language: "pt", value: EDITADO });

    const limpar = await editar(cookies, { key: CHAVE, language: "pt", value: "   " });
    expect(limpar.status).toBe(200);
    expect(limpar.body.usandoFabrica).toBe(true);
    expect(await prisma.siteText.count()).toBe(0);

    const res = await request(app).get("/");
    expect(res.text).toContain(FABRICA_PT);
  });
});

describe("texto do site — o que tem que ser RECUSADO", () => {
  it("sem sessão, não lista e não grava", async () => {
    expect((await request(app).get("/api/admin/site-text")).status).toBe(401);
    expect((await editar([], { key: CHAVE, language: "pt", value: EDITADO })).status).toBe(401);
  });

  it("membro autenticado não é admin — 403, e nada é gravado", async () => {
    const cookies = await sessaoMember();
    expect((await request(app).get("/api/admin/site-text").set("Cookie", cookies)).status).toBe(403);
    expect((await editar(cookies, { key: CHAVE, language: "pt", value: EDITADO })).status).toBe(403);
    expect(await prisma.siteText.count()).toBe(0);
  });

  it("chave que não existe no dicionário é recusada — a tabela não vira lixeira", async () => {
    const cookies = await sessaoAdmin();
    const res = await editar(cookies, { key: "home.inventada.pelo.atacante", language: "pt", value: "x" });

    expect(res.status).toBe(400);
    expect(await prisma.siteText.count()).toBe(0);
  });

  it("idioma fora dos dois da escola é recusado", async () => {
    const cookies = await sessaoAdmin();
    const res = await editar(cookies, { key: CHAVE, language: "es", value: "Hola" });

    expect(res.status).toBe(400);
    expect(await prisma.siteText.count()).toBe(0);
  });
});

describe("texto do site — a lista que a tela de admin consome", () => {
  it("traz TODO campo do dicionário, com fábrica e sobrescrita separadas", async () => {
    const cookies = await sessaoAdmin();
    await editar(cookies, { key: CHAVE, language: "pt", value: EDITADO });

    const res = await request(app).get("/api/admin/site-text").set("Cookie", cookies);
    expect(res.status).toBe(200);

    const campo = res.body.campos.find((c: { key: string }) => c.key === CHAVE);
    expect(campo.section).toBe("home.hero");
    expect(campo.pt).toEqual({ factory: FABRICA_PT, override: EDITADO });
    expect(campo.en.override).toBeNull();

    // A lista sai do DICIONÁRIO: campo nunca editado também aparece, senão a
    // tela só mostraria o que já foi mexido — inútil para editar a primeira vez.
    const nuncaEditado = res.body.campos.find((c: { key: string }) => c.key === "home.cta.title");
    expect(nuncaEditado.pt.override).toBeNull();
    expect(nuncaEditado.pt.factory).toBe(pt.home.cta.title);
  });
});

// O rodapé do app logado mostra os MESMOS textos do rodapé da home (decisão do
// operador, 24/09/2026). Ele os lê por esta rota pública — então ela tem que
// entregar a edição do operador, não o valor de fábrica.
describe("texto do site — os textos comuns, lidos pelo rodapé do app", () => {
  const CHAVE_CONTATO = "common.footer.links[5]";
  const FABRICA_CONTATO = pt.common.footer.links[5];

  it("sem edição, devolve o texto de fábrica — sem sessão, porque é texto público", async () => {
    const res = await request(app).get("/api/site-text/common/pt");

    expect(res.status).toBe(200);
    expect(res.body.footer.links[5]).toBe(FABRICA_CONTATO);
    expect(res.body.footer.copyright).toBe(pt.common.footer.copyright);
  });

  it("depois de o operador editar, devolve o texto EDITADO", async () => {
    const cookies = await sessaoAdmin();
    await editar(cookies, { key: CHAVE_CONTATO, language: "pt", value: "Fale comigo" });

    const res = await request(app).get("/api/site-text/common/pt");
    expect(res.body.footer.links[5]).toBe("Fale comigo");
  });

  it("a edição do português não chega no inglês", async () => {
    const cookies = await sessaoAdmin();
    await editar(cookies, { key: CHAVE_CONTATO, language: "pt", value: "Fale comigo" });

    const res = await request(app).get("/api/site-text/common/en");
    expect(res.status).toBe(200);
    expect(res.body.footer.links[5]).not.toBe("Fale comigo");
  });

  it("só os textos comuns: os de cada página (home.*) não saem por aqui", async () => {
    const res = await request(app).get("/api/site-text/common/pt");

    expect(res.body.footer).toBeDefined();
    expect(res.body.hero).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(pt.home.hero.subtitle);
  });

  it("idioma fora dos dois da escola é recusado", async () => {
    expect((await request(app).get("/api/site-text/common/es")).status).toBe(400);
  });
});
