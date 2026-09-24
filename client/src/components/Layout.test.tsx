// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { Role } from "@jilson/core";

const useSession = vi.fn();
const signOut = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  useSession: () => useSession(),
  signOut: () => signOut(),
}));

// O rodapé do app busca os textos comuns; aqui só importa SE ele aparece.
vi.mock("@/lib/api", () => ({
  COMMON_TEXTS_QUERY: "site-text-common",
  getCommonTexts: () => new Promise(() => {}),
  updateMyLanguage: () => Promise.resolve(),
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

  it("não recebe o rodapé do app — a superfície pública tem o dela, no servidor", () => {
    renderWithProviders(<Layout />);
    expect(screen.queryByRole("contentinfo")).toBeNull();
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

  // Decisão do operador (24/09/2026): rodapé em TODA tela depois do login,
  // do aluno e do admin.
  it("o aluno tem o rodapé do app", () => {
    renderWithProviders(<Layout />);
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });

  it("o admin também tem o rodapé do app", () => {
    useSession.mockReturnValue({ data: { user: { role: Role.ADMIN } } });
    renderWithProviders(<Layout />);
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });
});

// O app do aluno existe em inglês (decisão do operador, 24/09/2026); o Admin
// não muda de idioma (decisão dele, 23/09). O idioma é decidido AQUI, no shell.
describe("Layout — em inglês", () => {
  it("aluno com a conta em inglês: o menu fala inglês", () => {
    useSession.mockReturnValue({ data: { user: { role: Role.MEMBER, preferredLanguage: "en" } } });
    renderWithProviders(<Layout />);

    expect(screen.getByRole("navigation", { name: "Main" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Início" })).toBeNull();
    // A conta mora no menu da foto — em inglês também.
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(screen.getByRole("link", { name: "My account" })).toBeTruthy();
  });

  it("admin com a conta em inglês: os itens de ADMIN continuam em português", () => {
    useSession.mockReturnValue({ data: { user: { role: Role.ADMIN, preferredLanguage: "en" } } });
    renderWithProviders(<Layout />);

    expect(screen.getByRole("link", { name: "Courses" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cursos Admin" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Site" })).toBeTruthy();
  });

  it("no login em inglês (/login?lang=en), o cabeçalho também é inglês e mantém o idioma", () => {
    renderWithProviders(<Layout />, { route: "/login?lang=en" });

    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login?lang=en");
    expect(screen.getByRole("link", { name: "Catalog" })).toBeTruthy();
    expect(marca().getAttribute("href")).toBe("/en");
    expect(screen.queryByRole("link", { name: "Entrar" })).toBeNull();
  });
});

// "Minha conta" saiu do menu lateral e mora no menu da foto (decisão do
// operador, 24/09/2026) — mas a coluna da conta continua em /conta.
describe("Layout — o menu da conta", () => {
  beforeEach(() => {
    useSession.mockReturnValue({ data: { user: { role: Role.MEMBER, name: "Ana Souza", email: "ana@exemplo.com" } } });
  });

  it("o botão da foto está no topo, e Minha conta não está no menu lateral", () => {
    renderWithProviders(<Layout />);

    expect(screen.getByRole("button", { name: "Abrir o menu da conta" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Minha conta" })).toBeNull();
  });

  it("nem na gaveta do celular", async () => {
    renderWithProviders(<Layout />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir o menu" }));

    // Olha DENTRO da gaveta: fora dela o rail também tem "Início", e o teste
    // passaria mesmo com a gaveta fechada.
    const gaveta = await screen.findByRole("dialog");
    expect(within(gaveta).getByRole("link", { name: "Início" })).toBeTruthy();
    expect(within(gaveta).queryByRole("link", { name: "Minha conta" })).toBeNull();
  });

  it("em /conta, a coluna da conta continua aparecendo", () => {
    renderWithProviders(<Layout />, { route: "/conta" });

    expect(screen.getByRole("link", { name: "Seus dados" })).toBeTruthy();
  });
});
