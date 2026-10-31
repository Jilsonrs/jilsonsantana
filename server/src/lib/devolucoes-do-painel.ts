import type { AcaoFeita, PreviaDaDevolucao } from "@jilson/core";
import { prisma, TipoDeCaso } from "./prisma.js";
import { AssinaturaNaoEncontrada } from "./stripe.js";
import { buscarDetalhes } from "./stripe-assinatura.js";
import { aDevolver, assinaturaDoPagamento, cancelarNaHora, devolver, devolverParte, lerCobranca } from "./stripe-reembolso.js";
import { cobrancaDoPagamento } from "./stripe-devolucao.js";
import { oQueFoiPago, reembolsarAssinaturaDe } from "./minha-assinatura.js";
import { operarNaAssinatura } from "./assinaturas.js";
import { encerradaDeVez, temAcessoAtivo } from "./acesso.js";
import { clientesDe, concluirCaso, naStripe, registrar, type PorQuem, type Resultado } from "./acoes-da-cobranca.js";

// AS DEVOLUÇÕES DO PAINEL DA COBRANÇA (Fase 4, etapa 4.7b, bloco 4, passo 4a — decisões do operador: P114, 29/10/2026, "um
// clique reembolso já resolver tudo", e P139, 31/10/2026, "inteiro ou uma parte"). Três ações, todas pelas MESMAS operações
// que o aluno e os avisos já usam, e todas no registro, com o valor e quem fez:
//   - CANCELAR E DEVOLVER O DINHEIRO: a operação do reembolso do aluno (`reembolsarAssinaturaDe`), sem o prazo dos 7 dias —
//     encerra na hora e devolve TUDO o que falta voltar da assinatura (cartão ou o Pix da pré-paga). A tela mostra o valor
//     antes (a prévia), e a ação só devolve se o de agora for o mostrado;
//   - DEVOLVER UM PAGAMENTO: uma cobrança da ficha, inteira ou em parte (no máximo o que falta voltar). Se a cobrança é de
//     uma assinatura, a devolução vai com a trava dela e a sincronia de sempre. SÓ DEVOLVER NÃO MEXE NO ACESSO: a regra das
//     aulas libera a assinatura ativa sem olhar o pagamento (medido na prova pela rota, 31/10/2026). Com "e encerrar a
//     assinatura agora" (decisão do operador, 31/10/2026), ela ENCERRA na hora e DEPOIS devolve — a ordem do reembolso: o
//     acesso acaba e nada mais é cobrado;
//   - DEVOLVER DE NOVO a devolução que falhou (o caso "devolução que falhou"): o que falta, de novo.
// O cliente nunca vem do pedido: a cobrança tem de ser de um cliente da pessoa da ficha.

/** O valor em reais, como a tela do admin mostra. */
function emReais(centavos: number, moeda: string | null): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: (moeda ?? "brl").toUpperCase() }).format(centavos / 100);
}

/** A PRÉVIA de "Cancelar e devolver o dinheiro": tudo o que falta voltar da assinatura, e de quantos pagamentos. */
export async function previaDeDevolverTudo(espelhoId: number): Promise<Resultado<PreviaDaDevolucao>> {
  const achada = await naStripe(espelhoId);
  if (achada.resultado !== "ok") return achada;
  const pago = await oQueFoiPago(achada.detalhes);
  return { resultado: "ok", feito: { centavos: aDevolver(pago), moeda: pago.moeda, pagamentos: pago.pagamentos.filter((p) => p.centavos > p.devolvido).length } };
}

/** CANCELAR E DEVOLVER O DINHEIRO, com o valor que a tela mostrou. */
export async function devolverTudoPeloOperador(espelhoId: number, centavosMostrados: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const achada = await naStripe(espelhoId);
  if (achada.resultado !== "ok") return achada;
  const { linha, detalhes } = achada;
  const alvo = { userId: linha.ownerUserId, assinatura: linha.stripeSubscriptionId, cliente: linha.stripeCustomerId };
  const feito = await reembolsarAssinaturaDe(detalhes, linha.ownerUserId ?? "sem-conta", {}, { peloDono: false, centavosMostrados });
  if (feito.resultado === "ok") {
    const detalhe = `${emReais(feito.centavos, feito.moeda)} devolvidos; a assinatura acabou agora`;
    await registrar(por, "devolver-tudo", alvo, detalhe, feito.centavos);
    return { resultado: "ok", feito: { detalhe } };
  }
  if (feito.resultado === "devolucao-falhou") {
    await registrar(por, "devolver-tudo", alvo, "a assinatura acabou e a devolução falhou");
    return { resultado: "devolucao-falhou" };
  }
  if (feito.resultado === "valor-mudou" || feito.resultado === "ocupada" || feito.resultado === "pre-paga") return { resultado: feito.resultado };
  return { resultado: "nada-a-fazer" };
}

/** A assinatura de um pagamento: pela fatura dele — ou, na pré-paga, pelo Pix de que ela nasceu (a fatura dela foi paga por fora). */
async function assinaturaDaCobranca(pagamentoId: string | null): Promise<string | null> {
  if (!pagamentoId) return null;
  const daFatura = await assinaturaDoPagamento(pagamentoId);
  if (daFatura) return daFatura;
  return (await prisma.subscription.findUnique({ where: { pixPaymentIntentId: pagamentoId }, select: { stripeSubscriptionId: true } }))?.stripeSubscriptionId ?? null;
}

/** DEVOLVER UM PAGAMENTO — uma cobrança da ficha, inteira ou em parte; com `encerrar`, a assinatura dela acaba antes. */
export async function devolverPagamentoPeloOperador(quem: { conta: string } | { visitante: string }, cobrancaId: string, centavos: number, encerrar: boolean, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const de = await clientesDe(quem);
  if (!de || de.clientes.length === 0) return { resultado: "nao-encontrada" };
  const cobranca = await lerCobranca(cobrancaId);
  // A cobrança tem de ser de um cliente da pessoa da ficha: o pedido diz QUAL, nunca de quem.
  if (!cobranca || !cobranca.cliente || !de.clientes.includes(cobranca.cliente) || !cobranca.paga) return { resultado: "nao-encontrada" };
  if (centavos > cobranca.centavos - cobranca.devolvido) return { resultado: "valor-acima" };
  const assinatura = await assinaturaDaCobranca(cobranca.pagamentoId);
  let encerrou = false;
  const devolverAgora = () => devolverParte(cobranca, centavos, { userId: de.conta, assinaturaId: assinatura, operador: por.conta });
  try {
    if (assinatura) {
      // Com a trava da assinatura, e a sincronia logo depois. Encerrar vem ANTES de devolver (a ordem do reembolso), relido
      // com a trava: a já encerrada não se encerra de novo.
      const operacao = await operarNaAssinatura(assinatura, async () => {
        if (encerrar && !encerradaDeVez(await buscarDetalhes(assinatura))) {
          await cancelarNaHora(assinatura, {});
          encerrou = true;
        }
        await devolverAgora();
      });
      if (!operacao) return { resultado: "ocupada" };
    } else {
      await devolverAgora();
    }
  } catch (erro) {
    // O operador vê a falha na hora, na tela: é aviso, não alerta.
    console.warn(`[stripe] painel: a devolução da cobrança ${cobrancaId} (conta ${de.conta ?? "-"}) não saiu: ${erro instanceof Error ? erro.message : String(erro)}`);
    return { resultado: "devolucao-falhou" };
  }
  const comAcesso = de.conta ? await temAcessoAtivo(de.conta) : false;
  const encerramento = encerrou ? "a assinatura acabou agora; " : encerrar && !assinatura ? "a cobrança não é de uma assinatura, nada a encerrar; " : "";
  const detalhe = `${emReais(centavos, cobranca.moeda)} devolvidos desta cobrança; ${encerramento}${comAcesso ? "com acesso" : "sem acesso"} às aulas`;
  await registrar(por, encerrou ? "devolver-pagamento-e-encerrar" : "devolver-pagamento", { userId: de.conta, assinatura, cliente: cobranca.cliente }, detalhe, centavos);
  return { resultado: "ok", feito: { detalhe } };
}

/**
 * DEVOLVER DE NOVO (o conserto do caso "devolução que falhou"): o do reembolso (`sub:<assinatura>`) pela mesma operação,
 * sem prazo; o de um pagamento (`pagamento:<pi_…>`), o que falta voltar dele — com a trava e a sincronia da assinatura,
 * quando há. Saiu: o caso fecha, com o valor. Nada faltava voltar: o caso fecha também (alguém já devolveu).
 */
export async function devolverDeNovoPeloOperador(casoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const caso = await prisma.billingCase.findUnique({ where: { id: casoId }, select: { kind: true, key: true, open: true, userId: true, stripeSubscriptionId: true } });
  if (!caso || !caso.open || caso.kind !== TipoDeCaso.DEVOLUCAO_FALHOU) return { resultado: "nao-encontrada" };

  if (caso.key.startsWith("sub:")) {
    const id = caso.key.slice("sub:".length);
    let detalhes;
    try {
      detalhes = await buscarDetalhes(id);
    } catch (erro) {
      if (erro instanceof AssinaturaNaoEncontrada) return { resultado: "stripe-nao-conhece" };
      throw erro;
    }
    const alvo = { userId: caso.userId, assinatura: id };
    const feito = await reembolsarAssinaturaDe(detalhes, caso.userId ?? "sem-conta", {}, { peloDono: false });
    if (feito.resultado === "ok") {
      const detalhe = `${emReais(feito.centavos, feito.moeda)} devolvidos de novo`;
      await concluirCaso(casoId, por, "devolver-de-novo", alvo, detalhe, feito.centavos);
      return { resultado: "ok", feito: { detalhe } };
    }
    if (feito.resultado === "nada-a-devolver") {
      await concluirCaso(casoId, por, "devolver-de-novo", alvo, "nada faltava devolver");
      return { resultado: "ok", feito: { detalhe: "nada faltava devolver" } };
    }
    if (feito.resultado === "devolucao-falhou" || feito.resultado === "ocupada") return { resultado: feito.resultado };
    return { resultado: "nada-a-fazer" };
  }

  const pagamentoId = caso.key.startsWith("pagamento:pi_") ? caso.key.slice("pagamento:".length) : null;
  if (!pagamentoId) return { resultado: "nao-encontrada" };
  const { centavos, devolvido } = await cobrancaDoPagamento(pagamentoId);
  const falta = centavos - devolvido;
  const assinatura = (await assinaturaDaCobranca(pagamentoId)) ?? caso.stripeSubscriptionId;
  const alvo = { userId: caso.userId, assinatura };
  if (falta <= 0) {
    await concluirCaso(casoId, por, "devolver-de-novo", alvo, "nada faltava devolver");
    return { resultado: "ok", feito: { detalhe: "nada faltava devolver" } };
  }
  const devolverAgora = () => devolver({ pagamentoId, centavos, devolvido }, { userId: caso.userId ?? "sem-conta", assinaturaId: assinatura ?? "sem-assinatura" });
  try {
    if (assinatura) {
      if (!(await operarNaAssinatura(assinatura, devolverAgora))) return { resultado: "ocupada" };
    } else {
      await devolverAgora();
    }
  } catch (erro) {
    console.warn(`[stripe] painel: a devolução do pagamento ${pagamentoId} falhou de novo: ${erro instanceof Error ? erro.message : String(erro)}`);
    return { resultado: "devolucao-falhou" };
  }
  const detalhe = `${emReais(falta, "brl")} devolvidos de novo`;
  await concluirCaso(casoId, por, "devolver-de-novo", alvo, detalhe, falta);
  return { resultado: "ok", feito: { detalhe } };
}
