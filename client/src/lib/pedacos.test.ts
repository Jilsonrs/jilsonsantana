import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ATUALIZAR O SITE SEM ATRAPALHAR QUEM ESTÁ ESTUDANDO (decisão do operador,
// 06/10/2026). Todo pedaço do app carregado sob demanda (`import()`) precisa
// estar baixado ANTES de uma publicação apagá-lo — senão a aba aberta pede um
// arquivo que não existe mais. Este teste torna a regra mecânica: um `import()`
// novo fora das listas de `versao.ts` (e fora das exceções abaixo) reprova.

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VERSAO = join(SRC, "lib", "versao.ts");

/** Os que ficam fora das listas, cada um com o motivo. */
const EXCECOES: Record<string, string> = {
  // 381 KB para todo aluno, para servir poucos cursos: não compensa. Se não vier,
  // o HighlightIcon mostra o Brilho e a página segue (tem teste). Para o admin, ele
  // vem junto do seletor de ícones, que está na lista do admin.
  "components/content/todos-os-icones": "o ícone tem reserva",
};

function arquivosDoApp(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivosDoApp(caminho);
    return /\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

/** Os destinos dos `import("…")` de um arquivo, como caminho dentro de `src/`, sem extensão. */
function importsSobDemanda(arquivo: string): string[] {
  const texto = readFileSync(arquivo, "utf8");
  return [...texto.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)].map(([, destino]) => {
    const absoluto = destino.startsWith("@/") ? join(SRC, destino.slice(2)) : resolve(dirname(arquivo), destino);
    return relative(SRC, absoluto).replace(/\.tsx?$/, "");
  });
}

describe("os pedaços carregados sob demanda", () => {
  const listados = new Set(importsSobDemanda(VERSAO));
  const usados = arquivosDoApp(SRC)
    .filter((arquivo) => arquivo !== VERSAO)
    .flatMap((arquivo) => importsSobDemanda(arquivo).map((destino) => ({ arquivo: relative(SRC, arquivo), destino })));

  it("a busca acha os do app (o teste não está olhando para o vazio)", () => {
    expect(usados.map((u) => u.destino)).toContain("components/content/MarkdownText");
  });

  it("cada um está numa lista de pré-carregamento de versao.ts, ou nas exceções com o motivo", () => {
    const fora = usados.filter(({ destino }) => !listados.has(destino) && !(destino in EXCECOES));
    expect(fora).toEqual([]);
  });

  it("toda exceção ainda existe (exceção velha esconderia um pedaço novo de mesmo nome)", () => {
    const destinos = new Set(usados.map((u) => u.destino));
    expect(Object.keys(EXCECOES).filter((destino) => !destinos.has(destino))).toEqual([]);
  });
});
