// Gera design-lab/revisao-ingles.md — a tabela PT × EN que o parceiro de design
// revisa. Rode com `npm run revisao:ingles` sempre que TEXTO NOVO entrar no
// dicionário. O ciclo completo está em docs/idiomas.md → "Como o inglês é escrito".
//
// O arquivo gerado NÃO é versionado (design-lab/* está no .gitignore): ele é
// artefato de uma rodada de revisão, e o que fica no repo é o dicionário revisado.
import { writeFileSync, mkdirSync } from "node:fs";
import { pt } from "../core/dist/i18n/pt.js";
import { en } from "../core/dist/i18n/en.js";

const NOMES = {
  a11y: "Acessibilidade (só leitor de tela ouve)",
  nav: "Menu do topo",
  hero: "Hero",
  catalog: "Catálogo de cursos",
  target: "Para quem é",
  trilhas: "Trilhas",
  ai: "JilsonAI",
  author: "Autor",
  testimonials: "Depoimentos",
  pricing: "Preço",
  faq: "FAQ",
  cta: "Chamada final",
  footer: "Rodapé",
};

/** Achata { a: { b: [ { c: "x" } ] } } em [["a.b[0].c", "x"]]. */
function achatar(valor, prefixo = "") {
  if (Array.isArray(valor)) return valor.flatMap((v, i) => achatar(v, `${prefixo}[${i}]`));
  if (valor && typeof valor === "object")
    return Object.entries(valor).flatMap(([k, v]) => achatar(v, prefixo ? `${prefixo}.${k}` : k));
  return [[prefixo, String(valor)]];
}

const ingles = new Map(achatar(en));
const porSecao = new Map();
for (const [chave, valor] of achatar(pt)) {
  const secao = chave.split(/[.[]/)[0];
  if (!porSecao.has(secao)) porSecao.set(secao, []);
  porSecao.get(secao).push([chave, valor, ingles.get(chave) ?? ""]);
}

const esc = (s) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const total = achatar(pt).length;

const cabecalho = `# Revisão do inglês — para o Antigravity

> **Arquivo GERADO.** Não edite aqui: rode \`npm run revisao:ingles\` para refazer a partir do
> dicionário. Ele não é versionado — é artefato de uma rodada de revisão.

**O que é:** as ${total} frases do site, em português e inglês, lado a lado. **Revise o INGLÊS**,
não o português.

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
console.log(`design-lab/revisao-ingles.md — ${total} chaves em ${porSecao.size} seções`);
