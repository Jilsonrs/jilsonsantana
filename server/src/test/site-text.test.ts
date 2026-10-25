import { describe, it, expect, afterEach, vi } from "vitest";
import request from "supertest";
import { pt } from "@jilson/core";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { VALIDADE_DO_CACHE_DE_TEXTO, invalidarCacheDeTexto } from "../lib/dict.js";

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
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

const sessaoAdmin = () => sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
const sessaoMember = () => sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);

// `object` e não o tipo do schema: metade dos casos manda corpo INVÁLIDO de
// propósito, e tipar como válido impediria justamente esses testes de existir.
async function editar(cookies: string[], body: object) {
  return request(servidor).put("/api/admin/site-text").set("Cookie", cookies).send(body);
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
    const res = await request(servidor).get("/");
    expect(res.text).toContain(FABRICA_PT);
  });

  it("com sobrescrita, a home mostra o texto do operador e NÃO o de fábrica", async () => {
    const cookies = await sessaoAdmin();
    const put = await editar(cookies, { key: CHAVE, value: EDITADO });
    expect(put.status).toBe(200);

    const res = await request(servidor).get("/");
    expect(res.text).toContain(EDITADO);
    expect(res.text).not.toContain(FABRICA_PT);
  });

  // O SERVIDOR TEM ATÉ 3 CÓPIAS (25/10/2026): a edição chega por UMA delas, que limpa o próprio
  // cache; as outras só a veem quando o cache delas passa de 1 minuto. Aqui, a edição de "outra
  // cópia" é a linha gravada direto no banco, sem limpar o cache desta.
  it("edição feita em OUTRA cópia do servidor aparece aqui em até 1 minuto — e não antes", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
    try {
      expect((await request(servidor).get("/")).text).toContain(FABRICA_PT);
      await prisma.siteText.create({ data: { key: CHAVE, value: EDITADO } });

      vi.setSystemTime(Date.now() + VALIDADE_DO_CACHE_DE_TEXTO - 1000);
      expect((await request(servidor).get("/")).text).toContain(FABRICA_PT);

      vi.setSystemTime(Date.now() + 2000);
      const depois = (await request(servidor).get("/")).text;
      expect(depois).toContain(EDITADO);
      expect(depois).not.toContain(FABRICA_PT);
    } finally {
      vi.useRealTimers();
    }
  });

  // A escola é só em português (12/10/2026): um `language` que uma versão antiga do site
  // ainda mande é ignorado, e o texto vale.
  it("o idioma que o pedido ainda mande é ignorado", async () => {
    const cookies = await sessaoAdmin();
    const res = await editar(cookies, { key: CHAVE, language: "en", value: EDITADO });
    expect(res.status).toBe(200);
    expect(res.body.language).toBeUndefined();

    const home = await request(servidor).get("/");
    expect(home.text).toContain(EDITADO);
    expect(await prisma.siteText.count({ where: { key: CHAVE } })).toBe(1);
  });

  it("salvar duas vezes o mesmo texto não cria duas linhas: a chave é única", async () => {
    const cookies = await sessaoAdmin();
    await editar(cookies, { key: CHAVE, value: "Primeira." });
    await editar(cookies, { key: CHAVE, value: EDITADO });

    expect(await prisma.siteText.count({ where: { key: CHAVE } })).toBe(1);
    expect((await request(servidor).get("/")).text).toContain(EDITADO);
  });

  it("valor vazio APAGA a sobrescrita e a página volta ao valor de fábrica", async () => {
    const cookies = await sessaoAdmin();
    await editar(cookies, { key: CHAVE, value: EDITADO });

    const limpar = await editar(cookies, { key: CHAVE, value: "   " });
    expect(limpar.status).toBe(200);
    expect(limpar.body.usandoFabrica).toBe(true);
    expect(await prisma.siteText.count()).toBe(0);

    const res = await request(servidor).get("/");
    expect(res.text).toContain(FABRICA_PT);
  });
});

describe("texto do site — o que tem que ser RECUSADO", () => {
  it("sem sessão, não lista e não grava", async () => {
    expect((await request(servidor).get("/api/admin/site-text")).status).toBe(401);
    expect((await editar([], { key: CHAVE, value: EDITADO })).status).toBe(401);
  });

  it("membro autenticado não é admin — 403, e nada é gravado", async () => {
    const cookies = await sessaoMember();
    expect((await request(servidor).get("/api/admin/site-text").set("Cookie", cookies)).status).toBe(403);
    expect((await editar(cookies, { key: CHAVE, value: EDITADO })).status).toBe(403);
    expect(await prisma.siteText.count()).toBe(0);
  });

  it("chave que não existe no dicionário é recusada — a tabela não vira lixeira", async () => {
    const cookies = await sessaoAdmin();
    const res = await editar(cookies, { key: "home.inventada.pelo.atacante", value: "x" });

    expect(res.status).toBe(400);
    expect(await prisma.siteText.count()).toBe(0);
  });

});

describe("texto do site — a lista que a tela de admin consome", () => {
  it("traz TODO campo do dicionário, com fábrica e sobrescrita separadas", async () => {
    const cookies = await sessaoAdmin();
    await editar(cookies, { key: CHAVE, value: EDITADO });

    const res = await request(servidor).get("/api/admin/site-text").set("Cookie", cookies);
    expect(res.status).toBe(200);

    const campo = res.body.campos.find((c: { key: string }) => c.key === CHAVE);
    expect(campo.section).toBe("home.hero");
    expect(campo.pt).toEqual({ factory: FABRICA_PT, override: EDITADO });
    // Um idioma só: o inglês saiu da lista (12/10/2026).
    expect(campo.en).toBeUndefined();

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
    const res = await request(servidor).get("/api/site-text/common");

    expect(res.status).toBe(200);
    expect(res.body.footer.links[5]).toBe(FABRICA_CONTATO);
    expect(res.body.footer.copyright).toBe(pt.common.footer.copyright);
  });

  it("depois de o operador editar, devolve o texto EDITADO", async () => {
    const cookies = await sessaoAdmin();
    await editar(cookies, { key: CHAVE_CONTATO, value: "Fale comigo" });

    const res = await request(servidor).get("/api/site-text/common");
    expect(res.body.footer.links[5]).toBe("Fale comigo");
  });

  // O endereço antigo, com o idioma no fim, saiu no passo 4 da etapa 4.6c.
  it("o endereço antigo, com o idioma no fim, não existe mais", async () => {
    // Fora de produção, endereço que o servidor não conhece é mandado para o app (302);
    // em produção, cai no app compilado. Em nenhum dos dois sai o texto.
    const res = await request(servidor).get("/api/site-text/common/pt");
    expect(res.status).not.toBe(200);
    expect(res.body.footer).toBeUndefined();
  });

  it("só os textos comuns: os de cada página (home.*) não saem por aqui", async () => {
    const res = await request(servidor).get("/api/site-text/common");

    expect(res.body.footer).toBeDefined();
    expect(res.body.hero).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(pt.home.hero.subtitle);
  });

});

// O texto do APP (`app.*`) muda por código, não pelo admin (decisão do
// operador, 23/09/2026). Esconder da tela não basta: o servidor também recusa.
describe("texto do site — o texto do app fica FORA de Textos", () => {
  it("a lista de Textos não traz nenhuma chave do app", async () => {
    const cookies = await sessaoAdmin();
    const res = await request(servidor).get("/api/admin/site-text").set("Cookie", cookies);

    expect(res.status).toBe(200);
    const doApp = res.body.campos.filter((c: { key: string }) => c.key.startsWith("app."));
    expect(doApp).toEqual([]);
    // E o resto continua lá: o filtro não pode esvaziar a tela.
    expect(res.body.campos.some((c: { key: string }) => c.key === CHAVE)).toBe(true);
  });

  it("gravar uma chave do app é recusado, mesmo pelo admin", async () => {
    const cookies = await sessaoAdmin();
    const res = await editar(cookies, { key: "app.login.entrar", value: "Entre aqui" });

    expect(res.status).toBe(400);
    expect(await prisma.siteText.count()).toBe(0);
  });
});

// Os textos das 3 camadas ficam editáveis em Textos (decisão do operador,
// 24/09/2026): moram em `common.camadas`, e o app os lê pela rota dos comuns.
describe("texto do site — as 3 camadas são editáveis", () => {
  const CHAVE_CAMADA = "common.camadas.UNIVERSAL.nome";

  it("aparecem na lista de Textos", async () => {
    const cookies = await sessaoAdmin();
    const res = await request(servidor).get("/api/admin/site-text").set("Cookie", cookies);

    const campo = res.body.campos.find((c: { key: string }) => c.key === CHAVE_CAMADA);
    expect(campo.section).toBe("common.camadas");
    expect(campo.pt.factory).toBe(pt.common.camadas.UNIVERSAL.nome);
  });

  it("a edição chega ao app pela rota dos textos comuns", async () => {
    const cookies = await sessaoAdmin();
    await editar(cookies, { key: CHAVE_CAMADA, value: "Base que não quebra" });

    const res = await request(servidor).get("/api/site-text/common");
    expect(res.body.camadas.UNIVERSAL.nome).toBe("Base que não quebra");
  });
});
