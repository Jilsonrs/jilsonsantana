// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const useSessionMock = vi.fn();
vi.mock("@/lib/auth-client", () => ({ useSession: () => useSessionMock() }));

import { ProtectedRoute } from "./ProtectedRoute";

function renderAt() {
  return render(
    <MemoryRouter initialEntries={["/aluno/conta"]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/aluno/conta" element={<div>conta privada</div>} />
        </Route>
        <Route path="/login" element={<div>tela de login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => useSessionMock.mockReset());

  it("redirects to /login when there is no session", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: false });
    renderAt();
    expect(screen.getByText("tela de login")).toBeTruthy();
    expect(screen.queryByText("conta privada")).toBeNull();
  });

  it("renders the protected content when authenticated", () => {
    useSessionMock.mockReturnValue({
      data: { user: { role: "member" } },
      isPending: false,
    });
    renderAt();
    expect(screen.getByText("conta privada")).toBeTruthy();
  });

  // A conferência da sessão FALHOU (rede, servidor) ao abrir a página: quem está
  // logado não pode ser mandado para o login (06/10/2026).
  it("a sessão não veio por falha (rede, 5xx): a tela de erro, não o login", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: false, error: { status: 502 } });
    renderAt();
    expect(screen.getByRole("alert").textContent).toBe("Algo deu errado ao abrir esta tela.");
    expect(screen.queryByText("tela de login")).toBeNull();
    expect(screen.queryByText("conta privada")).toBeNull();
  });

  it("401 é sem login: vai para o login", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: false, error: { status: 401 } });
    renderAt();
    expect(screen.getByText("tela de login")).toBeTruthy();
  });
});
