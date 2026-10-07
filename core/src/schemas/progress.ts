import { z } from "zod";

// ONDE A PESSOA PAROU (Bloco AULA — plano aprovado pelo operador em 06/10/2026):
// o corpo do pedido que grava o ponto do vídeo de uma aula. O segundo, inteiro,
// ou `null`: viu até o fim, ou a aula não tem vídeo (texto, quiz). Contrato da
// rota (validação) E da tela que envia — uma fonte só.

/** O maior ponto aceito: 24 h de vídeo. */
export const PONTO_MAXIMO = 24 * 60 * 60;

export const pontoDaAulaSchema = z.object({
  segundos: z.number().int().min(0).max(PONTO_MAXIMO).nullable(),
});
export type PontoDaAulaInput = z.infer<typeof pontoDaAulaSchema>;
