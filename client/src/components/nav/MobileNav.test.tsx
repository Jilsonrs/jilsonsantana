// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { Role } from "@jilson/core";
import { MobileNav } from "./MobileNav";

function abrirGaveta(papel: string = Role.MEMBER) {
  renderWithProviders(<MobileNav papel={papel} onSignOut={vi.fn()} />, {
    route: "/inicio",
    path: "*",
  });
  fireEvent.click(screen.getByRole("button", { name: "Abrir o menu" }));
}

describe("MobileNav — o logo é a saída para a vitrine", () => {
  // Mesma decisão do operador que vale para o rail (set/2026): o logo leva à
  // home PÚBLICA. No celular a gaveta é a única navegação, então sem isto o
  // aluno logado não tem como voltar à vitrine.
  it("o logo aponta para a raiz, e como link de verdade", () => {
    abrirGaveta();
    const logo = screen.getByRole("link", { name: /Jilson Santana/ });

    expect(logo.getAttribute("href")).toBe("/");
  });
});

describe("MobileNav — o menu do aluno no celular", () => {
  // A gaveta é a ÚNICA navegação no celular: tem que concordar com o rail.
  it("tem Meus estudos, e o JilsonAI como EM BREVE sem link", () => {
    abrirGaveta();

    expect(screen.getByRole("link", { name: "Meus estudos" }).getAttribute("href")).toBe("/aluno/em-andamento");
    expect(screen.getByText("JilsonAI")).toBeTruthy();
    expect(screen.getByText("EM BREVE")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /JilsonAI/ })).toBeNull();
  });

  // A mesma etiqueta nas seções planejadas do admin (até 12/10/2026 a dele era
  // escolhida à parte; com um idioma só, é a do dicionário para todo mundo).
  it("a seção planejada do admin leva a etiqueta EM BREVE, sem link", () => {
    abrirGaveta(Role.ADMIN);

    const item = screen.getByText("Alunos").closest("[aria-disabled]");
    expect(item?.textContent).toContain("EM BREVE");
    expect(screen.queryByRole("link", { name: /Alunos/ })).toBeNull();
  });
});
