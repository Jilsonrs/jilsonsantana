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

import { useState } from "react";
import type { LanguageCode } from "@jilson/core";
import { CatalogPage } from "./CatalogPage";
import { IdiomaProvider } from "@/lib/language";

function emIngles(tipo: "cursos" | "trilhas") {
  return renderWithProviders(
    <IdiomaProvider idioma="en">
      <CatalogPage tipo={tipo} />
    </IdiomaProvider>,
  );
}

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

    await waitFor(() => expect(search).toHaveBeenCalledWith("procv", "pt"));
    // Aula aparece com o curso porque é dentro de um curso que o clique leva.
    expect(await screen.findByText("PROCV e ÍNDICE+CORRESP")).toBeTruthy();
    expect(screen.queryByText("Exemplo — Trilha Fundamentos")).toBeNull();
  });

  it("em /trilhas, a busca traz só trilhas", async () => {
    search.mockResolvedValue(resultado);
    renderWithProviders(<CatalogPage tipo="trilhas" />);
    await screen.findByText("Exemplo — Trilha Fundamentos");

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "procv" } });

    await waitFor(() => expect(search).toHaveBeenCalledWith("procv", "pt"));
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

// As listas seguem o IDIOMA DO APP (decisão do operador, 24/09/2026): são
// listas de descoberta. O idioma vai na consulta, e trocar o idioma refaz a lista.
describe("CatalogPage — idioma do app", () => {
  it("em inglês, pede os cursos em inglês e a tela fala inglês", async () => {
    emIngles("cursos");

    await waitFor(() => expect(getCourses).toHaveBeenCalledWith("en"));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Courses");
    expect(await screen.findByRole("heading", { name: "Course catalog" })).toBeTruthy();
    expect(screen.getByLabelText("Search")).toBeTruthy();
  });

  it("em inglês, as trilhas também vêm em inglês", async () => {
    emIngles("trilhas");
    await waitFor(() => expect(getTrilhas).toHaveBeenCalledWith("en"));
  });

  it("trocar o idioma refaz a lista no idioma novo", async () => {
    function Trocavel() {
      const [idioma, setIdioma] = useState<LanguageCode>("pt");
      return (
        <>
          <button onClick={() => setIdioma("en")}>trocar</button>
          <IdiomaProvider idioma={idioma}>
            <CatalogPage tipo="cursos" />
          </IdiomaProvider>
        </>
      );
    }
    renderWithProviders(<Trocavel />);
    await waitFor(() => expect(getCourses).toHaveBeenCalledWith("pt"));

    fireEvent.click(screen.getByRole("button", { name: "trocar" }));
    await waitFor(() => expect(getCourses).toHaveBeenCalledWith("en"));
  });

  it("catálogo em inglês vazio tem o aviso em inglês", async () => {
    getCourses.mockResolvedValue([]);
    emIngles("cursos");

    expect(await screen.findByText("No courses available yet.")).toBeTruthy();
  });

  it("a busca em inglês procura em inglês", async () => {
    search.mockResolvedValue({ query: "procv", trilhas: [], courses: [], lessons: [] });
    emIngles("cursos");
    await screen.findByText("Exemplo — Fundamentos de Excel + IA");

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "procv" } });

    await waitFor(() => expect(search).toHaveBeenCalledWith("procv", "en"));
    expect(await screen.findByText(/No results for "procv"/)).toBeTruthy();
  });
});

describe("CatalogPage — cartão do curso", () => {
  it("o nível aparece pelo NOME, não pelo valor do sistema", async () => {
    renderWithProviders(<CatalogPage tipo="cursos" />);

    expect(await screen.findByText("Intermediário")).toBeTruthy();
    expect(screen.queryByText("INTERMEDIARIO")).toBeNull();
  });

  it("em inglês, o nível e a contagem em inglês", async () => {
    emIngles("cursos");

    expect(await screen.findByText("Intermediate")).toBeTruthy();
    expect(screen.getByText("1 module · 2 lessons")).toBeTruthy();
  });

  // Revisão do inglês (24/09): singular só no 1, nos dois idiomas; zero é plural.
  it("1 módulo e 1 aula no singular", async () => {
    getCourses.mockResolvedValue([{ ...course, moduleCount: 1, lessonCount: 1 }]);
    renderWithProviders(<CatalogPage tipo="cursos" />);

    expect(await screen.findByText("1 módulo · 1 aula")).toBeTruthy();
  });

  it("curso publicado com 0 aulas aparece com 0 aulas, sem quebrar", async () => {
    getCourses.mockResolvedValue([{ ...course, moduleCount: 0, lessonCount: 0 }]);
    renderWithProviders(<CatalogPage tipo="cursos" />);

    expect(await screen.findByText("0 módulos · 0 aulas")).toBeTruthy();
  });
});
