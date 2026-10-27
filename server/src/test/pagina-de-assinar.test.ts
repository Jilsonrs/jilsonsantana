import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import request from "supertest";

// As etiquetas do app: o teste não depende do Vite nem do app montado. Só a LEITURA vira dublê; a
// regra que escolhe as etiquetas (`etiquetasDoApp`) tem o teste dela.
const ETIQUETAS = '<script type="module" crossorigin src="/assets/index-da-suite.js"></script>';
vi.mock("../lib/etiquetas-do-app.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/etiquetas-do-app.js")>()),
  etiquetasDaPagina: async () => ETIQUETAS,
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { invalidarCacheDeTexto } from "../lib/dict.js";
import { CABECALHO_DO_VITE } from "../routes/assinar.js";

// A TELA PÚBLICA DE ASSINAR, a página do servidor (etapa 4.7, passo 6c). O que estes testes protegem:
//   - o visitante recebe o menu e o rodapé do site (decisão do operador, 12/10/2026), o título e a
//     frase, e o app montado no meio — e a página nunca fica guardada (os arquivos do app mudam);
//   - o menu leva às seções da HOME (`/#cursos`…), o mesmo destino do menu dela;
//   - todo texto vem do dicionário, com as edições do admin, e passa por `escapeHtml`;
//   - quem está LOGADO vai para a tela de assinar do app;
//   - com a venda sem login DESLIGADA (produção, até o passo 8), o visitante vai para a tela de
//     entrar, como antes de a página existir;
//   - em dev, aberta direto no Express (sem o proxy do Vite), vai para o Vite.

const pelaVite = () => request(servidor).get("/assinar").set(CABECALHO_DO_VITE, "1");
const AMBIENTE = ["NODE_ENV", "ASSINAR_SEM_LOGIN"] as const;
const antes = Object.fromEntries(AMBIENTE.map((nome) => [nome, process.env[nome]]));
let member: string[] = [];

beforeAll(async () => {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email: process.env.SEED_MEMBER_EMAIL, password: process.env.SEED_MEMBER_PASSWORD });
  member = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(member.length).toBeGreaterThan(0);
});

afterEach(() => {
  for (const nome of AMBIENTE) {
    if (antes[nome] === undefined) delete process.env[nome];
    else process.env[nome] = antes[nome];
  }
});

describe("GET /assinar — a tela pública de assinar", () => {
  it("o visitante: o menu e o rodapé do site, o título, a frase e o app no meio — e a página não fica guardada", async () => {
    const res = await pelaVite();
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-cache");
    expect(res.text).toContain('<nav class="navbar"');
    expect(res.text).toContain('<footer class="site-footer">');
    expect(res.text).toContain('<body data-pagina-do-servidor="assinar">');
    expect(res.text).toContain('<div id="root"></div>');
    expect(res.text).toContain(ETIQUETAS);
    expect(res.text).toContain("<title>Assinar | Jilson Santana</title>");
    expect(res.text).toContain("<h1>Assinar</h1>");
    expect(res.text).toContain("<p>Uma assinatura, todos os cursos e trilhas.</p>");
    expect(res.text).toMatch(/<link rel="canonical" href="[^"]*\/assinar">/);
    // O visitante vê "Entrar", e o menu leva às seções da home — o mesmo destino do menu dela.
    expect(res.text).toContain('<a href="/login" class="btn-login">Entrar</a>');
    for (const secao of ["cursos", "trilhas", "assine"]) expect(res.text).toContain(`href="/#${secao}"`);
  });

  it("o CSS do site vem DEPOIS do app: nas regras que os dois têm (o corpo da página, os títulos), vale o do site", async () => {
    const res = await pelaVite();
    expect(res.text.indexOf(ETIQUETAS)).toBeLessThan(res.text.indexOf('<link rel="stylesheet" href="/css/public.css">'));
  });

  it("os textos do menu e do rodapé são os do dicionário, com as edições do admin — e escapados", async () => {
    await prisma.siteText.createMany({
      data: [
        { key: "common.nav.cursos", value: "Cursos <script>x</script>" },
        { key: "common.footer.tagline", value: "Marca do rodapé & cia" },
      ],
    });
    invalidarCacheDeTexto();
    try {
      const res = await pelaVite();
      expect(res.text).toContain("Cursos &lt;script&gt;x&lt;/script&gt;");
      expect(res.text).not.toContain("<script>x</script>");
      expect(res.text).toContain("Marca do rodapé &amp; cia");
    } finally {
      // A suíte compartilha UM banco: sobrescrita esquecida aqui quebra os outros testes.
      await prisma.siteText.deleteMany({});
      invalidarCacheDeTexto();
    }
  });

  it("quem está logado vai para a tela de assinar do app", async () => {
    const res = await pelaVite().set("Cookie", member);
    expect([res.status, res.headers.location]).toEqual([302, "/aluno/assinar"]);
  });

  it("em produção, com a venda sem login desligada: vai para a tela de entrar, como antes", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ASSINAR_SEM_LOGIN;
    const res = await request(servidor).get("/assinar");
    expect([res.status, res.headers.location]).toEqual([302, "/login"]);
  });

  it("em produção, com a venda ligada: a página — sem passar pelo Vite", async () => {
    process.env.NODE_ENV = "production";
    process.env.ASSINAR_SEM_LOGIN = "true";
    const res = await request(servidor).get("/assinar");
    expect(res.status).toBe(200);
    expect(res.text).toContain('<div id="root"></div>');
  });

  // A TELA DE DEPOIS DO PAGAMENTO de quem assinou sem conta (passo 6e2): a mesma página, com o app.
  describe("GET /assinar/concluido", () => {
    const concluido = () => request(servidor).get("/assinar/concluido").set(CABECALHO_DO_VITE, "1");

    it("o visitante: o menu, o rodapé e o app — fora do Google, e sem o título de assinar (quem diz o que acontece é o app)", async () => {
      const res = await concluido();
      expect(res.status).toBe(200);
      expect(res.headers["cache-control"]).toBe("no-cache");
      expect(res.text).toContain('<body data-pagina-do-servidor="concluido">');
      expect(res.text).toContain('<meta name="robots" content="noindex">');
      expect(res.text).not.toContain('rel="canonical"');
      expect(res.text).not.toContain("<h1>");
      expect(res.text).toContain('<div id="root"></div>');
      expect(res.text).toContain('<nav class="navbar"');
      expect(res.text).toContain('<footer class="site-footer">');
    });

    it("quem está logado vai para a de depois do pagamento do app", async () => {
      const res = await concluido().set("Cookie", member);
      expect([res.status, res.headers.location]).toEqual([302, "/aluno/assinar/concluido"]);
    });

    it("em produção, com a venda sem login desligada: a tela de entrar", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.ASSINAR_SEM_LOGIN;
      const res = await request(servidor).get("/assinar/concluido");
      expect([res.status, res.headers.location]).toEqual([302, "/login"]);
    });
  });

  it("em dev, aberta direto no Express (sem o proxy do Vite): vai para o Vite, com o endereço inteiro", async () => {
    const res = await request(servidor).get("/assinar?utm_source=youtube");
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/^http:\/\/localhost:5173\/assinar\?utm_source=youtube$/);
  });
});
