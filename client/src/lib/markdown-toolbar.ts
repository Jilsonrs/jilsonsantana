// Os botões do campo de descrição (decisão do operador, 27/09/2026: negrito,
// itálico e listas, como no GitHub). Cada função recebe o texto e a seleção e
// devolve o texto novo e a seleção que o campo deve mostrar depois. Clicar de
// novo no mesmo botão desfaz a marca, como no GitHub.

export type Edicao = { texto: string; inicio: number; fim: number };

/** Negrito (`**`) ou itálico (`_`) em volta do trecho selecionado. */
export function envolver(texto: string, inicio: number, fim: number, marca: string): Edicao {
  const trecho = texto.slice(inicio, fim);
  // Espaço nas pontas fica FORA da marca: "**texto **" não vira negrito no Markdown.
  const a = inicio + (trecho.length - trecho.trimStart().length);
  const b = fim - (trecho.length - trecho.trimEnd().length);
  const m = marca.length;

  if (a >= b) {
    // Nada selecionado: põe as duas marcas e deixa o cursor no meio.
    const novo = texto.slice(0, fim) + marca + marca + texto.slice(fim);
    return { texto: novo, inicio: fim + m, fim: fim + m };
  }
  if (texto.slice(a - m, a) === marca && texto.slice(b, b + m) === marca) {
    const novo = texto.slice(0, a - m) + texto.slice(a, b) + texto.slice(b + m);
    return { texto: novo, inicio: a - m, fim: b - m };
  }
  const novo = texto.slice(0, a) + marca + texto.slice(a, b) + marca + texto.slice(b);
  return { texto: novo, inicio: a + m, fim: b + m };
}

const MARCA_DA_LISTA = { lista: /^- /, numerada: /^\d+\. / } as const;

/** Lista (`- `) ou lista numerada (`1. `, `2. `…) nas linhas da seleção. */
export function prefixarLinhas(
  texto: string,
  inicio: number,
  fim: number,
  tipo: keyof typeof MARCA_DA_LISTA,
): Edicao {
  const comeco = texto.lastIndexOf("\n", inicio - 1) + 1;
  const quebra = texto.indexOf("\n", fim);
  const final = quebra === -1 ? texto.length : quebra;
  const linhas = texto.slice(comeco, final).split("\n");
  const marca = MARCA_DA_LISTA[tipo];
  const preenchidas = linhas.filter((l) => l.trim() !== "");
  const jaEraLista = preenchidas.length > 0 && preenchidas.every((l) => marca.test(l));

  let numero = 0;
  const bloco = linhas
    .map((linha) => {
      if (jaEraLista) return linha.replace(marca, "");
      // Linha em branco no meio da seleção continua em branco, sem item vazio.
      if (linha.trim() === "" && linhas.length > 1) return linha;
      numero += 1;
      return (tipo === "lista" ? "- " : `${numero}. `) + linha;
    })
    .join("\n");

  const novo = texto.slice(0, comeco) + bloco + texto.slice(final);
  if (inicio === fim) {
    // Sem seleção: o cursor anda junto com o texto da linha.
    const cursor = Math.max(comeco, inicio + (bloco.length - (final - comeco)));
    return { texto: novo, inicio: cursor, fim: cursor };
  }
  return { texto: novo, inicio: comeco, fim: comeco + bloco.length };
}
