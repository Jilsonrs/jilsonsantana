import { pt, type Dict } from "@jilson/core";

/**
 * Os textos do app. A ESCOLA É SÓ EM PORTUGUÊS (decisão do operador, 12/10/2026 —
 * etapa 4.6c do plano): não há seletor de idioma, nem idioma na conta.
 *
 * O texto de tela do aluno continua saindo daqui (`useT()`), e não escrito na
 * tela: é o dicionário (`core/src/i18n/pt.ts`) que o operador revisa.
 */

/** Os textos do app — a parte `app` do dicionário do `core`. */
export type AppTexts = Dict["app"];

/** Os textos do app. O texto de tela do aluno sai daqui. */
export function useT(): AppTexts {
  return pt.app;
}
