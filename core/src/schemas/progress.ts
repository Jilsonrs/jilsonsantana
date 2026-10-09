import { z } from "zod";

// ONDE A PESSOA PAROU (Bloco AULA — plano aprovado pelo operador em 06/10/2026):
// o corpo do pedido que grava o ponto do vídeo de uma aula. O segundo, ou `null`:
// viu até o fim, ou a aula não tem vídeo (texto, quiz). Contrato da rota
// (validação) E da tela que envia — uma fonte só.
//
// ACEITA FRAÇÃO, e o servidor arredonda para baixo (defeito achado no teste do
// operador, 07/10/2026): o player do Bunny avisa o tempo com casas decimais
// (17,43 s), e a primeira versão recusava tudo que não fosse inteiro — o ponto só
// ficava gravado na memória da tela, e recarregar, outro aparelho ou voltar no dia
// seguinte abria do começo. Aceitar aqui conserta até a aba aberta antes da correção.

/** O maior ponto aceito: 24 h de vídeo. */
export const PONTO_MAXIMO = 24 * 60 * 60;

export const pontoDaAulaSchema = z.object({
  segundos: z.number().min(0).max(PONTO_MAXIMO).nullable(),
});
export type PontoDaAulaInput = z.infer<typeof pontoDaAulaSchema>;

/** Abaixo disto, o vídeo abre do começo: não vale pular. */
export const PONTO_COMECO = 5;
/**
 * Nos últimos segundos, é o fim (proposta do agente, aprovada com o plano): abrir
 * ali tocaria um instante e passaria para a próxima aula — parece defeito.
 */
export const PONTO_FIM = 5;

/**
 * O ponto guardado vale? O começo e o fim contam como "do começo" (`null`); sem a
 * duração (vídeo ainda processando), vale o que foi guardado. Uma regra só, para o
 * servidor (o que a página da aula devolve) e a tela (o ponto de quem volta à aula
 * na mesma visita).
 */
export function pontoUtil(segundos: number | null, duracao: number | null): number | null {
  if (segundos === null || segundos < PONTO_COMECO) return null;
  if (duracao !== null && duracao > 0 && segundos >= duracao - PONTO_FIM) return null;
  return segundos;
}

// OS EVENTOS DO VÍDEO (Fase 5, Bloco MEDIR, etapa 1 — pedido do operador, 09/10/2026): o
// corpo do pedido que guarda um evento — tocou, pausou, terminou —, no segundo do vídeo
// (com fração, como o ponto: o servidor arredonda para baixo). Uma fonte só para a rota e
// para a tela. É o que alimenta as horas assistidas do cartão do admin.

/** Os eventos guardados. SEEK fica de fora até uma análise pedir. */
export const TIPOS_DE_EVENTO = ["PLAY", "PAUSE", "ENDED"] as const;
export type TipoDeEvento = (typeof TIPOS_DE_EVENTO)[number];

export const eventoDaAulaSchema = z.object({
  tipo: z.enum(TIPOS_DE_EVENTO),
  segundos: z.number().min(0).max(PONTO_MAXIMO),
});
export type EventoDaAulaInput = z.infer<typeof eventoDaAulaSchema>;
