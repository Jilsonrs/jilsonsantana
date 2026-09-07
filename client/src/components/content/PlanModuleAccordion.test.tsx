// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { PlanModuleAccordion } from "./PlanModuleAccordion";
import type { PlanModuleDetail } from "@/lib/api";

const moduloComCurso: PlanModuleDetail = {
  id: 20,
  title: "Comece por aqui",
  displayOrder: 0,
  items: [
    {
      id: 200,
      itemType: "COURSE",
      displayOrder: 0,
      course: {
        id: 1,
        slug: "exemplo-fundamentos-excel-ia",
        title: "Exemplo — Fundamentos de Excel + IA",
        subtitle: null,
        level: "INTERMEDIARIO",
        thumbnailUrl: null,
        camadas: ["UNIVERSAL"],
      },
      lesson: null,
    },
    {
      id: 201,
      itemType: "LESSON",
      displayOrder: 1,
      course: null,
      lesson: { id: 10, title: "Aula avulsa de apoio", tags: ["setup"] },
    },
  ],
};

describe("PlanModuleAccordion", () => {
  it("mostra o estado vazio quando a trilha não tem módulos", () => {
    renderWithProviders(<PlanModuleAccordion planModules={[]} />);

    expect(screen.getByText("Esta trilha ainda não tem conteúdo.")).toBeTruthy();
  });

  it("linka o item de CURSO para a página do curso", async () => {
    renderWithProviders(<PlanModuleAccordion planModules={[moduloComCurso]} />);

    screen.getByText("Comece por aqui").click();
    const link = await screen.findByRole("link", { name: "Exemplo — Fundamentos de Excel + IA" });
    expect(link.getAttribute("href")).toBe("/curso/exemplo-fundamentos-excel-ia");
  });

  it("mostra o item de AULA como texto, sem link (aula ainda não tem página própria)", async () => {
    renderWithProviders(<PlanModuleAccordion planModules={[moduloComCurso]} />);

    screen.getByText("Comece por aqui").click();
    expect(await screen.findByText("Aula avulsa de apoio")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Aula avulsa de apoio" })).toBeNull();
  });
});
