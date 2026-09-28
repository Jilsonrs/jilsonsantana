// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { AdminCourseDetail, AdminLesson } from "@/lib/api";
import { CURSO_DE_TESTE } from "./curso-de-teste";

const adminGetCourse = vi.fn();
const startLessonVideoUpload = vi.fn();
const completeLessonVideoUpload = vi.fn();
const getLessonPlayer = vi.fn();
const getLessonVideoStatus = vi.fn();
const updateLesson = vi.fn();
const enviarVideo = vi.fn();
vi.mock("@/lib/video-upload", () => ({
  enviarVideo: (...args: unknown[]) => enviarVideo(...args),
}));
vi.mock("@/lib/api", () => ({
  adminGetCourse: (...args: unknown[]) => adminGetCourse(...args),
  startLessonVideoUpload: (...args: unknown[]) => startLessonVideoUpload(...args),
  completeLessonVideoUpload: (...args: unknown[]) => completeLessonVideoUpload(...args),
  getLessonPlayer: (...args: unknown[]) => getLessonPlayer(...args),
  getLessonVideoStatus: (...args: unknown[]) => getLessonVideoStatus(...args),
  updateLesson: (...args: unknown[]) => updateLesson(...args),
}));

import { CourseEditorLayout } from "./CourseEditorLayout";
import { ROTAS_DO_EDITOR } from "./steps";

// O VÍDEO DE CADA AULA (Bloco U, etapa 3 — plano aprovado pelo operador em
// 28/09/2026). O envio em si é do Bunny (TUS); aqui se prova o que a TELA faz:
// porcentagem, gravar o vídeo só no fim, a prévia sempre ASSINADA (vinda do
// servidor), o "não configurado" e a prévia grátis.

const GUID = "eb1c4f77-0cda-46be-b47d-1118ad7c2ffe";
const ASSINADO = `https://iframe.mediadelivery.net/embed/762605/${GUID}?token=abc&expires=1`;

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
            bunnyVideoPendingId: null,
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
  for (const f of [adminGetCourse, startLessonVideoUpload, completeLessonVideoUpload, getLessonPlayer, updateLesson, enviarVideo]) f.mockReset();
  getLessonVideoStatus.mockReset().mockResolvedValue({ pronto: true, falhou: false });
  updateLesson.mockResolvedValue({ id: 11 });
});

async function abrirVideo(aula: Partial<AdminLesson> = {}) {
  adminGetCourse.mockResolvedValue(comAula(aula));
  renderWithProviders(<CourseEditorLayout />, { route: "/admin/cursos/1/conteudo", path: "/admin/cursos/:id", filhas: ROTAS_DO_EDITOR });
  fireEvent.click(await screen.findByRole("button", { name: "Vídeo da aula" }));
}

const escolher = () =>
  fireEvent.change(screen.getByTestId("lesson-video-file-11"), {
    target: { files: [new File(["mp4"], "abertura.mp4", { type: "video/mp4" })] },
  });

describe("vídeo da aula — enviar", () => {
  it('aula sem vídeo: "Sem vídeo" e o botão de enviar', async () => {
    await abrirVideo();
    expect(screen.getByText("Sem vídeo")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Enviar vídeo" })).toBeTruthy();
    expect(getLessonPlayer).not.toHaveBeenCalled();
  });

  it("mostra a porcentagem; no fim grava o vídeo e a prévia assinada toca", async () => {
    let progredir: (p: number) => void = () => {};
    let terminar: () => void = () => {};
    const dados = { videoId: GUID, titulo: "abertura.mp4", libraryId: "762605", expirationTime: 1, signature: "s" };
    startLessonVideoUpload.mockResolvedValue(dados);
    enviarVideo.mockImplementation((_f: File, _d: unknown, aoProgredir: (p: number) => void) => {
      progredir = aoProgredir;
      return { concluido: new Promise<void>((r) => (terminar = r)), cancelar: () => {} };
    });
    completeLessonVideoUpload.mockResolvedValue({ bunnyVideoId: GUID, playerUrl: ASSINADO });
    await abrirVideo();

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
    const player = await screen.findByTitle("Prévia do vídeo da aula Abertura");
    expect(player.getAttribute("src")).toBe(ASSINADO);
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

describe("vídeo da aula — a prévia", () => {
  it("aula com vídeo: a prévia vem ASSINADA do servidor", async () => {
    getLessonPlayer.mockResolvedValue({ playerUrl: ASSINADO });
    await abrirVideo({ bunnyVideoId: GUID });

    const player = await screen.findByTitle("Prévia do vídeo da aula Abertura");
    expect(player.getAttribute("src")).toBe(ASSINADO);
    expect(getLessonPlayer).toHaveBeenCalledWith(11);
    expect(screen.getByRole("button", { name: "Trocar o vídeo" })).toBeTruthy();
    // O estado do processamento é o da AULA, não o da apresentação.
    await waitFor(() => expect(getLessonVideoStatus).toHaveBeenCalledWith(GUID));
  });

  it("vídeo enviado mas sem a biblioteca neste ambiente: explica, sem quadro quebrado", async () => {
    getLessonPlayer.mockResolvedValue({ playerUrl: null });
    await abrirVideo({ bunnyVideoId: GUID });
    expect(await screen.findByText(/A prévia aparece onde a biblioteca de aulas está configurada/)).toBeTruthy();
    expect(screen.queryByTitle(/Prévia do vídeo da aula/)).toBeNull();
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

  it("aula de texto não tem o painel de vídeo", async () => {
    adminGetCourse.mockResolvedValue(comAula({ kind: "TEXT" }));
    renderWithProviders(<CourseEditorLayout />, { route: "/admin/cursos/1/conteudo", path: "/admin/cursos/:id", filhas: ROTAS_DO_EDITOR });
    await screen.findByRole("button", { name: "Texto da aula" });
    expect(screen.queryByRole("button", { name: "Vídeo da aula" })).toBeNull();
  });
});
