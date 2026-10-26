import { describe, it, expect } from "vitest";
import { icons } from "lucide-react";
import { AVAILABLE_ICONS } from "../content/icon-registry";
import { CATALOGO, REPETIDOS_DO_REGISTRO, SUGERIDOS, buscarIcones, desenhoDoIcone } from "./catalogo-de-icones";
import { NOME_DO_ICONE } from "./nomes-dos-icones";
import { desenhoDoLucide } from "../content/todos-os-icones";

// O catálogo do seletor de ícones (05/10/2026). Estes testes são o que avisa
// quando uma atualização do lucide-react acrescenta, tira ou renomeia ícone:
// sem eles, o ícone salvo viraria o Brilho na página do curso, sem erro nenhum.
// Conta por DESENHO, não por nome: desde o Lucide 1 (26/10/2026) o mapa de nomes do Lucide também
// traz os nomes antigos dos ícones renomeados, que são apelidos do mesmo desenho.
const DESENHOS_DO_LUCIDE = Object.values(icons);
/** Os desenhos que têm nome em português (pelo nome atual, ou pelos 55 de sempre). */
const COM_NOME = new Set(Object.keys(NOME_DO_ICONE).map(desenhoDoIcone));
/**
 * Desenhos do Lucide ESCONDIDOS de propósito: o nome deles no Lucide é igual a um dos 55 de sempre,
 * que mostra outro desenho ("bolt" é o raio do `zap`; "wand" é a varinha com brilho). O nosso ganha,
 * porque é o que os cursos já gravaram — e o desenho do Lucide com esse nome fica sem lugar na lista.
 */
const ESCONDIDOS = AVAILABLE_ICONS.map((token) => desenhoDoLucide(token)).filter(
  (desenho, i): desenho is NonNullable<typeof desenho> => desenho !== null && desenho !== desenhoDoIcone(AVAILABLE_ICONS[i]),
);

describe("catálogo de ícones dos Destaques", () => {
  it("todo ícone do Lucide tem nome em português", () => {
    const semNome = Object.entries(icons)
      .filter(([, desenho]) => !COM_NOME.has(desenho) && !ESCONDIDOS.includes(desenho))
      .map(([nome]) => nome);
    expect(ESCONDIDOS.length).toBe(2);
    expect(semNome).toEqual([]);
  });

  it("todo nome em português aponta para um desenho que existe", () => {
    const semDesenho = Object.keys(NOME_DO_ICONE).filter((token) => !desenhoDoIcone(token));
    expect(semDesenho).toEqual([]);
  });

  it("os 55 de sempre estão nos sugeridos, e nenhum ícone aparece duas vezes", () => {
    expect(SUGERIDOS.map((i) => i.token).sort()).toEqual([...AVAILABLE_ICONS].sort());
    const tokens = CATALOGO.map((i) => i.token);
    expect(new Set(tokens).size).toBe(tokens.length);
    for (const repetido of Object.keys(REPETIDOS_DO_REGISTRO)) expect(tokens).not.toContain(repetido);
    // Cada desenho uma vez só: o mesmo desenho com dois nomes apareceria duas vezes na lista.
    expect(new Set(CATALOGO.map((i) => i.Icone)).size).toBe(CATALOGO.length);
    // Os nossos que não são desenho do Lucide (a "Pilha", com o traço de antes do Lucide 1).
    const soNossos = AVAILABLE_ICONS.filter((token) => !DESENHOS_DO_LUCIDE.includes(desenhoDoIcone(token)!));
    expect(soNossos).toEqual(["layers-3"]);
    expect(CATALOGO.length).toBe(DESENHOS_DO_LUCIDE.length - ESCONDIDOS.length + soNossos.length);
  });

  it("um repetido é mesmo o desenho do nome antigo", () => {
    for (const [lucide, antigo] of Object.entries(REPETIDOS_DO_REGISTRO)) {
      expect(desenhoDoIcone(antigo)).toBe(desenhoDoIcone(lucide));
    }
  });

  it("a busca: todas as palavras precisam aparecer, sem acento, sem diferença de maiúscula", () => {
    expect(buscarIcones("CONSTRUCAO").map((i) => i.token)).toContain("construction");
    expect(buscarIcones("capacete obra").map((i) => i.token)).toEqual(["hard-hat"]);
    expect(buscarIcones("   ")).toBe(SUGERIDOS);
  });
});
