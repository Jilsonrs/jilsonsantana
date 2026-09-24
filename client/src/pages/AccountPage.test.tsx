// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";

const useSession = vi.fn();
const signOut = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  useSession: () => useSession(),
  signOut: () => signOut(),
}));

import { AccountPage } from "./AccountPage";
import { IdiomaProvider } from "@/lib/language";

// Minha conta mostra os dados da SESSÃO e o botão de sair. Não busca nada —
// por isso não tem estado de carregando nem de erro próprio.

function renderConta(ui = <AccountPage />) {
  return renderWithProviders(ui, {
    route: "/conta",
    path: "/conta",
    extraRoutes: [{ path: "/login", element: <div>TELA DE LOGIN</div> }],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useSession.mockReturnValue({
    data: { user: { name: "Ana Souza", email: "ana@exemplo.com", role: "member" } },
  });
  signOut.mockResolvedValue(undefined);
});

describe("AccountPage", () => {
  it("mostra os dados da conta", () => {
    renderConta();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Minha conta");
    expect(screen.getByText("Ana Souza")).toBeTruthy();
    expect(screen.getByText("ana@exemplo.com")).toBeTruthy();
  });

  it("sem nome na conta, mostra um traço em vez de deixar o campo vazio", () => {
    useSession.mockReturnValue({ data: { user: { email: "ana@exemplo.com", role: "member" } } });
    renderConta();

    expect(screen.getAllByText("—")).toHaveLength(1);
  });

  it("sair encerra a sessão e leva ao login", async () => {
    renderConta();
    fireEvent.click(screen.getByRole("button", { name: "Sair da plataforma" }));

    expect(await screen.findByText("TELA DE LOGIN")).toBeTruthy();
    expect(signOut).toHaveBeenCalled();
  });

  // O app do aluno existe em inglês (decisão do operador, 24/09/2026).
  it("em inglês: títulos, rótulos e o botão de sair em inglês", () => {
    renderConta(
      <IdiomaProvider idioma="en">
        <AccountPage />
      </IdiomaProvider>,
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("My account");
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
    expect(screen.queryByText("Nome")).toBeNull();
  });
});
