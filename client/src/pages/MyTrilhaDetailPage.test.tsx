// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { TrilhaDetail } from "@/lib/api";

const getMyTrilha = vi.fn();
vi.mock("@/lib/api", () => ({ getMyTrilha: (id: number) => getMyTrilha(id) }));

import { MyTrilhaDetailPage } from "./MyTrilhaDetailPage";

const minhaTrilha: TrilhaDetail = {
  id: 7,
  slug: null, // o clone do aluno não tem slug — é alcançado por id
  name: "Fundamentos de Excel + IA",
  description: "Minha cópia da trilha de fundamentos.",
  skillsCovered: ["Excel", "IA aplicada"],
  planModules: [
    {
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
      ],
    },
  ],
};

const rota = { route: "/minhas-trilhas/7", path: "/minhas-trilhas/:id" };

beforeEach(() => {
  getMyTrilha.mockReset();
});

describe("MyTrilhaDetailPage", () => {
  it("mostra o estado de carregando enquanto a busca não volta", () => {
    getMyTrilha.mockReturnValue(new Promise(() => {})); // nunca resolve
    renderWithProviders(<MyTrilhaDetailPage />, rota);

    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("mostra o estado de erro quando a trilha não é do aluno (404) ou a busca falha", async () => {
    getMyTrilha.mockRejectedValue(new Error("404"));
    renderWithProviders(<MyTrilhaDetailPage />, rota);

    expect(await screen.findByText("Não foi possível carregar esta trilha.")).toBeTruthy();
  });

  it("busca pelo id da URL convertido para NÚMERO", async () => {
    getMyTrilha.mockResolvedValue(minhaTrilha);
    renderWithProviders(<MyTrilhaDetailPage />, rota);

    await screen.findByRole("heading", { name: "Fundamentos de Excel + IA" });
    expect(getMyTrilha).toHaveBeenCalledWith(7);
  });

  it("mostra a trilha e sua árvore de conteúdo, com volta para a lista", async () => {
    getMyTrilha.mockResolvedValue(minhaTrilha);
    renderWithProviders(<MyTrilhaDetailPage />, rota);

    expect(await screen.findByRole("heading", { name: "Fundamentos de Excel + IA" })).toBeTruthy();
    expect(screen.getByText("IA aplicada")).toBeTruthy();

    const volta = screen.getByRole("link", { name: "← Voltar para Minhas Trilhas" });
    expect(volta.getAttribute("href")).toBe("/minhas-trilhas");

    screen.getByText("Comece por aqui").click();
    const curso = await screen.findByRole("link", { name: "Exemplo — Fundamentos de Excel + IA" });
    expect(curso.getAttribute("href")).toBe("/curso/exemplo-fundamentos-excel-ia");
  });
});
