import path from "node:path";
import { randomUUID } from "node:crypto";
// vitest/config re-exports vite's defineConfig with the `test` field typed
// (this file doubles as both the Vite build config and the Vitest config).
import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";

// A IDENTIDADE DESTA VERSÃO do app (decisão do operador, 06/10/2026: atualizar o
// site sem atrapalhar quem está estudando). Nasce a cada montagem e vai para dois
// lugares: dentro do app (`__VERSAO_DO_APP__`) e num arquivo ao lado dele
// (`versao.txt`), que o servidor de produção lê e manda em toda resposta da API.
// Quando as duas não batem, a aba aberta é de antes da publicação, e a próxima
// troca de tela carrega a página inteira, já atualizada (`src/lib/versao.ts`).
const VERSAO_DO_APP = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;

function arquivoDaVersao(versao: string): Plugin {
  return {
    name: "versao-do-app",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "versao.txt", source: versao });
    },
  };
}

export default defineConfig({
  plugins: [react(), arquivoDaVersao(VERSAO_DO_APP)],
  define: {
    __VERSAO_DO_APP__: JSON.stringify(VERSAO_DO_APP),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // AS ROTAS PÚBLICAS são HTML de servidor, não React. Em produção quem
      // responde por elas é o Express, antes de o React existir; aqui o proxy
      // reproduz isso, pela mesma razão do `/api` (CLAUDE.md → Client): ele
      // ELIMINA a diferença entre os ambientes em vez de administrá-la.
      //
      // ⚠️ TODA ROTA PÚBLICA NOVA ENTRA NESTA LISTA. Esquecer não quebra build,
      // teste nem typecheck: em dev a rota cai no React, que não a conhece, e a
      // PÁGINA FICA EM BRANCO. Aconteceu em set/2026 — o proxy nasceu cobrindo
      // só a raiz e o `/en` ficou de fora, descoberto por clique.
      //
      // A chave começa com `^`, então o Vite a trata como expressão regular.
      // Hoje: a raiz e o inglês. Quando `/cursos`, `/curso/:slug`, `/trilhas`,
      // `/trilha/:slug` e as legais saírem do React (Bloco C5), elas vêm junto.
      "^/(en)?$": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  test: {
    setupFiles: ["./src/test-setup.ts"],
    // `npm run test:changed` roda só os testes afetados pelo que mudou (05/10/2026).
    // Mudança nestes arquivos roda TUDO: os três primeiros são o padrão do Vitest
    // (definir a lista substitui o padrão); o `core` entra porque o app o importa
    // pelo `core/dist`, então o Vitest não liga uma mudança em `core/src` a teste
    // nenhum — e é lá que mora o dicionário de textos.
    forceRerunTriggers: ["**/package.json/**", "**/vitest.config.*/**", "**/vite.config.*/**", "**/core/src/**"],
  },
});
