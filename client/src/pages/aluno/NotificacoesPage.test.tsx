// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { Notificacao } from "@/lib/api";

const getNotificacoes = vi.fn();
const marcarTodasLidas = vi.fn();
vi.mock("@/lib/api", () => ({
  getNotificacoes: () => getNotificacoes(),
  marcarNotificacaoLida: () => Promise.resolve(),
  marcarTodasLidas: () => marcarTodasLidas(),
}));

import { NotificacoesPage } from "./NotificacoesPage";

// "VER TODAS" (Bloco E, etapa 4 — decisões do operador, 04/10/2026): todas as
// notificações, com o texto inteiro formatado e a data; o link do curso só
// enquanto ele está publicado.

const UMA: Notificacao = {
  id: 7,
  tipo: "BOAS_VINDAS",
  texto: "Bem-vindo **ao curso**!\n\n- Assista às aulas\n- Use os arquivos\n\n[clique](javascript:alert(1)) [site](https://exemplo.com)",
  criadaEm: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  lida: false,
  curso: { titulo: "Excel com IA", slug: "excel-com-ia" },
};

beforeEach(() => {
  getNotificacoes.mockReset().mockResolvedValue({ naoLidas: 1, itens: [UMA] });
  marcarTodasLidas.mockReset().mockResolvedValue(undefined);
});

const abrir = () => renderWithProviders(<NotificacoesPage />, { route: "/aluno/notificacoes" });

describe("Ver todas — estados", () => {
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

describe("Ver todas — a lista", () => {
  it("o título, a data e o texto INTEIRO formatado, com o link do curso", async () => {
    abrir();
    expect(await screen.findByRole("heading", { name: /Boas-vindas ao curso Excel com IA/ })).toBeTruthy();
    expect(screen.getByText("há 3 dias")).toBeTruthy();
    expect((await screen.findByText("ao curso")).tagName).toBe("STRONG");
    expect(screen.getByText("Use os arquivos").tagName).toBe("LI");
    expect(screen.getByRole("link", { name: "Ir para o curso" }).getAttribute("href")).toBe("/aluno/curso/excel-com-ia");
  });

  // Revisão de segurança (04/10/2026): o texto é Markdown do admin; link não vira link.
  it("link no texto não vira link (nem javascript:)", async () => {
    abrir();
    await screen.findByText("ao curso");
    expect(screen.queryByRole("link", { name: "clique" })).toBeNull();
    expect(screen.queryByRole("link", { name: "site" })).toBeNull();
    expect(screen.getByText(/site/)).toBeTruthy();
    expect(document.querySelector('a[href^="javascript"]')).toBeNull();
  });

  it("curso fora do ar: o título fica, sem o link", async () => {
    getNotificacoes.mockResolvedValue({ naoLidas: 0, itens: [{ ...UMA, lida: true, curso: { titulo: "Excel com IA", slug: null } }] });
    abrir();
    expect(await screen.findByRole("heading", { name: /Excel com IA/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Ir para o curso" })).toBeNull();
  });

  it("a não lida diz que não foi lida", async () => {
    abrir();
    expect((await screen.findByRole("heading", { name: /Excel com IA/ })).textContent).toContain("(Não lida)");
  });

  it("Marcar todas como lidas", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Marcar todas como lidas" }));
    await waitFor(() => expect(marcarTodasLidas).toHaveBeenCalled());
  });
});
