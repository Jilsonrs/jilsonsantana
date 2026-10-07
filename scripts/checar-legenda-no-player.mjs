// A CHECAGEM DIÁRIA DO SCRIPT DA LEGENDA (decisão do operador, 07/10/2026). Roda no GitHub
// uma vez por dia (.github/workflows/checagem-do-player.yml) e à mão com
// `npm run checar:player`.
//
// Por que existe: a legenda lembrada depende de um script NOSSO colado no "Custom HTML head"
// do player do Bunny (docs/bunny.md → "A legenda lembrada"). Se o Bunny parar de rodar o
// script, se alguém clicar "Reset to Default" no painel, ou se o player mudar os nomes que o
// script ouve, nada quebra na tela: a legenda só deixa de ser lembrada, e ninguém fica
// sabendo. Esta checagem é o aviso — quando ela falha, o GitHub manda e-mail.
//
// O que confere, no site NO AR, com o endereço do vídeo de apresentação (o mesmo que
// qualquer visitante recebe):
//   1. o site abre o player NOVO (`player.mediadelivery.net`), o único em que o script funciona;
//   2. a página do player traz o NOSSO script, na versão do player novo;
//   3. o pacote do player ainda usa os nomes que o script ouve (os pedidos de legenda e o
//      atributo que diz se ela está ligada).
//
// NUNCA imprime o endereço do player: ele é assinado, e o registro do GitHub é público
// (o repositório é público).

import { pathToFileURL } from "node:url";

const SITE = "https://www.jilsonsantana.com";
const PLAYER_NOVO = "https://player.mediadelivery.net";
// Como o navegador de um aluno: o Bunny só entrega o player com a origem da escola (a trava
// de domínio do painel).
const COMO_O_NAVEGADOR = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  Referer: `${SITE}/`,
};
/** O que o script ouve no player (docs/bunny.md). Mudou lá, muda aqui junto. */
export const PEDIDOS_DE_LEGENDA = ["mediashowsubtitlesrequest", "mediadisablesubtitlesrequest", "mediatogglesubtitlesrequest"];
/** O atributo que diz se a legenda está ligada: no pacote, o nome vem assim; na página, em minúsculas. */
export const ESTADO_DA_LEGENDA = "mediaSubtitlesShowing";
const MARCA_DO_SCRIPT = "jilsonsantana-legenda";

/**
 * Confere a página do player e o pacote dele. Função pura: devolve a lista do que falhou
 * (vazia = tudo certo).
 */
export function conferir({ pagina, pacote }) {
  const falhas = [];
  if (!pagina.includes("<media-controller")) falhas.push("a página não é a do player novo do Bunny (sem media-controller)");
  if (!pagina.includes(MARCA_DO_SCRIPT)) {
    falhas.push("o nosso script NÃO está na página do player (o Bunny parou de rodar o HTML personalizado, ou o painel perdeu o script)");
  } else if (!PEDIDOS_DE_LEGENDA.every((nome) => pagina.includes(nome))) {
    falhas.push("o script colado no painel não é o do player novo (falta ouvir os pedidos de legenda)");
  }
  if (pacote === null) {
    falhas.push("não achei o pacote do player na página");
  } else {
    for (const nome of PEDIDOS_DE_LEGENDA) if (!pacote.includes(nome)) falhas.push(`o player não tem mais o pedido "${nome}"`);
    if (!pacote.includes(ESTADO_DA_LEGENDA)) falhas.push(`o player não tem mais o estado "${ESTADO_DA_LEGENDA}"`);
  }
  return falhas;
}

/** O endereço assinado do vídeo de apresentação de um curso publicado. */
async function enderecoDeUmPlayer() {
  const lista = await (await fetch(`${SITE}/api/courses`)).json();
  const cursos = Array.isArray(lista) ? lista : (lista.courses ?? []);
  for (const curso of cursos) {
    const resposta = await fetch(`${SITE}/api/courses/${encodeURIComponent(curso.slug)}`);
    if (!resposta.ok) continue;
    const dados = await resposta.json();
    const endereco = dados.introVideoEmbedUrl ?? dados.course?.introVideoEmbedUrl;
    if (typeof endereco === "string" && endereco) return endereco;
  }
  return null;
}

async function principal() {
  const linha = (ok, texto) => console.log(`${ok ? "✓" : "✗"} ${texto}`);
  const endereco = await enderecoDeUmPlayer();
  if (!endereco) {
    linha(false, "nenhum curso publicado com vídeo de apresentação — a checagem precisa de um para abrir o player");
    return 1;
  }
  if (!endereco.startsWith(`${PLAYER_NOVO}/`)) {
    linha(false, "o site não abre o player novo (player.mediadelivery.net) — o script só funciona nele");
    return 1;
  }
  linha(true, "o site abre o player novo");

  const resposta = await fetch(endereco, { headers: COMO_O_NAVEGADOR });
  if (!resposta.ok) {
    linha(false, `o player respondeu ${resposta.status} para a origem da escola`);
    return 1;
  }
  const pagina = await resposta.text();
  const caminho = pagina.match(/<script[^>]*type="module"[^>]*src="(\/assets\/[^"]+\.js)"/)?.[1];
  const pacote = caminho ? await (await fetch(`${PLAYER_NOVO}${caminho}`, { headers: COMO_O_NAVEGADOR })).text() : null;

  const falhas = conferir({ pagina, pacote });
  if (falhas.length === 0) {
    linha(true, "o nosso script está no player, e o player ainda usa os nomes que ele ouve");
    return 0;
  }
  for (const falha of falhas) linha(false, falha);
  console.log("\nO que fazer: docs/bunny.md → \"A legenda lembrada\" (onde colar o script, e as saídas se o Bunny não aceitar mais).");
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().then(
    (codigo) => process.exit(codigo),
    (erro) => {
      // A mensagem sem nenhum "?…": um endereço assinado nunca vai para o registro público.
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      console.log(`✗ a checagem não conseguiu rodar: ${mensagem.replace(/\?\S*/g, "?…")}`);
      process.exit(1);
    },
  );
}
