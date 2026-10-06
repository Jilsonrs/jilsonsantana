// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ehErroDeVersaoAntiga, pagina, recarregarUmaVez, JANELA_DA_TRAVA } from "./recarregar";
import { semInterromper } from "./versao";

// O SITE FOI ATUALIZADO COM A TELA ABERTA (05/10/2026): recarrega UMA vez, e a
// trava impede o ciclo se o pedaço continuar faltando.

let recarregou: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  sessionStorage.clear();
  recarregou = vi.spyOn(pagina, "recarregar").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("recarregarUmaVez", () => {
  it("a primeira vez recarrega; de novo dentro de 30 s, não; depois, sim", () => {
    expect(recarregarUmaVez(1_000_000)).toBe(true);
    expect(recarregarUmaVez(1_000_000 + JANELA_DA_TRAVA - 1)).toBe(false);
    expect(recarregou).toHaveBeenCalledTimes(1);
    expect(recarregarUmaVez(1_000_000 + JANELA_DA_TRAVA)).toBe(true);
    expect(recarregou).toHaveBeenCalledTimes(2);
  });

  it("com um envio de vídeo em andamento: não recarrega (cortaria o envio); terminado, recarrega", async () => {
    let terminar: () => void = () => {};
    const envio = semInterromper(() => new Promise<void>((r) => (terminar = r)));
    expect(recarregarUmaVez()).toBe(false);
    expect(recarregou).not.toHaveBeenCalled();

    terminar();
    await envio;
    expect(recarregarUmaVez()).toBe(true);
  });

  it("sem armazenamento no navegador: não recarrega (não há como travar o ciclo)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(recarregarUmaVez()).toBe(false);
    expect(recarregou).not.toHaveBeenCalled();
  });
});

describe("ehErroDeVersaoAntiga", () => {
  it("as mensagens dos navegadores para o pedaço que não carregou", () => {
    expect(ehErroDeVersaoAntiga(new TypeError("Failed to fetch dynamically imported module: https://x/assets/a.js"))).toBe(true);
    expect(ehErroDeVersaoAntiga(new TypeError("Importing a module script failed."))).toBe(true);
    expect(ehErroDeVersaoAntiga(new TypeError("error loading dynamically imported module"))).toBe(true);
  });

  it("um erro qualquer, não", () => {
    expect(ehErroDeVersaoAntiga(new Error("Cannot read properties of undefined"))).toBe(false);
  });
});
