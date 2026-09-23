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
  return screen.getAllByRole("link", { name: /Jilson Santana/ })[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  useSession.mockReturnValue({ data: null });
});

// O Layout escolhe entre DUAS gramáticas pela sessão: cabeçalho público para
// quem não entrou, navegação em três níveis para quem entrou. QUAIS itens cada
// papel vê é assunto do mapa e do AppRail, que têm testes próprios.
describe("Layout — visitante sem sessão", () => {
  it("recebe o cabeçalho público, não o rail", () => {
    renderWithProviders(<Layout />);

    expect(screen.getByRole("link", { name: "Entrar" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Catálogo" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Início" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Minha conta" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Principal" })).toBeNull();
  });

  it("a marca leva para a landing pública", () => {
    renderWithProviders(<Layout />);
    expect(marca().getAttribute("href")).toBe("/");
  });
});

describe("Layout — quem entrou", () => {
  beforeEach(() => {
    useSession.mockReturnValue({ data: { user: { role: Role.MEMBER } } });
  });

  it("troca o cabeçalho público pelo rail", () => {
    renderWithProviders(<Layout />);

    expect(screen.getByRole("navigation", { name: "Principal" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Início" })).toBeTruthy();
    // "Entrar" só existe no cabeçalho público: vê-lo logado significaria as
    // duas gramáticas na mesma tela.
    expect(screen.queryByRole("link", { name: "Entrar" })).toBeNull();
  });

  // REVERTIDO em set/2026, por decisão do operador. Este teste guardava o
  // oposto — "a marca leva para a home do aluno, não para a landing" —, com o
  // argumento de não mandar quem já assina para a página que tenta convencê-lo
  // a assinar. O operador decidiu que o logo é a SAÍDA para a vitrine, porque o
  // app já tem o item "Início" para a casa de dentro. E a vitrine deixou de ser
  // uma página de venda pura: quem está logado vê "Meus estudos" no cabeçalho,
  // não "Entrar" — então o argumento antigo perdeu o alvo.
  it("a marca leva para a home PÚBLICA", () => {
    renderWithProviders(<Layout />);
    expect(marca().getAttribute("href")).toBe("/");
  });

  // O rail é `md:block`: abaixo disso a gaveta é a ÚNICA navegação que existe,
  // e sem este botão o celular fica sem navegação nenhuma.
  it("oferece o botão do menu no celular", () => {
    renderWithProviders(<Layout />);
    expect(screen.getByRole("button", { name: "Abrir o menu" })).toBeTruthy();
  });
});
