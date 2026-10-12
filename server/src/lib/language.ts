import type { Language } from "@prisma/client";

// A ESCOLA É SÓ EM PORTUGUÊS (decisão do operador, 12/10/2026 — etapa 4.6c do
// plano). O servidor não filtra mais lista por idioma, nem aceita idioma em
// pedido nenhum.
//
// Este arquivo fica só até o passo 4 da etapa, por UM motivo: a versão do site
// que está no ar ainda LÊ `language` na resposta de curso e de trilha (regra da
// API aditiva, CLAUDE.md → Rendering Boundary: o que a versão anterior usa só
// sai na publicação seguinte). No passo 4 a coluna sai do banco, e este arquivo
// sai junto.

/** O `language` do banco (PT/EN) como a API sempre o devolveu (pt/en). */
export const doBanco = (l: Language): "pt" | "en" => (l === "PT" ? "pt" : "en");

/** Troca o `language` do banco (PT/EN) pelo da API (pt/en) numa resposta. */
export function comIdioma<T extends { language: Language }>(registro: T): Omit<T, "language"> & { language: "pt" | "en" } {
  return { ...registro, language: doBanco(registro.language) };
}
