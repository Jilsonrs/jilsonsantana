// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { LegendasDoCurso } from "@/lib/api";
import { CURSO_DE_TESTE } from "./curso-de-teste";

const adminGetCourse = vi.fn();
const getLegendas = vi.fn();
const enviarLegenda = vi.fn();
const excluirLegenda = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  adminGetCourse: (...args: unknown[]) => adminGetCourse(...args),
  getLegendas: (...args: unknown[]) => getLegendas(...args),
  enviarLegenda: (...args: unknown[]) => enviarLegenda(...args),
  excluirLegenda: (...args: unknown[]) => excluirLegenda(...args),
}));

import { CourseEditorLayout } from "./CourseEditorLayout";
import { ROTAS_DO_EDITOR } from "./steps";

// O PASSO LEGENDAS (decisões do operador, 04/10/2026, a partir da tela da Udemy):
// a apresentação e as aulas de vídeo de cada módulo, uma `.vtt` por linha;
// "x de y aulas publicadas com legenda"; enviar, substituir, baixar e excluir.

const UM_DIA = 86_400_000;
const LEGENDA = { enviadaEm: new Date(Date.now() - 20 * UM_DIA).toISOString(), nomeDoArquivo: "aula.vtt", precisaReenviar: false };
const TELA: LegendasDoCurso = {
  idioma: "pt",
  apresentacao: { temVideo: true, legenda: LEGENDA },
  modulos: [
    {
      id: 1,
      title: "A Nova Era",
      status: "PUBLISHED",
      aulas: [
        { id: 11, title: "Bem-vindo", status: "PUBLISHED", temVideo: true, legenda: LEGENDA },
        { id: 12, title: "Iniciando", status: "PUBLISHED", temVideo: true, legenda: null },
        { id: 13, title: "Sem vídeo ainda", status: "PUBLISHED", temVideo: false, legenda: null },
      ],
    },
  ],
  contagem: { comLegenda: 1, total: 3 },
};

beforeEach(() => {
  adminGetCourse.mockReset().mockResolvedValue(CURSO_DE_TESTE);
  getLegendas.mockReset().mockResolvedValue(TELA);
  enviarLegenda.mockReset().mockResolvedValue({ cacheLimpo: true });
  excluirLegenda.mockReset().mockResolvedValue({ cacheLimpo: true });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

const abrir = () =>
  renderWithProviders(<CourseEditorLayout />, { route: "/admin/cursos/1/legendas", path: "/admin/cursos/:id", filhas: ROTAS_DO_EDITOR });
const vtt = () => new File(["WEBVTT\n"], "aula.vtt", { type: "text/vtt" });

describe("Legendas — estados", () => {
  it("carregando", async () => {
    getLegendas.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(await screen.findByText("Carregando…")).toBeTruthy();
  });

  it("erro: avisa", async () => {
    getLegendas.mockRejectedValue(new Error("rede"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar as legendas.");
  });

  it("curso sem aula de vídeo: diz onde os vídeos entram", async () => {
    getLegendas.mockResolvedValue({ ...TELA, modulos: [], contagem: { comLegenda: 0, total: 0 } });
    abrir();
    expect(await screen.findByText("Este curso ainda não tem aula de vídeo. Os vídeos entram no passo Conteúdo.")).toBeTruthy();
  });
});

describe("Legendas — a lista", () => {
  it("o idioma, a contagem, a apresentação e as aulas com o estado de cada uma", async () => {
    abrir();
    expect(await screen.findByText("Legendas em Português · 1 de 3 aulas publicadas com legenda")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Vídeo de apresentação" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "A Nova Era" })).toBeTruthy();
    expect(screen.getAllByText("Legenda enviada")).toHaveLength(2);
    expect(screen.getAllByText("há 20 dias")).toHaveLength(2);
    expect(screen.getByText("Sem legenda")).toBeTruthy();
    expect(screen.queryByText("Todas as aulas publicadas têm legenda.")).toBeNull();
  });

  it("todas com legenda: a mensagem de tudo pronto", async () => {
    getLegendas.mockResolvedValue({ ...TELA, contagem: { comLegenda: 3, total: 3 } });
    abrir();
    expect(await screen.findByText("Todas as aulas publicadas têm legenda.")).toBeTruthy();
  });

  it("aula sem vídeo: pede o vídeo, e não tem ações", async () => {
    abrir();
    expect(await screen.findByText("Envie o vídeo primeiro")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Sem vídeo ainda/ })).toBeNull();
  });

  it("legenda que precisa ser reenviada aparece pedindo o envio", async () => {
    getLegendas.mockResolvedValue({
      ...TELA,
      apresentacao: { temVideo: true, legenda: { ...LEGENDA, precisaReenviar: true } },
    });
    abrir();
    expect(await screen.findByText("Envie a legenda de novo")).toBeTruthy();
  });
});

describe("Legendas — as ações", () => {
  it("enviar a legenda da aula: vai o arquivo para a aula, e a mensagem confirma", async () => {
    abrir();
    await screen.findByRole("button", { name: "Enviar a legenda: Iniciando" });
    const arquivo = vtt();
    fireEvent.change(screen.getByLabelText("Arquivo da legenda: Iniciando"), { target: { files: [arquivo] } });

    await waitFor(() => expect(enviarLegenda).toHaveBeenCalledWith({ tipo: "aula", id: 12 }, arquivo));
    expect(await screen.findByText("Legenda enviada.")).toBeTruthy();
  });

  // O cache do Bunny não foi limpo (teste no ar, 04/10/2026): enviou, mas o player
  // pode mostrar a anterior por um tempo — a mensagem diz isso.
  it("enviou sem limpar o cache: a mensagem avisa que o player pode mostrar a anterior", async () => {
    enviarLegenda.mockResolvedValue({ cacheLimpo: false });
    abrir();
    await screen.findByRole("button", { name: "Enviar a legenda: Iniciando" });
    fireEvent.change(screen.getByLabelText("Arquivo da legenda: Iniciando"), { target: { files: [vtt()] } });
    expect(await screen.findByText("Legenda enviada. O player pode mostrar a anterior por algumas horas.")).toBeTruthy();
  });

  it("substituir a da apresentação: vai para a apresentação do curso", async () => {
    abrir();
    expect(await screen.findByRole("button", { name: "Substituir a legenda: Vídeo de apresentação" })).toBeTruthy();
    const arquivo = vtt();
    fireEvent.change(screen.getByLabelText("Arquivo da legenda: Vídeo de apresentação"), { target: { files: [arquivo] } });
    await waitFor(() => expect(enviarLegenda).toHaveBeenCalledWith({ tipo: "apresentacao", cursoId: 1 }, arquivo));
  });

  it("o servidor recusou o arquivo: a mensagem diz o porquê, e fica", async () => {
    enviarLegenda.mockRejectedValue({ response: { status: 400, data: { error: "NaoEVtt" } } });
    abrir();
    await screen.findByRole("button", { name: "Enviar a legenda: Iniciando" });
    fireEvent.change(screen.getByLabelText("Arquivo da legenda: Iniciando"), { target: { files: [vtt()] } });
    expect((await screen.findByRole("alert")).textContent).toBe("Este arquivo não é uma legenda .vtt válida (tem que começar com WEBVTT).");
  });

  it("baixar: o link da legenda da aula", async () => {
    abrir();
    const baixar = await screen.findByRole("link", { name: "Baixar a legenda: Bem-vindo" });
    expect(baixar.getAttribute("href")).toBe("/api/admin/lessons/11/legenda");
  });

  it("excluir: pede confirmação e exclui; sem confirmar, nada", async () => {
    abrir();
    const excluir = await screen.findByRole("button", { name: "Excluir a legenda: Bem-vindo" });

    vi.mocked(window.confirm).mockReturnValueOnce(false);
    fireEvent.click(excluir);
    expect(excluirLegenda).not.toHaveBeenCalled();

    fireEvent.click(excluir);
    await waitFor(() => expect(excluirLegenda).toHaveBeenCalledWith({ tipo: "aula", id: 11 }));
    expect(await screen.findByText("Legenda excluída.")).toBeTruthy();
  });

  it("o passo não tem Salvar no topo (cada linha se salva sozinha)", async () => {
    abrir();
    await screen.findByText(/aulas publicadas com legenda/);
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
  });
});
