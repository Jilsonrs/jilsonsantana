import { z } from "zod";
/**
 * Corpo de `PATCH /api/me/preferences` — as preferências do aluno logado (Bloco AULA,
 * etapa 6 — decisão do operador, 07/10/2026). Hoje, só a LEGENDA lembrada: ligada no
 * CC do player, continua ligada nas próximas aulas, em qualquer aparelho, até o aluno
 * desligar no mesmo CC. Fica na CONTA.
 */
export const myPreferencesSchema = z.object({
  legendas: z.boolean(),
});
export type MyPreferencesInput = z.infer<typeof myPreferencesSchema>;
