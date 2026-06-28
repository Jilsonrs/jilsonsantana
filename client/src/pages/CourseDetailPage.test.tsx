// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { CourseDetail } from "@/lib/api";

const getCourseBySlug = vi.fn();
vi.mock("@/lib/api", () => ({ getCourseBySlug: (...args: unknown[]) => getCourseBySlug(...args) }));

import { CourseDetailPage } from "./CourseDetailPage";

const baseCourse: CourseDetail = {
  id: 1,
  slug: "exemplo-fundamentos-excel-ia",
  title: "Exemplo — Fundamentos de Excel + IA",
  subtitle: "Da lógica de fórmulas ao copiloto de IA",
  description: null,
  level: "INTERMEDIARIO",
  learnTags: ["PROCX", "Tabelas dinâmicas"],
  requirements: ["Ter o Excel instalado"],
  personas: ["Analistas de dados"],
  highlights: [{ icon: "sparkles", title: "IA do seu lado", text: "Gere lógica com o JilsonAI." }],
  faq: [],
  camadas: ["UNIVERSAL", "IA"],
  thumbnailUrl: null,
  introVideoId: null,
  moduleCount: 1,
  lessonCount: 2,
  modules: [
    {
      id: 10,
      title: "Base Lógica Inquebrável",
      layer: "UNIVERSAL",
      displayOrder: 0,
      status: "PUBLISHED",
      lessons: [
        { id: 100, title: "PROCV e ÍNDICE+CORRESP", tags: ["procv"], displayOrder: 0 },
      ],
    },
  ],
};

beforeEach(() => {
  getCourseBySlug.mockReset();
});

describe("CourseDetailPage", () => {
  it("renders hero, selo (only the marked layers), learnTags and the module accordion", async () => {
    getCourseBySlug.mockResolvedValue(baseCourse);
    renderWithProviders(<CourseDetailPage />, { route: "/curso/exemplo-fundamentos-excel-ia", path: "/curso/:slug" });

    expect(await screen.findByText("Exemplo — Fundamentos de Excel + IA")).toBeTruthy();
    expect(screen.getByText("Fundamentos sólidos")).toBeTruthy();
    expect(screen.getByText("Com IA do seu lado")).toBeTruthy();
    expect(screen.queryByText("Recursos modernos")).toBeNull();
    expect(screen.getByText("PROCX")).toBeTruthy();

    screen.getByText("Base Lógica Inquebrável").click();
    await waitFor(() => expect(screen.getByText("PROCV e ÍNDICE+CORRESP")).toBeTruthy());
  });

  it("does not render the FAQ accordion when faq is empty", async () => {
    getCourseBySlug.mockResolvedValue(baseCourse);
    renderWithProviders(<CourseDetailPage />, { route: "/curso/exemplo-fundamentos-excel-ia", path: "/curso/:slug" });

    await screen.findByText("Exemplo — Fundamentos de Excel + IA");
    expect(screen.queryByText("Perguntas frequentes")).toBeNull();
  });

  it("shows a not-found state when the course doesn't exist", async () => {
    getCourseBySlug.mockRejectedValue(new Error("404"));
    renderWithProviders(<CourseDetailPage />, { route: "/curso/inexistente", path: "/curso/:slug" });

    expect(await screen.findByText("Curso não encontrado.")).toBeTruthy();
  });
});
