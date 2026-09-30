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
  videoSeconds: 3900, // 1h 05min
  thumbnailUrl: null,
  hasIntroVideo: false,
  descriptionWordCount: 0,
  publishedLessonCount: 0,
  lessonsWithoutVideo: 0,
};

const completo: AdminCourseCard = {
  ...course,
  id: 2,
  slug: "completo",
  title: "Curso completo",
  status: "PUBLISHED",
  thumbnailUrl: "https://img.jilsonsantana.com/cursos/completo.webp",
  hasIntroVideo: true,
  descriptionWordCount: 250,
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

// Excluir apaga no Bunny antes (decisão do operador, 28/09/2026): se o Bunny
// recusar, o curso fica, e a tela diz o porquê.
describe("AdminCoursesPage — quando excluir falha", () => {
  it("o Bunny recusou: diz que o vídeo ou os arquivos não foram apagados", async () => {
    deleteCourse.mockRejectedValue({ response: { status: 502, data: { error: "BunnyNaoApagou" } } });
    renderWithProviders(<AdminCoursesPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Não foi possível excluir: o Bunny não apagou o vídeo ou os arquivos. Tente de novo.",
    );
  });

  it("outra falha: aviso geral", async () => {
    deleteCourse.mockRejectedValue(new Error("rede"));
    renderWithProviders(<AdminCoursesPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível excluir. Tente de novo.");
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
  // A duração também na lista do admin (operador, 30/09/2026): "2 módulos · 5
  // aulas · 1h 05min", somando todo vídeo enviado, como o topo do editor.
  it("a linha das contagens termina com a duração", async () => {
    renderWithProviders(<AdminCoursesPage />);
    expect(await screen.findByText("2 módulos · 3 aulas · 1h 05min")).toBeTruthy();
  });

  it("curso sem vídeo mostra 0min", async () => {
    adminGetCourses.mockResolvedValue([{ ...course, videoSeconds: 0 }]);
    renderWithProviders(<AdminCoursesPage />);
    expect(await screen.findByText("2 módulos · 3 aulas · 0min")).toBeTruthy();
  });

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

  // Cinco itens desde o vídeo das aulas (28/09/2026): cada um vale 20%.
  it("preenchimento pela metade: 60%, e só o que falta aparece", async () => {
    adminGetCourses.mockResolvedValue([{ ...course, thumbnailUrl: "/img/x.jpg", publishedLessonCount: 1 }]);
    renderWithProviders(<AdminCoursesPage />);
    const c = within(await cartao(course.title));

    expect(c.getByText("60%")).toBeTruthy();
    expect(c.queryByText("Falta a capa")).toBeNull();
    expect(c.queryByText("Nenhuma aula publicada")).toBeNull();
    expect(c.getByText("Falta o vídeo de apresentação")).toBeTruthy();
    expect(c.getByText("Falta a descrição")).toBeTruthy();
  });
});

// Descrição com menos de 200 palavras conta como falta, sem impedir o salvar
// (decisão do operador, 28/09/2026).
describe("AdminCoursesPage — descrição curta", () => {
  const cartao = (titulo: string) => screen.findByRole("article", { name: titulo });

  it("com 199 palavras: não conta, e o que falta diz que está curta", async () => {
    adminGetCourses.mockResolvedValue([{ ...completo, descriptionWordCount: 199 }]);
    renderWithProviders(<AdminCoursesPage />);
    const c = within(await cartao(completo.title));

    expect(c.getByText("80%")).toBeTruthy();
    expect(c.getByText("Descrição curta (menos de 200 palavras)")).toBeTruthy();
    expect(c.queryByText("Falta a descrição")).toBeNull();
  });

  it("com 200 palavras: conta", async () => {
    adminGetCourses.mockResolvedValue([{ ...completo, descriptionWordCount: 200 }]);
    renderWithProviders(<AdminCoursesPage />);
    const c = within(await cartao(completo.title));

    expect(c.getByText("100%")).toBeTruthy();
    expect(c.queryByText(/Descrição curta/)).toBeNull();
  });
});

// O QUINTO ITEM: aula de vídeo publicada sem o vídeo (Bloco U, etapa 3 — 28/09/2026).
describe("AdminCoursesPage — aulas sem vídeo", () => {
  const cartao = (titulo: string) => screen.findByRole("article", { name: titulo });

  it.each([
    [1, "1 aula sem vídeo"],
    [3, "3 aulas sem vídeo"],
  ])("%i aula(s) de vídeo sem o vídeo: não conta, e diz quantas", async (quantas, texto) => {
    adminGetCourses.mockResolvedValue([{ ...completo, lessonsWithoutVideo: quantas }]);
    renderWithProviders(<AdminCoursesPage />);
    const c = within(await cartao(completo.title));
    expect(c.getByText("80%")).toBeTruthy();
    expect(c.getByText(texto)).toBeTruthy();
  });

  // Curso sem aula nenhuma não ganha o item de graça, e não repete o aviso.
  it("curso sem aula publicada: o item não conta, e não aparece \"0 aulas sem vídeo\"", async () => {
    renderWithProviders(<AdminCoursesPage />);
    const c = within(await cartao(course.title));
    expect(c.getByText("0%")).toBeTruthy();
    expect(c.queryByText(/sem vídeo/)).toBeNull();
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
