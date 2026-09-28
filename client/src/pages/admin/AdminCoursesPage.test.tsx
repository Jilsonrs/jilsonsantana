// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { AdminCourseCard } from "@/lib/api";

const adminGetCourses = vi.fn();
const deleteCourse = vi.fn();
vi.mock("@/lib/api", () => ({
  adminGetCourses: (...args: unknown[]) => adminGetCourses(...args),
  deleteCourse: (...args: unknown[]) => deleteCourse(...args),
}));

import { AdminCoursesPage } from "./AdminCoursesPage";

// Um curso vazio: nada preenchido ainda.
const course: AdminCourseCard = {
  id: 1,
  slug: "exemplo-fundamentos-excel-ia",
  title: "Exemplo — Fundamentos de Excel + IA",
  status: "DRAFT",
  language: "pt",
  displayOrder: 0,
  moduleCount: 2,
  lessonCount: 3,
  thumbnailUrl: null,
  hasIntroVideo: false,
  hasDescription: false,
  publishedLessonCount: 0,
};

const completo: AdminCourseCard = {
  ...course,
  id: 2,
  slug: "completo",
  title: "Curso completo",
  status: "PUBLISHED",
  thumbnailUrl: "https://img.jilsonsantana.com/cursos/completo.webp",
  hasIntroVideo: true,
  hasDescription: true,
  publishedLessonCount: 3,
};

beforeEach(() => {
  adminGetCourses.mockReset().mockResolvedValue([course]);
  deleteCourse.mockReset().mockResolvedValue(undefined);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("AdminCoursesPage", () => {
  it("renders every course regardless of status, with an edit link", async () => {
    renderWithProviders(<AdminCoursesPage />);

    expect(await screen.findByText("Exemplo — Fundamentos de Excel + IA")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Editar" }).getAttribute("href")).toBe(
      "/admin/cursos/1",
    );
  });

  it("deletes a course after confirmation", async () => {
    renderWithProviders(<AdminCoursesPage />);
    await screen.findByText("Exemplo — Fundamentos de Excel + IA");

    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));

    // TanStack Query v5's mutationFn is invoked with a second internal
    // context argument — assert on the actual variable passed, not an exact
    // arg-count match.
    await waitFor(() => expect(deleteCourse.mock.calls[0]?.[0]).toBe(1));
  });
});

describe("AdminCoursesPage — idioma", () => {
  it("curso em inglês ganha a etiqueta EN; em português, não", async () => {
    adminGetCourses.mockResolvedValue([
      course,
      { ...course, id: 2, slug: "curso-en", title: "English course", language: "en" },
    ]);
    renderWithProviders(<AdminCoursesPage />);

    await screen.findByText("English course");
    expect(screen.getAllByText("EN")).toHaveLength(1);
  });
});

// O cartão do curso (plano aprovado pelo operador em 27/09/2026): capa, status
// em português, os números que virão na Fase 5 e o preenchimento.
describe("AdminCoursesPage — o cartão do curso", () => {
  const cartao = (titulo: string) => screen.findByRole("article", { name: titulo });

  it("com capa: a imagem do curso; sem capa: \"Sem imagem\"", async () => {
    adminGetCourses.mockResolvedValue([course, completo]);
    renderWithProviders(<AdminCoursesPage />);

    const img = await screen.findByAltText("Capa de Curso completo");
    expect(img.getAttribute("src")).toBe(completo.thumbnailUrl);
    expect(within(await cartao(course.title)).getByText("Sem imagem")).toBeTruthy();
  });

  it("o status sai em português, nunca o valor do banco", async () => {
    adminGetCourses.mockResolvedValue([
      course,
      completo,
      { ...course, id: 3, slug: "arq", title: "Arquivado", status: "ARCHIVED" },
    ]);
    renderWithProviders(<AdminCoursesPage />);

    await screen.findByText("Curso completo");
    expect(screen.getByText("Rascunho")).toBeTruthy();
    expect(screen.getByText("Publicado")).toBeTruthy();
    expect(screen.getAllByText("Arquivado").length).toBeGreaterThan(0);
    expect(screen.queryByText("DRAFT")).toBeNull();
    expect(screen.queryByText("PUBLISHED")).toBeNull();
  });

  it("os três números da Fase 5 aparecem como placeholder, e não há preço", async () => {
    renderWithProviders(<AdminCoursesPage />);
    const c = within(await cartao(course.title));

    for (const rotulo of ["Horas assistidas", "Alunos", "Avaliação"]) {
      expect(c.getByText(rotulo)).toBeTruthy();
    }
    expect(c.getAllByText("—")).toHaveLength(3);
    expect(c.getAllByText("em breve")).toHaveLength(3);
    expect(c.queryByText(/R\$/)).toBeNull();
  });

  it("curso vazio: 0% e os quatro itens que faltam", async () => {
    renderWithProviders(<AdminCoursesPage />);
    const c = within(await cartao(course.title));

    expect(c.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
    expect(c.getByText("0%")).toBeTruthy();
    for (const falta of ["Falta a capa", "Falta o vídeo de apresentação", "Falta a descrição", "Nenhuma aula publicada"]) {
      expect(c.getByText(falta)).toBeTruthy();
    }
  });

  it("curso completo: 100% e nada faltando", async () => {
    adminGetCourses.mockResolvedValue([completo]);
    renderWithProviders(<AdminCoursesPage />);
    const c = within(await cartao(completo.title));

    expect(c.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
    expect(c.queryByText(/^Falta/)).toBeNull();
    expect(c.queryByText("Nenhuma aula publicada")).toBeNull();
  });

  it("preenchimento pela metade: 50%, e só o que falta aparece", async () => {
    adminGetCourses.mockResolvedValue([{ ...course, thumbnailUrl: "/img/x.jpg", publishedLessonCount: 1 }]);
    renderWithProviders(<AdminCoursesPage />);
    const c = within(await cartao(course.title));

    expect(c.getByText("50%")).toBeTruthy();
    expect(c.queryByText("Falta a capa")).toBeNull();
    expect(c.queryByText("Nenhuma aula publicada")).toBeNull();
    expect(c.getByText("Falta o vídeo de apresentação")).toBeTruthy();
    expect(c.getByText("Falta a descrição")).toBeTruthy();
  });
});

describe("AdminCoursesPage — estados da tela", () => {
  it("carregando", () => {
    adminGetCourses.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AdminCoursesPage />);
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("erro ao carregar", async () => {
    adminGetCourses.mockRejectedValue(new Error("500"));
    renderWithProviders(<AdminCoursesPage />);
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar os cursos.");
  });

  it("nenhum curso", async () => {
    adminGetCourses.mockResolvedValue([]);
    renderWithProviders(<AdminCoursesPage />);
    expect(await screen.findByText("Nenhum curso ainda. Crie o primeiro em Novo curso.")).toBeTruthy();
  });
});
