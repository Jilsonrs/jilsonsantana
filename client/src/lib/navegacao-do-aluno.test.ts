// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// NAVEGAÇÃO DE DENTRO DO CÓDIGO NO CAMINHO DO ALUNO USA `useIrPara()` (CLAUDE.md → Rendering
// Boundary): é ele que troca a navegação interna por um carregamento normal quando há versão nova
// do app. Um `navigate()` direto passa em todo teste de tela e falha só no dia de uma publicação.
// Este teste torna a regra mecânica no caminho do aluno (A5 da revisão da etapa 4.7, 28/10/2026):
// um `useNavigate` novo nas pastas abaixo reprova. Lê o código, por isso roda sem jsdom.

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** O caminho do aluno: as telas de acesso e de assinar, as telas do aluno e as páginas de fora do admin. */
const PASTAS_DO_ALUNO = [join(SRC, "components", "acesso"), join(SRC, "components", "assinar"), join(SRC, "pages", "aluno"), join(SRC, "pages")];

function arquivosTsx(pasta: string, recursivo: boolean): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return recursivo ? arquivosTsx(caminho, true) : [];
    return nome.endsWith(".tsx") && !nome.endsWith(".test.tsx") ? [caminho] : [];
  });
}

describe("a navegação de dentro do código no caminho do aluno", () => {
  it("nenhuma tela do caminho do aluno usa useNavigate direto — é useIrPara() (versao.ts)", () => {
    const arquivos = PASTAS_DO_ALUNO.flatMap((pasta) => arquivosTsx(pasta, pasta !== join(SRC, "pages")));
    expect(arquivos.length).toBeGreaterThan(10);
    const comNavigate = arquivos.filter((caminho) => /\buseNavigate\b/.test(readFileSync(caminho, "utf8"))).map((caminho) => relative(SRC, caminho));
    expect(comNavigate).toEqual([]);
  });
});
