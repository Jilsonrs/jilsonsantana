import type { AcaoFeita, PreviaDaDevolucao } from "@jilson/core";
import { prisma, TipoDeCaso } from "./prisma.js";
import { AssinaturaNaoEncontrada } from "./stripe.js";
import { buscarDetalhes } from "./stripe-assinatura.js";
import { aDevolver, assinaturaDoPagamento, buscarOQueFoiPago, cancelarNaHora, devolver, devolverParte, lerCobranca, oQueFoiPagoNaFatura, type CobrancaParaDevolver, type Pagamento } from "./stripe-reembolso.js";
import { assinaturasDoPix, lerPagamentoPix } from "./stripe-pix.js";
import { oQueFoiPago, reembolsarAssinaturaDe } from "./minha-assinatura.js";
import { devolverPixEmConferencia, escolherPrePaga, operarNaAssinatura, type PixDevolvidoPeloOperador } from "./assinaturas.js";
import { encerradaDeVez, temAcessoAtivo } from "./acesso.js";
import { clientesDe, concluirCaso, naStripe, registrar, type PorQuem, type Resultado } from "./acoes-da-cobranca.js";
import { abrirCaso, consertosDoCaso } from "./casos.js";

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
//   - DEVOLVER DE NOVO a devolução que falhou (o caso "devolução que falhou"): a do reembolso, inteira de novo; a de uma
//     cobrança, EXATAMENTE o valor que falhou (o caso guarda a cobrança e o valor — revisão do bloco 4, 31/10/2026).
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

/**
 * A assinatura de um pagamento: pela fatura dele — ou, na pré-paga, pelo Pix de que ela nasceu (a fatura dela foi paga por
 * fora): no espelho e, se o espelho ainda não a tem (o aviso atrasou — achado P2 da revisão do bloco 4, 31/10/2026), na lista
 * das assinaturas do Pix na Stripe, a que vale.
 */
async function assinaturaDaCobranca(pagamentoId: string | null, cliente: string | null): Promise<string | null> {
  if (!pagamentoId) return null;
  const daFatura = await assinaturaDoPagamento(pagamentoId);
  if (daFatura) return daFatura;
  const doEspelho = (await prisma.subscription.findUnique({ where: { pixPaymentIntentId: pagamentoId }, select: { stripeSubscriptionId: true } }))?.stripeSubscriptionId;
  if (doEspelho) return doEspelho;
  if (!cliente) return null;
  const escolhida = escolherPrePaga(await assinaturasDoPix(cliente, pagamentoId));
  return escolhida && "valendo" in escolhida ? escolhida.valendo : null;
}

/**
 * DEVOLVER UM PAGAMENTO — uma cobrança da ficha, inteira ou em parte; com `encerrar`, a assinatura dela acaba antes.
 * `devolvidoMostrado`: o quanto desta cobrança já tinha voltado quando a tela abriu (achado P1 da revisão do bloco 4,
 * 31/10/2026). Relido logo antes de devolver — com a trava da assinatura, quando há —, e se o de agora for outro, nada é
 * feito: o mesmo pedido repetido (outra aba, o "Confirmar" de novo depois de uma falha de rede) não devolve duas vezes.
 */
export async function devolverPagamentoPeloOperador(quem: { conta: string } | { visitante: string }, cobrancaId: string, centavos: number, devolvidoMostrado: number, encerrar: boolean, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const de = await clientesDe(quem);
  if (!de || de.clientes.length === 0) return { resultado: "nao-encontrada" };
  const cobranca = await lerCobranca(cobrancaId);
  // A cobrança tem de ser de um cliente da pessoa da ficha: o pedido diz QUAL, nunca de quem.
  if (!cobranca || !cobranca.cliente || !de.clientes.includes(cobranca.cliente) || !cobranca.paga) return { resultado: "nao-encontrada" };
  if (cobranca.devolvido !== devolvidoMostrado) return { resultado: "valor-mudou" };
  if (centavos > cobranca.centavos - cobranca.devolvido) return { resultado: "valor-acima" };
  const assinatura = await assinaturaDaCobranca(cobranca.pagamentoId, cobranca.cliente);
  // O Pix NOSSO que ainda não é de assinatura nenhuma (em conferência, ou à espera de virar uma) se devolve pelo caso dele, com
  // a trava do Pix (`devolverPixEmConferencia`) — nunca solto daqui (conferência do revisor do bloco 4: o "Aceitar este Pix"
  // ao mesmo tempo faria a pré-paga nascer com o Pix devolvido).
  if (!assinatura && cobranca.pagamentoId && (await lerPagamentoPix(cobranca.pagamentoId)).pagamento) return { resultado: "pix-sem-assinatura" };
  let encerrou = false;
  // A cobrança relida AGORA: só segue se o que já voltou ainda é o que a tela mostrou (a chave de repetição leva esse valor).
  const relidaSemMudanca = async (): Promise<CobrancaParaDevolver | null> => {
    const agora = await lerCobranca(cobrancaId);
    return agora && agora.devolvido === devolvidoMostrado ? agora : null;
  };
  const dono = { userId: de.conta, assinaturaId: assinatura, operador: por.conta };
  try {
    if (assinatura) {
      // Com a trava da assinatura, e a sincronia logo depois. Encerrar vem ANTES de devolver (a ordem do reembolso), relido
      // com a trava: a já encerrada não se encerra de novo — e nada se encerra se o valor mudou.
      const operacao = await operarNaAssinatura(assinatura, async (): Promise<"feita" | "valor-mudou"> => {
        const agora = await relidaSemMudanca();
        if (!agora) return "valor-mudou";
        if (encerrar && !encerradaDeVez(await buscarDetalhes(assinatura))) {
          await cancelarNaHora(assinatura, {});
          encerrou = true;
        }
        await devolverParte(agora, centavos, dono);
        return "feita";
      });
      if (!operacao) return { resultado: "ocupada" };
      if (operacao.feito === "valor-mudou") return { resultado: "valor-mudou" };
    } else {
      const agora = await relidaSemMudanca();
      if (!agora) return { resultado: "valor-mudou" };
      await devolverParte(agora, centavos, dono);
    }
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : String(erro);
    if (encerrou && assinatura) {
      // A assinatura ACABOU e o dinheiro não voltou (achado P2 da revisão do bloco 4): precisa de gente — como no "Cancelar e
      // devolver". O caso guarda a cobrança e o valor, para o "Devolver de novo" devolver exatamente isto; e o registro, o
      // encerramento.
      console.error(`[stripe] painel: a assinatura ${assinatura} (conta ${de.conta ?? "-"}) foi encerrada e a devolução de ${centavos} centavos da cobrança ${cobrancaId} FALHOU — o dinheiro não voltou: ${motivo}`);
      await abrirCaso({ tipo: TipoDeCaso.DEVOLUCAO_FALHOU, chave: `cobranca:${cobrancaId}`, urgente: true, conta: de.conta, assinatura, cliente: cobranca.cliente, objeto: cobrancaId, centavos, detalhe: "a assinatura acabou e a devolução falhou: o dinheiro não voltou" });
      await registrar(por, "devolver-pagamento-e-encerrar", { userId: de.conta, assinatura, cliente: cobranca.cliente }, "a assinatura acabou agora e a devolução falhou");
      return { resultado: "devolucao-falhou" };
    }
    // O operador vê a falha na hora, na tela: é aviso, não alerta.
    console.warn(`[stripe] painel: a devolução da cobrança ${cobrancaId} (conta ${de.conta ?? "-"}) não saiu: ${motivo}`);
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
 * sem prazo; o de uma cobrança (`devolucao:<re_…>`, `cobranca:<ch_…>`), EXATAMENTE o valor que falhou — com a trava e a
 * sincronia da assinatura, quando há. Saiu: o caso fecha, com o valor. Nada faltava voltar: o caso fecha também (alguém já
 * devolveu).
 */
export async function devolverDeNovoPeloOperador(casoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const caso = await prisma.billingCase.findUnique({ where: { id: casoId }, select: { kind: true, key: true, open: true, userId: true, stripeSubscriptionId: true, stripeObjectId: true, amount: true } });
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

  // A devolução de UMA COBRANÇA que falhou (achado P1 da revisão do bloco 4, 31/10/2026): devolve EXATAMENTE o valor que
  // falhou — o caso guarda a cobrança (`objeto`) e o valor —, nunca tudo o que falta da cobrança: a que falhou podia ser uma
  // parte. O caso antigo, sem o valor (`pagamento:<pi_…>`), não se repete por aqui: é o "Devolver um pagamento" da ficha.
  if (!caso.key.startsWith("devolucao:") && !caso.key.startsWith("cobranca:")) return { resultado: caso.key.startsWith("pagamento:") ? "sem-valor-da-devolucao" : "nao-encontrada" };
  if (caso.amount === null || !caso.stripeObjectId) return { resultado: "sem-valor-da-devolucao" };
  const cobranca = await lerCobranca(caso.stripeObjectId);
  if (!cobranca) return { resultado: "nao-encontrada" };
  const valor = Math.min(caso.amount, cobranca.centavos - cobranca.devolvido);
  const assinatura = (await assinaturaDaCobranca(cobranca.pagamentoId, cobranca.cliente)) ?? caso.stripeSubscriptionId;
  const alvo = { userId: caso.userId, assinatura, cliente: cobranca.cliente };
  if (valor <= 0) {
    await concluirCaso(casoId, por, "devolver-de-novo", alvo, "nada faltava devolver");
    return { resultado: "ok", feito: { detalhe: "nada faltava devolver" } };
  }
  const devolverAgora = async (): Promise<void> => {
    const nova = await devolverParte(cobranca, valor, { userId: caso.userId, assinaturaId: assinatura, operador: por.conta }, { deNovoDo: caso.key });
    // Nunca a MESMA devolução que falhou (a conferência do revisor do bloco 4): só uma chave reaproveitada a traria de volta.
    if (caso.key === `devolucao:${nova}`) throw new Error(`[stripe] a devolução de novo trouxe a mesma que falhou (${nova})`);
  };
  try {
    if (assinatura) {
      if (!(await operarNaAssinatura(assinatura, devolverAgora))) return { resultado: "ocupada" };
    } else {
      await devolverAgora();
    }
  } catch (erro) {
    console.warn(`[stripe] painel: a devolução da cobrança ${cobranca.id} falhou de novo: ${erro instanceof Error ? erro.message : String(erro)}`);
    return { resultado: "devolucao-falhou" };
  }
  const detalhe = `${emReais(valor, cobranca.moeda)} devolvidos de novo`;
  await concluirCaso(casoId, por, "devolver-de-novo", alvo, detalhe, valor);
  return { resultado: "ok", feito: { detalhe } };
}

/** Devolve o que falta de cada pagamento — com a trava e a sincronia da assinatura, quando há uma (a regra do "pago até"). */
async function devolverPagamentos(pagamentos: Pagamento[], dono: { userId: string | null; assinatura: string | null }): Promise<"ok" | "ocupada"> {
  const devolverTodos = async () => {
    for (const pagamento of pagamentos) await devolver(pagamento, { userId: dono.userId ?? "sem-conta", assinaturaId: dono.assinatura ?? "sem-assinatura" });
  };
  if (!dono.assinatura) {
    await devolverTodos();
    return "ok";
  }
  return (await operarNaAssinatura(dono.assinatura, devolverTodos)) ? "ok" : "ocupada";
}

/**
 * DEVOLVER O PIX (o conserto do caso "Pix em conferência", passo 4c — P117): o Pix volta INTEIRO para a pessoa, e ela pode
 * pagar de novo pela tela (a pré-paga que tenha ficado incompleta expira sozinha). O caso fecha, com o valor.
 */
export async function devolverPixPeloOperador(casoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const caso = await prisma.billingCase.findUnique({ where: { id: casoId }, select: { kind: true, key: true, open: true, userId: true } });
  if (!caso || !caso.open || !consertosDoCaso(caso.kind, caso.key).includes("devolver-pix")) return { resultado: "nao-encontrada" };
  const pagamentoId = caso.key.slice("pix:".length);
  const alvo = { userId: caso.userId, assinatura: null };
  // Com a trava do Pix (`devolverPixEmConferencia` — achado P1 da revisão do bloco 4): o que já virou assinatura não se
  // devolve solto.
  let feito: PixDevolvidoPeloOperador;
  try {
    feito = await devolverPixEmConferencia(pagamentoId, { userId: caso.userId });
  } catch (erro) {
    console.warn(`[stripe] painel: a devolução do Pix ${pagamentoId} não saiu: ${erro instanceof Error ? erro.message : String(erro)}`);
    return { resultado: "devolucao-falhou" };
  }
  if (feito.resultado === "ocupada") return { resultado: "ocupada" };
  if (feito.resultado === "nao-pago") return { resultado: "nao-encontrada" };
  if (feito.resultado === "ja-virou-assinatura") return { resultado: "pix-ja-virou-assinatura" };
  const detalhe = feito.resultado === "devolvido" ? `${emReais(feito.centavos, "brl")} devolvidos; o Pix voltou para a pessoa` : "o Pix já tinha voltado para a pessoa";
  await concluirCaso(casoId, por, "devolver-pix", alvo, detalhe, feito.resultado === "devolvido" ? feito.centavos : null);
  return { resultado: "ok", feito: { detalhe } };
}

/**
 * DEVOLVER ESTE PAGAMENTO (o conserto do caso "dinheiro recebido sem assinatura", passo 4c): o que entrou volta INTEIRO — o da
 * tentativa cancelada já paga (`sub:`, todas as faturas pagas dela) ou o da cobrança em aberto paga no instante de cancelar
 * (`fatura:in_…`). Com a trava e a sincronia da assinatura: o período que ela pagou deixa de contar. O caso fecha, com o valor.
 */
export async function devolverEstePagamentoPeloOperador(casoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const caso = await prisma.billingCase.findUnique({ where: { id: casoId }, select: { kind: true, key: true, open: true, userId: true, stripeSubscriptionId: true } });
  if (!caso || !caso.open || !consertosDoCaso(caso.kind, caso.key).includes("devolver-este-pagamento")) return { resultado: "nao-encontrada" };
  const daAssinatura = caso.key.startsWith("sub:") ? caso.key.slice("sub:".length) : null;
  const pago = daAssinatura ? await buscarOQueFoiPago(daAssinatura) : await oQueFoiPagoNaFatura(caso.key.slice("fatura:".length));
  const falta = aDevolver(pago);
  const assinatura = daAssinatura ?? caso.stripeSubscriptionId;
  const alvo = { userId: caso.userId, assinatura };
  if (falta <= 0) {
    await concluirCaso(casoId, por, "devolver-este-pagamento", alvo, "nada faltava devolver");
    return { resultado: "ok", feito: { detalhe: "nada faltava devolver" } };
  }
  try {
    if ((await devolverPagamentos(pago.pagamentos, { userId: caso.userId, assinatura })) === "ocupada") return { resultado: "ocupada" };
  } catch (erro) {
    console.warn(`[stripe] painel: a devolução do caso ${casoId} não saiu: ${erro instanceof Error ? erro.message : String(erro)}`);
    return { resultado: "devolucao-falhou" };
  }
  const detalhe = `${emReais(falta, pago.moeda)} devolvidos`;
  await concluirCaso(casoId, por, "devolver-este-pagamento", alvo, detalhe, falta);
  return { resultado: "ok", feito: { detalhe } };
}
