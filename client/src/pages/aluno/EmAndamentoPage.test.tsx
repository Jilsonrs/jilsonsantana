// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { EmAndamentoPage } from "./EmAndamentoPage";
import { IdiomaProvider } from "@/lib/language";

// Em andamento é a porta de entrada de Meus estudos (decisão do operador,
// 29/09/2026). Por ora só o título, que é o que identifica a página.
describe("EmAndamentoPage", () => {
  it("o título diz onde a pessoa está", () => {
    renderWithProviders(<EmAndamentoPage />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Em andamento");
  });

  it("em inglês", () => {
    renderWithProviders(
      <IdiomaProvider idioma="en">
        <EmAndamentoPage />
      </IdiomaProvider>,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("In progress");
  });
});
