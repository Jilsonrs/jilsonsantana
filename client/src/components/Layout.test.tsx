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
  document.cookie = "sidebar_state=; max-age=0; path=/";
});

// O Layout escolhe entre DUAS gramáticas pela sessão: cabeçalho público para
// quem não entrou, shell de aplicação (barra lateral) para quem entrou. Quais
// itens cada papel vê é assunto do AppSidebar e tem teste próprio.
describe("Layout — visitante sem sessão", () => {
  it("recebe o cabeçalho público, não a barra lateral", () => {
    renderWithProviders(<Layout />);

    expect(screen.getByRole("link", { name: "Entrar" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Catálogo" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Início" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Minha conta" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sair" })).toBeNull();
    expect(screen.queryByRole("button", { name: /barra lateral/i })).toBeNull();
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

  it("troca o cabeçalho pela barra lateral", () => {
    renderWithProviders(<Layout />);

    expect(screen.getByRole("link", { name: "Início" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Minha conta" })).toBeTruthy();
    // O cabeçalho público não sobra por baixo: "Entrar" é o item que só existe
    // lá, e vê-lo logado significaria as duas gramáticas na mesma tela.
    expect(screen.queryByRole("link", { name: "Entrar" })).toBeNull();
  });

  // Mandar quem já assina para a página que tenta convencê-lo a assinar.
  it("a marca leva para a home do aluno, não para a landing", () => {
    renderWithProviders(<Layout />);
    expect(marca().getAttribute("href")).toBe("/inicio");
  });

  it("oferece o botão que recolhe e expande", () => {
    renderWithProviders(<Layout />);
    expect(screen.getByRole("button", { name: /barra lateral/i })).toBeTruthy();
  });
});

// A peça do shadcn ESCREVE este cookie e nunca o lê — quem lê, no desenho
// dela, é um servidor que renderiza, e aqui não existe. Sem a leitura que o
// Layout faz, a barra voltaria aberta a cada visita: nenhum erro, nenhum log,
// só o aluno recolhendo de novo todo dia. Por isso é teste e não confiança.
describe("Layout — o estado da barra sobrevive à visita seguinte", () => {
  beforeEach(() => {
    useSession.mockReturnValue({ data: { user: { role: Role.MEMBER } } });
  });

  it("volta RECOLHIDA quando foi assim que ficou", () => {
    document.cookie = "sidebar_state=false; path=/";
    renderWithProviders(<Layout />);

    expect(document.querySelector('[data-state="collapsed"]')).toBeTruthy();
    expect(document.querySelector('[data-state="expanded"]')).toBeNull();
  });

  it("volta ABERTA quando foi assim que ficou", () => {
    document.cookie = "sidebar_state=true; path=/";
    renderWithProviders(<Layout />);

    expect(document.querySelector('[data-state="expanded"]')).toBeTruthy();
  });

  it("começa ABERTA na primeira visita, sem cookie", () => {
    renderWithProviders(<Layout />);

    expect(document.querySelector('[data-state="expanded"]')).toBeTruthy();
  });
});
