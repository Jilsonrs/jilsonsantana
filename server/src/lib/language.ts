import type { Response } from "express";
import type { Language } from "@prisma/client";
import type { LanguageCode } from "@jilson/core";

// A API fala "pt"/"en" (o mesmo código do endereço e do dicionário); o banco
// guarda o enum do Prisma, PT/EN. A conversão mora aqui para as rotas nunca
// compararem as duas grafias à mão.
export const paraBanco = (l: LanguageCode): Language => (l === "pt" ? "PT" : "EN");
export const doBanco = (l: Language): LanguageCode => (l === "PT" ? "pt" : "en");

/** Troca o `language` do banco (PT/EN) pelo da API (pt/en) numa resposta. */
export function comIdioma<T extends { language: Language }>(registro: T): Omit<T, "language"> & { language: LanguageCode } {
  return { ...registro, language: doBanco(registro.language) };
}

/**
 * O idioma de uma LISTA de descoberta (catálogo, trilhas, busca), vindo de
 * `?lang=`. Sem o parâmetro vale português — é o que as telas de antes do app
 * em inglês pedem. Valor fora dos dois idiomas: 400 e `null`, como `parseId`.
 *
 * Só as listas de descoberta filtram por idioma. O que é DO ALUNO (trilhas
 * salvas) e o link direto para um curso ou trilha NÃO filtram: idioma é filtro,
 * não portão (decisão do operador, 14 e 24/09/2026 — CLAUDE.md → Idiomas).
 */
export function idiomaDaLista(raw: unknown, res: Response): Language | null {
  const valor = Array.isArray(raw) ? raw[0] : raw;
  if (valor === undefined) return "PT";
  if (valor === "pt" || valor === "en") return paraBanco(valor);
  res.status(400).json({ error: "InvalidLanguage" });
  return null;
}
