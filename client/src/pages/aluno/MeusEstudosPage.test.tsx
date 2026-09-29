// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { MyTrilhaSummary } from "@/lib/api";

const getMyTrilhas = vi.fn();
vi.mock("@/lib/api", () => ({ getMyTrilhas: () => getMyTrilhas() }));

import { MeusEstudosPage } from "./MeusEstudosPage";
import { IdiomaProvider } from "@/lib/language";

function trilha(id: number): MyTrilhaSummary {
  return {
    id,
    name: `Trilha ${id}`,
    description: null,
    skillsCovered: [],
    sourcePlanId: 2,
    displayOrder: 0,
    _count: { planModules: 1 },
  };
}

beforeEach(() => {
  getMyTrilhas.mockReset();
});

// A tela Meus estudos (decisão do operador, 29/09/2026): um cartão por item do
// nível 2. Só Minhas trilhas existe hoje; os outros três são EM BREVE.
describe("MeusEstudosPage", () => {
  it("mostra os quatro itens, e só Minhas trilhas leva a algum lugar", async () => {
    getMyTrilhas.mockResolvedValue([trilha(1)]);
    renderWithProviders(<MeusEstudosPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Meus estudos");
    const titulos = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titulos).toEqual([
      "Em andamentoEM BREVE",
      "Minhas trilhas",
      "ConcluídosEM BREVE",
      "CertificadosEM BREVE",
    ]);
    // O que ainda não existe é texto, nunca link (mesma trava do menu).
    await screen.findByRole("link", { name: "Abrir minhas trilhas" });
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("carregando, enquanto a busca não volta", () => {
    getMyTrilhas.mockReturnValue(new Promise(() => {})); // nunca resolve
    renderWithProviders(<MeusEstudosPage />);

    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("erro, quando a busca falha", async () => {
    getMyTrilhas.mockRejectedValue(new Error("500"));
    renderWithProviders(<MeusEstudosPage />);

    expect(await screen.findByText("Não foi possível carregar suas trilhas.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Abrir minhas trilhas" })).toBeNull();
  });

  it("vazio: diz que não há trilha salva e leva às trilhas prontas", async () => {
    getMyTrilhas.mockResolvedValue([]);
    renderWithProviders(<MeusEstudosPage />);

    expect(await screen.findByText("Você ainda não salvou nenhuma trilha.")).toBeTruthy();
    const saida = screen.getByRole("link", { name: "Ver as trilhas prontas" });
    expect(saida.getAttribute("href")).toBe("/trilhas");
  });

  it("com trilhas: conta quantas e leva a Minhas trilhas", async () => {
    getMyTrilhas.mockResolvedValue([trilha(1), trilha(2)]);
    renderWithProviders(<MeusEstudosPage />);

    expect(await screen.findByText("2 trilhas salvas")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Abrir minhas trilhas" });
    expect(link.getAttribute("href")).toBe("/aluno/minhas-trilhas");
  });

  it("uma trilha só fica no singular", async () => {
    getMyTrilhas.mockResolvedValue([trilha(1)]);
    renderWithProviders(<MeusEstudosPage />);

    expect(await screen.findByText("1 trilha salva")).toBeTruthy();
  });
});

describe("MeusEstudosPage — em inglês", () => {
  it("títulos, etiqueta e contagem em inglês", async () => {
    getMyTrilhas.mockResolvedValue([trilha(1), trilha(2)]);
    renderWithProviders(
      <IdiomaProvider idioma="en">
        <MeusEstudosPage />
      </IdiomaProvider>,
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("My learning");
    expect(screen.getAllByText("COMING SOON")).toHaveLength(3);
    expect(await screen.findByText("2 saved learning paths")).toBeTruthy();
  });
});
