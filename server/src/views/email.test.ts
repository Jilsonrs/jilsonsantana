import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DICT_KEYS, pt } from "@jilson/core";
import { LOGO_DO_EMAIL, montarEmail } from "./email.js";

// O MODELO DE E-MAIL (etapa 4.7, passo 3): função pura, por isso teste unitário (CLAUDE.md →
// Testing). O que ele precisa garantir: o texto de quem chama nunca vira HTML, o botão nunca
// vira um link que executa código, e nenhum texto fica escrito no modelo. O desenho (cores,
// fontes, espaços) é do operador e se confere olhando o e-mail de prova, não aqui.

const MARCAS = { topo: "MARCA-DO-TOPO", rodape: "MARCA-DO-RODAPE" };
const CRIAR_SENHA = "https://www.jilsonsantana.com/criar-senha?token=abc&conta=1";

describe("montarEmail", () => {
  it("o nome no lugar do logo e o rodapé vêm do dicionário — nenhum texto fica escrito no modelo", () => {
    const { html, texto } = montarEmail({ assunto: "A", paragrafos: ["B"] }, MARCAS);

    expect(html).toContain('alt="MARCA-DO-TOPO"');
    // Fora os endereços (o do logo e o das fontes), nada no e-mail fala o nome da escola por conta própria.
    const semEnderecos = html.replace(/(?:src|href)="[^"]*"/g, "");
    for (const versao of [semEnderecos, texto]) {
      expect(versao).toContain("MARCA-DO-TOPO");
      expect(versao).toContain("MARCA-DO-RODAPE");
      expect(versao).not.toMatch(/jilson/i);
    }
  });

  it("abre com o logo oficial do site, que existe no site e é o recorte do logo do menu da home", () => {
    const { html } = montarEmail({ assunto: "A", paragrafos: ["B"] }, MARCAS);
    const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

    expect(html).toContain(`<img src="https://www.jilsonsantana.com/img/Logomarca-email.png" width="120" height="37" alt="MARCA-DO-TOPO"`);
    expect(LOGO_DO_EMAIL.endereco.endsWith(LOGO_DO_EMAIL.arquivo.replace("client/public", ""))).toBe(true);
    expect(existsSync(join(raiz, LOGO_DO_EMAIL.arquivo))).toBe(true);
  });

  it("o título, quando há, vem antes dos parágrafos — escapado no HTML e por extenso no texto", () => {
    const { html, texto } = montarEmail({ assunto: "A", titulo: "Crie <sua> senha", paragrafos: ["Um."] }, MARCAS);

    expect(html).toMatch(/<h1 [^>]*>Crie &lt;sua&gt; senha<\/h1>[\s\S]*<p [^>]*>Um\.<\/p>/);
    expect(texto).toBe("MARCA-DO-TOPO\n\nCrie <sua> senha\n\nUm.\n\n—\n\nMARCA-DO-RODAPE\n");
    expect(montarEmail({ assunto: "A", paragrafos: ["Um."] }, MARCAS).html).not.toContain("<h1");
  });

  it("o texto de quem chama é escapado no HTML (o nome do aluno chega a um e-mail)", () => {
    const { html, texto } = montarEmail(
      {
        assunto: "Olá <b>Ana</b>",
        paragrafos: ['<script>alert(1)</script> "R$ 99 < 199"'],
        botao: { texto: "<img src=x onerror=alert(1)>", endereco: CRIAR_SENHA },
      },
      MARCAS,
    );

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt; &quot;R$ 99 &lt; 199&quot;");
    // A versão de texto puro não é HTML: o texto vai como foi escrito.
    expect(texto).toContain('<script>alert(1)</script> "R$ 99 < 199"');
  });

  it("o botão só aceita endereço http(s) — um javascript: num e-mail seria um link que executa código", () => {
    for (const endereco of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", " https://x.com", "https://x.com/\\outro", "/criar-senha"]) {
      expect(() => montarEmail({ assunto: "A", paragrafos: [], botao: { texto: "Ir", endereco } }, MARCAS)).toThrow("[email]");
    }
  });

  it("o endereço do botão sai escapado no HTML e por extenso na versão de texto", () => {
    const { html, texto } = montarEmail({ assunto: "A", paragrafos: ["Um.", "Dois."], botao: { texto: "Criar senha", endereco: CRIAR_SENHA } }, MARCAS);

    expect(html).toContain('href="https://www.jilsonsantana.com/criar-senha?token=abc&amp;conta=1"');
    expect(texto).toBe(`MARCA-DO-TOPO\n\nUm.\n\nDois.\n\nCriar senha: ${CRIAR_SENHA}\n\n—\n\nMARCA-DO-RODAPE\n`);
  });

  // A outra saída, depois do botão (4.9b, E14 — o Pix na cobrança atrasada): escapada no HTML e por extenso no texto,
  // as duas DEPOIS do botão.
  it("os parágrafos depois do botão vêm depois dele — escapados no HTML e por extenso no texto", () => {
    const { html, texto } = montarEmail({ assunto: "A", paragrafos: ["ANTES"], botao: { texto: "BOTAO", endereco: CRIAR_SENHA }, depoisDoBotao: ['Depois <b>"Pix"</b>'] }, MARCAS);
    expect(html).toContain("Depois &lt;b&gt;&quot;Pix&quot;&lt;/b&gt;");
    expect(html).not.toContain("<b>");
    expect(html.indexOf(">BOTAO<")).toBeLessThan(html.indexOf("Depois &lt;b&gt;"));
    expect(texto.indexOf(`BOTAO: ${CRIAR_SENHA}`)).toBeLessThan(texto.indexOf('Depois <b>"Pix"</b>'));
    expect(texto.indexOf('Depois <b>"Pix"</b>')).toBeLessThan(texto.indexOf("MARCA-DO-RODAPE"));
  });

  // O LINK DE TEXTO depois do botão (etapa 4.7, passo 9 — o "Quero receber novidades" e o "Descadastrar" do lembrete):
  // escapado no HTML, por extenso no texto, e só http(s) — como o botão.
  it("o link de texto depois do botão: escapado no HTML, por extenso no texto, na ordem — e só http(s)", () => {
    const endereco = "https://www.jilsonsantana.com/novidades/abc?x=1&y=2";
    const { html, texto } = montarEmail({ assunto: "A", paragrafos: ["ANTES"], botao: { texto: "BOTAO", endereco: CRIAR_SENHA }, depoisDoBotao: ["Quer?", { link: 'Quero <b>"sim"</b>', endereco }, "Fim."] }, MARCAS);
    expect(html).toContain(`href="https://www.jilsonsantana.com/novidades/abc?x=1&amp;y=2"`);
    expect(html).toContain("Quero &lt;b&gt;&quot;sim&quot;&lt;/b&gt;</a>");
    expect(html).not.toContain("<b>");
    expect(html.indexOf(">BOTAO<")).toBeLessThan(html.indexOf("Quer?"));
    expect(html.indexOf("Quer?")).toBeLessThan(html.indexOf("Quero &lt;b&gt;"));
    expect(html.indexOf("Quero &lt;b&gt;")).toBeLessThan(html.indexOf("Fim."));
    expect(texto).toContain(`Quer?\n\nQuero <b>"sim"</b>: ${endereco}\n\nFim.`);
    for (const ruim of ["javascript:alert(1)", "data:text/html,oi", "//outro-site.com", "https://x.com/ com espaço"]) {
      expect(() => montarEmail({ assunto: "A", paragrafos: [], depoisDoBotao: [{ link: "L", endereco: ruim }] }, MARCAS), ruim).toThrow();
    }
  });

  it("sem botão, nenhum link no corpo", () => {
    const { html } = montarEmail({ assunto: "A", paragrafos: ["Um."] }, MARCAS);

    expect(html).not.toContain("<a ");
  });

  it("o assunto vira uma linha só: quebra de linha num cabeçalho de e-mail nunca é texto", () => {
    const { assunto, html } = montarEmail({ assunto: "Olá\r\nBcc: outra@example.com\nfim", paragrafos: [] }, MARCAS);

    expect(assunto).toBe("Olá Bcc: outra@example.com fim");
    expect(html).toContain("<title>Olá Bcc: outra@example.com fim</title>");
  });

  it("é um e-mail em português, com o assunto no título", () => {
    const { html, assunto } = montarEmail({ assunto: "Crie sua senha", paragrafos: [] }, MARCAS);

    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain("<title>Crie sua senha</title>");
    expect(assunto).toBe("Crie sua senha");
  });
});

describe("os textos do e-mail no dicionário", () => {
  it("existem e ficam FORA de Admin → Textos (editar e-mail pelo admin não faz parte do passo 3)", () => {
    expect(pt.app.email.topo).not.toBe("");
    expect(pt.app.email.rodape).not.toBe("");
    expect(DICT_KEYS.has("app.email.topo")).toBe(false);
    expect(DICT_KEYS.has("app.email.rodape")).toBe(false);
  });
});
