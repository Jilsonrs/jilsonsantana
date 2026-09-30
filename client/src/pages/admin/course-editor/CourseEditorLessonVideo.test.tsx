// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import { afterEach } from "vitest";
import { Role } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";
import { SecondaryNav } from "@/components/nav/SecondaryNav";
import type { AdminCourseDetail, AdminLesson } from "@/lib/api";
import { CURSO_DE_TESTE } from "./curso-de-teste";

const adminGetCourse = vi.fn();
const startLessonVideoUpload = vi.fn();
const completeLessonVideoUpload = vi.fn();
const getLessonVideo = vi.fn();
const updateLesson = vi.fn();
const enviarVideo = vi.fn();
vi.mock("@/lib/video-upload", () => ({
  enviarVideo: (...args: unknown[]) => enviarVideo(...args),
}));
vi.mock("@/lib/api", () => ({
  adminGetCourse: (...args: unknown[]) => adminGetCourse(...args),
  startLessonVideoUpload: (...args: unknown[]) => startLessonVideoUpload(...args),
  completeLessonVideoUpload: (...args: unknown[]) => completeLessonVideoUpload(...args),
  getLessonVideo: (...args: unknown[]) => getLessonVideo(...args),
  listLessonFiles: () => Promise.resolve([]),
  // Os arquivos aparecem dentro da aula aberta; aqui não são o assunto.
  uploadLessonFile: vi.fn(),
  deleteLessonFile: vi.fn(),
  updateLesson: (...args: unknown[]) => updateLesson(...args),
}));

import { esquecerEnvios } from "@/lib/envios-de-video";
import { CourseEditorLayout } from "./CourseEditorLayout";
import { ROTAS_DO_EDITOR } from "./steps";

// O VÍDEO DE CADA AULA (Bloco U, etapa 3). O envio em si é do Bunny (TUS); aqui
// se prova o que a TELA faz: a aula abre e recolhe, e aberta mostra a miniatura,
// o nome e a duração, SEM player (como a Udemy — operador, 28/09/2026); a
// porcentagem; gravar o vídeo só no fim; o "não configurado"; a prévia grátis.

const GUID = "eb1c4f77-0cda-46be-b47d-1118ad7c2ffe";
const MINIATURA = `https://vz-teste.b-cdn.net/${GUID}/thumbnail.jpg`;
const PRONTO = { pronto: true, falhou: false, nome: "abertura.mp4", duracaoEmSegundos: 111, miniaturaUrl: MINIATURA };

function comAula(aula: Partial<AdminLesson>): AdminCourseDetail {
  return {
    ...CURSO_DE_TESTE,
    modules: [
      {
        id: 1,
        courseId: 1,
        title: "Fundamentos",
        layer: null,
        displayOrder: 0,
        status: "DRAFT",
        lessons: [
          {
            id: 11,
            moduleId: 1,
            title: "Abertura",
            kind: "VIDEO",
            content: null,
            bunnyVideoId: null,
            bunnyVideoPendingId: null, bunnyVideoReady: false, videoDurationSeconds: null,
            isFreePreview: false,
            tags: [],
            displayOrder: 0,
            status: "DRAFT",
            ...aula,
          },
        ],
      },
    ],
  };
}

beforeEach(() => {
  for (const f of [adminGetCourse, startLessonVideoUpload, completeLessonVideoUpload, getLessonVideo, updateLesson, enviarVideo]) f.mockReset();
  getLessonVideo.mockResolvedValue({ video: PRONTO });
  updateLesson.mockResolvedValue({ id: 11 });
  esquecerEnvios();
});

afterEach(() => {
  vi.useRealTimers();
});

const renderizar = () =>
  renderWithProviders(<CourseEditorLayout />, { route: "/admin/cursos/1/conteudo", path: "/admin/cursos/:id", filhas: ROTAS_DO_EDITOR });

const seta = () => screen.findByRole("button", { name: /^(Abrir|Recolher) a aula Abertura$/ });

/** Entra no Conteúdo e deixa a aula aberta (a sem vídeo, ou processando, já começa aberta). */
async function abrirVideo(aula: Partial<AdminLesson> = {}) {
  adminGetCourse.mockResolvedValue(comAula(aula));
  renderizar();
  const botao = await seta();
  if (botao.getAttribute("aria-expanded") === "false") fireEvent.click(botao);
}

const escolher = () =>
  fireEvent.change(screen.getByTestId("lesson-video-file-11"), {
    target: { files: [new File(["mp4"], "abertura.mp4", { type: "video/mp4" })] },
  });

describe("a aula abre e recolhe (como a Udemy)", () => {
  it("a seta abre e recolhe", async () => {
    adminGetCourse.mockResolvedValue(comAula({ bunnyVideoId: GUID, bunnyVideoReady: true }));
    renderizar();
    const botao = await screen.findByRole("button", { name: "Abrir a aula Abertura" });
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "Trocar o vídeo" })).toBeNull();

    fireEvent.click(botao);
    expect(screen.getByRole("button", { name: "Recolher a aula Abertura" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Trocar o vídeo" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Recolher a aula Abertura" }));
    expect(screen.queryByRole("button", { name: "Trocar o vídeo" })).toBeNull();
  });

  it("aula de texto aberta não tem vídeo", async () => {
    adminGetCourse.mockResolvedValue(comAula({ kind: "TEXT" }));
    renderizar();
    fireEvent.click(await screen.findByRole("button", { name: "Abrir a aula Abertura" }));
    expect(screen.getByRole("textbox", { name: "Texto da aula" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Enviar vídeo" })).toBeNull();
  });
});

// Quem começa aberta ao entrar (decisão do operador, 29/09/2026): a aula que ainda
// espera o vídeo ou está processando fica aberta; a pronta e a de texto, recolhidas.
describe("ao entrar no Conteúdo", () => {
  const casos: [string, Partial<AdminLesson>, "true" | "false"][] = [
    ["sem vídeo: aberta", {}, "true"],
    ["processando (o Bunny ainda não confirmou): aberta", { bunnyVideoId: GUID, bunnyVideoReady: false }, "true"],
    ["com o vídeo pronto: recolhida", { bunnyVideoId: GUID, bunnyVideoReady: true }, "false"],
    ["aula de texto: recolhida", { kind: "TEXT" }, "false"],
  ];
  for (const [nome, aula, esperado] of casos) {
    it(nome, async () => {
      adminGetCourse.mockResolvedValue(comAula(aula));
      renderizar();
      expect((await seta()).getAttribute("aria-expanded")).toBe(esperado);
    });
  }

  // Aberta continua aberta: o vídeo ficar pronto e o curso recarregar não recolhe
  // a aula na cara do operador.
  it("a aula aberta continua aberta quando o curso recarrega com o vídeo pronto", async () => {
    await abrirVideo({ bunnyVideoId: GUID, bunnyVideoReady: false });
    adminGetCourse.mockResolvedValue(comAula({ bunnyVideoId: GUID, bunnyVideoReady: true }));

    fireEvent.click(screen.getByRole("checkbox", { name: /Prévia grátis/ }));
    await waitFor(() => expect(adminGetCourse).toHaveBeenCalledTimes(2));

    expect((await seta()).getAttribute("aria-expanded")).toBe("true");
  });
});

describe("vídeo da aula — enviar", () => {
  it('aula sem vídeo: "Sem vídeo" e o botão de enviar', async () => {
    await abrirVideo();
    expect(screen.getByText("Sem vídeo")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Enviar vídeo" })).toBeTruthy();
    expect(getLessonVideo).not.toHaveBeenCalled();
  });

  it("mostra a porcentagem; no fim grava o vídeo e mostra o resumo dele", async () => {
    let progredir: (p: number) => void = () => {};
    let terminar: () => void = () => {};
    const dados = { videoId: GUID, titulo: "abertura.mp4", libraryId: "762605", expirationTime: 1, signature: "s" };
    startLessonVideoUpload.mockResolvedValue(dados);
    enviarVideo.mockImplementation((_f: File, _d: unknown, aoProgredir: (p: number) => void) => {
      progredir = aoProgredir;
      return { concluido: new Promise<void>((r) => (terminar = r)), cancelar: () => {} };
    });
    completeLessonVideoUpload.mockResolvedValue({ bunnyVideoId: GUID });
    await abrirVideo();
    // Depois do envio, o curso recarrega com o vídeo na aula.
    adminGetCourse.mockResolvedValue(comAula({ bunnyVideoId: GUID }));

    escolher();
    await waitFor(() => expect(enviarVideo).toHaveBeenCalled());
    // O nome do arquivo escolhido vira o nome do vídeo no Bunny.
    expect(startLessonVideoUpload).toHaveBeenCalledWith(11, "abertura.mp4");
    act(() => progredir(37));
    expect(await screen.findByRole("button", { name: "Enviando… 37%" })).toBeTruthy();
    // Antes de terminar, a aula ainda não aponta para o vídeo novo.
    expect(completeLessonVideoUpload).not.toHaveBeenCalled();

    act(() => terminar());
    await waitFor(() => expect(completeLessonVideoUpload).toHaveBeenCalledWith(11, GUID));
    expect(await screen.findByText("abertura.mp4")).toBeTruthy();
    expect(getLessonVideo).toHaveBeenCalledWith(11);
    expect(screen.getByRole("button", { name: "Trocar o vídeo" })).toBeTruthy();
  });

  it("biblioteca não configurada (o computador do operador): diz isso", async () => {
    startLessonVideoUpload.mockRejectedValue({ response: { status: 503, data: { error: "StreamNaoConfigurado" } } });
    await abrirVideo();
    escolher();
    expect((await screen.findByRole("alert")).textContent).toBe("A biblioteca de aulas não está configurada neste ambiente.");
    expect(enviarVideo).not.toHaveBeenCalled();
  });

  it("o envio caiu: avisa, e a aula NÃO grava o vídeo", async () => {
    startLessonVideoUpload.mockResolvedValue({ videoId: GUID, titulo: "a.mp4", libraryId: "1", expirationTime: 1, signature: "s" });
    enviarVideo.mockImplementation(() => ({ concluido: Promise.reject(new Error("rede")), cancelar: () => {} }));
    await abrirVideo();
    escolher();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível enviar o vídeo. Tente de novo.");
    expect(completeLessonVideoUpload).not.toHaveBeenCalled();
  });
});

// O envio não depende da tela (pedido do operador, 29/09/2026): recolher a aula ou
// trocar de passo no meio não interrompe nada, e a porcentagem continua lá.
describe("vídeo da aula — o envio sobrevive à tela", () => {
  let progredir: (p: number) => void = () => {};
  let terminar: () => void = () => {};
  let falhar: (e: Error) => void = () => {};
  beforeEach(() => {
    startLessonVideoUpload.mockResolvedValue({ videoId: GUID, titulo: "abertura.mp4", libraryId: "762605", expirationTime: 1, signature: "s" });
    completeLessonVideoUpload.mockResolvedValue({ bunnyVideoId: GUID });
    enviarVideo.mockImplementation((_f: File, _d: unknown, aoProgredir: (p: number) => void) => {
      progredir = aoProgredir;
      return { concluido: new Promise<void>((r, x) => ((terminar = r), (falhar = x))), cancelar: () => {} };
    });
  });

  async function enviarAte37() {
    await abrirVideo();
    escolher();
    await waitFor(() => expect(enviarVideo).toHaveBeenCalled());
    act(() => progredir(37));
    await screen.findByRole("button", { name: "Enviando… 37%" });
  }

  it("recolher e abrir a aula: a porcentagem continua, e não dá para começar outro envio nela", async () => {
    await enviarAte37();
    fireEvent.click(screen.getByRole("button", { name: "Recolher a aula Abertura" }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir a aula Abertura" }));

    const botao = screen.getByRole("button", { name: "Enviando… 37%" });
    expect((botao as HTMLButtonElement).disabled).toBe(true);
    act(() => progredir(80));
    expect(await screen.findByRole("button", { name: "Enviando… 80%" })).toBeTruthy();

    act(() => terminar());
    await waitFor(() => expect(completeLessonVideoUpload).toHaveBeenCalledWith(11, GUID));
    expect(startLessonVideoUpload).toHaveBeenCalledTimes(1);
  });

  it("trocar de passo no meio e voltar: o envio continuou, com a porcentagem", async () => {
    // Com o nível 2 da navegação ao lado, que é por onde o operador troca de passo.
    adminGetCourse.mockResolvedValue(comAula({}));
    renderWithProviders(
      <>
        <SecondaryNav papel={Role.ADMIN} onSignOut={vi.fn()} />
        <CourseEditorLayout />
      </>,
      { route: "/admin/cursos/1/conteudo", path: "/admin/cursos/:id", filhas: ROTAS_DO_EDITOR },
    );
    await seta();
    escolher();
    await waitFor(() => expect(enviarVideo).toHaveBeenCalled());
    act(() => progredir(37));
    await screen.findByRole("button", { name: "Enviando… 37%" });
    const passo = (nome: string) => within(screen.getByRole("complementary")).getByRole("link", { name: new RegExp(nome) });
    fireEvent.click(passo("Informações básicas"));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Enviando/ })).toBeNull());
    act(() => progredir(60));

    fireEvent.click(passo("Conteúdo"));
    expect(await screen.findByRole("button", { name: "Enviando… 60%" })).toBeTruthy();
  });

  it("o envio caiu enquanto a aula estava recolhida: ao abrir, o aviso está lá", async () => {
    await enviarAte37();
    fireEvent.click(screen.getByRole("button", { name: "Recolher a aula Abertura" }));
    act(() => falhar(new Error("rede")));
    await waitFor(() => expect(startLessonVideoUpload).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Abrir a aula Abertura" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível enviar o vídeo. Tente de novo.");
    expect(completeLessonVideoUpload).not.toHaveBeenCalled();
  });
});

describe("vídeo da aula — o resumo, sem player", () => {
  it("pronto: a miniatura, o nome e a duração; nenhum player no editor", async () => {
    await abrirVideo({ bunnyVideoId: GUID });

    const miniatura = await screen.findByRole("img", { name: "Miniatura do vídeo abertura.mp4" });
    expect(miniatura.getAttribute("src")).toBe(MINIATURA);
    expect(screen.getByText("abertura.mp4")).toBeTruthy();
    expect(screen.getByText("1:51")).toBeTruthy();
    expect(getLessonVideo).toHaveBeenCalledWith(11);
    expect(document.querySelector("iframe")).toBeNull();
  });

  it('processando: "Processando…" sem miniatura; quando fica pronto, ela aparece sozinha', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getLessonVideo
      .mockResolvedValueOnce({ video: { ...PRONTO, pronto: false, miniaturaUrl: null } })
      .mockResolvedValue({ video: PRONTO });
    await abrirVideo({ bunnyVideoId: GUID });

    expect(await screen.findByText("Processando…")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();

    await act(() => vi.advanceTimersByTimeAsync(15_000));
    expect(await screen.findByRole("img", { name: "Miniatura do vídeo abertura.mp4" })).toBeTruthy();
    expect(screen.queryByText("Processando…")).toBeNull();
  });

  it("o Bunny não conseguiu processar: avisa para enviar de novo", async () => {
    getLessonVideo.mockResolvedValue({ video: { ...PRONTO, pronto: false, falhou: true, miniaturaUrl: null } });
    await abrirVideo({ bunnyVideoId: GUID });
    expect((await screen.findByRole("alert")).textContent).toBe("O Bunny não conseguiu processar este vídeo. Envie de novo.");
  });

  it("pronto, mas sem o endereço das miniaturas: o nome e a duração, sem imagem quebrada", async () => {
    getLessonVideo.mockResolvedValue({ video: { ...PRONTO, miniaturaUrl: null } });
    await abrirVideo({ bunnyVideoId: GUID });
    expect(await screen.findByText("Sem miniatura")).toBeTruthy();
    expect(screen.getByText("abertura.mp4")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("biblioteca não configurada neste ambiente: diz isso", async () => {
    getLessonVideo.mockRejectedValue({ response: { status: 503, data: { error: "StreamNaoConfigurado" } } });
    await abrirVideo({ bunnyVideoId: GUID });
    expect((await screen.findByRole("alert")).textContent).toBe("A biblioteca de aulas não está configurada neste ambiente.");
  });
});

describe("vídeo da aula — prévia grátis", () => {
  it("marcar grava a prévia grátis da aula", async () => {
    await abrirVideo();
    fireEvent.click(screen.getByRole("checkbox", { name: /Prévia grátis/ }));
    await waitFor(() => expect(updateLesson).toHaveBeenCalledWith(11, { isFreePreview: true }));
  });

  it("aula com prévia grátis ganha a etiqueta na lista", async () => {
    await abrirVideo({ isFreePreview: true });
    expect((screen.getByRole("checkbox", { name: /Prévia grátis/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("Prévia grátis")).toBeTruthy();
  });
});
