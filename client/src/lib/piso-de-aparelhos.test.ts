// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// O PISO DE APARELHOS (Bloco AULA, etapa 4 — plano aprovado pelo operador em
// 06/10/2026): iOS 15 (iPhone 6s em diante), Chrome e Edge 91, Firefox 90. As duas
// peças que o sustentam falham EM SILÊNCIO se alguém as tirar — o site continua
// montando e os testes do resto continuam verdes, e só o iPhone antigo quebra:
//   - a linha do piso no `vite.config.ts` (sem ela, vale o padrão do Vite, que muda
//     a cada versão grande — no Vite 7, Safari 16);
//   - o reforço `compat.ts` como a primeira coisa que o app carrega.

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("o piso de aparelhos", () => {
  it("a montagem do site tem o piso escrito: iOS 15, Chrome e Edge 91, Firefox 90 — no código e no CSS", async () => {
    // A configuração que o PRÓPRIO Vite resolve para montar o site, não o texto do arquivo.
    const { resolveConfig } = await import("vite");
    const config = await resolveConfig({ configFile: join(SRC, "..", "vite.config.ts"), logLevel: "silent" }, "build");
    const piso = ["chrome91", "edge91", "firefox90", "safari15", "ios15"];
    expect(config.build.target).toEqual(piso);
    expect(config.build.cssTarget).toEqual(piso);
  });

  it("o reforço dos aparelhos antigos é a primeira coisa que o app carrega", () => {
    const entrada = readFileSync(join(SRC, "main.tsx"), "utf8");
    expect(entrada.match(/^import\s[^;]+;/m)?.[0]).toBe('import "@/lib/compat";');
  });
});
