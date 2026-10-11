import { z } from "zod";
import { MOTIVOS_DE_CANCELAMENTO, PLANOS, TAMANHO_DO_COMENTARIO } from "../constants/billing.js";

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
 * Corpo de `POST /api/billing/minha-assinatura/cancelar` — parar a renovação (Fase 4, etapa 4.6).
 * Só o MOTIVO, e ele é opcional (decisão do operador, 11/10/2026): o botão de cancelar funciona
 * sem nada. O pedido NÃO diz qual assinatura — é a da conta da sessão. O comentário é aparado nas
 * pontas; vazio é o mesmo que não mandar.
 */
export const cancelarSchema = z.object({
  motivo: z.enum(MOTIVOS_DE_CANCELAMENTO).optional(),
  comentario: z.string().trim().max(TAMANHO_DO_COMENTARIO).optional(),
});
export type CancelarInput = z.infer<typeof cancelarSchema>;

/**
 * Corpo de `POST /api/billing/minha-assinatura/plano` — mudar de plano (Fase 4, etapa 4.6). Só
 * PARA QUAL plano e, na troca que vale na hora, o valor que a TELA MOSTROU (`valorMostrado`, em
 * centavos) e o instante em que o servidor fez essa conta (`mostradoEm`). O servidor confere os
 * dois: o instante tem que ser recente, e o valor tem que estar a poucos centavos da conta
 * refeita na hora — só então cobra o valor mostrado. Preço e assinatura nunca vêm do site, e um
 * valor inventado não passa na conferência.
 */
export const mudarDePlanoSchema = z.object({
  plano: z.enum(PLANOS),
  valorMostrado: z.number().int().min(0).optional(),
  mostradoEm: z.number().int().positive().optional(),
});
export type MudarDePlanoInput = z.infer<typeof mudarDePlanoSchema>;

/**
 * Corpo de `POST /api/admin/assinaturas/sincronizar` — o admin força a sincronia de UMA conta com
 * a Stripe (Fase 4, etapa 4.4). Só o e-mail do aluno: quais assinaturas conferir é o servidor
 * que acha. Aparado nas pontas (colado de e-mail, vem com espaço).
 */
export const sincronizarContaSchema = z.object({
  email: z.string().trim().email().max(254),
});
export type SincronizarContaInput = z.infer<typeof sincronizarContaSchema>;
