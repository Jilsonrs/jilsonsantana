// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { useParams } from "react-router-dom";
import { renderWithProviders } from "@/test-utils";

const getCourseBySlug = vi.fn();
vi.mock("@/lib/api", () => ({
  getCourseBySlug: (...args: unknown[]) => getCourseBySlug(...args),
}));

import { CourseEntryPage } from "./CourseEntryPage";

// A ENTRADA DO ALUNO NUM CURSO (decisão do operador, 29/09/2026): vai para a
// PRIMEIRA aula publicada, na ordem do Conteúdo.

/** O destino mostra o número da aula a que chegou: é o que se afirma. */
function AulaDeDestino() {
  const { id } = useParams();
  return <p>página da aula {id}</p>;
}

const abrir = () =>
  renderWithProviders(<CourseEntryPage />, {
    route: "/aluno/curso/excel",
    path: "/aluno/curso/:slug",
    extraRoutes: [{ path: "/aluno/aula/:id", element: <AulaDeDestino /> }],
  });

const curso = (modulos: { lessons: { id: number }[] }[]) => ({ modules: modulos });

// Com chaves: devolver o dublê faria o Vitest chamá-lo de novo como "limpeza" ao
// fim do teste, e a rejeição dessa chamada extra quebraria o teste de erro.
beforeEach(() => {
  getCourseBySlug.mockReset();
});

describe("entrada no curso", () => {
  it("vai para a primeira aula do primeiro módulo que tem aula", async () => {
    getCourseBySlug.mockResolvedValue(curso([{ lessons: [] }, { lessons: [{ id: 21 }, { id: 22 }] }, { lessons: [{ id: 31 }] }]));
    abrir();
    expect(await screen.findByText("página da aula 21")).toBeTruthy();
  });

  it("curso sem aula publicada: diz isso", async () => {
    getCourseBySlug.mockResolvedValue(curso([{ lessons: [] }]));
    abrir();
    expect(await screen.findByText("Este curso ainda não tem aulas.")).toBeTruthy();
  });

  it("curso que não existe: não encontrado", async () => {
    getCourseBySlug.mockRejectedValue(new Error("404"));
    abrir();
    expect(await screen.findByText("Curso não encontrado.")).toBeTruthy();
  });
});
