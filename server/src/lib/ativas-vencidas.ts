import { prisma } from "./prisma.js";
import { STATUS_VIVOS } from "./acesso.js";
import { sincronizarSeLivre } from "./assinaturas.js";
import { AssinaturaNaoEncontrada } from "./stripe.js";

// A CONFERÊNCIA DIÁRIA DAS ATIVAS VENCIDAS (E6 da revisão ampla da cobrança, 29/10/2026 — plano → etapa 4.9b). O
// espelho que diz "ativa" com o período pago vencido há mais de 2 dias está velho, ou a Stripe está num estado que
// precisa de gente:
//   - o REEMBOLSO DADO PELO PAINEL SEM CANCELAR (P114) deixa a assinatura ativa na Stripe com o período devolvido — e a
//     regra do gate dá acesso a toda ativa, então a pessoa continua estudando com o dinheiro de volta;
//   - o aviso do FIM, ou da renovação, perdido há mais de 3 dias (a conferência dos avisos, E1, olha só 3 dias) deixa o
//     espelho velho — o do fim, com as aulas abertas para quem já saiu.
// Uma vez por dia (a rodada das 12h UTC, 9h no Brasil), cada uma é relida na Stripe pela sincronia de sempre
// (`sincronizarSeLivre`: o espelho fica como a Stripe diz, e a ocupada fica para o dia seguinte, sem esperar a trava).
// ALERTA a que continua ativa sem período pago (o painel resolve: cancelar a devolvida), a que a Stripe diz encerrada (o
// espelho dava acesso a quem saiu — já acertado) e a que a Stripe não conhece (as aulas continuam abertas); a que
// renovou e só o espelho não sabia fica no registro.

const DIA_EM_MS = 24 * 60 * 60 * 1000;
/** Há quanto tempo o período pago da ativa precisa ter vencido para ela ser conferida: a renovação leva horas. */
export const FOLGA_DA_ATIVA_VENCIDA_EM_MS = 2 * DIA_EM_MS;
/** A hora (UTC) da rodada que faz a conferência: 9h no Brasil, para o alerta chegar de manhã. */
export const HORA_DA_CONFERENCIA_DAS_ATIVAS_UTC = 12;
/** O tempo da conferência dentro do job (5 min no total: a rodada dos e-mails fica com o resto — `tarefas/`). */
export const PRAZO_DA_CONFERENCIA_DAS_ATIVAS_EM_MS = 60_000;
/** No máximo tantas por dia (as mais vencidas primeiro): o resto fica para o dia seguinte. */
export const MAXIMO_DE_ATIVAS_POR_DIA = 50;

/** É a rodada que faz a conferência diária? Função pura. */
export function ehHoraDaConferenciaDasAtivas(agora: Date): boolean {
  return agora.getUTCHours() === HORA_DA_CONFERENCIA_DAS_ATIVAS_UTC;
}

/** Os status em que o gate dá acesso sem olhar a data — os do próprio gate (`acesso.ts`), nunca uma cópia. */
const ATIVAS = [...STATUS_VIVOS];

/**
 * O que a conferência fez: as relidas na Stripe; as ativas sem período pago e as encerradas (as duas com alerta); as
 * que renovaram (só registro); as ocupadas, as que a Stripe não conhece, as que falharam e as que ficaram para o dia
 * seguinte.
 */
export type ConferenciaDasAtivas = {
  conferidas: number;
  semPeriodoPago: number;
  encerradas: number;
  renovadas: number;
  ocupadas: number;
  desconhecidas: number;
  falhas: number;
  adiadas: number;
};

export async function conferirAtivasVencidas(agora: Date = new Date(), prazoEmMs: number = PRAZO_DA_CONFERENCIA_DAS_ATIVAS_EM_MS): Promise<ConferenciaDasAtivas> {
  const limiteDoRelogio = Date.now() + prazoEmMs;
  const vencidaAntesDe = new Date(agora.getTime() - FOLGA_DA_ATIVA_VENCIDA_EM_MS);
  const candidatas = await prisma.subscription.findMany({
    where: { status: { in: ATIVAS }, currentPeriodEnd: { lt: vencidaAntesDe }, owner: { deletedAt: null } },
    select: { stripeSubscriptionId: true, currentPeriodEnd: true },
    orderBy: { currentPeriodEnd: "asc" },
    take: MAXIMO_DE_ATIVAS_POR_DIA + 1,
  });
  const resultado: ConferenciaDasAtivas = { conferidas: 0, semPeriodoPago: 0, encerradas: 0, renovadas: 0, ocupadas: 0, desconhecidas: 0, falhas: 0, adiadas: 0 };
  if (candidatas.length > MAXIMO_DE_ATIVAS_POR_DIA) {
    console.warn(`[stripe] rodada: mais de ${MAXIMO_DE_ATIVAS_POR_DIA} assinaturas ativas com o período vencido — as mais vencidas primeiro, o resto amanhã`);
    candidatas.length = MAXIMO_DE_ATIVAS_POR_DIA;
  }
  for (const { stripeSubscriptionId: id } of candidatas) {
    if (Date.now() >= limiteDoRelogio) {
      resultado.adiadas += 1;
      continue;
    }
    try {
      const sincronia = await sincronizarSeLivre(id);
      if (!sincronia) {
        resultado.ocupadas += 1;
        continue;
      }
      resultado.conferidas += 1;
      const { status, pagoAte } = sincronia.assinatura;
      if (!STATUS_VIVOS.has(status)) {
        resultado.encerradas += 1;
        console.error(`[stripe] rodada: a assinatura ${id} estava ativa no site, mas a Stripe diz ${status} — o aviso do fim se perdeu, e as aulas ficaram abertas; o espelho já foi acertado`);
      } else if (!pagoAte || pagoAte < vencidaAntesDe) {
        resultado.semPeriodoPago += 1;
        console.error(`[stripe] rodada: a assinatura ${id} está ativa na Stripe sem período pago desde ${pagoAte?.toISOString() ?? "o começo"} — o reembolso dado pelo painel sem cancelar, ou a renovação parada; a pessoa continua com as aulas: conferir no painel da Stripe (cancelar a devolvida)`);
      } else {
        resultado.renovadas += 1;
        console.warn(`[stripe] rodada: a assinatura ${id} tinha renovado e o espelho não sabia (o aviso se perdeu) — acertado, pago até ${pagoAte.toISOString()}`);
      }
    } catch (erro) {
      if (erro instanceof AssinaturaNaoEncontrada || (erro instanceof Error && erro.cause instanceof AssinaturaNaoEncontrada)) {
        resultado.desconhecidas += 1;
        console.error(`[stripe] rodada: a Stripe não conhece a assinatura ${id}, ativa no site — as aulas continuam abertas: conferir (uma assinatura do modo de teste no banco de verdade?)`);
        continue;
      }
      resultado.falhas += 1;
      console.warn(`[stripe] rodada: a conferência da assinatura ativa ${id} falhou — fica para amanhã: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }
  if (resultado.falhas > 0) console.error(`[stripe] rodada: a conferência diária das assinaturas ativas vencidas falhou em ${resultado.falhas} — conferir o registro da rodada`);
  if (resultado.adiadas > 0) console.warn(`[stripe] rodada: ${resultado.adiadas} assinatura(s) ativa(s) vencida(s) ficaram para amanhã (o prazo da conferência acabou)`);
  return resultado;
}
