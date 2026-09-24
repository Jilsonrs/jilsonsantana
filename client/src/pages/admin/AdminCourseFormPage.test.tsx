// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { AdminCourseDetail } from "@/lib/api";

const adminGetCourse = vi.fn();
const createCourse = vi.fn();
const updateCourse = vi.fn();
const createModule = vi.fn();
vi.mock("@/lib/api", () => ({
  adminGetCourse: (...args: unknown[]) => adminGetCourse(...args),
  createCourse: (...args: unknown[]) => createCourse(...args),
  updateCourse: (...args: unknown[]) => updateCourse(...args),
  createModule: (...args: unknown[]) => createModule(...args),
}));

import { AdminCourseFormPage } from "./AdminCourseFormPage";

const existingCourse: AdminCourseDetail = {
  id: 1,
  slug: "exemplo-fundamentos-excel-ia",
  title: "Exemplo — Fundamentos de Excel + IA",
  subtitle: null,
  description: null,
  level: null,
  learnTags: ["PROCX"],
  requirements: [],
  personas: [],
  highlights: null,
  faq: null,
  camadas: [],
  thumbnailUrl: null,
  introVideoId: null,
  displayOrder: 0,
  status: "DRAFT",
  language: "pt",
  modules: [],
};

beforeEach(() => {
  adminGetCourse.mockReset();
  createCourse.mockReset();
  updateCourse.mockReset();
  createModule.mockReset();
});

describe("AdminCourseFormPage", () => {
  it("create mode: submits a new course with learnTags parsed from lines", async () => {
    createCourse.mockResolvedValue({ ...existingCourse, id: 2 });
    renderWithProviders(<AdminCourseFormPage />, { route: "/admin/cursos/novo" });

    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "curso-teste" } });
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Curso Teste" } });
    fireEvent.change(screen.getByLabelText(/learnTags/), {
      target: { value: "Fórmulas\nPROCX" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados do curso" }));

    await waitFor(() =>
      expect(createCourse).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "curso-teste",
          title: "Curso Teste",
          learnTags: ["Fórmulas", "PROCX"],
        }),
      ),
    );
  });

  it("edit mode: prefills from the fetched course and submits an update", async () => {
    adminGetCourse.mockResolvedValue(existingCourse);
    updateCourse.mockResolvedValue(existingCourse);
    renderWithProviders(<AdminCourseFormPage />, {
      route: "/admin/cursos/1",
      path: "/admin/cursos/:id",
    });

    const titleInput = (await screen.findByLabelText("Título")) as HTMLInputElement;
    await waitFor(() =>
      expect(titleInput.value).toBe("Exemplo — Fundamentos de Excel + IA"),
    );

    fireEvent.change(titleInput, { target: { value: "Título Editado" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados do curso" }));

    await waitFor(() =>
      expect(updateCourse).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: "Título Editado", learnTags: ["PROCX"] }),
      ),
    );
  });

  it("edit mode: adding a module calls createModule with the courseId", async () => {
    adminGetCourse.mockResolvedValue(existingCourse);
    createModule.mockResolvedValue({ id: 10 });
    renderWithProviders(<AdminCourseFormPage />, {
      route: "/admin/cursos/1",
      path: "/admin/cursos/:id",
    });

    const input = await screen.findByPlaceholderText("Título do novo módulo");
    fireEvent.change(input, { target: { value: "Módulo Novo" } });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar módulo/ }));

    await waitFor(() =>
      expect(createModule).toHaveBeenCalledWith({
        courseId: 1,
        title: "Módulo Novo",
        displayOrder: 0,
      }),
    );
  });
});

// Idioma do curso (decisões do operador: campo na criação, 14/09; troca só
// enquanto rascunho, 24/09/2026).
describe("AdminCourseFormPage — idioma", () => {
  it("criar: nasce em Português e pode virar English", async () => {
    createCourse.mockResolvedValue({ ...existingCourse, id: 2 });
    renderWithProviders(<AdminCourseFormPage />, { route: "/admin/cursos/novo" });

    const idioma = screen.getByLabelText("Idioma") as HTMLSelectElement;
    expect(idioma.value).toBe("pt");

    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "curso-en" } });
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "English course" } });
    fireEvent.change(idioma, { target: { value: "en" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados do curso" }));

    await waitFor(() => expect(createCourse).toHaveBeenCalled());
    expect(createCourse.mock.calls[0][0]).toMatchObject({ slug: "curso-en", language: "en" });
  });

  it("rascunho: o idioma troca", async () => {
    adminGetCourse.mockResolvedValue(existingCourse);
    updateCourse.mockResolvedValue(existingCourse);
    renderWithProviders(<AdminCourseFormPage />, { route: "/admin/cursos/1", path: "/admin/cursos/:id" });

    const idioma = (await screen.findByLabelText("Idioma")) as HTMLSelectElement;
    await waitFor(() => expect(idioma.value).toBe("pt"));
    fireEvent.change(idioma, { target: { value: "en" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados do curso" }));

    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect(updateCourse.mock.calls[0][1]).toMatchObject({ language: "en" });
  });

  it("publicado: o idioma aparece travado, com o motivo, e vai o mesmo no envio", async () => {
    const publicado = { ...existingCourse, status: "PUBLISHED" as const, language: "en" as const };
    adminGetCourse.mockResolvedValue(publicado);
    updateCourse.mockResolvedValue(publicado);
    renderWithProviders(<AdminCourseFormPage />, { route: "/admin/cursos/1", path: "/admin/cursos/:id" });

    expect(await screen.findByText("O idioma trava depois que o curso é publicado.")).toBeTruthy();
    expect(screen.getByText("English")).toBeTruthy();
    expect(screen.queryByLabelText("Idioma")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Salvar dados do curso" }));
    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect(updateCourse.mock.calls[0][1]).toMatchObject({ language: "en" });
  });
});

// Antes a tela não dizia nada quando o salvamento falhava (achado da etapa 3c,
// consertado a pedido do operador em 24/09/2026).
describe("AdminCourseFormPage — quando salvar falha", () => {
  function recusa(codigo?: string) {
    return { response: { status: 409, data: codigo ? { error: codigo } : {} } };
  }

  async function salvarEdicao() {
    adminGetCourse.mockResolvedValue(existingCourse);
    renderWithProviders(<AdminCourseFormPage />, { route: "/admin/cursos/1", path: "/admin/cursos/:id" });
    const titulo = (await screen.findByLabelText("Título")) as HTMLInputElement;
    await waitFor(() => expect(titulo.value).toBe(existingCourse.title));
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados do curso" }));
  }

  it.each([
    ["SlugTaken", "Este slug já está em uso por outro curso."],
    ["LanguageLocked", "O idioma trava depois que o curso é publicado."],
    ["LanguageInUse", "Este curso está numa trilha de outro idioma. Tire-o da trilha antes de trocar o idioma."],
    [undefined, "Não foi possível salvar o curso. Tente de novo."],
  ])("recusa %s mostra a frase certa", async (codigo, frase) => {
    updateCourse.mockRejectedValue(recusa(codigo));
    await salvarEdicao();

    expect((await screen.findByRole("alert")).textContent).toBe(frase);
  });

  it("queda de rede (sem resposta do servidor) também avisa", async () => {
    updateCourse.mockRejectedValue(new Error("Network Error"));
    await salvarEdicao();

    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível salvar o curso. Tente de novo.");
  });

  it("o aviso some quando o salvamento seguinte dá certo", async () => {
    updateCourse.mockRejectedValueOnce(recusa("SlugTaken")).mockResolvedValue(existingCourse);
    await salvarEdicao();
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "Salvar dados do curso" }));
    await waitFor(() => expect(updateCourse).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});
