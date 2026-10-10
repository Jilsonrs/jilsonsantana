import { z } from "zod";
import { PLANOS } from "../constants/billing.js";

/**
 * Corpo de `POST /api/billing/previa` — quanto fica a assinatura com um código promocional
 * (Fase 4, etapa 4.2). O site diz só QUAL plano e o código: preço e valor saem da Stripe, no
 * servidor. O código é aparado nas pontas (colado de e-mail, vem com espaço).
 */
export const previaSchema = z.object({
  plano: z.enum(PLANOS),
  codigo: z.string().trim().min(1).max(64),
});
export type PreviaInput = z.infer<typeof previaSchema>;

/**
 * Corpo de `POST /api/billing/assinatura` — assinar (Fase 4, etapa 4.2). Só o plano e, se houver,
 * o código promocional: a conta é a da sessão, e o preço é achado no servidor. Sem código, o
 * campo NÃO vem (vazio é recusado: a tela não manda o que o aluno não aplicou).
 */
export const assinarSchema = z.object({
  plano: z.enum(PLANOS),
  codigo: z.string().trim().min(1).max(64).optional(),
});
export type AssinarInput = z.infer<typeof assinarSchema>;

/**
 * Corpo de `POST /api/admin/assinaturas/sincronizar` — o admin força a sincronia de UMA conta com
 * a Stripe (Fase 4, etapa 4.4). Só o e-mail do aluno: quais assinaturas conferir é o servidor
 * que acha. Aparado nas pontas (colado de e-mail, vem com espaço).
 */
export const sincronizarContaSchema = z.object({
  email: z.string().trim().email().max(254),
});
export type SincronizarContaInput = z.infer<typeof sincronizarContaSchema>;
