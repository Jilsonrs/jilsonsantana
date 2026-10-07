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

/**
 * Corpo de `PATCH /api/me/preferences` — as preferências do aluno logado (Bloco AULA,
 * etapa 6 — decisão do operador, 07/10/2026). Hoje, só a LEGENDA lembrada: ligada no
 * CC do player, continua ligada nas próximas aulas, em qualquer aparelho, até o aluno
 * desligar no mesmo CC. Fica na CONTA, como o idioma.
 */
export const myPreferencesSchema = z.object({
  legendas: z.boolean(),
});
export type MyPreferencesInput = z.infer<typeof myPreferencesSchema>;
