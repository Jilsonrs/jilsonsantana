// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";

const useSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({ useSession: () => useSession() }));

import { StudentHomePage } from "./StudentHomePage";
import { IdiomaProvider } from "@/lib/language";

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

  // "Por onde começar" é navegação, não decoração: com a tela vazia, são as
  // únicas portas de saída além do botão. Um card que não leva a lugar nenhum
  // deixaria o aluno num beco — o mesmo defeito que a tela "Minhas trilhas"
  // existiu para consertar.
  describe("as portas de entrada levam a algum lugar", () => {
    it("cada card aponta para a rota que anuncia", () => {
      renderWithProviders(<StudentHomePage />);

      expect(screen.getByRole("link", { name: /Catálogo/ }).getAttribute("href")).toBe("/cursos");
      expect(screen.getByRole("link", { name: /Minhas trilhas/ }).getAttribute("href")).toBe(
        "/minhas-trilhas",
      );
    });
  });
});

// O app do aluno existe em inglês (decisão do operador, 24/09/2026).
describe("StudentHomePage — em inglês", () => {
  it("a home do aluno fala inglês, sem sobra de português", () => {
    useSession.mockReturnValue({ data: { user: { name: "Ana Souza" } }, isPending: false });
    renderWithProviders(
      <IdiomaProvider idioma="en">
        <StudentHomePage />
      </IdiomaProvider>,
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Hi, Ana");
    expect(screen.getByRole("heading", { name: "Keep learning" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Browse the catalog" }).getAttribute("href")).toBe("/cursos");
    expect(screen.queryByText("Continue estudando")).toBeNull();
    expect(screen.queryByText("Por onde começar")).toBeNull();
  });
});
