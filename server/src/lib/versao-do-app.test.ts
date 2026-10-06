import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { lerVersaoDoApp } from "./versao-do-app.js";

// A identidade da versão do app (06/10/2026). Função pura: o trecho que a usa só
// roda em produção, onde o app montado mora ao lado do servidor.
describe("lerVersaoDoApp", () => {
  it("lê a identidade gravada na montagem, sem espaço nem quebra de linha", () => {
    const pasta = mkdtempSync(path.join(tmpdir(), "versao-"));
    writeFileSync(path.join(pasta, "versao.txt"), "mgx1k2-3f9a01bc\n");
    expect(lerVersaoDoApp(pasta)).toBe("mgx1k2-3f9a01bc");
  });

  it("sem o arquivo, ou com ele vazio: nada (o desenvolvimento segue como sempre)", () => {
    const pasta = mkdtempSync(path.join(tmpdir(), "versao-"));
    expect(lerVersaoDoApp(pasta)).toBeNull();
    writeFileSync(path.join(pasta, "versao.txt"), "  \n");
    expect(lerVersaoDoApp(pasta)).toBeNull();
  });
});
