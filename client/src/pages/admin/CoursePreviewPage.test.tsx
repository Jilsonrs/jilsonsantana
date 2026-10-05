// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { useParams } from "react-router-dom";
import { renderWithProviders } from "@/test-utils";
import type { PaginaDaAula } from "@/lib/api";

const getAdminCoursePage = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getAdminCoursePage: (id: number) => getAdminCoursePage(id),
  // O "Sobre o curso" lê os textos comuns; sem servidor, valem os de fábrica.
  getCommonTexts: () => Promise.reject(new Error("sem servidor")),
}));

import { CoursePreviewPage } from "./CoursePreviewPage";

// A PRÉ-VISUALIZAÇÃO DO CURSO COMO ALUNO (passo Publicar — decisão do operador,
// 04/10/2026): com aula, vai para a primeira, mesmo em rascunho; sem aula, a tela
// do aluno com o que o curso já tem.

const CURSO: PaginaDaAula["curso"] = {
  id: 5,
  slug: "excel-ia",
  title: "Excel com IA",
  language: "pt",
  status: "DRAFT",
  level: null,
  description: "Um curso **prático** de Excel.",
  learnTags: ["Fórmulas dinâmicas"],
  requirements: [],
  personas: [],
  highlights: null,
  faq: null,
  camadas: [],
  materiais: [],
  videoSeconds: 0,
  modulos: [],
};

const aula = (id: number, status: "PUBLISHED" | "DRAFT") => ({ id, title: `Aula ${id}`, kind: "VIDEO" as const, isFreePreview: false, status, temArquivos: false });

function AulaAberta() {
  return <p>página da aula {useParams().id}</p>;
}

function abrir(rota = "/admin/cursos/5/previa") {
  renderWithProviders(<CoursePreviewPage />, {
    route: rota,
    path: "/admin/cursos/:id/previa",
    extraRoutes: [{ path: "/aluno/aula/:id", element: <AulaAberta /> }],
  });
}

beforeEach(() => {
  getAdminCoursePage.mockReset().mockResolvedValue({ curso: CURSO });
});

describe("Pré-visualização — estados", () => {
  it("carregando", () => {
    getAdminCoursePage.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("erro: avisa", async () => {
    getAdminCoursePage.mockRejectedValue(new Error("rede"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível abrir a pré-visualização deste curso.");
  });

  it("endereço com id inválido: avisa, sem perguntar ao servidor", async () => {
    abrir("/admin/cursos/abc/previa");
    expect((await screen.findByRole("alert")).textContent).toContain("pré-visualização");
    expect(getAdminCoursePage).not.toHaveBeenCalled();
  });
});

describe("Pré-visualização — o curso", () => {
  it("sem aula: o título, o aviso no lugar do player e o que já foi preenchido", async () => {
    abrir();
    expect(await screen.findByRole("heading", { name: "Excel com IA", level: 1 })).toBeTruthy();
    expect(screen.getByText("Este curso ainda não tem aulas.")).toBeTruthy();
    expect(screen.getByText("Fórmulas dinâmicas")).toBeTruthy();
    expect(getAdminCoursePage).toHaveBeenCalledWith(5);
  });

  it("com aula: vai para a PRIMEIRA, mesmo em rascunho", async () => {
    getAdminCoursePage.mockResolvedValue({
      curso: { ...CURSO, modulos: [{ id: 1, title: "M", status: "DRAFT", aulas: [aula(31, "DRAFT"), aula(32, "PUBLISHED")] }] },
    });
    abrir();
    expect(await screen.findByText("página da aula 31")).toBeTruthy();
  });
});
