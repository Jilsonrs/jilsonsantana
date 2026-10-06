// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

const startLessonVideoUpload = vi.fn();
const completeLessonVideoUpload = vi.fn();
const enviarVideo = vi.fn();
vi.mock("@/lib/api", () => ({
  startLessonVideoUpload: (...args: unknown[]) => startLessonVideoUpload(...args),
  completeLessonVideoUpload: (...args: unknown[]) => completeLessonVideoUpload(...args),
}));
vi.mock("@/lib/video-upload", () => ({
  enviarVideo: (...args: unknown[]) => enviarVideo(...args),
}));

import { enviarVideoDaAula, esquecerEnvios } from "./envios-de-video";
import { anotarVersaoDoServidor, esquecerVersaoDoServidor, trocarDeVersaoAgora } from "./versao";

beforeEach(() => {
  vi.clearAllMocks();
  esquecerEnvios();
  esquecerVersaoDoServidor();
});

// Uma atualização do site no meio do envio do vídeo de uma aula não o corta
// (06/10/2026): enquanto ele corre, a troca de tela continua dentro do app.
describe("o envio do vídeo de uma aula e a versão nova do site", () => {
  it("do começo até o servidor gravar o vídeo na aula, a versão nova espera; depois, entra", async () => {
    anotarVersaoDoServidor("outra-versao");
    let terminarEnvio: () => void = () => {};
    let gravar: () => void = () => {};
    startLessonVideoUpload.mockResolvedValue({ videoId: "v1" });
    enviarVideo.mockReturnValue({ concluido: new Promise<void>((r) => (terminarEnvio = r)), cancelar: () => {} });
    completeLessonVideoUpload.mockReturnValue(new Promise<void>((r) => (gravar = r)));

    const envio = enviarVideoDaAula(7, new File(["mp4"], "aula.mp4", { type: "video/mp4" }));
    expect(trocarDeVersaoAgora()).toBe(false);

    await vi.waitFor(() => expect(enviarVideo).toHaveBeenCalled());
    terminarEnvio();
    await vi.waitFor(() => expect(completeLessonVideoUpload).toHaveBeenCalledWith(7, "v1"));
    expect(trocarDeVersaoAgora()).toBe(false); // o arquivo subiu, mas a aula ainda não aponta para ele

    gravar();
    expect(await envio).toBe(true);
    expect(trocarDeVersaoAgora()).toBe(true);
  });

  it("o envio falhou: a versão nova deixa de esperar", async () => {
    anotarVersaoDoServidor("outra-versao");
    startLessonVideoUpload.mockRejectedValue(new Error("rede"));

    expect(await enviarVideoDaAula(7, new File(["mp4"], "aula.mp4", { type: "video/mp4" }))).toBe(false);
    expect(trocarDeVersaoAgora()).toBe(true);
  });
});
