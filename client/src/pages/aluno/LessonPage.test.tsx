// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Role } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";
import type { PaginaDaAula } from "@/lib/api";

const getLessonPage = vi.fn();
const concluirAula = vi.fn();
const getSalvos = vi.fn();
const alternarSalvo = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getLessonPage: (...args: unknown[]) => getLessonPage(...args),
  concluirAula: (...args: unknown[]) => concluirAula(...args),
  getSalvos: (...args: unknown[]) => getSalvos(...args),
  alternarSalvo: (...args: unknown[]) => alternarSalvo(...args),
}));
// O player do Bunny é ouvido pelo NOSSO módulo; aqui ele vira dublê, e o teste
// "chega aos 90%" chamando o aviso que a página entregou.
const ouvirConclusao = vi.fn();
vi.mock("@/lib/player-do-bunny", () => ({
  ouvirConclusao: (...args: unknown[]) => ouvirConclusao(...args),
}));
const useSessionMock = vi.fn();
vi.mock("@/lib/auth-client", () => ({ useSession: () => useSessionMock() }));

import { LessonPage } from "./LessonPage";
import { SecondaryNav } from "@/components/nav/SecondaryNav";
import { definirMenuDoCursoFechado } from "@/lib/menu-do-curso";

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
      level: "INTERMEDIARIO",
      description: "Um curso **completo** de fórmulas.",
      learnTags: ["PROCX"],
      requirements: ["Excel instalado"],
      personas: ["Analistas de dados"],
      highlights: [{ icon: "sparkles", title: "IA do seu lado", text: "Com o JilsonAI." }],
      faq: [{ pergunta: "Preciso do 365?", resposta: "Não." }],
      camadas: ["UNIVERSAL"],
      videoSeconds: 0,
      modulos: [
        {
          id: 1,
          title: "Fundamentos",
          status: "PUBLISHED",
          aulas: [
            { id: 11, title: "Abertura", kind: "VIDEO", isFreePreview: false, status: "PUBLISHED", temArquivos: true },
            { id: 12, title: "Leitura", kind: "TEXT", isFreePreview: false, status: "PUBLISHED", temArquivos: true },
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
      arquivosLiberados: true,
      playerUrl: PLAYER,
      texto: null,
      arquivos: [{ id: 5, originalName: "Planilha.zip", sizeBytes: 2048 }],
      ...aula,
    },
    concluidas: [],
  };
}

beforeEach(() => {
  getLessonPage.mockReset().mockResolvedValue(pagina());
  useSessionMock.mockReset().mockReturnValue({ data: null, isPending: false });
  window.localStorage.clear();
  definirMenuDoCursoFechado(false);
  concluirAula.mockReset().mockResolvedValue(undefined);
  getSalvos.mockReset().mockResolvedValue({ cursos: [], aulas: [] });
  alternarSalvo.mockReset().mockResolvedValue(undefined);
  ouvirConclusao.mockReset().mockReturnValue(() => {});
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
    getLessonPage.mockResolvedValue(pagina({ liberada: false, arquivosLiberados: false, playerUrl: undefined, arquivos: undefined }));
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
    expect(screen.getByRole("heading", { name: "Arquivos para baixar" })).toBeTruthy();
    const link = screen.getByRole("link", { name: /Base\.xlsx/ });
    expect(link.getAttribute("href")).toBe("/api/lessons/12/files/7");
  });
});

// Na prévia grátis o visitante só assiste: os arquivos existem, mas não vêm
// (decisão do operador, 29/09/2026).
describe("página da aula — prévia grátis, sem assinatura", () => {
  it("aula de texto: o texto aparece; no lugar dos recursos, \"para assinantes\"", async () => {
    getLessonPage.mockResolvedValue(
      pagina({ id: 12, title: "Leitura", kind: "TEXT", isFreePreview: true, playerUrl: null, texto: "Texto livre.", arquivosLiberados: false, arquivos: undefined }),
    );
    abrir("/aluno/aula/12");
    expect(await screen.findByText("Texto livre.")).toBeTruthy();
    expect(screen.getByText("Os arquivos desta aula são para assinantes.")).toBeTruthy();
    expect(document.querySelector('a[href*="/files/"]')).toBeNull();
  });

  it("Arquivos na lista: \"para assinantes\", sem link de download", async () => {
    getLessonPage.mockResolvedValue(pagina({ isFreePreview: true, arquivosLiberados: false, arquivos: undefined }));
    abrir();
    const nav = await screen.findByRole("navigation", { name: "Conteúdo do curso" });
    fireEvent.click(within(nav).getAllByText("Arquivos")[0]);
    expect(await within(nav).findByText("Os arquivos desta aula são para assinantes.")).toBeTruthy();
    expect(within(nav).queryByRole("link", { name: /Planilha/ })).toBeNull();
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

  it("Arquivos, junto à aula, lista os arquivos para baixar", async () => {
    abrir();
    const nav = await screen.findByRole("navigation", { name: "Conteúdo do curso" });
    // O primeiro "Arquivos" é o da aula Abertura (a lista tem duas aulas com arquivo).
    fireEvent.click(within(nav).getAllByText("Arquivos")[0]);
    const link = await within(nav).findByRole("link", { name: /Planilha\.zip/ });
    expect(link.getAttribute("href")).toBe("/api/lessons/11/files/5");
  });

  it("o visitante não vê rascunho; o ADMIN vê, marcado, pela rota de admin", async () => {
    getLessonPage.mockResolvedValue(pagina({}, true));
    comoAdmin();
    abrir();
    // Como logado, a navegação fica no drawer no celular ou na barra lateral. Na página isolada, abrimos o drawer.
    fireEvent.click(await screen.findByRole("button", { name: "Conteúdo do curso" }));
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

// "Sobre o curso" embaixo do player, em toda aula (decisão do operador, 29/09/2026).
describe("página da aula — sobre o curso", () => {
  it("os detalhes do curso: nível, descrição, listas, camadas, destaques e perguntas", async () => {
    abrir();
    const sobre = await screen.findByRole("region", { name: "Sobre o curso" });
    expect(within(sobre).getByText("Intermediário")).toBeTruthy();
    expect(await within(sobre).findByText("completo")).toBeTruthy();
    expect(within(sobre).getByText("PROCX")).toBeTruthy();
    expect(within(sobre).getByText("Excel instalado")).toBeTruthy();
    expect(within(sobre).getByText("Analistas de dados")).toBeTruthy();
    expect(within(sobre).getByText("Fundamentos sólidos")).toBeTruthy();
    expect(within(sobre).getByText("IA do seu lado")).toBeTruthy();
    expect(within(sobre).getByText("Preciso do 365?")).toBeTruthy();
  });

  // A contagem ao lado do nível (acabamento do Antigravity, 30/09/2026), no formato
  // da página do curso: "1 módulo · 2 aulas · 1h 05min".
  it("a contagem de módulos, aulas e tempo de vídeo", async () => {
    const comVideo = pagina();
    comVideo.curso = { ...comVideo.curso, videoSeconds: 3900 };
    getLessonPage.mockResolvedValue(comVideo);
    abrir();
    const sobre = await screen.findByRole("region", { name: "Sobre o curso" });
    expect(within(sobre).getByText("1 módulo · 2 aulas · 1h 05min")).toBeTruthy();
  });

  it("aparece também na aula bloqueada", async () => {
    getLessonPage.mockResolvedValue(pagina({ liberada: false, arquivosLiberados: false, playerUrl: undefined, arquivos: undefined }));
    abrir();
    expect(await screen.findByRole("region", { name: "Sobre o curso" })).toBeTruthy();
  });

  it("bloco vazio não aparece", async () => {
    const semNada = pagina();
    semNada.curso = { ...semNada.curso, requirements: [], faq: [], highlights: null };
    getLessonPage.mockResolvedValue(semNada);
    abrir();
    const sobre = await screen.findByRole("region", { name: "Sobre o curso" });
    expect(within(sobre).queryByText("Pré-requisitos")).toBeNull();
    expect(within(sobre).queryByText("Perguntas frequentes")).toBeNull();
    expect(within(sobre).getByText("Pra quem é")).toBeTruthy();
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

// FECHOU, CONTINUA FECHADO (decisão do operador, 03/10/2026): o menu do curso fica
// fechado nas próximas aulas, e na próxima visita, até a pessoa reabrir.
describe("página da aula — fechar o menu do curso", () => {
  const abrirComMenu = (rota = "/aluno/aula/11") =>
    renderWithProviders(
      <>
        <SecondaryNav papel={Role.MEMBER} onSignOut={vi.fn()} />
        <LessonPage />
      </>,
      { route: rota, path: "/aluno/aula/:id" },
    );

  it("fechado, continua fechado na aula seguinte; e reabre", async () => {
    useSessionMock.mockReturnValue({ data: { user: { role: Role.MEMBER } }, isPending: false });
    const primeira = abrirComMenu();
    const coluna = await screen.findByRole("complementary", { name: "Menu da seção" });
    fireEvent.click(within(coluna).getByRole("button", { name: "Fechar o menu" }));
    expect(screen.queryByRole("complementary", { name: "Menu da seção" })).toBeNull();
    primeira.unmount();

    getLessonPage.mockResolvedValue(pagina({ id: 12, title: "Leitura", kind: "TEXT", playerUrl: null, texto: "Texto." }));
    abrirComMenu("/aluno/aula/12");
    await screen.findByText("Texto.");
    expect(screen.queryByRole("complementary", { name: "Menu da seção" })).toBeNull();

    // Fechado, a página mostra o botão de reabrir ANTES do da gaveta do celular
    // (no navegador, cada um só aparece no seu tamanho de tela).
    fireEvent.click(screen.getAllByRole("button", { name: "Conteúdo do curso" })[0]);
    expect(await screen.findByRole("complementary", { name: "Menu da seção" })).toBeTruthy();
  });

  it("sem fechar, o menu aparece e não há botão de reabrir", async () => {
    useSessionMock.mockReturnValue({ data: { user: { role: Role.MEMBER } }, isPending: false });
    abrirComMenu();
    expect(await screen.findByRole("complementary", { name: "Menu da seção" })).toBeTruthy();
    await screen.findByTitle("Abertura");
    // Só o botão da gaveta do celular.
    expect(screen.getAllByRole("button", { name: "Conteúdo do curso" })).toHaveLength(1);
  });
});

// O PROGRESSO (Fase 5 — decisões do operador, 03/10/2026): a aula conta como
// concluída sozinha — vídeo a 90%, texto ao abrir —, a barra mostra o número real
// e o conteúdo do curso marca o que foi feito. Só para quem está logado.
describe("página da aula — o progresso", () => {
  const comoMembro = () => useSessionMock.mockReturnValue({ data: { user: { role: Role.MEMBER } }, isPending: false });
  const texto = (extra: Partial<PaginaDaAula["aula"]> = {}) =>
    pagina({ id: 12, title: "Leitura", kind: "TEXT", playerUrl: null, texto: "Texto da aula.", ...extra });
  const comConcluidas = (base: PaginaDaAula, concluidas: number[]): PaginaDaAula => ({ ...base, concluidas });

  it("a barra mostra o progresso real no curso", async () => {
    comoMembro();
    getLessonPage.mockResolvedValue(comConcluidas(pagina(), [12]));
    abrir();
    const barra = await screen.findByRole("progressbar", { name: "Progresso no curso" });
    expect(barra.getAttribute("aria-valuenow")).toBe("50");
  });

  it("visitante: sem barra, e abrir a aula de texto não conclui nada", async () => {
    getLessonPage.mockResolvedValue(texto({ isFreePreview: true }));
    abrir("/aluno/aula/12");
    await screen.findByText("Texto da aula.");
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(concluirAula).not.toHaveBeenCalled();
  });

  it("aula de texto: abrir conclui, uma vez", async () => {
    comoMembro();
    getLessonPage.mockResolvedValue(texto());
    abrir("/aluno/aula/12");
    await screen.findByText("Texto da aula.");
    await waitFor(() => expect(concluirAula).toHaveBeenCalledWith(12, false));
    expect(concluirAula).toHaveBeenCalledTimes(1);
  });

  it("aula de texto já concluída: não conclui de novo", async () => {
    comoMembro();
    getLessonPage.mockResolvedValue(comConcluidas(texto(), [12]));
    abrir("/aluno/aula/12");
    await screen.findByText("Texto da aula.");
    expect(concluirAula).not.toHaveBeenCalled();
  });

  it("o admin conclui pela rota dele", async () => {
    comoAdmin();
    getLessonPage.mockResolvedValue(texto());
    abrir("/aluno/aula/12");
    await waitFor(() => expect(concluirAula).toHaveBeenCalledWith(12, true));
  });

  it("aula bloqueada: nada conclui", async () => {
    comoMembro();
    getLessonPage.mockResolvedValue(texto({ liberada: false, texto: undefined, arquivos: undefined }));
    abrir("/aluno/aula/12");
    await screen.findByRole("status");
    expect(concluirAula).not.toHaveBeenCalled();
    expect(ouvirConclusao).not.toHaveBeenCalled();
  });

  it("aula de vídeo: o player é ouvido, e chegar aos 90% conclui", async () => {
    comoMembro();
    abrir();
    await screen.findByTitle("Abertura");
    await waitFor(() => expect(ouvirConclusao).toHaveBeenCalledTimes(1));
    expect(concluirAula).not.toHaveBeenCalled();

    const aoChegarAos90 = ouvirConclusao.mock.calls[0][1] as () => void;
    aoChegarAos90();

    await waitFor(() => expect(concluirAula).toHaveBeenCalledWith(11, false));
  });

  // Concluir recarrega os dados da página, e o servidor assina o vídeo de novo
  // (token novo). O player NÃO pode recomeçar aos 90% (achado de 03/10/2026).
  it("ao concluir, o vídeo continua de onde estava (o player não recarrega)", async () => {
    comoMembro();
    getLessonPage.mockResolvedValueOnce(pagina()).mockResolvedValue(
      comConcluidas(pagina({ playerUrl: PLAYER.replace("token=t", "token=novo") }), [11]),
    );
    abrir();
    const quadro = await screen.findByTitle("Abertura");
    await waitFor(() => expect(ouvirConclusao).toHaveBeenCalled());

    (ouvirConclusao.mock.calls[0][1] as () => void)();

    await waitFor(() => expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("50"));
    expect(screen.getByTitle("Abertura")).toBe(quadro);
    expect(quadro.getAttribute("src")).toBe(PLAYER);
  });

  it("aula de vídeo já concluída, ou de visitante: o player não é ouvido", async () => {
    comoMembro();
    getLessonPage.mockResolvedValue(comConcluidas(pagina(), [11]));
    const primeira = abrir();
    await screen.findByTitle("Abertura");
    primeira.unmount();

    useSessionMock.mockReturnValue({ data: null, isPending: false });
    getLessonPage.mockResolvedValue(pagina({ isFreePreview: true }));
    abrir();
    await screen.findByTitle("Abertura");

    expect(ouvirConclusao).not.toHaveBeenCalled();
  });

  it("o conteúdo do curso marca só a aula concluída", async () => {
    getLessonPage.mockResolvedValue(comConcluidas(pagina(), [12]));
    abrir();
    const nav = await screen.findByRole("navigation", { name: "Conteúdo do curso" });
    expect(within(nav).getByRole("link", { name: /Leitura/ }).textContent).toContain("Concluída");
    expect(within(nav).getByRole("link", { name: /Abertura/ }).textContent).not.toContain("Concluída");
  });
});

// SALVAR PARA DEPOIS (decisão do operador, 03/10/2026, "como no LinkedIn"): um
// botão ao lado de cada aula e um no curso. Só logado, e só no que está publicado.
describe("página da aula — salvar para depois", () => {
  const comoMembro = () => useSessionMock.mockReturnValue({ data: { user: { role: Role.MEMBER } }, isPending: false });
  const navDoCurso = () => screen.findByRole("navigation", { name: "Conteúdo do curso" });

  it("salvar uma aula e tirar outra que já estava salva", async () => {
    comoMembro();
    getSalvos.mockResolvedValue({ cursos: [], aulas: [{ id: 11, title: "Abertura", kind: "VIDEO", curso: { slug: "excel", title: "Excel + IA" } }] });
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Conteúdo do curso" }));
    const nav = await navDoCurso();

    const leitura = within(nav).getByRole("button", { name: "Salvar para depois: Leitura" });
    const abertura = within(nav).getByRole("button", { name: "Salvar para depois: Abertura" });
    await waitFor(() => expect(abertura.getAttribute("aria-pressed")).toBe("true"));
    expect(leitura.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(leitura);
    await waitFor(() => expect(alternarSalvo).toHaveBeenCalledWith("aulas", 12, true));
    fireEvent.click(abertura);
    await waitFor(() => expect(alternarSalvo).toHaveBeenCalledWith("aulas", 11, false));
  });

  it("salvar o curso, no topo da página", async () => {
    comoMembro();
    abrir();
    const botao = await screen.findByRole("button", { name: "Salvar curso" });
    expect(botao.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(botao);

    await waitFor(() => expect(alternarSalvo).toHaveBeenCalledWith("cursos", 1, true));
  });

  it("o curso já salvo aparece ligado", async () => {
    comoMembro();
    getSalvos.mockResolvedValue({ cursos: [{ id: 1, slug: "excel", title: "Excel + IA", subtitle: null, level: null, thumbnailUrl: null }], aulas: [] });
    abrir();
    await waitFor(async () => expect((await screen.findByRole("button", { name: "Salvar curso" })).getAttribute("aria-pressed")).toBe("true"));
  });

  it("visitante: nenhum botão de salvar, e a lista nem é pedida", async () => {
    abrir();
    const nav = await navDoCurso();
    expect(within(nav).queryByRole("button", { name: /Salvar para depois/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Salvar curso" })).toBeNull();
    expect(getSalvos).not.toHaveBeenCalled();
  });

  it("aula em rascunho (o admin vê): sem botão de salvar", async () => {
    getLessonPage.mockResolvedValue(pagina({}, true));
    comoAdmin();
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Conteúdo do curso" }));
    const nav = await navDoCurso();
    expect(within(nav).getByRole("button", { name: "Salvar para depois: Abertura" })).toBeTruthy();
    expect(within(nav).queryByRole("button", { name: "Salvar para depois: Macros" })).toBeNull();
  });
});
