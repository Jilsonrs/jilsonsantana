import { z } from "zod";
import { LANGUAGES } from "./site-text.js";

/**
 * Corpo de `PATCH /api/me/language` — o idioma do app do aluno logado.
 *
 * Grava em `User.preferredLanguage` (decisão do operador, 24/09/2026: a escolha
 * do seletor fica na CONTA, e sobrevive a recarregar a página e a entrar de novo).
 */
export const myLanguageSchema = z.object({
  language: z.enum(LANGUAGES),
});
export type MyLanguageInput = z.infer<typeof myLanguageSchema>;
