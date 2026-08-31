// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { TrilhaDetail } from "@/lib/api";

const getTrilhaBySlug = vi.fn();
const saveTrilha = vi.fn();
vi.mock("@/lib/api", () => ({
  getTrilhaBySlug: (...args: unknown[]) => getTrilhaBySlug(...args),
  saveTrilha: (...args: unknown[]) => saveTrilha(...args),
}));

const useSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({ useSession: () => useSession() }));

import { TrilhaDetailPage } from "./TrilhaDetailPage";

const baseTrilha: TrilhaDetail = {
  id: 2,
  slug: "exemplo-fundamentos",
  name: "Exemplo — Trilha Fundamentos",
  description: "Trilha de exemplo.",
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

beforeEach(() => {
  getTrilhaBySlug.mockReset();
  saveTrilha.mockReset();
  useSession.mockReset();
});

describe("TrilhaDetailPage", () => {
  it("renders the module/item tree and links the course item to its course page", async () => {
    getTrilhaBySlug.mockResolvedValue(baseTrilha);
    useSession.mockReturnValue({ data: null, isPending: false });
    renderWithProviders(<TrilhaDetailPage />, { route: "/trilha/exemplo-fundamentos", path: "/trilha/:slug" });

    expect(await screen.findByText("Exemplo — Trilha Fundamentos")).toBeTruthy();
    screen.getByText("Comece por aqui").click();
    const link = await screen.findByRole("link", { name: "Exemplo — Fundamentos de Excel + IA" });
    expect(link.getAttribute("href")).toBe("/curso/exemplo-fundamentos-excel-ia");
  });

  it("prompts logged-out visitors to log in instead of showing the save button", async () => {
    getTrilhaBySlug.mockResolvedValue(baseTrilha);
    useSession.mockReturnValue({ data: null, isPending: false });
    renderWithProviders(<TrilhaDetailPage />, { route: "/trilha/exemplo-fundamentos", path: "/trilha/:slug" });

    expect(await screen.findByRole("link", { name: "Entrar para salvar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Salvar trilha" })).toBeNull();
  });

  it("lets a logged-in member save the trilha", async () => {
    getTrilhaBySlug.mockResolvedValue(baseTrilha);
    useSession.mockReturnValue({ data: { user: { id: "u1" } }, isPending: false });
    saveTrilha.mockResolvedValue({ id: 99 });
    renderWithProviders(<TrilhaDetailPage />, { route: "/trilha/exemplo-fundamentos", path: "/trilha/:slug" });

    const button = await screen.findByRole("button", { name: "Salvar trilha" });
    button.click();

    await waitFor(() => expect(screen.getByRole("button", { name: "Trilha salva ✓" })).toBeTruthy());
    expect(saveTrilha).toHaveBeenCalledWith(2);
  });

  it("shows a not-found state when the trilha doesn't exist", async () => {
    getTrilhaBySlug.mockRejectedValue(new Error("404"));
    useSession.mockReturnValue({ data: null, isPending: false });
    renderWithProviders(<TrilhaDetailPage />, { route: "/trilha/inexistente", path: "/trilha/:slug" });

    expect(await screen.findByText("Trilha não encontrada.")).toBeTruthy();
  });
});
