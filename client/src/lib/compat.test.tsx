// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// APARELHOS ANTIGOS (Bloco AULA, etapa 4): no iOS 15.0 a 15.3 o navegador não tem
// `Object.hasOwn`, e a biblioteca do texto das aulas (react-markdown) a usa a cada
// texto. O que estes testes protegem: sem a função, o texto da aula QUEBRA de verdade
// (a peça real, não um dublê); com `compat.ts`, ele aparece; e no navegador que já
// tem a função, a dele continua valendo.

type ComHasOwn = { hasOwn?: unknown };
const original = Object.getOwnPropertyDescriptor(Object, "hasOwn");
/** Simula o navegador antigo, sem a função. */
const semAFuncao = () => {
  // Seguro: só para o teste — o descritor original volta no `afterEach`.
  delete (Object as ComHasOwn).hasOwn;
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
    semAFuncao();
    const texto = await textoDaAula();
    expect(() => render(texto)).toThrow(TypeError);
    cleanup();

    await import("./compat");

    render(await textoDaAula());
    expect(screen.getByText("PROCV").tagName).toBe("STRONG");
  });

  it("o reforço responde como a função do navegador: só a chave do próprio objeto conta", async () => {
    semAFuncao();
    await import("./compat");
    // Seguro: o reforço acabou de criar a função; o tipo do ES2020 não a conhece.
    const hasOwn = (Object as unknown as { hasOwn: (alvo: object, chave: PropertyKey) => boolean }).hasOwn;
    expect(hasOwn({ a: 1 }, "a")).toBe(true);
    expect(hasOwn({ a: 1 }, "b")).toBe(false);
    expect(hasOwn({}, "toString")).toBe(false);
  });

  it("navegador que já tem a função: a dele fica", async () => {
    const doNavegador = original?.value;
    expect(typeof doNavegador).toBe("function");
    await import("./compat");
    expect(Object.getOwnPropertyDescriptor(Object, "hasOwn")?.value).toBe(doNavegador);
  });
});
