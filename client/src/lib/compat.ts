// APARELHOS ANTIGOS (Bloco AULA, etapa 4 — plano aprovado pelo operador em
// 06/10/2026). O piso do site é o iOS 15 (iPhone 6s em diante), Chrome e Edge 91 e
// Firefox 90 (`build.target`, no `vite.config.ts`). A SINTAXE nova o próprio build
// converte; as FUNÇÕES novas do navegador, não. Medido no pacote em 07/10/2026: só
// uma é usada sem conferir antes se existe — `Object.hasOwn` (Safari 15.4), pela
// biblioteca que mostra o texto das aulas (react-markdown), a cada texto. Sem ela, a
// aula de texto quebraria num iPhone com iOS 15.0 a 15.3. As outras funções novas que
// aparecem no pacote (`structuredClone`, `crypto.randomUUID`, `checkVisibility`,
// `requestIdleCallback`), as bibliotecas conferem antes de usar.

// Seguro: `Object.hasOwn` não está nos tipos do ES2020 com que o app compila; aqui
// ela só é consultada, e criada quando o navegador não a tem.
const objeto = Object as ObjectConstructor & { hasOwn?: unknown };
if (typeof objeto.hasOwn !== "function") {
  Object.defineProperty(Object, "hasOwn", {
    value: (alvo: object, chave: PropertyKey) => Object.prototype.hasOwnProperty.call(alvo, chave),
    configurable: true,
    writable: true,
  });
}

export {};
