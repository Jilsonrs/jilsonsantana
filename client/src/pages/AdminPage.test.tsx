// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { AdminPage } from "./AdminPage";
import { IdiomaProvider } from "@/lib/language";

/** O cartão de um título — achado pelo nome acessível, não pelo visual. */
function cartao(titulo: string) {
  return screen.getByRole("group", { name: new RegExp(`^${titulo}`) });
}

// O Início do admin (decisão do operador, 29/09/2026): os relatórios que eram a
// seção "Dados", todos EM BREVE, e os atalhos que já existiam, embaixo.
describe("AdminPage — o Início do admin", () => {
  it("tem o título Início e as duas seções, nesta ordem", () => {
    renderWithProviders(<AdminPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Início");
    const secoes = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(secoes).toEqual(["Relatórios", "Atalhos"]);
  });

  // Nenhum número inventado: sem dado real, o bloco diz EM BREVE e não leva a
  // lugar nenhum.
  it("os 4 relatórios são EM BREVE e nenhum é link", () => {
    renderWithProviders(<AdminPage />);

    for (const titulo of ["Assinantes", "Aprendizado", "De onde vieram os alunos", "Uso do JilsonAI"]) {
      const c = cartao(titulo);
      expect(within(c).getByText("EM BREVE"), titulo).toBeTruthy();
      expect(within(c).queryByRole("link"), titulo).toBeNull();
    }
  });

  it("atalhos: Cursos e Site levam à tela deles; Trilhas é EM BREVE, sem link", () => {
    renderWithProviders(<AdminPage />);

    expect(screen.getByRole("link", { name: "Cursos" }).getAttribute("href")).toBe("/admin/cursos");
    expect(screen.getByRole("link", { name: "Site" }).getAttribute("href")).toBe("/admin/site");
    const trilhas = cartao("Trilhas");
    expect(within(trilhas).getByText("EM BREVE")).toBeTruthy();
    expect(within(trilhas).queryByRole("link")).toBeNull();
  });

  // O Admin não muda de idioma (decisão do operador, 23/09/2026).
  it("fica em português mesmo com o app em inglês", () => {
    renderWithProviders(
      <IdiomaProvider idioma="en">
        <AdminPage />
      </IdiomaProvider>,
    );

    expect(screen.getAllByText("EM BREVE")).toHaveLength(5);
    expect(screen.queryByText("COMING SOON")).toBeNull();
  });
});
