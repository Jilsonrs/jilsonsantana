// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { agendarNaSaida } from "./envio-na-saida";

// O ENVIO NA SAÍDA DA PÁGINA (Bloco AULA, etapa 2). Este módulo É a fronteira com o
// navegador (`fetchLater`, `fetch`, `visibilitychange`), então aqui, e só aqui, o
// navegador vira dublê. O que estes testes protegem: o ponto sai quando a página
// ESCONDE (fechar a aba, trocar de app), uma vez, com o JSON e o `keepalive`; desistir
// cancela; e, onde o navegador tem `fetchLater`, o agendamento é dele.

let visibilidade: DocumentVisibilityState = "visible";
const fetchFalso = vi.fn();

function mudarVisibilidade(estado: DocumentVisibilityState) {
  visibilidade = estado;
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  visibilidade = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibilidade });
  fetchFalso.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchFalso);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sem fetchLater (Safari, Firefox): sai quando a página esconde", () => {
  it("nada sai com a página à vista; ao esconder, sai UMA vez, com o JSON e o keepalive", () => {
    const envio = agendarNaSaida("/api/lessons/11/ponto", { segundos: 42 });
    expect(fetchFalso).not.toHaveBeenCalled();
    expect(envio.enviado()).toBe(false);

    mudarVisibilidade("hidden");
    mudarVisibilidade("visible");
    mudarVisibilidade("hidden");

    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [endereco, pedido] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(endereco).toBe("/api/lessons/11/ponto");
    expect(pedido).toMatchObject({ method: "POST", keepalive: true, credentials: "same-origin", body: JSON.stringify({ segundos: 42 }) });
    expect(pedido.headers).toEqual({ "Content-Type": "application/json" });
    expect(envio.enviado()).toBe(true);
  });

  it("cancelado antes: nada sai", () => {
    const envio = agendarNaSaida("/api/lessons/11/ponto", { segundos: 42 });
    envio.cancelar();
    mudarVisibilidade("hidden");
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("agendado com a página JÁ escondida (vídeo tocando em outra aba): espera a próxima vez que ela esconder", () => {
    visibilidade = "hidden";
    agendarNaSaida("/api/lessons/11/ponto", { segundos: 42 });
    expect(fetchFalso).not.toHaveBeenCalled();

    mudarVisibilidade("visible");
    expect(fetchFalso).not.toHaveBeenCalled();
    mudarVisibilidade("hidden");
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it("sem rede na saída: não quebra a página", async () => {
    fetchFalso.mockRejectedValue(new TypeError("sem rede"));
    agendarNaSaida("/api/lessons/11/ponto", { segundos: 42 });
    expect(() => mudarVisibilidade("hidden")).not.toThrow();
    await Promise.resolve();
  });
});

describe("com fetchLater (Chrome, Edge): o navegador agenda", () => {
  it("agenda no navegador, com o JSON; cancelar desiste; 'enviado' é o do navegador", () => {
    const resultado = { activated: false };
    const fetchLater = vi.fn().mockReturnValue(resultado);
    vi.stubGlobal("fetchLater", fetchLater);

    const envio = agendarNaSaida("/api/lessons/11/ponto", { segundos: null });

    expect(fetchLater).toHaveBeenCalledTimes(1);
    const [endereco, pedido] = fetchLater.mock.calls[0] as [string, RequestInit];
    expect(endereco).toBe("/api/lessons/11/ponto");
    expect(pedido).toMatchObject({ method: "POST", body: JSON.stringify({ segundos: null }) });
    expect(pedido.signal?.aborted).toBe(false);
    // O caminho de reserva não entra: esconder a página não manda nada por fora.
    mudarVisibilidade("hidden");
    expect(fetchFalso).not.toHaveBeenCalled();

    resultado.activated = true;
    expect(envio.enviado()).toBe(true);
    envio.cancelar();
    expect(pedido.signal?.aborted).toBe(true);
  });

  it("cota cheia (o navegador recusa): cai no caminho de reserva", () => {
    vi.stubGlobal(
      "fetchLater",
      vi.fn(() => {
        throw new DOMException("cota", "QuotaExceededError");
      }),
    );
    agendarNaSaida("/api/lessons/11/ponto", { segundos: 7 });
    mudarVisibilidade("hidden");
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });
});
