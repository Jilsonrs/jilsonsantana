import { describe, it, expect } from "vitest";
import { pedeArquivo } from "./pede-arquivo.js";

// Arquivo que não existe → 404; tela → o app (05/10/2026). Função pura: o
// trecho do servidor que a usa só roda em produção.
describe("pedeArquivo", () => {
  it("arquivo (com extensão): sim — o pedaço antigo do app, uma imagem, um ícone", () => {
    expect(pedeArquivo("/assets/MarkdownText-Cse5IHeA.js")).toBe(true);
    expect(pedeArquivo("/assets/index-abc.css")).toBe(true);
    expect(pedeArquivo("/favicon.ico")).toBe(true);
  });

  it("tela (sem extensão): não — vai para o app", () => {
    expect(pedeArquivo("/")).toBe(false);
    expect(pedeArquivo("/aluno/aula/12")).toBe(false);
    expect(pedeArquivo("/admin/cursos/11/publicar")).toBe(false);
  });
});
