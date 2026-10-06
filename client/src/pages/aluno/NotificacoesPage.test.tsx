// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { Notificacao } from "@/lib/api";

const getNotificacoes = vi.fn();
const marcarNotificacaoLida = vi.fn();
const marcarTodasLidas = vi.fn();
vi.mock("@/lib/api", () => ({
  getNotificacoes: () => getNotificacoes(),
  marcarNotificacaoLida: (id: number) => marcarNotificacaoLida(id),
  marcarTodasLidas: () => marcarTodasLidas(),
}));

import { NotificacoesPage } from "./NotificacoesPage";

// AS NOTIFICAÇÕES — a lista (decisão do operador, 06/10/2026, a partir da Udemy):
// em Meus estudos, embaixo de Salvos. Cada uma com o título, as 2 primeiras linhas
// e a data; clicar abre a mensagem completa.

const UMA: Notificacao = {
  id: 7,
  tipo: "BOAS_VINDAS",
  texto: "Bem-vindo **ao curso**!\n\n- Assista às aulas\n- Use os arquivos",
  criadaEm: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  lida: false,
  curso: { titulo: "Excel com IA", slug: "excel-com-ia" },
};

beforeEach(() => {
  getNotificacoes.mockReset().mockResolvedValue({ naoLidas: 1, itens: [UMA, { ...UMA, id: 8, tipo: "PARABENS", lida: true }] });
  marcarNotificacaoLida.mockReset().mockResolvedValue(undefined);
  marcarTodasLidas.mockReset().mockResolvedValue(undefined);
});

const abrir = () => renderWithProviders(<NotificacoesPage />, { route: "/aluno/notificacoes" });

describe("Notificações — estados", () => {
  it("carregando", () => {
    getNotificacoes.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("erro: avisa", async () => {
    getNotificacoes.mockRejectedValue(new Error("rede"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar as notificações.");
  });

  it("vazio", async () => {
    getNotificacoes.mockResolvedValue({ naoLidas: 0, itens: [] });
    abrir();
    expect(await screen.findByText("Nenhuma notificação por enquanto.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Marcar todas como lidas" })).toBeNull();
  });
});

describe("Notificações — a lista", () => {
  it("cada uma com o título, o começo do texto sem as marcas e a data; leva à mensagem completa", async () => {
    abrir();
    const link = await screen.findByRole("link", { name: /Boas-vindas ao curso Excel com IA/ });
    expect(link.getAttribute("href")).toBe("/aluno/notificacoes/7");
    expect(link.textContent).toContain("Bem-vindo ao curso! Assista às aulas Use os arquivos");
    expect(link.textContent).toContain("há 3 dias");
    expect(screen.getByRole("link", { name: /Parabéns! Você concluiu Excel com IA/ }).getAttribute("href")).toBe("/aluno/notificacoes/8");
  });

  it("a lista não mostra o texto formatado nem marca nada como lida (quem marca é abrir)", async () => {
    abrir();
    await screen.findByRole("link", { name: /Boas-vindas/ });
    expect(screen.queryByText("ao curso", { selector: "strong" })).toBeNull();
    expect(marcarNotificacaoLida).not.toHaveBeenCalled();
  });

  it("a não lida diz que não foi lida; a lida, não", async () => {
    abrir();
    expect((await screen.findByRole("link", { name: /Boas-vindas/ })).textContent).toContain("(Não lida)");
    expect(screen.getByRole("link", { name: /Parabéns/ }).textContent).not.toContain("(Não lida)");
  });

  it("Marcar todas como lidas", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Marcar todas como lidas" }));
    await waitFor(() => expect(marcarTodasLidas).toHaveBeenCalled());
  });
});
