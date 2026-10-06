// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { Role } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";

const useSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  useSession: () => useSession(),
  signOut: () => Promise.resolve(),
}));

// O shell e o Início buscam dados; aqui só importa EM QUE TELA a pessoa chega.
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  getCommonTexts: () => new Promise(() => {}),
  updateMyLanguage: () => Promise.resolve(),
  getNotificacoes: () => Promise.resolve({ naoLidas: 0, itens: [] }),
  getMyTrilhas: () => Promise.resolve([]),
}));

import App from "./App";

// ENDEREÇO QUE NÃO EXISTE NO APP LEVA AO INÍCIO (decisão do operador, 06/10/2026,
// P44); antes, a página ficava em branco.
describe("endereço que não existe no app", () => {
  beforeEach(() => {
    useSession.mockReturnValue({ data: { user: { name: "Ana Souza", role: Role.MEMBER } }, isPending: false, error: null });
  });

  it("um favorito antigo (/conta) leva ao Início", async () => {
    renderWithProviders(<App />, { route: "/conta" });
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toContain("Olá");
  });

  it("um endereço digitado errado dentro de /aluno também", async () => {
    renderWithProviders(<App />, { route: "/aluno/nao-existe" });
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toContain("Olá");
  });

  it("um endereço que existe não é desviado (Minha conta continua em /aluno/conta)", async () => {
    renderWithProviders(<App />, { route: "/aluno/conta" });
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Minha conta");
  });
});
