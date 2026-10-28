import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { SCRIPT_DO_ARQUIVO_QUE_SUMIU, vigiaDoArquivoQueSumiu } from "./arquivo-que-sumiu";

// O VIGIA VAI PARA A PÁGINA (27/10/2026): o comportamento dele está em `arquivo-que-sumiu.test.ts`;
// aqui, que o plugin o escreve no começo do <head> e que o `vite.config.ts` liga o plugin. Sem
// navegador (como `pedacos.test.ts`): o caminho do arquivo é lido do disco.
const VITE_CONFIG = resolve(dirname(fileURLToPath(import.meta.url)), "../../vite.config.ts");

describe("o vigia vai para a página", () => {
  it("o plugin o escreve no COMEÇO do <head>, antes dos arquivos do app, e com a recarga de verdade", () => {
    // O `transformIndexHtml` do plugin é a função deste arquivo; o tipo do Vite aceita também um objeto.
    const escrever = vigiaDoArquivoQueSumiu().transformIndexHtml as () => unknown;
    expect(escrever()).toEqual([{ tag: "script", children: SCRIPT_DO_ARQUIVO_QUE_SUMIU, injectTo: "head-prepend" }]);
    expect(SCRIPT_DO_ARQUIVO_QUE_SUMIU).toContain("location.reload()");
  });

  it("o vite.config.ts liga o plugin", () => {
    expect(readFileSync(VITE_CONFIG, "utf8")).toMatch(/plugins:\s*\[[^\]]*vigiaDoArquivoQueSumiu\(\)/);
  });
});
