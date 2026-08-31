// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";

const useSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({ useSession: () => useSession() }));

import { StudentHomePage } from "./StudentHomePage";

beforeEach(() => {
  vi.clearAllMocks();
  useSession.mockReturnValue({
    data: { user: { name: "Jilson Santana", email: "j@x.com" } },
    isPending: false,
  });
});

describe("StudentHomePage", () => {
  it("cumprimenta pelo PRIMEIRO nome", () => {
    renderWithProviders(<StudentHomePage />);
    expect(screen.getByRole("heading", { name: "Olá, Jilson" })).toBeTruthy();
  });

  // O `name` é OPCIONAL no modelo de usuário (CLAUDE.md → Auth: um gestor
  // corporativo pode ser convidado só com e-mail). Sem este caso, a home
  // cumprimentaria "Olá, undefined" para essa pessoa.
  it("sem nome cadastrado, cumprimenta sem quebrar", () => {
    useSession.mockReturnValue({ data: { user: { email: "j@x.com" } }, isPending: false });
    renderWithProviders(<StudentHomePage />);
    expect(screen.getByRole("heading", { name: "Olá" })).toBeTruthy();
  });

  // Estado vazio é o ÚNICO estado desta tela hoje — ela não busca dados, por
  // isso não tem carregando nem erro. Quando passar a buscar, os três entram
  // juntos com os testes deles.
  it("mostra o vazio explicando o que vai aparecer, não 'nenhum curso'", () => {
    renderWithProviders(<StudentHomePage />);
    expect(
      screen.getByText(/aulas em andamento aparecem aqui assim que você começar/i),
    ).toBeTruthy();
  });

  it("oferece o catálogo como saída do estado vazio", () => {
    renderWithProviders(<StudentHomePage />);
    const link = screen.getByRole("link", { name: "Ver catálogo" });
    expect(link.getAttribute("href")).toBe("/cursos");
  });
});
