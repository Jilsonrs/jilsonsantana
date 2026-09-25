import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Global Vitest setup. Without this, multiple `it`s in the same file render
// into the same jsdom `document` without unmounting between them — harmless
// for single-test files (LoginPage.test.tsx) but produces "multiple elements
// found" failures in any file with 2+ tests (Catalog/CourseDetail/Trilha
// pages, Bloco 5).
afterEach(() => {
  cleanup();
});

// O jsdom não implementa `window.matchMedia`, e o `useIsMobile` da barra
// lateral chama isso num efeito — sem este stub, TODO teste que renderiza o
// `Layout` quebra com "matchMedia is not a function", que é um erro de
// ambiente disfarçado de erro de componente.
//
// Responde "não é mobile" de propósito: é o ramo desktop da barra, o que os
// testes de papel exercitam. Quem precisar do ramo da gaveta sobrescreve.
// `typeof window` e não `window`: este setup roda para TODA a suíte, e teste de
// função pura (o mapa de navegação) roda em Node, onde `window` não existe —
// sem a guarda, ele quebraria antes de coletar um teste sequer.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// O jsdom (24) não implementa `PointerEvent`. Sem ele, `fireEvent.pointerEnter`
// cria um Event comum SEM `pointerType`, e nenhum teste consegue dizer "isto é
// mouse" ou "isto é toque" — justamente a diferença que o menu da conta precisa
// provar (abrir ao passar o mouse vale só para mouse). Substituto mínimo:
// um MouseEvent que carrega `pointerType`.
if (typeof window !== "undefined" && !window.PointerEvent) {
  class PointerEventDeTeste extends MouseEvent {
    pointerType: string;
    constructor(tipo: string, init: PointerEventInit = {}) {
      super(tipo, init);
      this.pointerType = init.pointerType ?? "";
    }
  }
  // Seguro: só preenche a lacuna do ambiente de teste; o navegador real tem o seu.
  window.PointerEvent = PointerEventDeTeste as unknown as typeof PointerEvent;
}
