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

// O shell, o Início e as telas do Financeiro buscam dados; aqui só importa EM QUE TELA a pessoa chega.
vi.mock("@/lib/api", async (original) => {
  const nunca = () => new Promise(() => {});
  return {
    ...(await original<typeof import("@/lib/api")>()),
    getCommonTexts: nunca,
    getNotificacoes: () => Promise.resolve({ naoLidas: 0, itens: [] }),
    getMyTrilhas: () => Promise.resolve([]),
    adminListarCasos: nunca,
    adminNumerosDoMes: nunca,
    adminListarAssinaturas: nunca,
    adminListarTentativas: nunca,
    adminOQueAconteceu: nunca,
    adminListarCodigos: nunca,
    getMinhasCobrancas: () => Promise.resolve({ cobrancas: [{ em: "2026-10-10T15:00:00.000Z", centavos: 9990, moeda: "brl", forma: "pix", cartao: null, situacao: "paga", devolvido: 0, chave: "abc0000000000000" }] }),
  };
});

import App from "./App";
import { NAVEGACAO } from "@/lib/navigation";

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

// O MENU DO FINANCEIRO LEVA A CADA TELA (decisão do operador, 31/10/2026: Financeiro → Receita, endereços novos): o
// endereço de cada item do mapa de navegação tem rota no app. Sem a rota, o clique cairia no Início — e nenhum outro
// teste veria, porque o mapa e as rotas moram em arquivos diferentes.
describe("o menu do Financeiro leva a cada tela", () => {
  const telas = NAVEGACAO.find((s) => s.to === "/admin/financeiro")?.filhos ?? [];

  beforeEach(() => {
    useSession.mockReturnValue({ data: { user: { name: "Jilson", email: "jilson@exemplo.com", role: Role.ADMIN } }, isPending: false, error: null });
  });

  it("o Financeiro tem as 5 telas da Receita", () => {
    expect(telas.map((t) => t.label)).toEqual(["Precisa de atendente", "Assinaturas", "Tentativas", "O que aconteceu", "Códigos promocionais"]);
  });

  it.each(telas.map((t) => [t.label, t.to]))("%s abre a própria tela", async (titulo, endereco) => {
    renderWithProviders(<App />, { route: endereco });
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe(titulo);
  });

  it("o próprio Financeiro abre Precisa de atendente", async () => {
    renderWithProviders(<App />, { route: "/admin/financeiro" });
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Precisa de atendente");
  });
});

// O RECIBO DA ESCOLA (decisão do operador, 31/10/2026): abre FORA do menu do app, para imprimir só o recibo — e só com login.
describe("o recibo da escola", () => {
  const RECIBO = "/aluno/conta/faturamento/recibo/abc0000000000000";

  beforeEach(() => {
    useSession.mockReturnValue({ data: { user: { name: "Ana Souza", email: "ana@exemplo.com", role: Role.MEMBER } }, isPending: false, error: null });
  });

  it("abre o recibo sem o menu do app (a tela da conta, no mesmo app, tem o menu)", async () => {
    renderWithProviders(<App />, { route: RECIBO });
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Recibo");
    expect(await screen.findByText("Pix")).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("a tela da conta, para comparar: com o menu", async () => {
    renderWithProviders(<App />, { route: "/aluno/conta" });
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryAllByRole("navigation").length).toBeGreaterThan(0);
  });

  it("sem login, vai ao login — o recibo não abre", async () => {
    useSession.mockReturnValue({ data: null, isPending: false, error: null });
    renderWithProviders(<App />, { route: RECIBO });
    expect(await screen.findByRole("button", { name: "Entrar" })).toBeTruthy();
    expect(screen.queryByText("Recibo")).toBeNull();
  });
});
