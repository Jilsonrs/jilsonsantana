// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// APARELHOS ANTIGOS (Bloco AULA, etapa 4): no iOS 15.0 a 15.3 o navegador não tem
// `Object.hasOwn`, e a biblioteca do texto das aulas (react-markdown) a usa a cada
// texto. O que estes testes protegem: sem a função, o texto da aula QUEBRA de verdade
// (a peça real, não um dublê); com `compat.ts`, ele aparece; e no navegador que já
// tem a função, a dele continua valendo.
//
// O VITEST 5 TAMBÉM USA `Object.hasOwn` (25/10/2026): para carregar um arquivo com
// `import()` e dentro do `expect`. Apagar a função do processo inteiro, como estes testes
// faziam, quebra o próprio Vitest antes do app. Por isso ela some só para o código do app:
// `escondidaDe` a esconde só de quem chama de dentro do arquivo dado; o resto do processo
// continua com a do Node.

type ComHasOwn = { hasOwn?: unknown };
const original = Object.getOwnPropertyDescriptor(Object, "hasOwn");
const doNode = original?.value as unknown;

/** Simula o navegador antigo, mas só para quem chama de dentro de `arquivo`. */
const escondidaDe = (arquivo: string) => {
  Object.defineProperty(Object, "hasOwn", {
    configurable: true,
    get: () => ((new Error().stack ?? "").includes(arquivo) ? undefined : doNode),
  });
};
const textoDaAula = async () => {
  const { MarkdownText } = await import("@/components/content/MarkdownText");
  return <MarkdownText texto="O **PROCV** procura." permitidos={["p", "strong"]} />;
};

afterEach(() => {
  cleanup();
  if (original) Object.defineProperty(Object, "hasOwn", original);
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("aparelhos antigos: Object.hasOwn", () => {
  it("sem a função, o texto da aula quebra; com o reforço do app, ele aparece", async () => {
    // O React avisa no console o erro que o teste provoca de propósito.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const texto = await textoDaAula();
    // Sem a função de fato, mas só durante o desenho: nenhum `expect` aqui dentro.
    delete (Object as ComHasOwn).hasOwn;
    let erro: unknown;
    try {
      render(texto);
    } catch (e) {
      erro = e;
    }
    if (original) Object.defineProperty(Object, "hasOwn", original);
    expect(erro).toBeInstanceOf(TypeError);
    cleanup();

    // O reforço carregado como o app o carrega: ele não vê a função e cria a dele.
    escondidaDe("compat.ts");
    await import("./compat");
    const depois = Object.getOwnPropertyDescriptor(Object, "hasOwn")?.value as unknown;
    expect(typeof depois).toBe("function");
    expect(depois).not.toBe(doNode);

    // O texto desenhado agora usa a do reforço — a do Node já não está em lugar nenhum.
    render(await textoDaAula());
    expect(screen.getByText("PROCV").tagName).toBe("STRONG");
  });

  it("o reforço responde como a função do navegador: só a chave do próprio objeto conta", async () => {
    escondidaDe("compat.ts");
    await import("./compat");
    // Seguro: o reforço acabou de criar a função; o tipo do ES2020 não a conhece.
    const hasOwn = (Object as unknown as { hasOwn: (alvo: object, chave: PropertyKey) => boolean }).hasOwn;
    expect(hasOwn).not.toBe(doNode);
    expect(hasOwn({ a: 1 }, "a")).toBe(true);
    expect(hasOwn({ a: 1 }, "b")).toBe(false);
    expect(hasOwn({}, "toString")).toBe(false);
  });

  it("navegador que já tem a função: a dele fica", async () => {
    expect(typeof doNode).toBe("function");
    await import("./compat");
    expect(Object.getOwnPropertyDescriptor(Object, "hasOwn")?.value).toBe(doNode);
  });
});
