import type { AvisoDaStripe } from "./stripe.js";
import type { Desfecho } from "./assinaturas.js";
import { assinaturaDaAcesso } from "./acesso.js";
import { mandarBoasVindasDaAssinatura } from "./boas-vindas.js";
import { avisarSobreAAssinatura } from "./avisos-da-assinatura.js";

// O QUE VEM DEPOIS DE PROCESSAR UM AVISO DA STRIPE — os alertas, o registro, as boas-vindas e os e-mails da cobrança.
// Mora aqui, e não na rota (estava em `routes/stripe-webhook.ts` até a 4.9b), porque são DOIS os caminhos de um aviso:
// o endereço de avisos e a conferência da rodada de hora em hora (E1 da revisão ampla da cobrança, 29/10/2026 —
// `avisos-perdidos.ts`), que processa o aviso que não chegou. Os dois fazem exatamente o mesmo. Nunca lança por
// causa do e-mail (`enviarEmail` não lança); o registro leva ids e status, nunca o corpo do aviso.

export async function depoisDoAviso(aviso: AvisoDaStripe, desfecho: Desfecho): Promise<void> {
  // Precisa de gente: a devolução que falhou é dinheiro que NÃO voltou. Uma vez por aviso — o
  // repetido (a reentrega) não alerta de novo; e se o processamento falhar, a Stripe entrega de
  // novo e o alerta sai então.
  if (aviso.devolucaoFalhou && desfecho.resultado !== "repetido") console.error(`[stripe] aviso ${aviso.id} (${aviso.tipo}): uma devolução do pagamento ${aviso.pagamento ?? "?"} FALHOU — o dinheiro não voltou ao aluno; conferir e devolver pelo painel da Stripe`);
  // O PIX PAGO cuja assinatura terminou SEM ACESSO (achado 5 do passo 6 da etapa 4.9, 29/10/2026): o
  // dinheiro entrou e a assinatura não abre — pagante trancado, que hoje só o aluno descobriria. Uma vez
  // por aviso. O Pix que nem virou assinatura já alertou na rotina (em conferência, uma vez só) ou foi
  // devolvido antes (nada a alertar) — segunda revisão do passo 6.
  if (aviso.pagamentoPrePago && "assinatura" in desfecho && !assinaturaDaAcesso({ status: desfecho.assinatura.status, currentPeriodEnd: desfecho.assinatura.pagoAte })) {
    console.error(`[stripe] aviso ${aviso.id}: o Pix ${aviso.pagamentoPrePago.id} foi PAGO e a assinatura ${desfecho.assinatura.id} (${desfecho.assinatura.status}) não dá acesso — pagante trancado; conferir no painel da Stripe`);
  }
  if (desfecho.resultado === "sem-conta") {
    // Assinatura sem conta na escola: em voz alta. Se ela dá acesso, há alguém PAGANDO e trancado
    // fora (achado P1 da revisão) — o force-sync (etapa 4.4) conserta depois que a conta existir.
    const { id, clienteId, status, pagoAte } = desfecho.assinatura;
    const linha = `[stripe] aviso ${aviso.id} (${aviso.tipo}): assinatura ${id} do cliente ${clienteId} (${status}) SEM CONTA — ${desfecho.motivo}`;
    if (assinaturaDaAcesso({ status, currentPeriodEnd: pagoAte })) console.error(`${linha}; ela dá acesso: o assinante está trancado fora`);
    // A tentativa do visitante que ainda não foi paga (etapa 4.7, passo 4): o normal de toda
    // assinatura dele até o pagamento passar — a conta nasce no aviso seguinte. Não é aviso.
    else if (desfecho.motivo === "aguardando o pagamento") console.info(linha);
    else console.warn(linha);
  } else {
    const qual = "assinatura" in desfecho ? ` — assinatura ${desfecho.assinatura.id} (${desfecho.assinatura.status})` : "";
    // A conta tinha acesso e deixou de ter: as sessões dela caíram junto (etapa 4.4).
    const caiu = desfecho.resultado === "atualizada" && desfecho.perdeuAcesso ? "; a conta perdeu o acesso: sessões encerradas" : "";
    // A conta do visitante nasceu agora, do pagamento (etapa 4.7, passo 4) — o id, nunca o e-mail.
    const nasceu = desfecho.resultado === "atualizada" && desfecho.contaNova ? `; a conta ${desfecho.contaNova} nasceu da ficha ${desfecho.assinatura.pedido ?? "?"}` : "";
    console.info(`[stripe] aviso ${aviso.id} (${aviso.tipo}): ${desfecho.resultado}${qual}${caiu}${nasceu}`);
  }
  // As boas-vindas de quem assinou sem conta (etapa 4.7, passo 5): DEPOIS do commit, e em todo aviso
  // da assinatura — inclusive o repetido —, até sair uma vez. A assinatura que NASCEU de um Pix
  // pré-pago (etapa 4.9) só é conhecida depois de processar o aviso.
  const assinaturaDoAviso = aviso.assinatura ?? ("assinatura" in desfecho ? desfecho.assinatura.id : null);
  if (assinaturaDoAviso) await mandarBoasVindasDaAssinatura(assinaturaDoAviso);
  // Os e-mails da cobrança (etapa 4.7, passo 7): a cobrança que falhou, o aviso antes de trancar, a
  // assinatura que terminou — com o que a Stripe acabou de dizer, DEPOIS do commit, uma vez cada. O
  // aviso repetido não traz a assinatura de agora: o que ficar para trás, a rodada do agendador manda.
  if (desfecho.resultado === "atualizada") await avisarSobreAAssinatura(desfecho.assinatura);
}
