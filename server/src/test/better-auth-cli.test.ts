import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// A FERRAMENTA QUE GERA O ESQUEMA DO BETTER AUTH NA MESMA VERSÃO DA BIBLIOTECA
// (05/10/2026). O `@better-auth/cli` parou na 1.4.21 enquanto o site já estava na
// 1.7.5: gerar o esquema com ele seria gerar para outra versão, sem erro nenhum.
// O sucessor oficial (`auth`, desde o Better Auth 1.5) sai com a mesma numeração
// da biblioteca — este teste reprova se as duas se separarem, que é o lembrete
// de atualizar as duas juntas.

const SERVIDOR = fileURLToPath(new URL("../..", import.meta.url));

/** Onde o npm pôs o `package.json` de um pacote (no servidor ou na raiz). */
function ondeEsta(pacote: string): string {
  for (const pasta of ["node_modules", "../node_modules"]) {
    const arquivo = `${SERVIDOR}${pasta}/${pacote}/package.json`;
    if (existsSync(arquivo)) return arquivo;
  }
  throw new Error(`${pacote} não está instalado`);
}

function versaoDe(arquivo: string): string {
  return (JSON.parse(readFileSync(arquivo, "utf8")) as { version: string }).version;
}

/** A versão INSTALADA de um pacote. */
function versaoInstalada(pacote: string): string {
  return versaoDe(ondeEsta(pacote));
}

describe("a ferramenta do esquema do Better Auth", () => {
  it("o `auth` está na mesma versão do `better-auth`", () => {
    expect(versaoInstalada("auth")).toBe(versaoInstalada("better-auth"));
  });

  it("o pacote antigo, parado na 1.4.21, não volta", () => {
    const pacote = JSON.parse(readFileSync(`${SERVIDOR}package.json`, "utf8")) as { devDependencies?: Record<string, string> };
    expect(pacote.devDependencies ?? {}).not.toHaveProperty("@better-auth/cli");
  });

  // MEDIDO em 18/10/2026: o comando falhava com "createJiti is not a function". O
  // `c12`, que lê o nosso `auth.ts`, usa o `jiti` que achar a partir da pasta DELE —
  // e na raiz havia só o 1, do Tailwind. O `jiti` 2 declarado na raiz (package.json,
  // devDependencies) existe só por isto: nenhum arquivo o importa, e por isso parece
  // sobra. Tirá-lo quebra o `auth:generate` sem erro em nenhum outro lugar.
  it("o `c12`, que lê a configuração, acha o `jiti` 2", () => {
    const doC12 = createRequire(ondeEsta("c12"));
    let pasta = dirname(doC12.resolve("jiti"));
    while (!existsSync(join(pasta, "package.json"))) pasta = dirname(pasta);
    expect(Number(versaoDe(join(pasta, "package.json")).split(".")[0])).toBeGreaterThanOrEqual(2);
  });
});
