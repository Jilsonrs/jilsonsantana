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

describe("CatalogPage", () => {
  it("renders the default catalog with trilha and course cards", async () => {
    renderWithProviders(<CatalogPage />);

    expect(await screen.findByText("Exemplo — Trilha Fundamentos")).toBeTruthy();
    expect(screen.getByText("Exemplo — Fundamentos de Excel + IA")).toBeTruthy();
  });

  it("swaps to search results once 2+ chars are typed", async () => {
    const result: SearchResult = {
      query: "procv",
      trilhas: [],
      courses: [],
      lessons: [
        {
          id: 100,
          title: "PROCV e ÍNDICE+CORRESP",
          tags: ["procv"],
          module: { title: "Base Lógica", course: { slug: "exemplo-fundamentos-excel-ia", title: "Exemplo" } },
        },
      ],
    };
    search.mockResolvedValue(result);
    renderWithProviders(<CatalogPage />);
    await screen.findByText("Exemplo — Trilha Fundamentos");

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "procv" } });

    await waitFor(() => expect(search).toHaveBeenCalledWith("procv"));
    expect(await screen.findByText("PROCV e ÍNDICE+CORRESP")).toBeTruthy();
    expect(screen.queryByText("Exemplo — Fundamentos de Excel + IA")).toBeNull();
  });
});
