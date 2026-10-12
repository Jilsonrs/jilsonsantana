import { describe, it, expect } from "vitest";
import request from "supertest";
import { flattenDict, pt as fabrica } from "@jilson/core";
import servidor from "../test/servidor.js";
import { prisma } from "../lib/prisma.js";
import { invalidarCacheDeTexto } from "../lib/dict.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";

// Testa o app REAL (nada de dublê de Prisma): o que importa aqui é que a rota
// esteja registrada e que o HTML venha inteiro na primeira resposta.
//
// A ESCOLA É SÓ EM PORTUGUÊS (decisão do operador, 12/10/2026 — etapa 4.6c do
// plano): a página `/en`, o seletor PT | EN e o `hreflang` saíram.
describe("Home pública (SSR)", () => {
  it("GET / responde HTML em português, completo na primeira resposta", async () => {
    const res = await request(servidor).get("/");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toContain('<html lang="pt-BR"');
    expect(res.text).toContain("Torne-se um");
    // o conteúdo está no HTML cru, não num bundle de JS
    expect(res.text).toContain("Agentic AI na Prática");
    expect(res.text).not.toContain('<div id="root"></div>');
  });

  it("a página em inglês NÃO existe mais: /en não é a home", async () => {
    // Fora de produção, endereço que o servidor não conhece vai para o app (Vite); em
    // produção, para o app compilado — que leva ao Início. Em nenhum dos dois é a home.
    const res = await request(servidor).get("/en");

    expect(res.status).toBe(302);
    expect(res.text).not.toContain("<html");
  });

  it("não sobra nada do segundo idioma na página", async () => {
    const res = await request(servidor).get("/");

    // O seletor PT | EN (topo e rodapé), o endereço em inglês e as marcas para o buscador.
    expect(res.text).not.toContain('class="lang-atual"');
    expect(res.text).not.toContain(">EN</a>");
    expect(res.text).not.toContain('href="/en');
    expect(res.text).not.toContain("hreflang");
    expect(res.text).not.toContain("lang=en");
    expect(res.text).toContain('<meta property="og:locale" content="pt_BR">');
    expect(res.text).toMatch(/<link rel="canonical" href="[^"]+">/);
  });

  it("sem sessão, o botão leva ao login", async () => {
    // Nasceu com href="#" e ficou assim até o operador clicar. Link morto não
    // quebra teste, typecheck nem build — só decepciona quem clica.
    const res = await request(servidor).get("/");
    expect(res.text).toContain('<a href="/login" class="btn-login">');
    expect(res.text).not.toContain('href="/inicio"');
  });

  it("COM sessão, o botão vira Meus estudos e leva ao app", async () => {
    // O visitante logado não deve ser convidado a "Entrar" de novo. A sessão muda
    // DUAS coisas na vitrine — esta e os botões Assinar (teste abaixo); o resto é
    // igual para todo mundo, inclusive para o robô do Google, que nunca tem cookie.
    const login = await request(servidor).post("/api/auth/sign-in/email").send({
      email: process.env.SEED_MEMBER_EMAIL,
      password: process.env.SEED_MEMBER_PASSWORD,
    });
    const cookies = (login.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
    expect(cookies.length).toBeGreaterThan(0);

    const res = await request(servidor).get("/").set("Cookie", cookies);

    expect(res.text).toContain('<a href="/inicio" class="btn-login">');
    expect(res.text).toContain("Meus estudos");
    expect(res.text).not.toContain('href="/login"');
  });

  // OS BOTÕES ASSINAR (Fase 4, etapa 4.2 — decisão do operador, 09/10/2026): com login, levam
  // à tela de assinar; sem login continuam como no mock, sem ação (o visitante é a etapa 4.7).
  describe("os botões Assinar", () => {
    const paraATelaDeAssinar = '<form method="get" action="/aluno/assinar" style="display: contents;"><button  class="btn"';
    const entrar = async (): Promise<string[]> => {
      const login = await request(servidor).post("/api/auth/sign-in/email").send({ email: process.env.SEED_MEMBER_EMAIL, password: process.env.SEED_MEMBER_PASSWORD });
      return (login.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
    };

    it("COM sessão: os dois botões Assinar levam à tela de assinar — e são os mesmos botões do mock", async () => {
      const res = await request(servidor).get("/").set("Cookie", await entrar());
      expect(res.text.split(paraATelaDeAssinar).length - 1).toBe(2);
      // A página de quem está logado nunca fica guardada num cache do caminho (revisão de segurança).
      expect(res.headers["cache-control"]).toBe("private, no-cache");
      expect(res.text).toContain(`${paraATelaDeAssinar} style="width: 100%;">Assinar</button></form>`);
      expect(res.text).toContain(`${paraATelaDeAssinar} style="padding: 24px 64px; font-size: 1.35rem;">Assinar</button></form>`);
    });

    it("SEM sessão: nenhum botão leva a lugar nenhum — a vitrine do visitante e do Google não muda", async () => {
      const res = await request(servidor).get("/");
      expect(res.text).not.toContain("/aluno/assinar");
      expect(res.text).toContain('<button  class="btn" style="width: 100%;">Assinar</button>');
      // Para o visitante e o robô do Google, a resposta não ganha cabeçalho nenhum.
      expect(res.headers["cache-control"]).toBeUndefined();
      expect(res.text).toContain('<button  class="btn" style="padding: 24px 64px; font-size: 1.35rem;">Assinar</button>');
    });

    // "REATIVAR ASSINATURA" (etapa 4.4 — decisão do operador, 10/10/2026): quem está logado, já
    // foi assinante e hoje está sem acesso lê "Reativar assinatura"; "Assinar" é só a primeira vez.
    describe("para quem já foi assinante", () => {
      const com = (status: string, currentPeriodEnd: Date) => prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status, currentPeriodEnd } });
      const [PASSADO, FUTURO] = [new Date("2020-01-01T00:00:00Z"), new Date("2100-01-01T00:00:00Z")];
      /** Roda o bloco com a assinatura de teste do member@ nesta situação, e devolve ela ao fim. */
      async function naSituacao(status: string, fim: Date, fn: () => Promise<void>) {
        await com(status, fim);
        try {
          await fn();
        } finally {
          await com("active", FUTURO);
        }
      }

      it("logado, já foi assinante e sem acesso: os DOIS botões dizem Reativar assinatura, e seguem levando à tela de assinar", async () => {
        await naSituacao("canceled", PASSADO, async () => {
          const res = await request(servidor).get("/").set("Cookie", await entrar());
          expect(res.text).toContain(`${paraATelaDeAssinar} style="width: 100%;">Reativar assinatura</button></form>`);
          expect(res.text).toContain(`${paraATelaDeAssinar} style="padding: 24px 64px; font-size: 1.35rem;">Reativar assinatura</button></form>`);
          expect(res.text).not.toContain(">Assinar</button>");
        });
      });

      it("logado e só TENTOU pagar (nunca foi assinante): continua Assinar", async () => {
        await naSituacao("incomplete_expired", PASSADO, async () => {
          const res = await request(servidor).get("/").set("Cookie", await entrar());
          expect(res.text.split(">Assinar</button>").length - 1).toBe(2);
          expect(res.text).not.toContain("Reativar assinatura");
        });
      });

      it("cancelou e ainda tem dias pagos (tem acesso): continua Assinar — não há o que reativar", async () => {
        await naSituacao("canceled", FUTURO, async () => {
          const res = await request(servidor).get("/").set("Cookie", await entrar());
          expect(res.text).not.toContain("Reativar assinatura");
        });
      });

      it("SEM login nunca: o visitante e o Google veem Assinar, mesmo com ex-assinante no banco", async () => {
        await naSituacao("canceled", PASSADO, async () => {
          const res = await request(servidor).get("/");
          expect(res.text).not.toContain("Reativar assinatura");
          expect(res.headers["cache-control"]).toBeUndefined();
        });
      });
    });

  });

  it("não sobra NENHUM link morto na vitrine", async () => {
    // `href="#"` não quebra build, teste nem typecheck — só decepciona quem
    // clica, e foi assim que o "Entrar" passou semanas sem levar a lugar nenhum.
    // Os destinos apontam para a página final mesmo onde ela ainda não existe
    // (decisão do operador): link no lugar certo desde o começo.
    const res = await request(servidor).get("/");
    expect(res.text).not.toContain('href="#"');
  });

  it("os links da vitrine e o canal do YouTube", async () => {
    const res = await request(servidor).get("/");

    expect(res.text).toContain('href="/cursos"');
    expect(res.text).toContain('href="/quem-somos"');
    expect(res.text).toContain('href="https://www.youtube.com/@JilsonSantanaBI/"');
  });

  it("a página declara o favicon", async () => {
    // O template do servidor não herda nada do index.html do React: o que não
    // estiver escrito aqui simplesmente não existe na página pública.
    const res = await request(servidor).get("/");
    expect(res.text).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg">');
  });

  it("a imagem de cada curso se chama como o slug do curso", async () => {
    // Convenção do operador: o arquivo leva o nome do curso.
    // Vale a pena testar porque o erro é INVISÍVEL: a página renderiza a imagem
    // de outro curso e parece certa. Já aconteceu uma vez, em 22/09.
    const res = await request(servidor).get("/");

    const slugs = [...res.text.matchAll(/href="\/curso\/([^"]+)"/g)].map((m) => m[1]);
    const imagens = [...res.text.matchAll(/src="\/img\/([^"]+)\.jpg"/g)].map((m) => m[1]);

    expect(slugs.length).toBeGreaterThan(0);
    expect(new Set(imagens)).toEqual(new Set(slugs));
  });

});

// NENHUM TEXTO FICA CRAVADO NO TEMPLATE (CLAUDE.md → Rendering Boundary).
//
// Antes, a prova era a página em inglês: um texto em português cravado no HTML
// aparecia em `/en`. Sem `/en`, a prova passa a ser o próprio caminho do
// operador: TODO texto editável da home é trocado no banco por uma marca, e a
// página tem que mostrar as marcas e nenhum texto de fábrica. O que estiver
// escrito direto no template continua aparecendo — e reprova aqui.
//
// Um trecho por seção, tirado do dicionário. Inclui um rótulo de acessibilidade,
// que o olho não vê mas o leitor de tela lê.
// (Depoimentos e perguntas não entram: vêm de tabelas, não do dicionário.)
const TRECHOS = [
  "Navegação Principal",
  "A IA está redefinindo o mundo",
  "Atualize-se continuamente",
  "Um certificado por trilha",
  "conhece o curso que você está fazendo",
  "Vou te guiar para que você",
  "Sem fidelidade e sem multa",
  "Todos os direitos reservados",
];

// Os textos que a home usa: `common.*` (menu e rodapé) e `home.*`.
const DA_HOME = flattenDict(fabrica).filter(([chave]) => chave.startsWith("home.") || chave.startsWith("common."));
const marca = (chave: string) => `«${chave}»`;

describe("Home — nenhum texto fica cravado no template", () => {
  it("de fábrica, a home mostra todos os trechos (o dicionário está ligado)", async () => {
    const res = await request(servidor).get("/");

    for (const trecho of TRECHOS) {
      expect(res.text, `faltou em /: ${trecho}`).toContain(trecho);
    }
  });

  it("com TODO texto trocado no banco, não sobra nenhum texto de fábrica na página", async () => {
    await prisma.siteText.createMany({ data: DA_HOME.map(([chave]) => ({ key: chave, value: marca(chave) })) });
    invalidarCacheDeTexto();
    try {
      const res = await request(servidor).get("/");
      expect(res.status).toBe(200);

      // Cada trecho de seção deu lugar à marca da chave dele.
      for (const trecho of TRECHOS) {
        const dono = DA_HOME.find(([, texto]) => texto.includes(trecho));
        expect(dono, `trecho sem chave no dicionário: ${trecho}`).toBeDefined();
        expect(res.text, `vazou na home: ${trecho}`).not.toContain(trecho);
        if (dono) expect(res.text, `a marca não chegou: ${dono[0]}`).toContain(marca(dono[0]));
      }
      // E nenhuma frase do dicionário sobrou escrita no HTML. Só as de 25 letras ou
      // mais: palavra curta ("Cursos", "IA") aparece também no nome de um curso.
      for (const [chave, texto] of DA_HOME) {
        if (texto.length >= 25) expect(res.text, `texto cravado no template (${chave})`).not.toContain(texto);
      }
    } finally {
      // A suíte compartilha UM banco: sobrescrita esquecida aqui quebra os outros testes.
      await prisma.siteText.deleteMany({});
      invalidarCacheDeTexto();
    }
  });
});
