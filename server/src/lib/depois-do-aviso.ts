import { NOME_DO_TIPO_DE_FRAUDE } from "@jilson/core";
import type { AvisoDaStripe } from "./stripe.js";
import type { DesfechoDoAviso, FraudeTratada } from "./assinaturas.js";
import { assinaturaDaAcesso } from "./acesso.js";
import { mandarBoasVindasDaAssinatura } from "./boas-vindas.js";
import { avisarSobreAAssinatura } from "./avisos-da-assinatura.js";
import { registrarAviso } from "./registro-da-cobranca.js";
import { abrirCaso, casoJaResolvido, TipoDeCaso } from "./casos.js";
import { QuemFez } from "./prisma.js";
import { avisarUrgentes } from "./avisos-ao-operador.js";

// O QUE VEM DEPOIS DE PROCESSAR UM AVISO DA STRIPE — os alertas, o registro, as boas-vindas e os e-mails da cobrança.
// Mora aqui, e não na rota (estava em `routes/stripe-webhook.ts` até a 4.9b), porque são DOIS os caminhos de um aviso:
// o endereço de avisos e a conferência da rodada de hora em hora (E1 da revisão ampla da cobrança, 29/10/2026 —
// `avisos-perdidos.ts`), que processa o aviso que não chegou. Os dois fazem exatamente o mesmo. Nunca lança por
// causa do e-mail (`enviarEmail` não lança); o registro leva ids e status, nunca o corpo do aviso.

/** O que a escola fez com o aviso de fraude, numa frase sem dado pessoal: o que voltou, e como ficou a assinatura. Função pura. */
export function oQueOAvisoDeFraudeFez(fraude: FraudeTratada | undefined, desfecho: DesfechoDoAviso): string {
  const devolucao = fraude?.devolucao;
  const devolveu = !devolucao
    ? "nada devolvido"
    : "devolvidos" in devolucao
      ? `R$ ${(devolucao.devolvidos / 100).toFixed(2).replace(".", ",")} devolvidos, marcados como fraude`
      : devolucao.semDevolucao === "contestada"
        ? "nada devolvido: a cobrança já foi contestada (segue pela contestação)"
        : devolucao.semDevolucao === "ja-devolvida"
          ? "nada devolvido: a cobrança já tinha voltado inteira"
          : "nada devolvido: a Stripe não tem a cobrança paga";
  if (!("assinatura" in desfecho)) return `${devolveu}; a cobrança não é de uma assinatura da escola`;
  const perdeu = desfecho.resultado === "atualizada" && desfecho.perdeuAcesso;
  const ficou = desfecho.assinatura.status === "canceled" ? "foi encerrada" : `ficou ${desfecho.assinatura.status}`;
  return `${devolveu}; a assinatura ${desfecho.assinatura.id} ${ficou}${perdeu ? " e a pessoa perdeu o acesso" : " — a conta não perdeu o acesso por aqui (já não tinha, ou tem outra assinatura)"}`;
}

export async function depoisDoAviso(aviso: AvisoDaStripe, desfecho: DesfechoDoAviso): Promise<void> {
  // O REGISTRO DA COBRANÇA (etapa 4.7b, passo 1f): o aviso processado vira uma linha — o painel mostra o que aconteceu.
  // Nunca lança (o aviso já está gravado).
  await registrarAviso(aviso, desfecho);
  // Precisa de gente: a devolução que falhou é dinheiro que NÃO voltou. Uma vez por aviso — o
  // repetido (a reentrega) não alerta de novo; e se o processamento falhar, a Stripe entrega de
  // novo e o alerta sai então.
  if (aviso.devolucaoFalhou && desfecho.resultado !== "repetido") {
    const falhou = aviso.devolucaoQueFalhou ?? null;
    console.error(`[stripe] aviso ${aviso.id} (${aviso.tipo}): uma devolução${falhou ? ` de ${falhou.centavos} centavos` : ""} do pagamento ${aviso.pagamento ?? "?"} FALHOU — o dinheiro não voltou ao aluno; devolver de novo em Precisa de atendente`);
    // Um caso por DEVOLUÇÃO, com a cobrança e o valor dela (achado P1 da revisão do bloco 4, 31/10/2026): o "Devolver de novo"
    // devolve exatamente o que falhou. Sem a cobrança no aviso, o caso de antes (`pagamento:`), que manda para a ficha.
    await abrirCaso({ tipo: TipoDeCaso.DEVOLUCAO_FALHOU, chave: falhou?.cobranca ? `devolucao:${falhou.id}` : `pagamento:${aviso.pagamento ?? aviso.id}`, urgente: true, assinatura: aviso.assinatura, objeto: falhou?.cobranca ?? aviso.pagamento ?? null, centavos: falhou?.centavos ?? null, detalhe: "uma devolução falhou: o dinheiro não voltou ao aluno" });
  }
  // O PIX PAGO cuja assinatura terminou SEM ACESSO (achado 5 do passo 6 da etapa 4.9, 29/10/2026): o
  // dinheiro entrou e a assinatura não abre — pagante trancado, que hoje só o aluno descobriria. Uma vez
  // por aviso. O Pix que nem virou assinatura já alertou na rotina (em conferência, uma vez só) ou foi
  // devolvido antes (nada a alertar) — segunda revisão do passo 6.
  if (aviso.pagamentoPrePago && "assinatura" in desfecho && !assinaturaDaAcesso({ status: desfecho.assinatura.status, currentPeriodEnd: desfecho.assinatura.pagoAte })) {
    console.error(`[stripe] aviso ${aviso.id}: o Pix ${aviso.pagamentoPrePago.id} foi PAGO e a assinatura ${desfecho.assinatura.id} (${desfecho.assinatura.status}) não dá acesso — pagante trancado; conferir no painel da Stripe`);
  }
  // A CONTESTAÇÃO (E7 — P122 e 30/10/2026): precisa de gente — responder no painel da Stripe, no prazo, e decidir se
  // devolve ou libera de novo (a 4.7b). Uma vez por aviso. O INQUÉRITO e a contestação ABERTA só alertam; quando o
  // DINHEIRO SAI, o alerta diz como ficou a assinatura e se a conta perdeu o acesso (pode ter outra assinatura).
  if (aviso.contestacao && desfecho.resultado !== "repetido") {
    const { id, motivo, centavos, prazo, pagamento, fase } = aviso.contestacao;
    // O caso (4.7b, bloco 2): um por contestação, urgente (tem prazo); a fase seguinte atualiza o mesmo.
    await abrirCaso({ tipo: TipoDeCaso.CONTESTACAO, chave: `du:${id}`, urgente: true, assinatura: "assinatura" in desfecho ? desfecho.assinatura.id : aviso.assinatura, objeto: id, centavos, detalhe: `${fase} · ${motivo}${prazo ? ` · prazo ${prazo.toISOString().slice(0, 10)}` : ""}` });
    const valor = `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
    const responder = `responder no painel da Stripe${prazo ? ` até ${prazo.toISOString().slice(0, 10)}` : ""}`;
    if (fase === "inquerito") {
      console.error(`[stripe] inquérito ${id}: o banco perguntou sobre o pagamento ${pagamento ?? "?"} (${valor}, ${motivo}) — o acesso continua; ${responder}, ou devolver o dinheiro agora, sem taxa`);
    } else if (fase === "aberta") {
      console.error(`[stripe] contestação ${id}: o pagamento ${pagamento ?? "?"} (${valor}) foi contestado no banco (${motivo}) — o acesso é cortado e a assinatura cancelada quando o dinheiro sair da conta; ${responder}`);
    } else {
      const comoFicou =
        "assinatura" in desfecho
          ? `a assinatura ${desfecho.assinatura.id} ficou ${desfecho.assinatura.status}${desfecho.resultado === "atualizada" && desfecho.perdeuAcesso ? " e a conta perdeu o acesso" : " — a conta não perdeu o acesso por aqui (já não tinha, ou tem outra assinatura)"}`
          : "o pagamento não é de uma assinatura da escola";
      console.error(`[stripe] contestação ${id}: o dinheiro do pagamento ${pagamento ?? "?"} (${valor}, ${motivo}) saiu da conta — ${comoFicou}; ${responder}`);
    }
  }
  // O AVISO DE FRAUDE (P141 — 4.7b, passo 5c; decisão do operador, 31/10/2026): a escola JÁ devolveu (marcado como fraude),
  // encerrou a assinatura e cortou o acesso, sozinha (`processarAviso`) — o caso chega ao operador JÁ RESOLVIDO, e o alerta diz
  // o que foi feito. Uma vez por aviso; gravado só agora, depois de tudo ter dado certo.
  if (aviso.avisoDeFraude && desfecho.resultado !== "repetido") {
    const { id, cobranca, pagamento, tipo } = aviso.avisoDeFraude;
    const feito = oQueOAvisoDeFraudeFez(desfecho.fraude, desfecho);
    const devolucao = desfecho.fraude?.devolucao;
    const assinatura = "assinatura" in desfecho ? desfecho.assinatura.id : aviso.assinatura;
    await casoJaResolvido({ tipo: TipoDeCaso.AVISO_DE_FRAUDE, chave: `fraude:${id}`, urgente: false, assinatura, objeto: cobranca, centavos: devolucao && "devolvidos" in devolucao ? devolucao.devolvidos : null, detalhe: `${NOME_DO_TIPO_DE_FRAUDE[tipo] ?? tipo} · cobrança ${cobranca}` }, { quem: QuemFez.STRIPE, nota: `resolvido sozinho: ${feito}` });
    console.error(`[stripe] aviso de fraude ${id}: a cobrança ${cobranca} (pagamento ${pagamento ?? "?"}, ${tipo}) — ${feito}. Já resolvido: nada a fazer`);
  }
  if (desfecho.resultado === "sem-conta") {
    // Assinatura sem conta na escola: em voz alta. Se ela dá acesso, há alguém PAGANDO e trancado
    // fora (achado P1 da revisão) — o force-sync (etapa 4.4) conserta depois que a conta existir.
    const { id, clienteId, status, pagoAte } = desfecho.assinatura;
    const linha = `[stripe] aviso ${aviso.id} (${aviso.tipo}): assinatura ${id} do cliente ${clienteId} (${status}) SEM CONTA — ${desfecho.motivo}`;
    if (assinaturaDaAcesso({ status, currentPeriodEnd: pagoAte })) {
      console.error(`${linha}; ela dá acesso: o assinante está trancado fora`);
      await abrirCaso({ tipo: TipoDeCaso.PAGOU_SEM_CONTA, chave: `sub:${id}`, urgente: true, assinatura: id, cliente: clienteId, detalhe: `sem conta (${desfecho.motivo}) e dá acesso` });
    }
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
  // O caso URGENTE que este aviso (ou outro antes) abriu: o e-mail ao operador sai agora, fora de qualquer transação
  // (4.7b, passo 2d — P137). Nunca lança.
  await avisarUrgentes();
}
