// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { CourseCard, TrilhaCard, SearchResult } from "@/lib/api";

const getTrilhas = vi.fn();
const getCourses = vi.fn();
const search = vi.fn();
vi.mock("@/lib/api", () => ({
  getTrilhas: (...args: unknown[]) => getTrilhas(...args),
  getCourses: (...args: unknown[]) => getCourses(...args),
  search: (...args: unknown[]) => search(...args),
}));

import { CatalogPage } from "./CatalogPage";

const trilha: TrilhaCard = {
  id: 2,
  slug: "exemplo-fundamentos",
  name: "Exemplo — Trilha Fundamentos",
  description: null,
  skillsCovered: ["Excel"],
  displayOrder: 0,
  _count: { planModules: 1 },
};
const course: CourseCard = {
  id: 1,
  slug: "exemplo-fundamentos-excel-ia",
  title: "Exemplo — Fundamentos de Excel + IA",
  subtitle: null,
  level: "INTERMEDIARIO",
  thumbnailUrl: null,
  camadas: ["UNIVERSAL"],
  displayOrder: 0,
  moduleCount: 1,
  lessonCount: 2,
};

beforeEach(() => {
  getTrilhas.mockReset().mockResolvedValue([trilha]);
  getCourses.mockReset().mockResolvedValue([course]);
  search.mockReset();
});

describe("CatalogPage — /cursos e /trilhas são telas SEPARADAS", () => {
  // A regra que estes testes seguram (operador, set/2026): "se clicou em cursos
  // aparece só cursos, o mesmo com trilhas". Antes era uma tela só, "Catálogo",
  // com as duas listas empilhadas.
  it("a tela de cursos mostra curso e NÃO mostra trilha", async () => {
    renderWithProviders(<CatalogPage tipo="cursos" />);

    expect(await screen.findByText("Exemplo — Fundamentos de Excel + IA")).toBeTruthy();
    expect(screen.queryByText("Exemplo — Trilha Fundamentos")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Cursos");
  });

  it("a tela de trilhas mostra trilha e NÃO mostra curso", async () => {
    renderWithProviders(<CatalogPage tipo="trilhas" />);

    expect(await screen.findByText("Exemplo — Trilha Fundamentos")).toBeTruthy();
    expect(screen.queryByText("Exemplo — Fundamentos de Excel + IA")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Trilhas");
  });

  it("cada tela busca SÓ o que mostra", async () => {
    renderWithProviders(<CatalogPage tipo="cursos" />);
    await screen.findByText("Exemplo — Fundamentos de Excel + IA");

    // Estando em /cursos não há por que pedir trilhas ao servidor.
    expect(getCourses).toHaveBeenCalled();
    expect(getTrilhas).not.toHaveBeenCalled();
  });

  it("lista vazia tem estado próprio em cada tela", async () => {
    getCourses.mockResolvedValue([]);
    renderWithProviders(<CatalogPage tipo="cursos" />);

    expect(await screen.findByText("Nenhum curso publicado ainda.")).toBeTruthy();
  });

  it("quando a lista falha, a tela diz qual lista falhou", async () => {
    getTrilhas.mockRejectedValue(new Error("500"));
    renderWithProviders(<CatalogPage tipo="trilhas" />);

    expect(await screen.findByText("Não foi possível carregar as trilhas.")).toBeTruthy();
  });
});

describe("CatalogPage — busca", () => {
  const resultado: SearchResult = {
    query: "procv",
    trilhas: [trilha],
    courses: [course],
    lessons: [
      {
        id: 100,
        title: "PROCV e ÍNDICE+CORRESP",
        tags: ["procv"],
        module: {
          title: "Base Lógica",
          course: { slug: "exemplo-fundamentos-excel-ia", title: "Exemplo" },
        },
      },
    ],
  };

  it("em /cursos, a busca traz cursos e AULAS, nunca trilhas", async () => {
    search.mockResolvedValue(resultado);
    renderWithProviders(<CatalogPage tipo="cursos" />);
    await screen.findByText("Exemplo — Fundamentos de Excel + IA");

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "procv" } });

    await waitFor(() => expect(search).toHaveBeenCalledWith("procv"));
    // Aula aparece com o curso porque é dentro de um curso que o clique leva.
    expect(await screen.findByText("PROCV e ÍNDICE+CORRESP")).toBeTruthy();
    expect(screen.queryByText("Exemplo — Trilha Fundamentos")).toBeNull();
  });

  it("em /trilhas, a busca traz só trilhas", async () => {
    search.mockResolvedValue(resultado);
    renderWithProviders(<CatalogPage tipo="trilhas" />);
    await screen.findByText("Exemplo — Trilha Fundamentos");

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "procv" } });

    await waitFor(() => expect(search).toHaveBeenCalledWith("procv"));
    expect(screen.queryByText("PROCV e ÍNDICE+CORRESP")).toBeNull();
    expect(screen.queryByText("Exemplo — Fundamentos de Excel + IA")).toBeNull();
  });

  it("busca sem resultado do tipo da tela avisa, mesmo achando do outro tipo", async () => {
    search.mockResolvedValue({ ...resultado, courses: [], lessons: [] });
    renderWithProviders(<CatalogPage tipo="cursos" />);
    await screen.findByText("Exemplo — Fundamentos de Excel + IA");

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "procv" } });

    // O servidor achou uma TRILHA, mas esta tela é de cursos: para quem está
    // aqui, não há resultado. Dizer "achamos" e não mostrar nada seria pior.
    expect(await screen.findByText('Nada encontrado para "procv".')).toBeTruthy();
  });
});
