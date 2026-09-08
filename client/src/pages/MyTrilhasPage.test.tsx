// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { MyTrilhaSummary } from "@/lib/api";

const getMyTrilhas = vi.fn();
vi.mock("@/lib/api", () => ({ getMyTrilhas: () => getMyTrilhas() }));

import { MyTrilhasPage } from "./MyTrilhasPage";

const trilhaSalva: MyTrilhaSummary = {
  id: 7,
  name: "Fundamentos de Excel + IA",
  description: "Minha cópia da trilha de fundamentos.",
  skillsCovered: ["Excel", "IA aplicada"],
  sourcePlanId: 2,
  displayOrder: 0,
  _count: { planModules: 3 },
};

beforeEach(() => {
  getMyTrilhas.mockReset();
});

describe("MyTrilhasPage", () => {
  it("mostra o estado de carregando enquanto a busca não volta", () => {
    getMyTrilhas.mockReturnValue(new Promise(() => {})); // nunca resolve
    renderWithProviders(<MyTrilhasPage />);

    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("mostra o estado de erro quando a busca falha", async () => {
    getMyTrilhas.mockRejectedValue(new Error("500"));
    renderWithProviders(<MyTrilhasPage />);

    expect(await screen.findByText("Não foi possível carregar suas trilhas.")).toBeTruthy();
  });

  it("no estado vazio oferece SAÍDA para o catálogo, não só o aviso", async () => {
    getMyTrilhas.mockResolvedValue([]);
    renderWithProviders(<MyTrilhasPage />);

    expect(await screen.findByText("Você ainda não salvou nenhuma trilha.")).toBeTruthy();
    const saida = screen.getByRole("link", { name: "Ver trilhas do catálogo" });
    expect(saida.getAttribute("href")).toBe("/cursos");
  });

  it("lista as trilhas salvas e linka cada uma por id", async () => {
    getMyTrilhas.mockResolvedValue([trilhaSalva]);
    renderWithProviders(<MyTrilhasPage />);

    const link = await screen.findByRole("link", { name: /Fundamentos de Excel \+ IA/ });
    expect(link.getAttribute("href")).toBe("/minhas-trilhas/7");
    expect(screen.getByText("Minha cópia da trilha de fundamentos.")).toBeTruthy();
    expect(screen.getByText("IA aplicada")).toBeTruthy();
    expect(screen.queryByText("Você ainda não salvou nenhuma trilha.")).toBeNull();
  });
});
