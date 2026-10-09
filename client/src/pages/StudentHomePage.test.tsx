// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { MyTrilhaSummary } from "@/lib/api";

const useSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({ useSession: () => useSession() }));
const getMyTrilhas = vi.fn();
const getProgressoDasTrilhas = vi.fn();
vi.mock("@/lib/api", () => ({ getMyTrilhas: () => getMyTrilhas(), getProgressoDasTrilhas: () => getProgressoDasTrilhas() }));

import { StudentHomePage } from "./StudentHomePage";
import { IdiomaProvider } from "@/lib/language";

function trilha(id: number): MyTrilhaSummary {
  return {
    id,
    name: `Trilha ${id}`,
    description: null,
    skillsCovered: [],
    sourcePlanId: 2,
    displayOrder: 0,
    _count: { planModules: 1 },
  };
}

/** O bloco Minhas trilhas. Os testes olham DENTRO dele: a tela tem links e textos em outros blocos. */
const blocoMinhasTrilhas = () => screen.getByRole("region", { name: "Minhas trilhas" });

beforeEach(() => {
  vi.clearAllMocks();
  getProgressoDasTrilhas.mockResolvedValue([]);
  useSession.mockReturnValue({
    data: { user: { name: "Jilson Santana", email: "j@x.com" } },
    isPending: false,
  });
  getMyTrilhas.mockResolvedValue([]);
});

describe("StudentHomePage — a saudação", () => {
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
});

// O painel com 4 blocos (decisão do operador, 29/09/2026), nesta ordem.
describe("StudentHomePage — o painel", () => {
  it("tem os blocos na ordem: Continue estudando, Minhas trilhas, Atalhos", () => {
    renderWithProviders(<StudentHomePage />);
    const titulos = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titulos).toEqual(["Continue estudando", "Minhas trilhas", "Atalhos"]);
  });

  // Sem progresso (Fase 5) não há "a aula em que você parou". Dizer que ela
  // aparece "assim que você começar um curso" seria promessa falsa.
  it("Continue estudando é EM BREVE, sem link", () => {
    renderWithProviders(<StudentHomePage />);
    const bloco = screen.getByRole("region", { name: "Continue estudando" });

    expect(within(bloco).getByText("EM BREVE")).toBeTruthy();
    expect(within(bloco).getByText(/a aula em que você parou aparece aqui/)).toBeTruthy();
    expect(within(bloco).queryByRole("link")).toBeNull();
  });

  it("Atalhos: Cursos e Trilhas levam a algum lugar; JilsonAI e Certificados são EM BREVE, sem link", () => {
    renderWithProviders(<StudentHomePage />);
    const bloco = screen.getByRole("region", { name: "Atalhos" });

    expect(within(bloco).getByRole("link", { name: "Cursos" }).getAttribute("href")).toBe("/cursos");
    expect(within(bloco).getByRole("link", { name: "Trilhas" }).getAttribute("href")).toBe("/trilhas");
    for (const nome of ["JilsonAI", "Certificados"]) {
      expect(within(bloco).getByText(nome), nome).toBeTruthy();
      expect(within(bloco).queryByRole("link", { name: new RegExp(nome) }), nome).toBeNull();
    }
    expect(within(bloco).getAllByText("EM BREVE")).toHaveLength(2);
  });
});

describe("StudentHomePage — Minhas trilhas", () => {
  // A porcentagem da trilha também no Início (Bloco MEDIR, etapa 3 — decisão do operador, 09/10/2026).
  it("a trilha começada mostra a barra com a porcentagem", async () => {
    getMyTrilhas.mockResolvedValue([trilha(1), trilha(2)]);
    getProgressoDasTrilhas.mockResolvedValue([{ planId: 2, concluidas: 1, total: 2, concluida: false }]);
    renderWithProviders(<StudentHomePage />);
    const barra = await screen.findByRole("progressbar", { name: "Progresso na trilha" });
    expect(barra.getAttribute("aria-valuenow")).toBe("50");
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
  });

  it("carregando, enquanto a busca não volta", () => {
    getMyTrilhas.mockReturnValue(new Promise(() => {})); // nunca resolve
    renderWithProviders(<StudentHomePage />);

    expect(within(blocoMinhasTrilhas()).getByText("Carregando…")).toBeTruthy();
  });

  it("erro, quando a busca falha — e o resto do painel continua de pé", async () => {
    getMyTrilhas.mockRejectedValue(new Error("500"));
    renderWithProviders(<StudentHomePage />);

    expect(await within(blocoMinhasTrilhas()).findByText("Não foi possível carregar suas trilhas.")).toBeTruthy();
    expect(within(blocoMinhasTrilhas()).queryByRole("link")).toBeNull();
    expect(screen.getByRole("region", { name: "Atalhos" })).toBeTruthy();
  });

  it("vazio: diz que não há trilha salva e leva às trilhas prontas", async () => {
    renderWithProviders(<StudentHomePage />);

    const bloco = blocoMinhasTrilhas();
    expect(await within(bloco).findByText("Você ainda não salvou nenhuma trilha.")).toBeTruthy();
    expect(within(bloco).getByRole("link", { name: "Ver as trilhas prontas" }).getAttribute("href")).toBe("/trilhas");
    // "Ver todas" só com o que ver.
    expect(within(bloco).queryByRole("link", { name: "Ver todas" })).toBeNull();
  });

  it("com trilhas: cada uma leva à dela, e Ver todas leva a Minhas trilhas", async () => {
    getMyTrilhas.mockResolvedValue([trilha(7)]);
    renderWithProviders(<StudentHomePage />);

    const bloco = blocoMinhasTrilhas();
    const card = await within(bloco).findByRole("link", { name: /Trilha 7/ });
    expect(card.getAttribute("href")).toBe("/aluno/minhas-trilhas/7");
    expect(within(bloco).getByRole("link", { name: "Ver todas" }).getAttribute("href")).toBe("/aluno/minhas-trilhas");
  });

  it("mostra no máximo 3 — o resto fica em Ver todas", async () => {
    getMyTrilhas.mockResolvedValue([trilha(1), trilha(2), trilha(3), trilha(4)]);
    renderWithProviders(<StudentHomePage />);

    const bloco = blocoMinhasTrilhas();
    await within(bloco).findByRole("link", { name: /Trilha 1/ });
    expect(within(bloco).getByRole("link", { name: /Trilha 3/ })).toBeTruthy();
    expect(within(bloco).queryByRole("link", { name: /Trilha 4/ })).toBeNull();
  });
});

// O app do aluno existe em inglês (decisão do operador, 24/09/2026).
describe("StudentHomePage — em inglês", () => {
  it("o painel fala inglês, sem sobra de português", async () => {
    useSession.mockReturnValue({ data: { user: { name: "Ana Souza" } }, isPending: false });
    renderWithProviders(
      <IdiomaProvider idioma="en">
        <StudentHomePage />
      </IdiomaProvider>,
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Hi, Ana");
    const titulos = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titulos).toEqual(["Keep learning", "My learning paths", "Shortcuts"]);
    expect(screen.getAllByText("COMING SOON")).toHaveLength(3);
    expect(await screen.findByText("You haven't saved any learning paths yet.")).toBeTruthy();
    expect(screen.queryByText("EM BREVE")).toBeNull();
    expect(screen.queryByText("Continue estudando")).toBeNull();
  });
});
