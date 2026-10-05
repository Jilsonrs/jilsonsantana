import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import servidor from "./servidor.js";

// A TRAVA DO SERVIDOR DE TESTE (05/10/2026 — ver `servidor.ts`). Sem ela, um teste
// novo escrito com `request(app)` traria de volta as falhas intermitentes, sem
// erro nenhum: elas só aparecem na máquina de quem tem outro programa escutando
// em 127.0.0.1, e somem ao rodar de novo.

const SRC = fileURLToPath(new URL("..", import.meta.url));

function arquivosDeTeste(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) return arquivosDeTeste(caminho);
    return item.name.endsWith(".test.ts") ? [caminho] : [];
  });
}

describe("o servidor dos testes", () => {
  it("escuta só em 127.0.0.1", () => {
    expect((servidor.address() as AddressInfo).address).toBe("127.0.0.1");
  });

  it("nenhum teste usa o app direto (request(app) ou importar app.ts)", () => {
    const esteArquivo = fileURLToPath(import.meta.url);
    const quebram = arquivosDeTeste(SRC)
      .filter((arquivo) => arquivo !== esteArquivo)
      .filter((arquivo) => /request\(app\)|from "(\.\.\/)+app\.js"/.test(readFileSync(arquivo, "utf8")))
      .map((arquivo) => relative(SRC, arquivo));
    expect(quebram).toEqual([]);
  });
});
