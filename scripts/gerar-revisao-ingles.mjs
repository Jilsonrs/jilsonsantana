// Gera design-lab/revisao-ingles.md — a tabela PT × EN que o parceiro de design
// revisa. Rode com `npm run revisao:ingles` sempre que TEXTO NOVO entrar no
// dicionário. O ciclo completo está em docs/idiomas.md → "Como o inglês é escrito".
//
// O arquivo gerado NÃO é versionado (design-lab/* está no .gitignore): ele é
// artefato de uma rodada de revisão, e o que fica no repo é o dicionário revisado.
//
// Duas opções, para uma rodada que só tem texto NOVO (o resto já foi revisado):
//   --so app,common.camadas   só as seções cujas chaves começam por esses prefixos
//   --duvidas <arquivo.md>    põe no topo a lista de pontos de dúvida da rodada
//                             (passo 3 do ciclo: sem ela o revisor não sabe onde olhar)
// Ex.: npm run revisao:ingles -- --so app,common.camadas --duvidas caminho/duvidas.md
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { pt } from "../core/dist/i18n/pt.js";
import { en } from "../core/dist/i18n/en.js";

// Nome amigável de cada seção. A chave é "onde.seção" — `common.*` aparece em
// toda página pública, `home.*` só na home. Página nova ganha as linhas dela
// aqui; sem nome amigável o script cai na própria chave, que também funciona.
const NOMES = {
  "common.nav": "TODA PÁGINA · Menu do topo",
  "common.a11y": "TODA PÁGINA · Acessibilidade (só leitor de tela ouve)",
  "common.footer": "TODA PÁGINA · Rodapé",
  "home.a11y": "Home · Acessibilidade (só leitor de tela ouve)",
  "home.hero": "Home · Hero",
  "home.catalog": "Home · Catálogo de cursos",
  "home.target": "Home · Para quem é",
  "home.trilhas": "Home · Trilhas",
  "home.ai": "Home · JilsonAI",
  "home.author": "Home · Autor",
  "home.testimonials": "Home · Depoimentos",
  "home.pricing": "Home · Preço",
  "home.faq": "Home · FAQ",
  "home.cta": "Home · Chamada final",
  "common.camadas": "TODA PÁGINA · As 3 camadas (selo do curso)",
  "app.header": "APP · Cabeçalho da tela de login",
  "app.nav": "APP · Menu (barra lateral, coluna, celular)",
  "app.login": "APP · Tela de login",
  "app.footer": "APP · Rodapé",
  "app.comum": "APP · Comum",
  "app.inicio": "APP · Início do aluno",
  "app.conta": "APP · Minha conta",
  "app.minhasTrilhas": "APP · Minhas trilhas",
  "app.catalogo": "APP · Catálogo de cursos e trilhas",
  "app.busca": "APP · Busca",
  "app.niveis": "APP · Nível do curso",
  "app.curso": "APP · Página do curso",
  "app.trilha": "APP · Página da trilha",
};

function argumento(nome) {
  const i = process.argv.indexOf(nome);
  return i === -1 ? undefined : process.argv[i + 1];
}
const prefixos = argumento("--so")?.split(",").map((p) => p.trim()).filter(Boolean);
const arquivoDuvidas = argumento("--duvidas");
const entra = (chave) => !prefixos || prefixos.some((p) => chave === p || chave.startsWith(`${p}.`) || chave.startsWith(`${p}[`));

/** Achata { a: { b: [ { c: "x" } ] } } em [["a.b[0].c", "x"]]. */
function achatar(valor, prefixo = "") {
  if (Array.isArray(valor)) return valor.flatMap((v, i) => achatar(v, `${prefixo}[${i}]`));
  if (valor && typeof valor === "object")
    return Object.entries(valor).flatMap(([k, v]) => achatar(v, prefixo ? `${prefixo}.${k}` : k));
  return [[prefixo, String(valor)]];
}

const ingles = new Map(achatar(en));
const porSecao = new Map();
for (const [chave, valor] of achatar(pt).filter(([c]) => entra(c))) {
  // Agrupa por "onde.seção" (home.faq, common.nav) — a primeira parte sozinha
  // jogaria a home inteira num balde só.
  const secao = chave.split(/[.[]/).slice(0, 2).join(".");
  if (!porSecao.has(secao)) porSecao.set(secao, []);
  porSecao.get(secao).push([chave, valor, ingles.get(chave) ?? ""]);
}

const esc = (s) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const total = achatar(pt).filter(([c]) => entra(c)).length;
const recorte = prefixos
  ? `\n> **Esta rodada revisa SÓ o texto novo:** ${prefixos.map((p) => `\`${p}\``).join(", ")}. O resto do\n> site já foi revisado e não está aqui.\n`
  : "";
const duvidas = arquivoDuvidas ? `\n---\n\n${readFileSync(arquivoDuvidas, "utf-8").trim()}\n` : "";

const cabecalho = `# Revisão do inglês — para o Antigravity

> **Arquivo GERADO.** Não edite aqui: rode \`npm run revisao:ingles\` para refazer a partir do
> dicionário. Ele não é versionado — é artefato de uma rodada de revisão.

**O que é:** ${total} frases do site, em português e inglês, lado a lado. **Revise o INGLÊS**,
não o português.
${recorte}

**Como responder:** devolva **só as linhas que você mudaria**, no formato
\`chave → sugestão → por quê (uma linha)\`. Não devolva o arquivo inteiro e não edite código.

---

## O inglês que eu quero

A voz é a do **LinkedIn Learning**, não a de uma agência:

- **Simples e direto.** Frase curta, voz ativa, segunda pessoa ("you"). Se dá para cortar palavra
  sem perder sentido, corte.
- **Para o mundo entender**, não só os Estados Unidos. Sem gíria, sem expressão idiomática, sem
  referência cultural. **Ortografia americana** (\`standardizing\`).
- **Sem hype.** Nada de *unlock your potential*, *game-changing*, *master X in 30 days*. A escola
  promete o que o aprendizado entrega; nunca emprego, salário ou sucesso.
- **Concreto no lugar de vago:** "skills you can prove" ganha de "amazing skills".
- **Expressão idiomática do português não se traduz, se substitui.**

**Nunca se traduz:** \`JilsonAI\`, \`Jilson Santana\`, nomes de produto (\`Power BI\`, \`Excel\`,
\`Claude\`, \`Pix\`, \`LinkedIn\`) e **nome de pessoa em depoimento**.

**Igual nos dois idiomas de propósito:** nome das pessoas dos depoimentos e valores em dinheiro.
Um teste automático reprova qualquer OUTRA frase copiada do português — se uma linha está
idêntica, é intencional.

**Cuidado com conceito brasileiro.** "Nota fiscal" e o direito de arrependimento do CDC não
existem iguais lá fora: traduzir ao pé da letra vira promessa que não se pode cumprir. Quando
encontrar um, **aponte** em vez de traduzir.

${duvidas}
---

## As frases, seção por seção
`;

let corpo = "";
for (const [secao, linhas] of porSecao) {
  corpo += `\n### ${NOMES[secao] ?? secao}  \`${secao}\`\n\n`;
  corpo += "| chave | português | inglês |\n|---|---|---|\n";
  for (const [chave, p, e] of linhas) {
    corpo += `| \`${chave}\` | ${esc(p) || "*(vazio)*"} | ${esc(e) || "*(vazio)*"} |\n`;
  }
}

mkdirSync(new URL("../design-lab/", import.meta.url), { recursive: true });
writeFileSync(new URL("../design-lab/revisao-ingles.md", import.meta.url), cabecalho + corpo);
console.log(`design-lab/revisao-ingles.md — ${total} chaves em ${porSecao.size} seções${prefixos ? ` (só ${prefixos.join(", ")})` : ""}`);
