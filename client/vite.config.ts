import path from "node:path";
// vitest/config re-exports vite's defineConfig with the `test` field typed
// (this file doubles as both the Vite build config and the Vitest config).
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
  },
});
