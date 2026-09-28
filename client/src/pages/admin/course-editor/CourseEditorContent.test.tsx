// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { AdminCourseDetail, AdminModule } from "@/lib/api";
import { CURSO_DE_TESTE } from "./curso-de-teste";

const adminGetCourse = vi.fn();
const updateCourseStructure = vi.fn();
vi.mock("@/lib/api", () => ({
  adminGetCourse: (...args: unknown[]) => adminGetCourse(...args),
  updateCourseStructure: (...args: unknown[]) => updateCourseStructure(...args),
}));

import { CourseEditorLayout } from "./CourseEditorLayout";
import { ROTAS_DO_EDITOR } from "./steps";

// O PASSO CONTEÚDO (Bloco E, etapa 2 — plano aprovado pelo operador em
// 28/09/2026): a ordem vai INTEIRA numa gravação só.

function modulo(id: number, titulo: string, aulas: [number, string][]): AdminModule {
  return {
    id,
    courseId: 1,
    title: titulo,
    layer: null,
    displayOrder: 0,
    status: "DRAFT",
    lessons: aulas.map(([aulaId, t]) => ({ id: aulaId, moduleId: id, title: t, tags: [], displayOrder: 0, status: "DRAFT" })),
  };
}

const COM_CONTEUDO: AdminCourseDetail = {
  ...CURSO_DE_TESTE,
  modules: [
    modulo(1, "Fundamentos", [[11, "Abertura"], [12, "Fórmulas"]]),
    modulo(2, "Automação", [[21, "Macros"]]),
  ],
};

beforeEach(() => {
  adminGetCourse.mockReset().mockResolvedValue(COM_CONTEUDO);
  updateCourseStructure.mockReset().mockResolvedValue(undefined);
});

async function abrir() {
  renderWithProviders(<CourseEditorLayout />, {
    route: "/admin/cursos/1/conteudo",
    path: "/admin/cursos/:id",
    filhas: ROTAS_DO_EDITOR,
  });
  await screen.findByRole("button", { name: "Descer o módulo Fundamentos" });
}

describe("Conteúdo — as setas mandam a ordem inteira", () => {
  it("descer um módulo manda a lista inteira, com as aulas junto", async () => {
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Descer o módulo Fundamentos" }));

    await waitFor(() => expect(updateCourseStructure).toHaveBeenCalled());
    expect(updateCourseStructure).toHaveBeenCalledWith(1, {
      modulos: [
        { id: 2, aulas: [21] },
        { id: 1, aulas: [11, 12] },
      ],
    });
  });

  it("descer uma aula muda só o módulo dela", async () => {
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Descer a aula Abertura" }));

    await waitFor(() => expect(updateCourseStructure).toHaveBeenCalled());
    expect(updateCourseStructure.mock.calls[0][1]).toEqual({
      modulos: [
        { id: 1, aulas: [12, 11] },
        { id: 2, aulas: [21] },
      ],
    });
  });

  it("o primeiro não sobe e o último não desce", async () => {
    await abrir();
    const botao = (nome: string) => screen.getByRole("button", { name: nome }) as HTMLButtonElement;
    expect(botao("Subir o módulo Fundamentos").disabled).toBe(true);
    expect(botao("Descer o módulo Automação").disabled).toBe(true);
    expect(botao("Subir a aula Abertura").disabled).toBe(true);
    expect(botao("Descer a aula Fórmulas").disabled).toBe(true);
  });

  it("falhou ao gravar a ordem: avisa", async () => {
    updateCourseStructure.mockRejectedValue(new Error("500"));
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Descer o módulo Fundamentos" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível mudar a ordem. Tente de novo.");
  });

  // O valor do banco (DRAFT) nunca aparece na tela.
  it("o status do módulo e da aula aparece em português", async () => {
    await abrir();
    const status = screen.getAllByLabelText("Status do módulo")[0] as HTMLSelectElement;
    expect([...status.options].map((o) => o.textContent)).toEqual(["Rascunho", "Publicado", "Arquivado"]);
    expect(screen.queryByText("DRAFT")).toBeNull();
  });
});
