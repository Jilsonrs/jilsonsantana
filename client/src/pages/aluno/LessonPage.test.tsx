// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Link } from "react-router-dom";
import { AxiosError, AxiosHeaders } from "axios";
import { Role } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";
import type { PaginaDaAula } from "@/lib/api";
import type { OuvintesDoPlayer } from "@/lib/player-do-bunny";

const getLessonPage = vi.fn();
const concluirAula = vi.fn();
const getSalvos = vi.fn();
const alternarSalvo = vi.fn();
const gravarPonto = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getLessonPage: (...args: unknown[]) => getLessonPage(...args),
  concluirAula: (...args: unknown[]) => concluirAula(...args),
  getSalvos: (...args: unknown[]) => getSalvos(...args),
  alternarSalvo: (...args: unknown[]) => alternarSalvo(...args),
  gravarPonto: (...args: unknown[]) => gravarPonto(...args),
}));
// O player do Bunny é ouvido pelo NOSSO módulo; aqui ele vira dublê, e o teste
// "chega aos 90%" chamando o aviso que a página entregou.
const ouvirPlayer = vi.fn();
vi.mock("@/lib/player-do-bunny", () => ({
  ouvirPlayer: (...args: unknown[]) => ouvirPlayer(...args),
}));
/** Os avisos que a página entregou ao player (o dublê guarda o que recebeu). */
const avisosDoPlayer = () => ouvirPlayer.mock.calls[0][1] as Required<OuvintesDoPlayer>;
// O envio na saída da página é a NOSSA fronteira com o navegador (`fetchLater`): dublê.
type EnvioFalso = { cancelar: ReturnType<typeof vi.fn>; enviado: ReturnType<typeof vi.fn> };
const agendarNaSaida = vi.fn();
vi.mock("@/lib/envio-na-saida", () => ({
  agendarNaSaida: (...args: unknown[]) => agendarNaSaida(...args),
}));
const useSessionMock = vi.fn();
vi.mock("@/lib/auth-client", () => ({ useSession: () => useSessionMock() }));

import { LessonPage } from "./LessonPage";
import { anotarVersaoDoServidor, esquecerVersaoDoServidor, navegador } from "@/lib/versao";
import { SecondaryNav } from "@/components/nav/SecondaryNav";
import { definirMenuDoCursoFechado } from "@/lib/menu-do-curso";

// A PÁGINA DA AULA (etapa 4 do Bloco U — plano aprovado pelo operador em
// 29/09/2026, no estilo do LinkedIn Learning). O que estes testes protegem: os
// estados da tela; a tela mostra SÓ o que o servidor liberou; a aula atual fica
// destacada no conteúdo do curso; o rascunho aparece só para o admin; os recursos;
// e o painel da IA.

// Vale até 2100: um endereço vencido faria a aula pedir outro (06/10/2026).
const PLAYER = "https://iframe.mediadelivery.net/embed/762605/abc?token=t&expires=4102444800";

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
      materiais: [],
      // As linhas calculadas vêm do servidor; há aula com arquivo na lista.
      inclui: { segundosDeVideo: 0, artigos: 0, aulasGratis: 0, arquivos: true, legendas: false },
      videoSeconds: 0,
      modulos: [
        {
          id: 1,
          title: "Fundamentos",
          status: "PUBLISHED",
          aulas: [
            { id: 11, title: "Abertura", kind: "VIDEO", isFreePreview: false, status: "PUBLISHED", temArquivos: true, duracaoSegundos: 82 },
            { id: 12, title: "Leitura", kind: "TEXT", isFreePreview: false, status: "PUBLISHED", temArquivos: true, duracaoSegundos: null },
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
  ouvirPlayer.mockReset().mockReturnValue(() => {});
  gravarPonto.mockReset().mockResolvedValue(undefined);
  agendarNaSaida.mockReset().mockImplementation((): EnvioFalso => ({ cancelar: vi.fn(), enviado: vi.fn(() => false) }));
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
  // Aba aberta de um dia para o outro (decisão do operador, 06/10/2026: "se
  // expirar, recarrega a aula"): a aula busca um endereço novo e o player troca.
  it("endereço do vídeo vencido: a aula busca de novo e o player recebe o endereço novo", async () => {
    // Logado: a página tem uma busca só (o visitante tem também a da lista de aulas,
    // que traria o endereço novo por outro caminho e esconderia a renovação).
    useSessionMock.mockReturnValue({ data: { user: { role: Role.MEMBER } }, isPending: false });
    const vencido = PLAYER.replace("token=t", "token=velho").replace("expires=4102444800", "expires=1");
    getLessonPage.mockResolvedValueOnce(pagina({ playerUrl: vencido })).mockResolvedValue(pagina({ playerUrl: PLAYER }));
    abrir();
    const player = await screen.findByTitle("Abertura");
    await waitFor(() => expect(player.getAttribute("src")).toBe(PLAYER));
    // Com o endereço novo no player, a aula para de pedir.
    const pedidos = getLessonPage.mock.calls.length;
    await new Promise((r) => setTimeout(r, 50));
    expect(getLessonPage.mock.calls.length).toBe(pedidos);
  });

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

  // A duração ao lado de cada aula, como no LinkedIn (operador, 06/10/2026).
  it("a aula de vídeo mostra a duração; a de texto, não", async () => {
    abrir();
    const nav = await screen.findByRole("navigation", { name: "Conteúdo do curso" });
    expect(within(nav).getByRole("link", { name: /Abertura/ }).textContent).toContain("1min 22s");
    expect(within(nav).getByRole("link", { name: /Leitura/ }).textContent).not.toMatch(/\d+(min|s)\b/);
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

// "ESTE CURSO INCLUI" também no "Sobre o curso" (decisão do operador, 04/10/2026):
// os arquivos aparecem quando alguma aula da lista tem; os materiais, os marcados.
describe("página da aula — este curso inclui", () => {
  it("as linhas que o servidor calculou e o material marcado", async () => {
    const comMaterial = pagina();
    comMaterial.curso = { ...comMaterial.curso, materiais: ["APOSTILA"] };
    getLessonPage.mockResolvedValue(comMaterial);
    abrir();
    const sobre = await screen.findByRole("region", { name: "Sobre o curso" });
    const quadro = within(sobre).getByRole("heading", { name: "Este curso inclui:" }).closest("section") as HTMLElement;
    expect([...quadro.querySelectorAll("li")].map((li) => li.textContent)).toEqual([
      "Arquivos para acompanhar as aulas",
      "Apostila",
      "Certificado de conclusão",
    ]);
  });

  it("nenhuma outra linha: o quadro aparece só com o certificado", async () => {
    const vazio = pagina();
    vazio.curso = { ...vazio.curso, inclui: { ...vazio.curso.inclui, arquivos: false } };
    getLessonPage.mockResolvedValue(vazio);
    abrir();
    const sobre = await screen.findByRole("region", { name: "Sobre o curso" });
    const quadro = within(sobre).getByRole("heading", { name: "Este curso inclui:" }).closest("section") as HTMLElement;
    expect([...quadro.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["Certificado de conclusão"]);
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
    // E o número escrito no topo, como no cartão (operador, 06/10/2026).
    expect(screen.getByText("50% concluído")).toBeTruthy();
  });

  it("visitante: sem barra, e abrir a aula de texto não conclui nada", async () => {
    getLessonPage.mockResolvedValue(texto({ isFreePreview: true }));
    abrir("/aluno/aula/12");
    await screen.findByText("Texto da aula.");
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText(/% concluído/)).toBeNull();
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
    expect(ouvirPlayer).not.toHaveBeenCalled();
  });

  it("aula de vídeo: o player é ouvido, e chegar aos 90% conclui", async () => {
    comoMembro();
    abrir();
    await screen.findByTitle("Abertura");
    await waitFor(() => expect(ouvirPlayer).toHaveBeenCalledTimes(1));
    expect(concluirAula).not.toHaveBeenCalled();

    avisosDoPlayer().aoConcluir();

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
    await waitFor(() => expect(ouvirPlayer).toHaveBeenCalled());

    avisosDoPlayer().aoConcluir();

    await waitFor(() => expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("50"));
    expect(screen.getByTitle("Abertura")).toBe(quadro);
    expect(quadro.getAttribute("src")).toBe(PLAYER);
  });

  // O player é sempre ouvido (o ponto e o fim, 05/10/2026); o que não pode é
  // CONCLUIR de novo, nem concluir para o visitante.
  it("aula de vídeo já concluída, ou de visitante: chegar aos 90% não conclui", async () => {
    comoMembro();
    getLessonPage.mockResolvedValue(comConcluidas(pagina(), [11]));
    const primeira = abrir();
    await screen.findByTitle("Abertura");
    await waitFor(() => expect(ouvirPlayer).toHaveBeenCalled());
    avisosDoPlayer().aoConcluir();
    primeira.unmount();

    ouvirPlayer.mockClear();
    useSessionMock.mockReturnValue({ data: null, isPending: false });
    getLessonPage.mockResolvedValue(pagina({ isFreePreview: true }));
    abrir();
    await screen.findByTitle("Abertura");
    await waitFor(() => expect(ouvirPlayer).toHaveBeenCalled());
    avisosDoPlayer().aoConcluir();

    expect(concluirAula).not.toHaveBeenCalled();
  });

  it("o conteúdo do curso marca só a aula concluída", async () => {
    getLessonPage.mockResolvedValue(comConcluidas(pagina(), [12]));
    abrir();
    const nav = await screen.findByRole("navigation", { name: "Conteúdo do curso" });
    expect(within(nav).getByRole("link", { name: /Leitura/ }).textContent).toContain("Concluída");
    expect(within(nav).getByRole("link", { name: /Abertura/ }).textContent).not.toContain("Concluída");
  });
});

// A PRÓXIMA AULA (decisão do operador, 05/10/2026): o vídeo terminou, a próxima
// aula da lista abre na hora, seja vídeo ou texto — para o aluno e na prévia do
// admin. Na última aula, o vídeo só termina.
// AULA DE TEXTO SEM TEXTO (achado do operador, 05/10/2026): o aviso, nunca a
// área vazia — e o texto, quando existe, continua aparecendo.
describe("página da aula — aula de texto sem texto", () => {
  it("mostra que a aula ainda não tem texto", async () => {
    getLessonPage.mockResolvedValue(pagina({ id: 12, title: "Leitura", kind: "TEXT", playerUrl: null, texto: "   " }));
    abrir("/aluno/aula/12");
    expect(await screen.findByText("Esta aula ainda não tem texto.")).toBeTruthy();
  });

  it("com texto: o texto, sem o aviso", async () => {
    getLessonPage.mockResolvedValue(pagina({ id: 12, title: "Leitura", kind: "TEXT", playerUrl: null, texto: "O **PROCV** procura." }));
    abrir("/aluno/aula/12");
    expect(await screen.findByText("PROCV")).toBeTruthy();
    expect(screen.queryByText("Esta aula ainda não tem texto.")).toBeNull();
  });
});

describe("página da aula — o fim do vídeo abre a próxima", () => {
  it("aluno: o fim da aula de vídeo abre a próxima, que é de texto", async () => {
    useSessionMock.mockReturnValue({ data: { user: { role: Role.MEMBER } }, isPending: false });
    getLessonPage.mockImplementation((id: number) =>
      Promise.resolve(id === 12 ? pagina({ id: 12, title: "Leitura", kind: "TEXT", playerUrl: null, texto: "A aula seguinte." }) : pagina()),
    );
    abrir();
    await screen.findByTitle("Abertura");
    await waitFor(() => expect(ouvirPlayer).toHaveBeenCalled());

    avisosDoPlayer().aoTerminar();

    expect(await screen.findByText("A aula seguinte.")).toBeTruthy();
    expect(getLessonPage).toHaveBeenLastCalledWith(12, false);
  });

  // Com versão nova no servidor (06/10/2026): a próxima aula abre carregando a
  // página inteira, já atualizada — não por dentro do app.
  it("com versão nova no servidor: a próxima aula abre carregando a página", async () => {
    const ir = vi.spyOn(navegador, "ir").mockImplementation(() => {});
    useSessionMock.mockReturnValue({ data: { user: { role: Role.MEMBER } }, isPending: false });
    abrir();
    await screen.findByTitle("Abertura");
    await waitFor(() => expect(ouvirPlayer).toHaveBeenCalled());
    anotarVersaoDoServidor("outra-versao");

    avisosDoPlayer().aoTerminar();

    expect(ir).toHaveBeenCalledWith("/aluno/aula/12");
    expect(getLessonPage.mock.calls.every(([id]) => id === 11)).toBe(true);
    esquecerVersaoDoServidor();
    ir.mockRestore();
  });

  it("na prévia do admin também", async () => {
    useSessionMock.mockReturnValue({ data: { user: { role: Role.ADMIN } }, isPending: false });
    abrir();
    await screen.findByTitle("Abertura");
    await waitFor(() => expect(ouvirPlayer).toHaveBeenCalled());
    avisosDoPlayer().aoTerminar();
    await waitFor(() => expect(getLessonPage).toHaveBeenLastCalledWith(12, true));
  });

  it("na última aula: o vídeo termina e a página fica", async () => {
    useSessionMock.mockReturnValue({ data: { user: { role: Role.MEMBER } }, isPending: false });
    getLessonPage.mockResolvedValue(pagina({ id: 12, title: "Leitura", kind: "VIDEO", playerUrl: PLAYER }));
    abrir("/aluno/aula/12");
    await screen.findByTitle("Leitura");
    await waitFor(() => expect(ouvirPlayer).toHaveBeenCalled());
    const chamadas = getLessonPage.mock.calls.length;

    avisosDoPlayer().aoTerminar();

    expect(screen.getByTitle("Leitura")).toBeTruthy();
    expect(getLessonPage.mock.calls.length).toBe(chamadas);
    expect(getLessonPage.mock.calls.every(([id]) => id === 12)).toBe(true);
  });
});

// ONDE A PESSOA PAROU (Bloco AULA, etapa 2 — decisões do operador, 06/10/2026): o
// ponto do vídeo e a aula em que a pessoa está vão para a CONTA; quem volta abre na
// mesma aula, no mesmo segundo, TOCANDO (o "pausou, volta pausado" foi revogado).
describe("página da aula — onde a pessoa parou", () => {
  const comoMembro = () => useSessionMock.mockReturnValue({ data: { user: { role: Role.MEMBER } }, isPending: false });
  const texto = () => pagina({ id: 12, title: "Leitura", kind: "TEXT", playerUrl: null, texto: "Texto da aula." });
  const params = () => new URL(screen.getByTitle("Abertura").getAttribute("src") ?? "").searchParams;
  const ultimoAgendado = () => agendarNaSaida.mock.lastCall as [string, { segundos: number | null }];
  const semRede = () => new AxiosError("Network Error", "ERR_NETWORK");
  function comStatus(status: number) {
    const headers = new AxiosHeaders();
    return new AxiosError(String(status), "ERR_BAD_REQUEST", undefined, undefined, { status, statusText: "", headers, config: { headers }, data: {} });
  }
  /** Abre a aula 11 logado, espera o player ser ouvido, e devolve os avisos dele. */
  async function abrirAssistindo(extra: Partial<PaginaDaAula["aula"]> = {}) {
    comoMembro();
    getLessonPage.mockResolvedValue(pagina(extra));
    abrir();
    await screen.findByTitle("Abertura");
    await waitFor(() => expect(ouvirPlayer).toHaveBeenCalled());
    return avisosDoPlayer();
  }

  it("abrir a aula de vídeo: o player abre no ponto da conta, TOCANDO, e a aula avisa que a pessoa está nela", async () => {
    // O servidor manda a aula com `autoplay=true`; a tela nunca troca por `false`.
    await abrirAssistindo({ ponto: 125, playerUrl: `${PLAYER}&autoplay=true` });
    expect(params().get("t")).toBe("125s");
    expect(params().get("autoplay")).toBe("true");
    await waitFor(() => expect(gravarPonto).toHaveBeenCalledWith(11, 125, false));
    expect(ultimoAgendado()).toEqual(["/api/lessons/11/ponto", { segundos: 125 }]);
  });

  it("abrir a aula de texto: avisa que a pessoa está nela, sem ponto", async () => {
    comoMembro();
    getLessonPage.mockResolvedValue(texto());
    abrir("/aluno/aula/12");
    await screen.findByText("Texto da aula.");
    await waitFor(() => expect(gravarPonto).toHaveBeenCalledWith(12, null, false));
    expect(agendarNaSaida).not.toHaveBeenCalled();
  });

  it("o admin grava pela rota dele", async () => {
    comoAdmin();
    abrir();
    await screen.findByTitle("Abertura");
    await waitFor(() => expect(gravarPonto).toHaveBeenCalledWith(11, 0, true));
    expect(ultimoAgendado()[0]).toBe("/api/admin/lessons/11/ponto");
  });

  it("visitante (prévia grátis) e aula trancada: nada é gravado", async () => {
    getLessonPage.mockResolvedValue(pagina({ isFreePreview: true }));
    const visitante = abrir();
    await screen.findByTitle("Abertura");
    await waitFor(() => expect(ouvirPlayer).toHaveBeenCalled());
    avisosDoPlayer().aoPausar(30);
    visitante.unmount();

    comoMembro();
    getLessonPage.mockResolvedValue(pagina({ liberada: false, playerUrl: undefined, arquivos: undefined }));
    abrir();
    await screen.findByRole("status");
    await new Promise((r) => setTimeout(r, 20));
    expect(gravarPonto).not.toHaveBeenCalled();
    expect(agendarNaSaida).not.toHaveBeenCalled();
  });

  it("o vídeo andando grava a cada 15 s; a PAUSA grava na hora; o envio da saída fica sempre com o último ponto", async () => {
    const player = await abrirAssistindo();
    await waitFor(() => expect(gravarPonto).toHaveBeenCalledTimes(1));

    player.aoAndar(10, 600);
    player.aoAndar(16, 600);
    player.aoAndar(20, 600);
    expect(ultimoAgendado()[1]).toEqual({ segundos: 20 });
    player.aoPausar(22);

    await waitFor(() => expect(gravarPonto).toHaveBeenCalledTimes(3));
    expect(gravarPonto.mock.calls).toEqual([
      [11, 0, false],
      [11, 16, false],
      [11, 22, false],
    ]);
    expect(ultimoAgendado()[1]).toEqual({ segundos: 22 });
  });

  it("o fim grava 'viu até o fim' (vazio) ANTES de abrir a próxima, que avisa que a pessoa está nela", async () => {
    const player = await abrirAssistindo();
    getLessonPage.mockImplementation((id: number) => Promise.resolve(id === 12 ? texto() : pagina()));

    player.aoAndar(590, 600);
    player.aoTerminar();

    expect(await screen.findByText("Texto da aula.")).toBeTruthy();
    await waitFor(() => expect(gravarPonto).toHaveBeenCalledWith(12, null, false));
    expect(gravarPonto.mock.calls).toEqual([
      [11, 0, false],
      [11, 590, false],
      [11, null, false],
      [12, null, false],
    ]);
  });

  it("na ÚLTIMA aula, o fim grava 'viu até o fim' sem sair dela (é o que leva quem terminou à aula que falta)", async () => {
    comoMembro();
    getLessonPage.mockResolvedValue(pagina({ id: 12, title: "Leitura", kind: "VIDEO", playerUrl: PLAYER }));
    abrir("/aluno/aula/12");
    await screen.findByTitle("Leitura");
    await waitFor(() => expect(ouvirPlayer).toHaveBeenCalled());
    await waitFor(() => expect(gravarPonto).toHaveBeenCalledWith(12, 0, false));

    avisosDoPlayer().aoTerminar();

    await waitFor(() => expect(gravarPonto).toHaveBeenLastCalledWith(12, null, false));
    expect(ultimoAgendado()[1]).toEqual({ segundos: null });
    expect(screen.getByTitle("Leitura")).toBeTruthy();
  });

  it("sair para outra tela grava o último ponto e desfaz o envio da saída; quem volta na mesma visita abre nele", async () => {
    const enviados: EnvioFalso[] = [];
    agendarNaSaida.mockImplementation((): EnvioFalso => {
      const envio = { cancelar: vi.fn(), enviado: vi.fn(() => false) };
      enviados.push(envio);
      return envio;
    });
    comoMembro();
    getLessonPage.mockResolvedValue(pagina({ ponto: 125 }));
    renderWithProviders(
      <>
        <LessonPage />
        <Link to="/inicio">sair</Link>
      </>,
      {
        route: "/aluno/aula/11",
        path: "/aluno/aula/:id",
        extraRoutes: [{ path: "/inicio", element: <Link to="/aluno/aula/11">voltar à aula</Link> }],
      },
    );
    await screen.findByTitle("Abertura");
    await waitFor(() => expect(ouvirPlayer).toHaveBeenCalled());
    const player = avisosDoPlayer();
    player.aoAndar(140, 600);
    player.aoAndar(147, 600);

    fireEvent.click(screen.getByText("sair"));
    await waitFor(() => expect(gravarPonto).toHaveBeenLastCalledWith(11, 147, false));
    // Gravado pelo caminho normal, o envio da saída não precisa mais sair.
    const ultimoEnvio = enviados[enviados.length - 1];
    await waitFor(() => expect(ultimoEnvio.cancelar).toHaveBeenCalled());

    fireEvent.click(await screen.findByText("voltar à aula"));
    await screen.findByTitle("Abertura");
    expect(params().get("t")).toBe("147s");
  });

  it("o envio da saída já saiu (Safari e Firefox, ao esconder a aba): ao voltar, é agendado de novo, com o último ponto", async () => {
    const enviados: EnvioFalso[] = [];
    agendarNaSaida.mockImplementation((): EnvioFalso => {
      const envio = { cancelar: vi.fn(), enviado: vi.fn(() => true) };
      enviados.push(envio);
      return envio;
    });
    const player = await abrirAssistindo();
    player.aoAndar(30, 600);
    const antes = agendarNaSaida.mock.calls.length;

    document.dispatchEvent(new Event("visibilitychange"));

    expect(agendarNaSaida.mock.calls.length).toBe(antes + 1);
    expect(ultimoAgendado()[1]).toEqual({ segundos: 30 });
    // O anterior foi desfeito antes de agendar o novo.
    expect(enviados[enviados.length - 2].cancelar).toHaveBeenCalled();
  });

  it("os envios vão em FILA: o próximo espera o anterior chegar", async () => {
    let soltarAbertura: () => void = () => {};
    gravarPonto.mockImplementationOnce(() => new Promise<void>((r) => (soltarAbertura = r)));
    const player = await abrirAssistindo();
    await waitFor(() => expect(gravarPonto).toHaveBeenCalledTimes(1));

    player.aoPausar(40);
    await new Promise((r) => setTimeout(r, 20));
    expect(gravarPonto).toHaveBeenCalledTimes(1);

    soltarAbertura();
    await waitFor(() => expect(gravarPonto).toHaveBeenLastCalledWith(11, 40, false));
  });

  it("um tropeço de rede tenta de novo; um 4xx (ex.: perdeu a assinatura) não insiste", async () => {
    gravarPonto.mockRejectedValueOnce(semRede());
    await abrirAssistindo();
    await waitFor(() => expect(gravarPonto).toHaveBeenCalledTimes(2), { timeout: 2500 });
    expect(gravarPonto.mock.calls[1]).toEqual([11, 0, false]);

    gravarPonto.mockReset().mockRejectedValue(comStatus(403));
    avisosDoPlayer().aoPausar(50);
    await new Promise((r) => setTimeout(r, 1200));
    expect(gravarPonto).toHaveBeenCalledTimes(1);
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
