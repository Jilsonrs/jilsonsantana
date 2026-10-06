import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// O CORTE EM N LINHAS (`line-clamp-N`) só funciona com o `display` que ele mesmo
// põe. Uma classe de exibição na mesma lista (`block`, `flex`…) vem DEPOIS no CSS
// do Tailwind e o anula, sem erro nenhum: o texto aparece inteiro. Foi o que
// aconteceu na prévia do sino (achado do operador, 06/10/2026). O teste não
// enxerga a tela (o jsdom não calcula CSS), então confere a combinação na fonte.

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXIBICAO = /^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|table|contents|hidden|flow-root|list-item)$/;

function telas(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return telas(caminho);
    return nome.endsWith(".tsx") && !nome.endsWith(".test.tsx") ? [caminho] : [];
  });
}

describe("o corte em N linhas", () => {
  it("nenhuma lista de classes junta line-clamp com uma classe de exibição", () => {
    const anuladas = telas(SRC).flatMap((arquivo) =>
      [...readFileSync(arquivo, "utf8").matchAll(/className=["`{]([^"`}]*)/g)]
        .map(([, classes]) => classes.split(/\s+/))
        .filter((classes) => classes.some((c) => /^line-clamp-\d+$/.test(c)) && classes.some((c) => EXIBICAO.test(c)))
        .map((classes) => `${relative(SRC, arquivo)}: ${classes.join(" ")}`),
    );
    expect(anuladas).toEqual([]);
  });

  it("a busca acha os cortes do app (o teste não está olhando para o vazio)", () => {
    const comCorte = telas(SRC).filter((arquivo) => /line-clamp-\d/.test(readFileSync(arquivo, "utf8")));
    expect(comCorte.map((a) => relative(SRC, a))).toContain(join("components", "notificacoes", "Sino.tsx"));
  });
});
