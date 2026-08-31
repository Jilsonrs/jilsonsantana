import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Sem jsdom: aqui não há tela. É a "fronteira transversal" do CLAUDE.md —
    // gate de acesso, webhook e auth são fatia própria, com teste de servidor e
    // sem teste de componente, porque não têm interface.
    environment: "node",

    // Roda 1× antes de tudo: TRAVA por ref → migrate reset → seed.
    globalSetup: ["./src/test/global-setup.ts"],

    // Roda em CADA worker: carrega .env.test com override antes de o app ser
    // importado (o globalSetup roda em outro contexto e não cobre isto).
    setupFiles: ["./src/test/setup.ts"],

    include: ["src/**/*.test.ts"],

    // O setup faz reset do banco; workers em paralelo disputariam o MESMO banco
    // e produziriam falhas intermitentes — a pior classe de teste, porque ensina
    // a ignorar vermelho. Um processo só: a suíte é de fronteira, é pequena, e
    // determinismo vale mais que segundos.
    fileParallelism: false,

    // O reset + migrations + seed leva mais que o default de 5s.
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
