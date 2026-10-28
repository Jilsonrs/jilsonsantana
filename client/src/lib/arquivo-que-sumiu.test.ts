// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { CHAVE_DA_TRAVA, JANELA_DA_TRAVA, scriptDoVigia } from "./arquivo-que-sumiu";

// O VIGIA ESCRITO NA PÁGINA (achado do operador, 27/10/2026 — a página em branco). O que estes testes
// protegem: o arquivo do app que não chega recarrega a página UMA vez; a trava de 30 s (a mesma do app)
// segura o ciclo; e o que não é arquivo do app não recarrega nada. Que ele vai mesmo para a página:
// `arquivo-que-sumiu-na-pagina.test.ts`.

const contagem = globalThis as unknown as { recarregadas?: number };

// O vigia de verdade (o mesmo texto da página), executado uma vez: ele escuta a janela inteira. Só a
// recarga troca por uma contagem — o jsdom não deixa trocar `location.reload`.
beforeAll(() => {
  new Function(scriptDoVigia("globalThis.recarregadas = (globalThis.recarregadas || 0) + 1"))();
});
beforeEach(() => {
  window.sessionStorage.clear();
  contagem.recarregadas = 0;
});
afterEach(() => {
  vi.restoreAllMocks();
});

/** Um arquivo que não chegou: o navegador avisa com um `error` no próprio elemento (o aviso não sobe). */
function naoChegou(tag: "script" | "link" | "img", endereco: string) {
  const elemento = document.createElement(tag);
  if (elemento instanceof HTMLLinkElement) elemento.href = endereco;
  else if (elemento instanceof HTMLScriptElement || elemento instanceof HTMLImageElement) elemento.src = endereco;
  document.head.appendChild(elemento);
  elemento.dispatchEvent(new Event("error"));
  elemento.remove();
}
const DO_APP = `${window.location.origin}/assets/index-de-antes.js`;

describe("o vigia: um arquivo do app que não chega", () => {
  it("o arquivo PRINCIPAL do app (o script): a página recarrega, uma vez", () => {
    naoChegou("script", DO_APP);
    expect(contagem.recarregadas).toBe(1);
  });

  it("a folha de estilo do app: recarrega também", () => {
    naoChegou("link", `${window.location.origin}/assets/index-de-antes.css`);
    expect(contagem.recarregadas).toBe(1);
  });

  it("a trava de 30 s, a MESMA do app: dentro dela não recarrega de novo; passada, recarrega", () => {
    const agora = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    naoChegou("script", DO_APP);
    agora.mockReturnValue(1_000_000 + JANELA_DA_TRAVA - 1);
    naoChegou("script", DO_APP);
    expect(contagem.recarregadas).toBe(1);
    expect(window.sessionStorage.getItem(CHAVE_DA_TRAVA)).toBe("1000000");
    agora.mockReturnValue(1_000_000 + JANELA_DA_TRAVA);
    naoChegou("script", DO_APP);
    expect(contagem.recarregadas).toBe(2);
  });

  it("o app acabou de recarregar pela versão (a anotação dele): o vigia não recarrega em cima", () => {
    window.sessionStorage.setItem(CHAVE_DA_TRAVA, String(Date.now()));
    naoChegou("script", DO_APP);
    expect(contagem.recarregadas).toBe(0);
  });

  it("o que NÃO é arquivo do app não recarrega: imagem, script de outro site, script do site fora de /assets/", () => {
    naoChegou("img", `${window.location.origin}/assets/foto.png`);
    naoChegou("script", "https://js.stripe.com/v3/");
    naoChegou("script", `https://outro-site.com/assets/index.js`);
    naoChegou("script", `${window.location.origin}/outro/arquivo.js`);
    expect(contagem.recarregadas).toBe(0);
  });

  it("sem armazenamento no navegador (não há como travar o ciclo): não recarrega", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("armazenamento bloqueado");
    });
    naoChegou("script", DO_APP);
    expect(contagem.recarregadas).toBe(0);
  });
});
