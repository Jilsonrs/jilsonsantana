import { describe, it, expect } from "vitest";
import mapaDoLucide from "lucide-react/dynamicIconImports";
import { AVAILABLE_ICONS } from "../content/icon-registry";
import { CATALOGO, REPETIDOS_DO_REGISTRO, SUGERIDOS, buscarIcones, desenhoDoIcone } from "./catalogo-de-icones";
import { NOME_DO_ICONE } from "./nomes-dos-icones";

// O catálogo do seletor de ícones (05/10/2026). Estes testes são o que avisa
// quando uma atualização do lucide-react acrescenta, tira ou renomeia ícone:
// sem eles, o ícone salvo viraria o Brilho na página do curso, sem erro nenhum.
describe("catálogo de ícones dos Destaques", () => {
  it("todo ícone do Lucide tem nome em português", () => {
    const semNome = Object.keys(mapaDoLucide).filter((token) => !NOME_DO_ICONE[token]);
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
    expect(CATALOGO.length).toBe(Object.keys(mapaDoLucide).length + 2 - Object.keys(REPETIDOS_DO_REGISTRO).length);
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
