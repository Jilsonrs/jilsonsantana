import { limiteDeLigacoes } from "./ligacoes.js";
import type { AvisoDaStripe } from "./stripe.js";

// QUANTAS ASSINATURAS PODEM ESTAR EM ANDAMENTO AO MESMO TEMPO NESTA CÓPIA — com e sem login (achado
// P1 da revisão de segurança do passo 6 da etapa 4.7, 27/10/2026; antes, só as sem login, com um teto
// fixo de 3 — do passo 4, 21/10/2026). Cada assinatura segura uma ligação com o banco enquanto a
// Stripe responde (até 7 idas, dentro da trava); sem teto, umas poucas paradas ocupariam todas, e a
// aula de quem paga ficaria esperando. O teto é tirado das ligações da cópia (`ligacoes.ts`, 10 por
// decisão do operador), deixando SEMPRE 2 livres para o resto do site. Cheio, a resposta é 409
// `MuitosAoMesmoTempo` na hora, antes de abrir qualquer transação — a tela diz "Aguarde um instante
// e tente novamente." (texto do operador, 21/10/2026). Contagem em memória, POR CÓPIA, de propósito:
// o que ela protege são as ligações com o banco, e cada cópia tem as suas.

/** As ligações que ficam sempre livres para o resto do site (o gate, as aulas). */
export const LIGACOES_SEMPRE_LIVRES = 2;

let emAndamento = 0;
/** A última linha de aviso do "cheio": no máximo uma por minuto, para um ataque não encher o registro. */
let avisouEm = 0;

/** O teto desta cópia: as ligações dela menos as que ficam livres — pelo menos 1. */
export function assinaturasAoMesmoTempo(): number {
  return Math.max(1, limiteDeLigacoes() - LIGACOES_SEMPRE_LIVRES);
}

/**
 * O AVISO DA STRIPE que segura uma ligação do banco por muito tempo — várias idas à Stripe com a trava — e por isso passa pela
 * vaga: o Pix pago (até 8 idas), o aviso de fraude (encerrar, devolver — 4.7b, passo 5c) e o dinheiro que saiu da contestação
 * (marcar, cancelar). Sem a vaga, um lote deles (um teste de cartões roubados) prenderia as ligações da cópia, e as aulas de
 * quem paga ficariam esperando (revisão de segurança do bloco 5 da 4.7b, 31/10/2026). Função pura.
 */
export function avisoQuePedeVaga(aviso: Pick<AvisoDaStripe, "pagamentoPrePago" | "avisoDeFraude" | "contestacao">): boolean {
  return Boolean(aviso.pagamentoPrePago) || Boolean(aviso.avisoDeFraude) || aviso.contestacao?.fase === "dinheiro-saiu";
}

/** Roda a assinatura ocupando uma vaga; sem vaga, `{ cheio: true }` na hora, sem rodar nada. */
export async function comVaga<T>(assinatura: () => Promise<T>): Promise<{ cheio: true } | { cheio: false; resultado: T }> {
  if (emAndamento >= assinaturasAoMesmoTempo()) {
    if (Date.now() - avisouEm > 60_000) {
      avisouEm = Date.now();
      console.warn(`[api] assinaturas: ${emAndamento} em andamento nesta cópia — as seguintes ouvem "muitos ao mesmo tempo"`);
    }
    return { cheio: true };
  }
  emAndamento++;
  try {
    return { cheio: false, resultado: await assinatura() };
  } finally {
    emAndamento--;
  }
}
