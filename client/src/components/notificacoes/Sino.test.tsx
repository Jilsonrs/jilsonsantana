// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";
import { renderWithProviders } from "@/test-utils";
import type { Notificacao, Notificacoes } from "@/lib/api";
import { IdiomaProvider } from "@/lib/language";

const getNotificacoes = vi.fn();
const marcarNotificacaoLida = vi.fn();
const marcarTodasLidas = vi.fn();
vi.mock("@/lib/api", () => ({
  getNotificacoes: () => getNotificacoes(),
  marcarNotificacaoLida: (id: number) => marcarNotificacaoLida(id),
  marcarTodasLidas: () => marcarTodasLidas(),
}));

import { Sino } from "./Sino";

// O SINO (Bloco E, etapa 4 — decisões do operador, 04/10/2026): só o número no
// sino; a lista das mais recentes com "Marcar todas como lidas" e "Ver todas";
// clicar numa notificação abre a mensagem completa (06/10/2026).

const HA_2_DIAS = new Date(Date.now() - 2 * 86_400_000).toISOString();
const n = (id: number, extra: Partial<Notificacao> = {}): Notificacao => ({
  id,
  tipo: "BOAS_VINDAS",
  texto: `Bem-vindo **ao curso** ${id}!\n\n- Assista às aulas`,
  criadaEm: HA_2_DIAS,
  lida: false,
  curso: { titulo: `Excel ${id}`, slug: `excel-${id}` },
  ...extra,
});
const lista = (naoLidas: number, itens: Notificacao[]): Notificacoes => ({ naoLidas, itens });

function OndeEstou() {
  const { pathname, hash } = useLocation();
  return <p data-testid="onde">{pathname + hash}</p>;
}

function abrir(idioma: "pt" | "en" = "pt") {
  renderWithProviders(
    <IdiomaProvider idioma={idioma}>
      <Sino />
      <Routes>
        <Route path="*" element={<OndeEstou />} />
      </Routes>
    </IdiomaProvider>,
  );
}

const painel = () => within(screen.getByRole("heading", { name: "Notificações" }).parentElement as HTMLElement);

beforeEach(() => {
  getNotificacoes.mockReset().mockResolvedValue(lista(2, [n(1), n(2, { tipo: "PARABENS", lida: true })]));
  marcarNotificacaoLida.mockReset().mockResolvedValue(undefined);
  marcarTodasLidas.mockReset().mockResolvedValue(undefined);
});

describe("Sino — o número", () => {
  it("o número de não lidas sobre o sino, e no nome do botão", async () => {
    abrir();
    const sino = await screen.findByRole("button", { name: "Notificações, 2 não lidas" });
    expect(sino.textContent).toBe("2");
    expect(sino.getAttribute("aria-expanded")).toBe("false");
  });

  it("acima de nove: 9+", async () => {
    getNotificacoes.mockResolvedValue(lista(12, [n(1)]));
    abrir();
    expect((await screen.findByRole("button", { name: "Notificações, 12 não lidas" })).textContent).toBe("9+");
  });

  it("sem não lidas: sem número, e o nome é só Notificações", async () => {
    getNotificacoes.mockResolvedValue(lista(0, [n(1, { lida: true })]));
    abrir();
    await waitFor(() => expect(getNotificacoes).toHaveBeenCalled());
    const sino = await screen.findByRole("button", { name: "Notificações" });
    await waitFor(() => expect(sino.textContent).toBe(""));
  });
});

describe("Sino — a lista", () => {
  it("carregando", async () => {
    getNotificacoes.mockReturnValue(new Promise(() => {}));
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Notificações" }));
    expect(painel().getByText("Carregando…")).toBeTruthy();
  });

  it("erro: avisa", async () => {
    getNotificacoes.mockRejectedValue(new Error("rede"));
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Notificações" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar as notificações.");
  });

  it("vazio: diz que não há nenhuma", async () => {
    getNotificacoes.mockResolvedValue(lista(0, []));
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Notificações" }));
    expect(await screen.findByText("Nenhuma notificação por enquanto.")).toBeTruthy();
  });

  it("abre com o título, o começo do texto sem as marcas, e há quanto tempo", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Notificações, 2 não lidas" }));
    const links = painel().getAllByRole("link");
    expect(links[0].textContent).toContain("Boas-vindas ao curso Excel 1 (Não lida)");
    expect(links[0].textContent).toContain("Bem-vindo ao curso 1! Assista às aulas");
    expect(links[0].textContent).toContain("há 2 dias");
    expect(links[1].textContent).toContain("Parabéns! Você concluiu Excel 2");
    expect(links[1].textContent).not.toContain("Não lida");
  });

  it("chegou agora: agora", async () => {
    getNotificacoes.mockResolvedValue(lista(1, [n(1, { criadaEm: new Date().toISOString() })]));
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Notificações, 1 não lida" }));
    expect(painel().getByText("agora")).toBeTruthy();
  });

  it("mostra só as 5 mais recentes", async () => {
    getNotificacoes.mockResolvedValue(lista(7, [1, 2, 3, 4, 5, 6, 7].map((i) => n(i))));
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Notificações, 7 não lidas" }));
    expect(painel().getAllByRole("listitem")).toHaveLength(5);
  });

  it("em inglês", async () => {
    abrir("en");
    fireEvent.click(await screen.findByRole("button", { name: "Notifications, 2 unread" }));
    expect(screen.getByText("Welcome to Excel 1")).toBeTruthy();
    expect(screen.getAllByText("2 days ago")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Mark all as read" })).toBeTruthy();
  });

  it("Esc fecha e devolve o foco ao sino", async () => {
    abrir();
    const sino = await screen.findByRole("button", { name: "Notificações, 2 não lidas" });
    fireEvent.click(sino);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("heading", { name: "Notificações" })).toBeNull();
    expect(document.activeElement).toBe(sino);
  });
});

describe("Sino — as ações", () => {
  // O sino é só mais um atalho (operador, 06/10/2026): clicar abre a mensagem
  // completa; quem marca como lida é abrir a mensagem (NotificacaoPage).
  it("clicar numa notificação: fecha o sino e abre a mensagem completa", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Notificações, 2 não lidas" }));
    fireEvent.click(painel().getAllByRole("link")[0]);
    expect(screen.getByTestId("onde").textContent).toBe("/aluno/notificacoes/1");
    expect(screen.queryByRole("heading", { name: "Notificações" })).toBeNull();
    expect(marcarNotificacaoLida).not.toHaveBeenCalled();
  });

  it("a já lida também abre a mensagem dela", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Notificações, 2 não lidas" }));
    fireEvent.click(painel().getAllByRole("link")[1]);
    expect(screen.getByTestId("onde").textContent).toBe("/aluno/notificacoes/2");
  });

  it("Marcar todas como lidas: marca, e o número some", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Notificações, 2 não lidas" }));
    getNotificacoes.mockResolvedValue(lista(0, [n(1, { lida: true })]));
    fireEvent.click(screen.getByRole("button", { name: "Marcar todas como lidas" }));
    await waitFor(() => expect(marcarTodasLidas).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: "Notificações" })).toBeTruthy();
  });

  it("sem não lidas, Marcar todas fica desligado", async () => {
    getNotificacoes.mockResolvedValue(lista(0, [n(1, { lida: true })]));
    abrir();
    await waitFor(() => expect(getNotificacoes).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Notificações" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Marcar todas como lidas" }) as HTMLButtonElement).disabled).toBe(true));
  });

  it("Ver todas leva à página", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Notificações, 2 não lidas" }));
    fireEvent.click(screen.getByRole("link", { name: "Ver todas" }));
    expect(screen.getByTestId("onde").textContent).toBe("/aluno/notificacoes");
  });
});
