// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { Role } from "@jilson/core";
import { AppRail } from "./AppRail";

function render(papel?: string, route = "/inicio") {
  return renderWithProviders(<AppRail papel={papel} />, {
    route,
    path: "*",
  });
}

describe("AppRail — quem vê o quê", () => {
  it("o aluno vê as seções dele", () => {
    render(Role.MEMBER);

    expect(screen.getByRole("link", { name: "Início" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cursos" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Minhas trilhas" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Minha conta" })).toBeTruthy();

  });

  // Não é sobre acesso — o servidor barra de qualquer jeito. É sobre não
  // anunciar a existência de uma área que não é dele.
  it("o aluno NÃO vê seção de admin", () => {
    render(Role.MEMBER);
    // "Cursos Admin" e não "Cursos": desde set/2026 o ALUNO tem um "Cursos"
    // (o antigo Catálogo). Procurar por "Cursos" aqui passaria a achar o item
    // do aluno e o teste deixaria de provar o que promete.
    expect(screen.queryByRole("link", { name: "Cursos Admin" })).toBeNull();
  });

  it("o admin vê as dele e as do aluno", () => {
    render(Role.ADMIN);
    expect(screen.getByRole("link", { name: "Cursos Admin" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Início" })).toBeTruthy();
  });

  // O mapa tem seções "planejadas" (JilsonAI, Certificados, Alunos…) que
  // descrevem telas ainda não construídas. Renderizá-las seria enviar o aluno
  // para um link quebrado.
  it("seção PLANEJADA não vira link", () => {
    render(Role.ADMIN);
    expect(screen.queryByRole("link", { name: "Certificados" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Alunos" })).toBeNull();
  });
});

describe("AppRail — onde estou", () => {
  it("marca só a rota atual", () => {
    render(Role.MEMBER, "/inicio");

    expect(screen.getByRole("link", { name: "Início" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Cursos" }).getAttribute("aria-current")).toBeNull();
  });

  it("Cursos continua aceso dentro da página de um curso", () => {
    render(Role.MEMBER, "/curso/excel-e-ia");
    expect(screen.getByRole("link", { name: "Cursos" }).getAttribute("aria-current")).toBe("page");
  });

  // Se o casamento fosse por prefixo solto, "/admin/cursos" acenderia também o
  // "Cursos" do aluno e o rail mostraria DOIS itens ativos.
  it("um item ativo por vez, nunca dois", () => {
    render(Role.ADMIN, "/admin/cursos/12");

    const ativos = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("aria-current") === "page");
    expect(ativos).toHaveLength(1);
    expect(ativos[0].textContent).toContain("Cursos Admin");
  });
});

describe("AppRail — acessibilidade do estado recolhido", () => {
  it("todo item tem nome acessível, mesmo recolhido", () => {
    render(Role.ADMIN);

    // O rótulo está sempre no DOM: some por RECORTE (overflow), nunca por
    // `display:none`. Isto reprova se alguém apagar o <span> do rótulo e
    // deixar só o ícone.
    for (const nome of ["Início", "Cursos", "Trilhas", "Minhas trilhas", "Minha conta", "Cursos Admin", "Site"]) {
      expect(screen.getByRole("link", { name: nome })).toBeTruthy();
    }
  });

  /**
   * ESTE TESTE OLHA UMA CLASSE, e é exceção consciente à regra de "testar
   * comportamento, não implementação". O motivo:
   *
   * a expansão do rail é CSS puro, e o jsdom não aplica o CSS do Tailwind —
   * então NENHUM teste de comportamento consegue provar que o rail expande no
   * foco do teclado. Sem esta asserção, apagar `focus-within:w-64` deixaria a
   * suíte inteira verde e quem navega por teclado sem navegação nenhuma: uma
   * falha invisível, que é exatamente o que a doutrina de teste deste repo
   * existe para impedir.
   *
   * A alternativa honesta seria um teste de browser de verdade; enquanto ele
   * não existe, esta linha é a única guarda da trava do design.md §13.
   */
  it("expande por FOCO de teclado, não só por mouse", () => {
    render(Role.MEMBER);
    const nav = screen.getByRole("navigation", { name: "Principal" });

    // Confere o PREFIXO, não a medida: mudar 280px para outro valor é decisão
    // de design e não deve quebrar teste; APAGAR a expansão por foco é o
    // defeito de acessibilidade que este teste existe para reprovar.
    expect(nav.className).toMatch(/focus-within:w-/);
    expect(nav.className).toMatch(/hover:w-/);
  });

  /**
   * Mesma exceção, mesmo motivo: o rótulo some por OPACIDADE quando o rail está
   * recolhido, e trocar isso por `hidden`/`display:none` deixaria a tela
   * IDÊNTICA — só que o nome do item sumiria da árvore de acessibilidade.
   * Falha invisível a olho nu e invisível a teste de comportamento em jsdom.
   */
  it("esconde o rótulo por opacidade, nunca por `hidden`", () => {
    render(Role.MEMBER);
    const rotulo = screen.getByRole("link", { name: "Início" }).querySelector("span");

    expect(rotulo?.className).toContain("opacity-0");
    expect(rotulo?.className).toContain("group-hover:opacity-100");
    expect(rotulo?.className).toContain("group-focus-within:opacity-100");
    expect(rotulo?.className).not.toContain("hidden");
  });
});
