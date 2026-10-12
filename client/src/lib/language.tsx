import { pt, type Dict, type LanguageCode } from "@jilson/core";

/**
 * Os textos do app. A ESCOLA É SÓ EM PORTUGUÊS (decisão do operador, 12/10/2026 —
 * etapa 4.6c do plano): não há mais seletor de idioma, nem idioma na conta, nem
 * `?lang=` no login.
 *
 * O texto de tela do aluno continua saindo daqui (`useT()`), e não escrito na
 * tela: é o dicionário (`core/src/i18n/pt.ts`) que o operador revisa.
 */

/** Os textos do app — a parte `app` do dicionário do `core`. */
export type AppTexts = Dict["app"];

/**
 * O idioma do app: sempre português. Fica como função (e com o tipo largo) só
 * até o passo 3 da etapa 4.6c tirar o tipo do `core` — é ele que mostra, no
 * typecheck, cada lugar que ainda recebe um idioma.
 */
export function useIdioma(): LanguageCode {
  return "pt";
}

/** Os textos do app. O texto de tela do aluno sai daqui. */
export function useT(): AppTexts {
  return pt.app;
}
