import { describe, it, expect } from "vitest";
import { pt, en } from "@jilson/core";

// O typecheck já garante que o inglês tem TODAS as chaves do português — `en` é
// tipado como `Dict`. O que ele NÃO pega é a chave presente e VAZIA, que era o
// estado real até set/2026: 143 de 150 em branco, a página respondendo 200 e
// ninguém percebendo. Este teste fecha exatamente esse buraco.

/** Achata { a: { b: [ { c: "x" } ] } } em [["a.b[0].c", "x"]]. */
function achatar(valor: unknown, prefixo = ""): [string, string][] {
  if (Array.isArray(valor)) {
    return valor.flatMap((v, i) => achatar(v, `${prefixo}[${i}]`));
  }
  if (valor && typeof valor === "object") {
    return Object.entries(valor).flatMap(([k, v]) =>
      achatar(v, prefixo ? `${prefixo}.${k}` : k),
    );
  }
  return [[prefixo, String(valor)]];
}

/**
 * Chaves que DEVEM ficar iguais nos dois idiomas. Cada uma com o motivo: quem
 * acrescentar uma linha aqui está declarando "não é esquecimento", e é isso que
 * impede a lista de virar tapete para varrer tradução faltando.
 */
const IGUAIS_DE_PROPOSITO = [
  { padrao: /^testimonials\.list\[\d+\]\.name$/, porque: "nome de pessoa real" },
  { padrao: /^pricing\.price[A-Za-z]*$/, porque: "valor monetário" },
];

describe("dicionário bilíngue", () => {
  it("toda chave com texto em português tem texto em inglês", () => {
    const ingles = new Map(achatar(en));
    // Chave vazia nos DOIS lados é intencional (os `titleSuffix` que não têm
    // continuação depois da palavra em destaque). Vazia só no inglês, não.
    const faltando = achatar(pt)
      .filter(([chave, valor]) => valor.trim() !== "" && !ingles.get(chave)?.trim())
      .map(([chave]) => chave);

    expect(faltando, `sem tradução: ${faltando.join(", ")}`).toEqual([]);
  });

  it("o inglês não repete o português palavra por palavra", () => {
    // Não é sobre estilo: chave copiada e colada é o jeito silencioso de "ter
    // tradução" sem ter tradução. O filtro é ter espaço — ou seja, ser frase, e
    // não uma palavra que por acaso é igual nos dois idiomas.
    const ingles = new Map(achatar(en));
    const copiadas = achatar(pt)
      .filter(([chave, valor]) => valor.includes(" ") && ingles.get(chave) === valor)
      .filter(([chave]) => !IGUAIS_DE_PROPOSITO.some(({ padrao }) => padrao.test(chave)))
      .map(([chave]) => chave);

    expect(copiadas, `idêntico ao português: ${copiadas.join(", ")}`).toEqual([]);
  });
});
