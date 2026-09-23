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
      // A RAIZ é a home PÚBLICA, e ela é HTML de servidor — não React.
      // Em produção quem responde "/" é o Express, antes de o React existir.
      // Sem este proxy, dev divergiria: o mesmo clique no logo levaria à home
      // pública em produção e ao app em `localhost:5173`. Mesma razão do proxy
      // de `/api` (CLAUDE.md → Client): o proxy ELIMINA a diferença entre os
      // ambientes em vez de administrá-la.
      // A chave começa com `^`, então o Vite a trata como expressão regular —
      // casa a raiz EXATA, e nenhuma outra rota.
      "^/$": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  test: {
    setupFiles: ["./src/test-setup.ts"],
  },
});
