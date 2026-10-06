// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { Notificacao } from "@/lib/api";

const getNotificacoes = vi.fn();
const marcarNotificacaoLida = vi.fn();
vi.mock("@/lib/api", () => ({
  getNotificacoes: () => getNotificacoes(),
  marcarNotificacaoLida: (id: number) => marcarNotificacaoLida(id),
  marcarTodasLidas: () => Promise.resolve(),
}));

import { NotificacaoPage } from "./NotificacaoPage";

// UMA NOTIFICAÇÃO, completa (decisão do operador, 06/10/2026, a partir da Udemy):
// o texto inteiro com os parágrafos, o link do curso, a volta para a lista; abrir
// marca como lida.

const UMA: Notificacao = {
  id: 7,
  tipo: "BOAS_VINDAS",
  texto: "Bem-vindo **ao curso**!\n\nO segundo parágrafo.\n\n- Use os arquivos\n\n[clique](javascript:alert(1)) [site](https://exemplo.com)",
  criadaEm: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  lida: false,
  curso: { titulo: "Excel com IA", slug: "excel-com-ia" },
};

beforeEach(() => {
  getNotificacoes.mockReset().mockResolvedValue({ naoLidas: 1, itens: [UMA] });
  marcarNotificacaoLida.mockReset().mockResolvedValue(undefined);
});

const abrir = (id = "7") => renderWithProviders(<NotificacaoPage />, { route: `/aluno/notificacoes/${id}`, path: "/aluno/notificacoes/:id" });

describe("Uma notificação — estados", () => {
  it("carregando, com a volta para a lista", () => {
    getNotificacoes.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText("Carregando…")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Notificações" }).getAttribute("href")).toBe("/aluno/notificacoes");
  });

  it("erro: avisa", async () => {
    getNotificacoes.mockRejectedValue(new Error("rede"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar as notificações.");
  });

  it("uma que não está na lista (de outra pessoa, ou antiga): não encontrada, e nada é marcado", async () => {
    abrir("99");
    expect(await screen.findByText("Notificação não encontrada.")).toBeTruthy();
    expect(marcarNotificacaoLida).not.toHaveBeenCalled();
  });
});

describe("Uma notificação — o conteúdo", () => {
  it("o título, a data, o texto inteiro com os parágrafos e o link do curso", async () => {
    abrir();
    expect(await screen.findByRole("heading", { name: "Boas-vindas ao curso Excel com IA" })).toBeTruthy();
    expect(screen.getByText("há 3 dias")).toBeTruthy();
    expect((await screen.findByText("ao curso")).tagName).toBe("STRONG");
    expect(screen.getByText("O segundo parágrafo.").tagName).toBe("P");
    expect(screen.getByText("Use os arquivos").tagName).toBe("LI");
    expect(screen.getByRole("link", { name: "Ir para o curso" }).getAttribute("href")).toBe("/aluno/curso/excel-com-ia");
    expect(screen.getByRole("link", { name: "Notificações" }).getAttribute("href")).toBe("/aluno/notificacoes");
  });

  // Revisão de segurança (04/10/2026): o texto é Markdown do admin; link não vira link.
  it("link no texto não vira link (nem javascript:)", async () => {
    abrir();
    await screen.findByText("ao curso");
    expect(screen.queryByRole("link", { name: "clique" })).toBeNull();
    expect(screen.queryByRole("link", { name: "site" })).toBeNull();
    expect(document.querySelector('a[href^="javascript"]')).toBeNull();
  });

  it("curso fora do ar: sem o link do curso", async () => {
    getNotificacoes.mockResolvedValue({ naoLidas: 0, itens: [{ ...UMA, lida: true, curso: { titulo: "Excel com IA", slug: null } }] });
    abrir();
    expect(await screen.findByRole("heading", { name: /Excel com IA/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Ir para o curso" })).toBeNull();
  });
});

describe("Uma notificação — lida", () => {
  it("abrir a não lida a marca como lida, uma vez", async () => {
    abrir();
    await waitFor(() => expect(marcarNotificacaoLida).toHaveBeenCalledWith(7));
    expect(marcarNotificacaoLida).toHaveBeenCalledTimes(1);
  });

  it("a já lida não é marcada de novo", async () => {
    getNotificacoes.mockResolvedValue({ naoLidas: 0, itens: [{ ...UMA, lida: true }] });
    abrir();
    await screen.findByRole("heading", { name: /Excel com IA/ });
    expect(marcarNotificacaoLida).not.toHaveBeenCalled();
  });
});
