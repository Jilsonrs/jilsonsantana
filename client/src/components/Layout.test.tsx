// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { Role } from "@jilson/core";

const useSession = vi.fn();
const signOut = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  useSession: () => useSession(),
  signOut: () => signOut(),
}));

import { Layout } from "./Layout";

function marca() {
  return screen.getByRole("link", { name: /Jilson Santana/ });
}

beforeEach(() => {
  vi.clearAllMocks();
  useSession.mockReturnValue({ data: null });
});

// O cabeçalho decide o que CADA PAPEL enxerga — é lógica de verdade, não
// decoração, e nunca teve teste. Um item de admin vazando para o aluno não
// dá acesso (o servidor barra), mas mostra a existência de uma área que ele
// não deveria conhecer.
describe("Layout — visitante sem sessão", () => {
  it("oferece Entrar e esconde as áreas de quem tem conta", () => {
    renderWithProviders(<Layout />);

    expect(screen.getByRole("link", { name: "Entrar" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Início" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Minha conta" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sair" })).toBeNull();
  });

  it("a marca leva para a landing pública", () => {
    renderWithProviders(<Layout />);
    expect(marca().getAttribute("href")).toBe("/");
  });
});

describe("Layout — aluno logado", () => {
  beforeEach(() => {
    useSession.mockReturnValue({ data: { user: { role: Role.MEMBER } } });
  });

  it("mostra Início, Catálogo, Minha conta e Sair", () => {
    renderWithProviders(<Layout />);

    expect(screen.getByRole("link", { name: "Início" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Catálogo" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Minha conta" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sair" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Entrar" })).toBeNull();
  });

  // Mandar quem já assina para a página que tenta convencê-lo a assinar.
  it("a marca leva para a home do aluno, não para a landing", () => {
    renderWithProviders(<Layout />);
    expect(marca().getAttribute("href")).toBe("/inicio");
  });

  it("NÃO vê o item de Admin", () => {
    renderWithProviders(<Layout />);
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
  });
});

describe("Layout — admin", () => {
  it("vê o item de Admin", () => {
    useSession.mockReturnValue({ data: { user: { role: Role.ADMIN } } });
    renderWithProviders(<Layout />);
    expect(screen.getByRole("link", { name: "Admin" })).toBeTruthy();
  });
});
