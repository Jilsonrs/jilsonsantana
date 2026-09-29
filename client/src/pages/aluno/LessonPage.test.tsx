// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Role } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";
import type { PaginaDaAula } from "@/lib/api";

const getLessonPage = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getLessonPage: (...args: unknown[]) => getLessonPage(...args),
}));
const useSessionMock = vi.fn();
vi.mock("@/lib/auth-client", () => ({ useSession: () => useSessionMock() }));

import { LessonPage } from "./LessonPage";
import { SecondaryNav } from "@/components/nav/SecondaryNav";

// A PÁGINA DA AULA (etapa 4 do Bloco U — plano aprovado pelo operador em
// 29/09/2026, no estilo do LinkedIn Learning). O que estes testes protegem: os
// estados da tela; a tela mostra SÓ o que o servidor liberou; a aula atual fica
// destacada no conteúdo do curso; o rascunho aparece só para o admin; os recursos;
// e o painel da IA.

const PLAYER = "https://iframe.mediadelivery.net/embed/762605/abc?token=t&expires=1";

function pagina(aula: Partial<PaginaDaAula["aula"]> = {}, rascunho = false): PaginaDaAula {
  return {
    curso: {
      id: 1,
      slug: "excel",
      title: "Excel + IA",
      language: "pt",
      status: "PUBLISHED",
      modulos: [
        {
          id: 1,
          title: "Fundamentos",
          status: "PUBLISHED",
          aulas: [
            { id: 11, title: "Abertura", kind: "VIDEO", isFreePreview: false, status: "PUBLISHED", temArquivos: true },
            { id: 12, title: "Leitura", kind: "TEXT", isFreePreview: false, status: "PUBLISHED", temArquivos: false },
          ],
        },
        ...(rascunho
          ? [{ id: 2, title: "Automação", status: "DRAFT" as const, aulas: [{ id: 21, title: "Macros", kind: "VIDEO" as const, isFreePreview: false, status: "DRAFT" as const, temArquivos: false }] }]
          : []),
      ],
    },
    aula: {
      id: 11,
      title: "Abertura",
      kind: "VIDEO",
      isFreePreview: false,
      status: "PUBLISHED",
      moduloId: 1,
      liberada: true,
      playerUrl: PLAYER,
      texto: null,
      arquivos: [{ id: 5, originalName: "Planilha.zip", sizeBytes: 2048 }],
      ...aula,
    },
  };
}

beforeEach(() => {
  getLessonPage.mockReset().mockResolvedValue(pagina());
  useSessionMock.mockReset().mockReturnValue({ data: null, isPending: false });
});

const abrir = (rota = "/aluno/aula/11") => renderWithProviders(<LessonPage />, { route: rota, path: "/aluno/aula/:id" });
const comoAdmin = () => useSessionMock.mockReturnValue({ data: { user: { role: Role.ADMIN } }, isPending: false });

describe("página da aula — estados", () => {
  it("carregando", () => {
    getLessonPage.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("erro: avisa", async () => {
    getLessonPage.mockRejectedValue({ response: { status: 500 } });
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível abrir a aula. Tente de novo.");
  });

  it("aula que não existe (ou fora do publicado): não encontrada", async () => {
    getLessonPage.mockRejectedValue({ response: { status: 404 } });
    abrir();
    expect(await screen.findByText("Aula não encontrada.")).toBeTruthy();
  });

  it("endereço sem número: não encontrada, sem perguntar ao servidor", () => {
    abrir("/aluno/aula/abc");
    expect(screen.getByText("Aula não encontrada.")).toBeTruthy();
    expect(getLessonPage).not.toHaveBeenCalled();
  });
});

describe("página da aula — o conteúdo", () => {
  it("aula de vídeo liberada: o player grande, com o endereço do servidor", async () => {
    abrir();
    const player = await screen.findByTitle("Abertura");
    expect(player.getAttribute("src")).toBe(PLAYER);
    expect(getLessonPage).toHaveBeenCalledWith(11, false);
  });

  it("bloqueada: \"para assinantes\", sem player", async () => {
    getLessonPage.mockResolvedValue(pagina({ liberada: false, playerUrl: undefined, arquivos: undefined }));
    abrir();
    expect((await screen.findByRole("status")).textContent).toContain("Esta aula é para assinantes.");
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("aula de texto: o texto e, embaixo, os recursos para baixar", async () => {
    getLessonPage.mockResolvedValue(
      pagina({ id: 12, title: "Leitura", kind: "TEXT", playerUrl: null, texto: "O **PROCV** procura.", arquivos: [{ id: 7, originalName: "Base.xlsx", sizeBytes: 3072 }] }),
    );
    abrir("/aluno/aula/12");
    expect(await screen.findByText("PROCV")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Recursos para esta aula" })).toBeTruthy();
    const link = screen.getByRole("link", { name: /Base\.xlsx/ });
    expect(link.getAttribute("href")).toBe("/api/lessons/12/files/7");
  });
});

describe("página da aula — o conteúdo do curso", () => {
  it("a aula atual fica destacada; as outras levam à página delas", async () => {
    abrir();
    const nav = await screen.findByRole("navigation", { name: "Conteúdo do curso" });
    expect(within(nav).getByRole("link", { name: /Abertura/ }).getAttribute("aria-current")).toBe("page");
    const outra = within(nav).getByRole("link", { name: /Leitura/ });
    expect(outra.getAttribute("aria-current")).toBeNull();
    expect(outra.getAttribute("href")).toBe("/aluno/aula/12");
  });

  it("Recursos, junto à aula, lista os arquivos para baixar", async () => {
    abrir();
    const nav = await screen.findByRole("navigation", { name: "Conteúdo do curso" });
    fireEvent.click(within(nav).getByText("Recursos"));
    const link = await within(nav).findByRole("link", { name: /Planilha\.zip/ });
    expect(link.getAttribute("href")).toBe("/api/lessons/11/files/5");
  });

  it("o visitante não vê rascunho; o ADMIN vê, marcado, pela rota de admin", async () => {
    getLessonPage.mockResolvedValue(pagina({}, true));
    comoAdmin();
    abrir();
    const nav = await screen.findByRole("navigation", { name: "Conteúdo do curso" });
    expect(within(nav).getByRole("link", { name: /Macros/ }).textContent).toContain("Rascunho");
    expect(getLessonPage).toHaveBeenCalledWith(11, true);
  });

  it("logado, a coluna do nível 2 desenha o conteúdo do curso da aula", async () => {
    useSessionMock.mockReturnValue({ data: { user: { role: Role.MEMBER } }, isPending: false });
    renderWithProviders(<SecondaryNav papel={Role.MEMBER} onSignOut={vi.fn()} />, { route: "/aluno/aula/11", path: "/aluno/aula/:id" });
    const coluna = await screen.findByRole("complementary", { name: "Menu da seção" });
    expect(await within(coluna).findByRole("link", { name: /Abertura/ })).toBeTruthy();
  });
});

describe("página da aula — o JilsonAI", () => {
  it("o botão flutuante abre o painel com \"em breve\", e fecha", async () => {
    abrir();
    await screen.findByTitle("Abertura");
    fireEvent.click(screen.getByRole("button", { name: "Abrir o JilsonAI" }));
    const painel = screen.getByRole("complementary", { name: "JilsonAI" });
    expect(painel.textContent).toContain("Em breve");

    fireEvent.click(within(painel).getByRole("button", { name: "Fechar o JilsonAI" }));
    await waitFor(() => expect(screen.queryByRole("complementary", { name: "JilsonAI" })).toBeNull());
  });
});
