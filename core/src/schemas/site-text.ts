import { z } from "zod";
import { DICT_KEYS } from "../i18n/keys.js";

/** Os dois idiomas da escola — espelha o enum `Language` do Prisma 1:1. */
export const LANGUAGES = ["pt", "en"] as const;
export type LanguageCode = (typeof LANGUAGES)[number];

/**
 * Corpo de `PUT /api/admin/site-text`.
 *
 * A chave é validada contra o DICIONÁRIO, não contra um formato: só existe
 * sobrescrita de texto que já existe. É a mesma família do "escrita confere o
 * que referencia" (CLAUDE.md → Server) — aqui o que ela referencia é uma chave
 * do código, não uma linha do banco.
 *
 * `value` vazio é VÁLIDO e significa "volte ao valor de fábrica": a rota apaga
 * a linha. Sem isso, desfazer uma edição exigiria o operador redigitar o texto
 * original, que ele não tem mais à mão.
 */
export const siteTextUpdateSchema = z.object({
  key: z.string().refine((k) => DICT_KEYS.has(k), {
    message: "Chave inexistente no dicionário.",
  }),
  language: z.enum(LANGUAGES),
  value: z.string().max(5000),
});

export type SiteTextUpdateInput = z.infer<typeof siteTextUpdateSchema>;
