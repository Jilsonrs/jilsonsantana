// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { CURSO_DE_TESTE } from "./curso-de-teste";

const createCourse = vi.fn();
const adminGetCourse = vi.fn();
vi.mock("@/lib/api", () => ({
  createCourse: (...args: unknown[]) => createCourse(...args),
  adminGetCourse: (...args: unknown[]) => adminGetCourse(...args),
}));

import { NewCoursePage } from "./NewCoursePage";
import { CourseEditorLayout } from "./CourseEditorLayout";

beforeEach(() => {
  createCourse.mockReset();
});

// NOVO CURSO mostra só o passo 1; criar grava e abre o editor (Bloco E,
// etapa 1 — plano aprovado pelo operador em 28/09/2026).
function abrir() {
  renderWithProviders(<NewCoursePage />, {
    route: "/admin/cursos/novo",
    extraRoutes: [{ path: "/admin/cursos/:id/basico", element: <p>editor aberto</p> }],
  });
}

function preencher(slug: string, titulo: string) {
  fireEvent.change(screen.getByLabelText("Slug"), { target: { value: slug } });
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: titulo } });
  fireEvent.click(screen.getByRole("button", { name: "Criar curso" }));
}

describe("Novo curso", () => {
  it("cria com o passo 1 e abre o editor do curso criado", async () => {
    createCourse.mockResolvedValue({ ...CURSO_DE_TESTE, id: 2 });
    abrir();
    preencher("curso-teste", "Curso Teste");

    await waitFor(() => expect(createCourse).toHaveBeenCalled());
    expect(createCourse.mock.calls[0][0]).toMatchObject({ slug: "curso-teste", title: "Curso Teste", language: "pt" });
    expect(Object.keys(createCourse.mock.calls[0][0]).sort()).toEqual([
      "description",
      "language",
      "level",
      "slug",
      "subtitle",
      "title",
    ]);
    expect(await screen.findByText("editor aberto")).toBeTruthy();
  });

  it("sem título, nada é criado", async () => {
    abrir();
    preencher("curso-teste", "");

    expect(await screen.findByText("Obrigatório")).toBeTruthy();
    expect(createCourse).not.toHaveBeenCalled();
  });

  // O idioma nasce na criação (decisão do operador, 14/09/2026).
  it("nasce em Português e pode virar English", async () => {
    createCourse.mockResolvedValue({ ...CURSO_DE_TESTE, id: 2 });
    abrir();

    const idioma = screen.getByLabelText("Idioma") as HTMLSelectElement;
    expect(idioma.value).toBe("pt");
    fireEvent.change(idioma, { target: { value: "en" } });
    preencher("curso-en", "English course");

    await waitFor(() => expect(createCourse).toHaveBeenCalled());
    expect(createCourse.mock.calls[0][0]).toMatchObject({ slug: "curso-en", language: "en" });
  });

  // A capa e o vídeo vão para um curso que já existe: antes de criar, não há onde enviar.
  it("não oferece enviar capa nem vídeo", () => {
    abrir();
    expect(screen.queryByRole("button", { name: "Enviar imagem" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Enviar vídeo" })).toBeNull();
  });

  it("recusa do servidor aparece na tela", async () => {
    createCourse.mockRejectedValue({ response: { status: 409, data: { error: "SlugTaken" } } });
    abrir();
    preencher("curso-teste", "Curso Teste");

    expect((await screen.findByRole("alert")).textContent).toBe("Este slug já está em uso por outro curso.");
    expect(screen.queryByText("editor aberto")).toBeNull();
  });
});

// O CRIAR CURSO NO TOPO (decisões do operador, 03/10/2026, a partir da Udemy):
// depois de "Voltar para cursos", sem linha embaixo; o erro sai na mensagem
// flutuante, e o editor abre dizendo "Curso criado.".
describe("Novo curso — o botão no topo e a mensagem", () => {
  it("um Criar curso só, no topo, logo depois de Voltar para cursos", () => {
    abrir();
    const criar = screen.getByRole("button", { name: "Criar curso" });
    const voltar = screen.getByRole("link", { name: "Voltar para cursos" });
    expect(screen.getAllByRole("button", { name: "Criar curso" })).toHaveLength(1);
    expect(voltar.nextElementSibling).toBe(criar);
  });

  it("criou: o editor abre com a mensagem \"Curso criado.\"", async () => {
    createCourse.mockResolvedValue({ ...CURSO_DE_TESTE, id: 2 });
    adminGetCourse.mockResolvedValue({ ...CURSO_DE_TESTE, id: 2 });
    renderWithProviders(<NewCoursePage />, {
      route: "/admin/cursos/novo",
      extraRoutes: [{ path: "/admin/cursos/:id/basico", element: <CourseEditorLayout /> }],
    });
    preencher("curso-teste", "Curso Teste");

    expect(await screen.findByText("Curso criado.")).toBeTruthy();
    expect(adminGetCourse).toHaveBeenCalledWith(2);
  });

  it("sem título: a mensagem pede para conferir", async () => {
    abrir();
    preencher("curso-teste", "");
    expect((await screen.findByRole("alert")).textContent).toBe("Confira os campos marcados antes de salvar.");
  });
});
