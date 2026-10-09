// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// A nossa fronteira: a API e o envio ao esconder a página viram dublês.
const gravarEvento = vi.fn();
vi.mock("@/lib/api", () => ({
  gravarEvento: (...args: unknown[]) => gravarEvento(...args),
  enderecoDosEventos: (id: number) => `/api/lessons/${id}/eventos`,
}));
const enviarJa = vi.fn();
vi.mock("@/lib/envio-na-saida", () => ({ enviarJa: (...args: unknown[]) => enviarJa(...args) }));

import { useEventosDaAula } from "./eventos-da-aula";

// OS EVENTOS DO VÍDEO, na tela (Fase 5, Bloco MEDIR, etapa 1 — pedido do operador,
// 09/10/2026). O que estes testes protegem — é o que faz as horas assistidas (etapa 2)
// contarem só o tempo em que a pessoa estava vendo:
//   - tocou, pausou, terminou chegam ao servidor, na ordem, no segundo do vídeo;
//   - a página escondida com o vídeo tocando fecha o trecho NA HORA (o envio que
//     sobrevive a fechar a aba); voltar com ele tocando abre outro;
//   - sair da aula tocando fecha o trecho;
//   - sem estar ativo (visitante, admin, aula trancada ou de texto), nada é guardado.

let visibilidade: DocumentVisibilityState = "visible";
const mudarVisibilidade = (estado: DocumentVisibilityState) => {
  visibilidade = estado;
  document.dispatchEvent(new Event("visibilitychange"));
};
/** O que chegou ao servidor, na ordem: [tipo, segundos]. */
const guardados = () => gravarEvento.mock.calls.map(([, tipo, segundos]) => [tipo, segundos]);

beforeEach(() => {
  gravarEvento.mockReset().mockResolvedValue(undefined);
  enviarJa.mockReset();
  visibilidade = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibilidade });
});

afterEach(() => {
  Reflect.deleteProperty(document, "visibilityState");
});

const abrir = (ativo = true) => renderHook(() => useEventosDaAula({ lessonId: 11, ativo }));

describe("os eventos do vídeo, na tela", () => {
  it("tocou, pausou, voltou a tocar e terminou: chegam ao servidor, na ordem, no segundo do vídeo", async () => {
    const { result } = abrir();
    const player = result.current;

    player.aoTocar();
    player.aoAndar(12.4);
    player.aoPausar(13.7);
    player.aoTocar();
    player.aoAndar(599.2);
    // No fim, o player avisa "pausou" e logo "terminou" (medido no player novo do Bunny).
    player.aoPausar(600);
    player.aoTerminar();

    await waitFor(() => expect(gravarEvento).toHaveBeenCalledTimes(5));
    expect(guardados()).toEqual([
      ["PLAY", 0],
      ["PAUSE", 13.7],
      ["PLAY", 13.7],
      ["PAUSE", 600],
      ["ENDED", 600],
    ]);
    expect(gravarEvento.mock.calls.every(([aula]) => aula === 11)).toBe(true);
  });

  it("a fila: o segundo evento só sai depois que o primeiro foi gravado", async () => {
    let soltar: () => void = () => {};
    gravarEvento.mockReturnValueOnce(new Promise<void>((r) => (soltar = r)));
    const { result } = abrir();

    result.current.aoTocar();
    result.current.aoPausar(5);
    await new Promise((r) => setTimeout(r, 10));
    expect(guardados()).toEqual([["PLAY", 0]]);

    soltar();
    await waitFor(() => expect(guardados()).toEqual([["PLAY", 0], ["PAUSE", 5]]));
  });

  it("a página escondeu com o vídeo tocando: 'pausou' sai NA HORA pelo envio da saída; voltou tocando: 'tocou'", async () => {
    const { result } = abrir();
    result.current.aoTocar();
    result.current.aoAndar(40.5);

    mudarVisibilidade("hidden");
    expect(enviarJa).toHaveBeenCalledWith("/api/lessons/11/eventos", { tipo: "PAUSE", segundos: 40.5 });

    result.current.aoAndar(70);
    mudarVisibilidade("visible");
    await waitFor(() => expect(guardados()).toEqual([["PLAY", 0], ["PLAY", 70]]));
    expect(enviarJa).toHaveBeenCalledTimes(1);
  });

  it("escondeu com o vídeo pausado: nada sai; tocou com a página escondida: só conta quando ela volta", async () => {
    const { result } = abrir();
    mudarVisibilidade("hidden");
    expect(enviarJa).not.toHaveBeenCalled();

    result.current.aoTocar();
    await new Promise((r) => setTimeout(r, 10));
    expect(gravarEvento).not.toHaveBeenCalled();

    mudarVisibilidade("visible");
    await waitFor(() => expect(guardados()).toEqual([["PLAY", 0]]));
  });

  it("saiu da aula com o vídeo tocando: o trecho fecha no último segundo; saiu pausado: nada a mais", async () => {
    const tocando = abrir();
    tocando.result.current.aoTocar();
    tocando.result.current.aoAndar(33.3);
    tocando.unmount();
    await waitFor(() => expect(guardados()).toEqual([["PLAY", 0], ["PAUSE", 33.3]]));

    gravarEvento.mockClear();
    const pausado = abrir();
    pausado.result.current.aoTocar();
    pausado.result.current.aoPausar(8);
    pausado.unmount();
    await waitFor(() => expect(guardados()).toEqual([["PLAY", 0], ["PAUSE", 8]]));
  });

  it("sem estar ativo (visitante, admin, aula trancada ou de texto): nada é guardado", async () => {
    const { result } = abrir(false);
    result.current.aoTocar();
    result.current.aoPausar(3);
    result.current.aoTerminar();
    mudarVisibilidade("hidden");
    await new Promise((r) => setTimeout(r, 10));
    expect(gravarEvento).not.toHaveBeenCalled();
    expect(enviarJa).not.toHaveBeenCalled();
  });
});
