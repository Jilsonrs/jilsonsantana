import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// A FERRAMENTA QUE GERA O ESQUEMA DO BETTER AUTH NA MESMA VERSÃO DA BIBLIOTECA
// (05/10/2026). O `@better-auth/cli` parou na 1.4.21 enquanto o site já estava na
// 1.7.5: gerar o esquema com ele seria gerar para outra versão, sem erro nenhum.
// O sucessor oficial (`auth`, desde o Better Auth 1.5) sai com a mesma numeração
// da biblioteca — este teste reprova se as duas se separarem, que é o lembrete
// de atualizar as duas juntas.

const SERVIDOR = fileURLToPath(new URL("../..", import.meta.url));

/** A versão INSTALADA de um pacote, onde o npm o tiver posto (no servidor ou na raiz). */
function versaoInstalada(pacote: string): string {
  for (const pasta of ["node_modules", "../node_modules"]) {
    const arquivo = `${SERVIDOR}${pasta}/${pacote}/package.json`;
    if (existsSync(arquivo)) return (JSON.parse(readFileSync(arquivo, "utf8")) as { version: string }).version;
  }
  throw new Error(`${pacote} não está instalado`);
}

describe("a ferramenta do esquema do Better Auth", () => {
  it("o `auth` está na mesma versão do `better-auth`", () => {
    expect(versaoInstalada("auth")).toBe(versaoInstalada("better-auth"));
  });

  it("o pacote antigo, parado na 1.4.21, não volta", () => {
    const pacote = JSON.parse(readFileSync(`${SERVIDOR}package.json`, "utf8")) as { devDependencies?: Record<string, string> };
    expect(pacote.devDependencies ?? {}).not.toHaveProperty("@better-auth/cli");
  });
});
