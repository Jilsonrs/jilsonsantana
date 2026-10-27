import { describe, it, expect } from "vitest";
import { etiquetasDoApp } from "./etiquetas-do-app.js";

// AS ETIQUETAS DO APP numa página do servidor (etapa 4.7, passo 6c) — função pura, sobre o
// `index.html` que o Vite monta (produção) e o que o servidor dele entrega (dev).

const MONTADO = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Jilson Santana</title>
    <script type="module" crossorigin src="/assets/index-AAA.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/react-BBB.js">
    <link rel="stylesheet" crossorigin href="/assets/index-CCC.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

const DO_VITE = `<!doctype html>
<html lang="pt-BR">
  <head>
    <script type="module">import { injectIntoGlobalHook } from "/@react-refresh";
injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};</script>
    <script type="module" src="/@vite/client"></script>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>Jilson Santana</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

describe("as etiquetas do app", () => {
  it("do montado: o script, o pré-carregamento e a folha de estilo, na ordem — sem o título, o ícone e o #root", () => {
    expect(etiquetasDoApp(MONTADO).split("\n  ")).toEqual([
      '<script type="module" crossorigin src="/assets/index-AAA.js"></script>',
      '<link rel="modulepreload" crossorigin href="/assets/react-BBB.js">',
      '<link rel="stylesheet" crossorigin href="/assets/index-CCC.css">',
    ]);
  });

  it("do Vite: o recarregar ao vivo (escrito ali), o cliente do Vite e a entrada do app, na ordem", () => {
    const etiquetas = etiquetasDoApp(DO_VITE).split("\n  ");
    expect(etiquetas).toHaveLength(3);
    expect(etiquetas[0]).toMatch(/^<script type="module">import \{ injectIntoGlobalHook \}[\s\S]*<\/script>$/);
    expect(etiquetas.slice(1)).toEqual(['<script type="module" src="/@vite/client"></script>', '<script type="module" src="/src/main.tsx"></script>']);
  });

  it("sem etiqueta do app: nada", () => {
    expect(etiquetasDoApp("<html><head><title>x</title></head></html>")).toBe("");
  });
});
