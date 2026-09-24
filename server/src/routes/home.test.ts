import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

// Testa o app REAL (nada de dublê de Prisma): o que importa aqui é que a rota
// esteja registrada, que o HTML venha inteiro na primeira resposta e que as
// duas versões de idioma se apontem uma para a outra.
describe("Home pública (SSR)", () => {
  it("GET / responde HTML em português, completo na primeira resposta", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toContain('<html lang="pt-BR"');
    expect(res.text).toContain("Torne-se um");
    // o conteúdo está no HTML cru, não num bundle de JS
    expect(res.text).toContain("Agentic AI na Prática");
    expect(res.text).not.toContain('<div id="root"></div>');
  });

  it("GET /en responde HTML em inglês", async () => {
    const res = await request(app).get("/en");

    expect(res.status).toBe(200);
    expect(res.text).toContain('<html lang="en"');
  });

  it("sem sessão, o botão leva ao login — nos dois idiomas", async () => {
    // Nasceu com href="#" e ficou assim até o operador clicar. Link morto não
    // quebra teste, typecheck nem build — só decepciona quem clica.
    for (const rota of ["/", "/en"]) {
      const res = await request(app).get(rota);
      expect(res.text, rota).toContain('<a href="/login" class="btn-login">');
      expect(res.text, rota).not.toContain('href="/inicio"');
    }
  });

  it("COM sessão, o botão vira Meus estudos e leva ao app", async () => {
    // O visitante logado não deve ser convidado a "Entrar" de novo. É a ÚNICA
    // coisa que a sessão muda na vitrine — o resto é igual para todo mundo,
    // inclusive para o robô do Google, que nunca tem cookie.
    const login = await request(app).post("/api/auth/sign-in/email").send({
      email: process.env.SEED_MEMBER_EMAIL,
      password: process.env.SEED_MEMBER_PASSWORD,
    });
    const cookies = (login.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
    expect(cookies.length).toBeGreaterThan(0);

    const res = await request(app).get("/").set("Cookie", cookies);

    expect(res.text).toContain('<a href="/inicio" class="btn-login">');
    expect(res.text).toContain("Meus estudos");
    expect(res.text).not.toContain('href="/login"');
  });

  it("não sobra NENHUM link morto na vitrine", async () => {
    // `href="#"` não quebra build, teste nem typecheck — só decepciona quem
    // clica, e foi assim que o "Entrar" passou semanas sem levar a lugar nenhum.
    // Os destinos apontam para a página final mesmo onde ela ainda não existe
    // (decisão do operador): link no lugar certo desde o começo.
    for (const rota of ["/", "/en"]) {
      const res = await request(app).get(rota);
      expect(res.text, rota).not.toContain('href="#"');
    }
  });

  it("cada idioma aponta para os endereços DELE", async () => {
    const pt = await request(app).get("/");
    const en = await request(app).get("/en");

    expect(pt.text).toContain('href="/cursos"');
    expect(pt.text).toContain('href="/quem-somos"');
    expect(pt.text).not.toContain('href="/en/about"');

    expect(en.text).toContain('href="/en/courses"');
    expect(en.text).toContain('href="/en/about"');
    // Um endereço por idioma: a página em inglês não empurra ninguém para o
    // catálogo em português (CLAUDE.md → Idiomas).
    expect(en.text).not.toContain('href="/cursos"');
  });

  // Um canal por idioma (decisão do operador, 24/09/2026): o visitante em
  // inglês não cai no canal em português.
  it("o YouTube leva ao canal do idioma da página", async () => {
    const pt = await request(app).get("/");
    const en = await request(app).get("/en");

    expect(pt.text).toContain('href="https://www.youtube.com/@JilsonSantanaBI/"');
    expect(pt.text).not.toContain("@jilsonen");
    expect(en.text).toContain('href="https://www.youtube.com/@jilsonen"');
    expect(en.text).not.toContain("@JilsonSantanaBI");
  });

  it("as duas versões declaram o favicon", async () => {
    // O template do servidor não herda nada do index.html do React: o que não
    // estiver escrito aqui simplesmente não existe na página pública.
    for (const rota of ["/", "/en"]) {
      const res = await request(app).get(rota);
      expect(res.text, rota).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg">');
    }
  });

  it("a imagem de cada curso se chama como o slug do curso", async () => {
    // Convenção do operador (docs/idiomas.md): o arquivo leva o nome do curso, e
    // é isso que faz a versão em inglês ter arquivo próprio sem convenção extra.
    // Vale a pena testar porque o erro é INVISÍVEL: a página renderiza a imagem
    // de outro curso e parece certa. Já aconteceu uma vez, em 22/09.
    const res = await request(app).get("/");

    const slugs = [...res.text.matchAll(/href="\/curso\/([^"]+)"/g)].map((m) => m[1]);
    const imagens = [...res.text.matchAll(/src="\/img\/([^"]+)\.jpg"/g)].map((m) => m[1]);

    expect(slugs.length).toBeGreaterThan(0);
    expect(new Set(imagens)).toEqual(new Set(slugs));
  });

  it("o seletor PT | EN leva ao endereço do outro idioma e marca o atual", async () => {
    const pt = await request(app).get("/");
    const en = await request(app).get("/en");

    // Um endereço por idioma: o seletor é dois links, nunca um botão que troca
    // o idioma no mesmo endereço (CLAUDE.md → Idiomas).
    // O idioma atual é marcado por `aria-current` (leitor de tela) + a classe
    // do traço (visual). O outro fica na cor NORMAL, não apagada: cinza lia
    // como "indisponível" justamente no link para onde a pessoa quer ir
    // (decisão do operador, set/2026).
    expect(pt.text).toContain('<a href="/" aria-current="page" class="lang-atual">PT</a>');
    expect(pt.text).toContain('<a href="/en">EN</a>');
    expect(en.text).toContain('<a href="/en" aria-current="page" class="lang-atual">EN</a>');
    expect(en.text).toContain('<a href="/">PT</a>');
    // Nenhum dos dois pode voltar a ser apagado.
    expect(pt.text + en.text).not.toContain('style="color: var(--text-muted);">EN');
  });

  it("as duas versões declaram canonical e hreflang recíprocos", async () => {
    const pt = await request(app).get("/");
    const en = await request(app).get("/en");

    expect(pt.text).toMatch(/<link rel="canonical" href="[^"]+">/);
    expect(pt.text).toContain('hreflang="en"');
    expect(en.text).toContain('hreflang="pt-BR"');
  });

  it("sem curso em inglês, a home /en não quebra e não mostra card de curso", async () => {
    const res = await request(app).get("/en");

    expect(res.status).toBe(200);
    expect(res.text).not.toContain("Agentic AI na Prática");
  });
});

// Um trecho por seção, tirado do dicionário em português. Se algum deles voltar
// a ser literal no template, ele aparece na página /en — que é justamente o
// defeito que este teste existe para pegar. Inclui um rótulo de acessibilidade,
// que o olho não vê mas o leitor de tela lê.
const TRECHOS_PT = [
  "Navegação Principal",
  "A IA está redefinindo o mundo",
  "Atualize-se continuamente",
  "Um certificado por trilha",
  "conhece o curso que você está fazendo",
  "Vou te guiar para que você",
  "muito acima de qualquer expectativa",
  "Sem fidelidade e sem multa",
  "profissionais de negócios",
  "Todos os direitos reservados",
];

describe("Home — nenhum texto fica cravado no template", () => {
  it("a home em português mostra todos os trechos (o dicionário está ligado)", async () => {
    const res = await request(app).get("/");

    for (const trecho of TRECHOS_PT) {
      expect(res.text, `faltou em /: ${trecho}`).toContain(trecho);
    }
  });

  it("a home em inglês NÃO vaza nenhum deles", async () => {
    const res = await request(app).get("/en");

    for (const trecho of TRECHOS_PT) {
      expect(res.text, `vazou em /en: ${trecho}`).not.toContain(trecho);
    }
  });
});
