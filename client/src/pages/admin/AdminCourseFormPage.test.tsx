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
    fireEvent.click(screen.getByRole("button", { name: "Salvar curso" }));

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
    fireEvent.click(screen.getByRole("button", { name: "Salvar curso" }));

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
