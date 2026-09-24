// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { Role } from "@jilson/core";
import { MobileNav } from "./MobileNav";

function abrirGaveta() {
  renderWithProviders(<MobileNav papel={Role.MEMBER} onSignOut={vi.fn()} />, {
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
