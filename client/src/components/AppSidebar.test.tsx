// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { Role } from "@jilson/core";
import { SidebarProvider } from "@/components/ui/sidebar";

const useSession = vi.fn();
const signOut = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  useSession: () => useSession(),
  signOut: () => signOut(),
}));

import { AppSidebar } from "./AppSidebar";

// A barra decide o que CADA PAPEL enxerga — é lógica, não decoração.
function renderBarra(route = "/inicio", { aberta = true } = {}) {
  return renderWithProviders(
    <SidebarProvider defaultOpen={aberta}>
      <AppSidebar />
    </SidebarProvider>,
    { route, path: "*" },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useSession.mockReturnValue({ data: null });
});

describe("AppSidebar — sem sessão", () => {
  it("não renderiza nada: a barra é o cromo de quem entrou", () => {
    renderBarra();

    expect(screen.queryByRole("link", { name: "Início" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Minha conta" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sair" })).toBeNull();
  });
});

describe("AppSidebar — aluno", () => {
  beforeEach(() => {
    useSession.mockReturnValue({ data: { user: { role: Role.MEMBER } } });
  });

  it("mostra as portas do aluno", () => {
    renderBarra();

    expect(screen.getByRole("link", { name: "Início" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Catálogo" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Minhas trilhas" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Minha conta" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sair" })).toBeTruthy();
  });

  // O que mais importa deste arquivo. Não é sobre acesso — o servidor barra de
  // qualquer jeito — é sobre não anunciar a existência de uma área que não é
  // dele. Apagar a checagem de papel no AppSidebar tem que REPROVAR aqui.
  it("NÃO vê o grupo Admin", () => {
    renderBarra();

    expect(screen.queryByText("Admin")).toBeNull();
    expect(screen.queryByRole("link", { name: "Cursos" })).toBeNull();
  });
});

describe("AppSidebar — admin", () => {
  beforeEach(() => {
    useSession.mockReturnValue({ data: { user: { role: Role.ADMIN } } });
  });

  it("vê o grupo Admin e as portas do aluno", () => {
    renderBarra();

    expect(screen.getByText("Admin")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cursos" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Início" })).toBeTruthy();
  });
});

describe("AppSidebar — onde estou", () => {
  beforeEach(() => {
    useSession.mockReturnValue({ data: { user: { role: Role.MEMBER } } });
  });

  // `aria-current` é a MESMA marcação que o leitor de tela anuncia e que
  // acende a pílula azul. Testar a classe seria testar implementação; testar
  // isto é testar o que a pessoa percebe.
  it("marca só a rota atual", () => {
    renderBarra("/inicio");

    expect(screen.getByRole("link", { name: "Início" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Catálogo" }).getAttribute("aria-current")).toBeNull();
  });

  it("acende o item certo numa rota filha", () => {
    renderBarra("/minhas-trilhas/7");

    expect(
      screen.getByRole("link", { name: "Minhas trilhas" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.getByRole("link", { name: "Início" }).getAttribute("aria-current")).toBeNull();
  });

  // A página de um curso é `/curso/:slug`, não `/cursos` — sem o casamento por
  // prefixo o aluno navega para dentro do catálogo e o rail apaga, deixando-o
  // sem nenhum "onde estou".
  it("o Catálogo continua aceso dentro da página de um curso", () => {
    renderBarra("/curso/excel-e-ia");

    expect(screen.getByRole("link", { name: "Catálogo" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });
});

// A trava de acessibilidade do Bloco S: expandir só por mouse exclui quem
// navega por teclado ou usa leitor de tela. O rótulo do shadcn é recortado
// visualmente (overflow), não removido — este teste é o que garante que
// ninguém "otimize" isso para display:none, que passaria despercebido porque
// a tela continuaria idêntica.
describe("AppSidebar — recolhida, o rótulo continua existindo", () => {
  it("todo item segue alcançável pelo nome", () => {
    useSession.mockReturnValue({ data: { user: { role: Role.ADMIN } } });
    renderBarra("/inicio", { aberta: false });

    expect(screen.getByRole("link", { name: "Início" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Catálogo" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Minhas trilhas" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cursos" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Minha conta" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sair" })).toBeTruthy();
  });
});
