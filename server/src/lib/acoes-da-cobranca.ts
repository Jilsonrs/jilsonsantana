import { entrarPara, lerDocumentoFiscal, TELA_DE_PAGAR_COM_PIX, type Plano, type AcaoFeita, type ConferenciaPelaFicha, type ConsertoDoCaso, type FichaQuery, type LinkParaOAluno } from "@jilson/core";
import { Prisma, prisma, QuemFez, TipoDeCaso } from "./prisma.js";
import { consertosDoCaso } from "./casos.js";
import { AssinaturaNaoEncontrada, assinaturasDoCliente, buscarAssinatura, buscarPrecos, DocumentoRecusado, trocarNumeroFiscal } from "./stripe.js";
import { buscarDetalhes, pagarFatura, type CobrancaDaFatura, type DetalhesDaAssinatura } from "./stripe-assinatura.js";
import { anularFatura, assinaturaDaFatura, soltarAgendamento } from "./stripe-plano.js";
import { aceitarContestacao, cancelarNaHora, statusDaContestacao, tirarMarcaDeContestacao } from "./stripe-reembolso.js";
import { criarAssinaturaPagaPorFora, listarPixDoCliente, operadorDaPagaPorFora, pixConfigurado, type PixPendente } from "./stripe-pix.js";
import { enviarEmail } from "./email.js";
import { getDict } from "./dict.js";
import { enderecoDoSite } from "./endereco-do-site.js";
import { manterAssinaturaDe, pararRenovacaoDe } from "./minha-assinatura.js";
import { aceitarPixEmConferencia, cancelarOutrosPix, operarNaAssinatura, pixPagoSemEspelho, sincronizarAssinatura, sincronizarConta, sincronizarPedido, sincronizarSeLivre, TEMPO_DO_PIX, type Conferida } from "./assinaturas.js";
import { assinaturasAbertas } from "./pix-pre-pago.js";
import { clienteDaConta, travarSeLivre } from "./checkout.js";
import { transacaoDaCobranca } from "./casos.js";
import { cobrancaAtrasada, encerradaDeVez, temAcessoAtivo } from "./acesso.js";
import { mandarBoasVindasDaAssinatura } from "./boas-vindas.js";
import { avisarSobreAAssinatura } from "./avisos-da-assinatura.js";

// AS AÇÕES DO PAINEL DA COBRANÇA (Fase 4, etapa 4.7b, bloco 3 — o mapa aprovado pelo operador, 31/10/2026). Cada ação
// chama a MESMA operação que o aluno (ou a rodada) já usa — "o painel e o JilsonAI chamam as mesmas" (CLAUDE.md) — e
// grava no registro da cobrança QUEM fez (o operador hoje; o JilsonAI depois), em quem e o que a Stripe respondeu. A
// assinatura vem pelo id do ESPELHO; o que fazer com ela sai da Stripe, na hora. Nenhuma devolve dinheiro (isso é o
// bloco 4).

/** Quem faz a ação: o operador (a conta dele) — e, no futuro, o JilsonAI. */
export type PorQuem = { quem: typeof QuemFez.OPERADOR | typeof QuemFez.JILSONAI; conta: string };

/** O que não deu para fazer — cada um vira um status na rota. */
export type NaoFeita =
  | "nao-encontrada"
  | "ocupada"
  | "pre-paga"
  | "nada-a-fazer"
  | "stripe-nao-conhece"
  | "assinatura-viva"
  | "valor-mudou"
  | "valor-acima"
  | "devolucao-falhou"
  | "pix-nao-aceito"
  | "ja-tem-acesso"
  | "contestacao-nao-ganha"
  | "contestacao-nao-aberta"
  // A revisão de segurança do bloco 4 (31/10/2026):
  | "ja-tem-outra-assinatura"
  | "outra-assinatura-viva"
  | "pix-pago-esperando"
  | "pix-ja-virou-assinatura"
  | "sem-valor-da-devolucao"
  | "outra-contestacao-nao-ganha"
  // A conferência do revisor do bloco 4 (31/10/2026):
  | "pix-sem-assinatura";
export type Resultado<T> = { resultado: "ok"; feito: T } | { resultado: NaoFeita };

/** Grava a ação no registro: quem fez, em quem, o valor (quando há dinheiro) e o que a Stripe respondeu (sem dado pessoal). */
export async function registrar(por: PorQuem, acao: string, alvo: { userId?: string | null; assinatura?: string | null; cliente?: string | null }, detalhe: string, centavos: number | null = null): Promise<void> {
  const conta = alvo.userId ? await prisma.user.findUnique({ where: { id: alvo.userId }, select: { id: true } }) : null;
  await prisma.billingLog.create({ data: { who: por.quem, actorUserId: por.conta, action: acao, userId: conta?.id ?? null, stripeSubscriptionId: alvo.assinatura ?? null, stripeCustomerId: alvo.cliente ?? null, amount: centavos, detail: detalhe } });
}

/** A linha do espelho e os detalhes da assinatura na Stripe, agora. */
export async function naStripe(espelhoId: number) {
  const linha = await prisma.subscription.findUnique({ where: { id: espelhoId }, select: { stripeSubscriptionId: true, ownerUserId: true, stripeCustomerId: true } });
  if (!linha) return { resultado: "nao-encontrada" as const };
  try {
    return { resultado: "ok" as const, linha, detalhes: await buscarDetalhes(linha.stripeSubscriptionId) };
  } catch (erro) {
    if (erro instanceof AssinaturaNaoEncontrada) return { resultado: "stripe-nao-conhece" as const };
    throw erro;
  }
}

/** O que a conferência achou, em poucas palavras. */
function resumoDaConferencia(conferidas: Conferida[]): string {
  if (conferidas.length === 0) return "nenhuma assinatura na Stripe";
  return conferidas.map((c) => ("assinatura" in c ? c.assinatura.status : c.resultado)).join(", ");
}

/**
 * CONFERIR NA STRIPE (passo 3a): a sincronia de sempre (`assinaturas.ts`), pela conta, pela assinatura ou pela ficha do
 * visitante — com a ficha, a conta NASCE se o pagamento passou (etapa 4.7, passo 4), e as boas-vindas saem.
 */
export async function conferirPeloOperador(quem: FichaQuery, por: PorQuem): Promise<Resultado<ConferenciaPelaFicha>> {
  let conta: string | null = null;
  let conferidas: Conferida[];
  let cliente: string | null = null;
  if ("conta" in quem) {
    const achada = await prisma.user.findUnique({ where: { id: quem.conta }, select: { id: true } });
    if (!achada) return { resultado: "nao-encontrada" };
    conta = achada.id;
    conferidas = await sincronizarConta(conta);
  } else if ("assinatura" in quem) {
    const linha = await prisma.subscription.findUnique({ where: { id: quem.assinatura }, select: { stripeSubscriptionId: true, ownerUserId: true, stripeCustomerId: true } });
    if (!linha) return { resultado: "nao-encontrada" };
    conta = linha.ownerUserId;
    cliente = linha.stripeCustomerId;
    conferidas = conta ? await sincronizarConta(conta) : [{ id: linha.stripeSubscriptionId, ...(await sincronizarAssinatura(linha.stripeSubscriptionId)) }];
  } else {
    const ficha = await prisma.guestCheckout.findUnique({ where: { id: quem.visitante }, select: { email: true, stripeCustomerId: true } });
    if (!ficha) return { resultado: "nao-encontrada" };
    cliente = ficha.stripeCustomerId;
    conferidas = (await sincronizarPedido(ficha.email)) ?? [];
    // A conta pode ter nascido agora: as boas-vindas saem daqui (depois do commit; uma vez só).
    for (const c of conferidas) if (c.resultado === "atualizada") await mandarBoasVindasDaAssinatura(c.id);
    conta = (await prisma.guestCheckout.findUnique({ where: { id: quem.visitante }, select: { userId: true } }))?.userId ?? null;
  }
  const temAcesso = conta ? await temAcessoAtivo(conta) : false;
  const detalhe = `${resumoDaConferencia(conferidas)}; ${temAcesso ? "com acesso" : "sem acesso"}`;
  await registrar(por, "conferir-na-stripe", { userId: conta, cliente }, detalhe);
  return { resultado: "ok", feito: { temAcesso, detalhe } };
}

/**
 * CANCELAR (passo 3a): a MESMA operação do aluno (`pararRenovacaoDe`) — em dia, para de renovar e o acesso continua até
 * o fim do que foi pago; com a cobrança atrasada, termina agora e a cobrança em aberto não é mais tentada. Sem motivo:
 * o motivo é o do aluno, e o operador não escolhe por ele.
 */
export async function cancelarPeloOperador(espelhoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const achada = await naStripe(espelhoId);
  if (achada.resultado !== "ok") return achada;
  const { linha, detalhes } = achada;
  const feita = await pararRenovacaoDe(detalhes, linha.ownerUserId ?? "sem-conta", {}, { peloDono: false });
  if (feita.resultado === "ocupada" || feita.resultado === "pre-paga") return { resultado: feita.resultado };
  if (feita.resultado !== "ok") return { resultado: "nada-a-fazer" };
  const detalhe = feita.terminou ? "terminou agora (a cobrança estava atrasada)" : `não renova; acesso até ${feita.acessoAte?.slice(0, 10) ?? "o fim do período"}`;
  await registrar(por, "cancelar", { userId: linha.ownerUserId, assinatura: linha.stripeSubscriptionId, cliente: linha.stripeCustomerId }, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}

/**
 * ENCERRAR AGORA A PAGA POR FORA (bloco 6, passo 6e — decisão do operador, 31/10/2026, P149: "Sim, com confirmação"): o jeito de
 * desfazer uma liberação feita na conta ou no plano errado sem ir à Stripe. Só a paga por fora (a marca `pago_por_fora`): a
 * assinatura acaba na hora (`cancelarNaHora`, pela operação na assinatura — a trava e a sincronia, que corta o acesso e
 * derruba as sessões, como toda perda de acesso pelo operador). Nada se devolve pela Stripe: o dinheiro foi recebido por fora,
 * e se devolve por fora. Fica no registro, com quem fez.
 */
export async function encerrarPagaPorForaPeloOperador(espelhoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const achada = await naStripe(espelhoId);
  if (achada.resultado !== "ok") return achada;
  const { linha, detalhes } = achada;
  if (!detalhes.pagoPorFora || encerradaDeVez(detalhes)) return { resultado: "nada-a-fazer" };
  const id = linha.stripeSubscriptionId;
  const operacao = await operarNaAssinatura(id, async (): Promise<"encerrada" | "nada"> => {
    // Relida com a trava: a já encerrada não se encerra de novo.
    if (encerradaDeVez(await buscarDetalhes(id))) return "nada";
    await cancelarNaHora(id, {});
    return "encerrada";
  });
  if (!operacao) return { resultado: "ocupada" };
  if (operacao.feito === "nada") return { resultado: "nada-a-fazer" };
  const detalhe = "a assinatura paga por fora acabou agora; o dinheiro recebido por fora se devolve por fora";
  await registrar(por, "encerrar-paga-por-fora", { userId: linha.ownerUserId, assinatura: id, cliente: linha.stripeCustomerId }, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}

/**
 * TENTAR COBRAR DE NOVO AGORA (bloco 4, passo 4b): a cobrança em aberto da ATRASADA, no cartão da assinatura — quando o
 * aluno avisa que resolveu o cartão. A MESMA cobrança que a troca de cartão do aluno faz (`pagarFatura`), com a trava e a
 * sincronia, e relida com a trava (paga no meio, não cobra de novo): passou, as aulas voltam na hora. Recusada, a Stripe
 * segue tentando sozinha. O banco pedindo uma confirmação, só a pessoa a completa — pelo link de trocar o cartão.
 */
export async function cobrarDeNovoPeloOperador(espelhoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const achada = await naStripe(espelhoId);
  if (achada.resultado !== "ok") return achada;
  const { linha, detalhes } = achada;
  if (!cobrancaAtrasada(detalhes) || !detalhes.faturaEmAbertoId) return { resultado: "nada-a-fazer" };
  const id = linha.stripeSubscriptionId;
  const operacao = await operarNaAssinatura(id, async (): Promise<CobrancaDaFatura | "nada"> => {
    const agora = await buscarDetalhes(id);
    if (!cobrancaAtrasada(agora) || !agora.faturaEmAbertoId) return "nada";
    return pagarFatura(agora.faturaEmAbertoId);
  });
  if (!operacao) return { resultado: "ocupada" };
  if (operacao.feito === "nada") return { resultado: "nada-a-fazer" };
  const comAcesso = linha.ownerUserId ? await temAcessoAtivo(linha.ownerUserId) : false;
  const detalhe =
    operacao.feito === "paga"
      ? `a cobrança passou; ${comAcesso ? "com acesso" : "sem acesso"} às aulas`
      : operacao.feito === "recusada"
        ? "o cartão foi recusado de novo; a Stripe segue tentando sozinha"
        : "o banco pede uma confirmação que só a pessoa dá: mande o link de trocar o cartão";
  await registrar(por, "cobrar-de-novo", { userId: linha.ownerUserId, assinatura: id, cliente: linha.stripeCustomerId }, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}

/** DESFAZER O CANCELAMENTO (passo 3a): a MESMA operação do aluno (`manterAssinaturaDe`) — volta a renovar. */
export async function desfazerCancelamentoPeloOperador(espelhoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const achada = await naStripe(espelhoId);
  if (achada.resultado !== "ok") return achada;
  const { linha, detalhes } = achada;
  const feita = await manterAssinaturaDe(detalhes, linha.ownerUserId ?? "sem-conta");
  if (feita.resultado === "ocupada" || feita.resultado === "pre-paga") return { resultado: feita.resultado };
  if (feita.resultado !== "ok") return { resultado: "nada-a-fazer" };
  const detalhe = "volta a renovar";
  await registrar(por, "desfazer-cancelamento", { userId: linha.ownerUserId, assinatura: linha.stripeSubscriptionId, cliente: linha.stripeCustomerId }, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}

/**
 * REENVIAR o e-mail de um caso "e-mail que não saiu" (passo 3a): a MESMA rotina que manda — as boas-vindas, ou o e-mail
 * da cobrança devido agora. Ela é idempotente (uma vez cada); se sair, o caso fecha sozinho.
 */
export async function reenviarPeloOperador(casoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const caso = await prisma.billingCase.findUnique({ where: { id: casoId }, select: { kind: true, key: true, open: true, userId: true, stripeSubscriptionId: true } });
  if (!caso || caso.kind !== TipoDeCaso.EMAIL_NAO_SAIU || !caso.open || !caso.stripeSubscriptionId) return { resultado: "nao-encontrada" };
  if (caso.key.startsWith("boas-vindas:")) {
    await mandarBoasVindasDaAssinatura(caso.stripeSubscriptionId);
  } else {
    try {
      await avisarSobreAAssinatura(await buscarAssinatura(caso.stripeSubscriptionId));
    } catch (erro) {
      if (erro instanceof AssinaturaNaoEncontrada) return { resultado: "stripe-nao-conhece" };
      throw erro;
    }
  }
  const depois = await prisma.billingCase.findUnique({ where: { id: casoId }, select: { open: true } });
  const detalhe = depois?.open ? "o e-mail não saiu de novo" : "o e-mail saiu";
  await registrar(por, "reenviar-email", { userId: caso.userId, assinatura: caso.stripeSubscriptionId }, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}

// ── OS CONSERTOS DO PASSO 3b: o que hoje só o painel da Stripe faz ───────────────────────────────────────────────────

/** Fecha o caso pelo operador, com o que foi feito na nota, e grava a ação no registro. */
export async function concluirCaso(casoId: number, por: PorQuem, acao: string, alvo: { userId: string | null; assinatura: string | null }, detalhe: string, centavos: number | null = null): Promise<void> {
  await prisma.billingCase.updateMany({ where: { id: casoId, open: true }, data: { open: false, closedAt: new Date(), closedBy: por.quem, closedByUserId: por.conta, note: detalhe } });
  await registrar(por, acao, alvo, detalhe, centavos);
}

const ENCERRADA = new Set(["canceled", "incomplete_expired"]);

/**
 * RESOLVER UM CASO com o conserto que ele pede (passo 3b), dentro das travas:
 *   - ANULAR A COBRANÇA EM ABERTO (caso "cobrança em aberto"): só com a assinatura ENCERRADA, ou quando a fatura é a da
 *     troca de plano — `[FATO — medido na área restrita, 11/10/2026]` anular a renovação de uma assinatura viva a
 *     devolve a `active` sem pagamento (aulas abertas de graça): aí é 409 `AssinaturaViva`;
 *   - SOLTAR O AGENDAMENTO pela metade (caso "troca de plano"): o mesmo `soltarAgendamento` do aluno;
 *   - ENCERRAR NA HORA, SEM DEVOLVER (caso "ativa sem período pago"): `cancelarNaHora` (sem crédito nem fatura), pela
 *     operação na assinatura — a sincronia corta o acesso.
 */
export async function resolverCasoPeloOperador(casoId: number, acao: "anular-cobranca" | "soltar-agendamento" | "encerrar-na-hora", por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const caso = await prisma.billingCase.findUnique({ where: { id: casoId }, select: { kind: true, key: true, open: true, userId: true, stripeSubscriptionId: true, stripeObjectId: true } });
  // O conserto tem de ser O DO CASO (o tipo e a chave): o "soltar" de um caso de troca sem agendamento na chave soltaria o
  // que a Stripe tiver agora — talvez a troca que o próprio aluno marcou (revisão de segurança do bloco 3).
  if (!caso || !caso.open || !consertosDoCaso(caso.kind, caso.key).includes(acao) || !caso.stripeSubscriptionId) return { resultado: "nao-encontrada" };
  const id = caso.stripeSubscriptionId;
  const alvo = { userId: caso.userId, assinatura: id };
  let detalhes: DetalhesDaAssinatura;
  try {
    detalhes = await buscarDetalhes(id);
  } catch (erro) {
    if (erro instanceof AssinaturaNaoEncontrada) return { resultado: "stripe-nao-conhece" };
    throw erro;
  }

  if (acao === "anular-cobranca") {
    const fatura = caso.stripeObjectId;
    if (!fatura) return { resultado: "nada-a-fazer" };
    if (!ENCERRADA.has(detalhes.status) && fatura !== detalhes.faturaDaTrocaId) return { resultado: "assinatura-viva" };
    // A fatura é DESTA assinatura (revisão de segurança do bloco 3): a de outra, ainda viva, seria reativada sem pagamento.
    if ((await assinaturaDaFatura(fatura)) !== id) return { resultado: "nada-a-fazer" };
    const ficou = await anularFatura(fatura);
    const detalhe = ficou === "anulada" ? "a cobrança em aberto foi anulada" : "a cobrança já estava paga: nada foi anulado";
    await concluirCaso(casoId, por, "anular-cobranca", alvo, detalhe);
    return { resultado: "ok", feito: { detalhe } };
  }

  if (acao === "soltar-agendamento") {
    const agendamento = caso.key.slice("agendamento:".length);
    const operacao = await operarNaAssinatura(id, () => soltarAgendamento(agendamento));
    if (!operacao) return { resultado: "ocupada" };
    const detalhe = "o agendamento da troca foi solto";
    await concluirCaso(casoId, por, "soltar-agendamento", alvo, detalhe);
    return { resultado: "ok", feito: { detalhe } };
  }

  if (ENCERRADA.has(detalhes.status)) return { resultado: "nada-a-fazer" };
  const operacao = await operarNaAssinatura(id, async (): Promise<"encerrada" | "nada"> => {
    // COM A TRAVA, relida (revisão de segurança do bloco 3): quem pagou entre o caso e o clique (a renovação passou e o
    // aviso ainda não chegou) não é encerrado — a sincronia logo depois fecha o caso sozinha.
    const agora = await buscarDetalhes(id);
    if (ENCERRADA.has(agora.status) || (agora.pagoAte !== null && agora.pagoAte.getTime() > Date.now())) return "nada";
    await cancelarNaHora(id, {});
    return "encerrada";
  });
  if (!operacao) return { resultado: "ocupada" };
  if (operacao.feito === "nada") return { resultado: "nada-a-fazer" };
  const detalhe = "encerrada agora, sem devolver";
  await concluirCaso(casoId, por, "encerrar-na-hora", alvo, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}

/**
 * ACEITAR ESTE PIX (o conserto do caso "Pix em conferência", passo 4c — P117): o Pix pago vira a assinatura pré-paga no preço
 * de agora (`aceitarPixEmConferencia`, com a trava do Pix). Valeu: o caso fecha, e as boas-vindas saem se a conta nasceu
 * agora (a do visitante). O Pix que já voltou, ou que já virou assinatura: o caso fecha também — a situação acabou. O plano
 * fora de venda, ou a fatura que não se paga por fora: 409, e o caminho é devolver.
 */
export async function aceitarPixPeloOperador(casoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const caso = await prisma.billingCase.findUnique({ where: { id: casoId }, select: { kind: true, key: true, open: true, userId: true, stripeCustomerId: true } });
  if (!caso || !caso.open || !consertosDoCaso(caso.kind, caso.key).includes("aceitar-pix")) return { resultado: "nao-encontrada" };
  const feito = await aceitarPixEmConferencia(caso.key.slice("pix:".length));
  if (feito.resultado !== "aceito") {
    if (feito.resultado === "ocupada") return { resultado: "ocupada" };
    if (feito.resultado === "ja-tem-outra-assinatura") return { resultado: "ja-tem-outra-assinatura" };
    if (feito.resultado === "devolvido" || feito.resultado === "ja-virou-assinatura") {
      const detalhe = feito.resultado === "devolvido" ? "o Pix já tinha voltado para a pessoa" : "o Pix já tinha virado assinatura";
      await concluirCaso(casoId, por, "aceitar-pix", { userId: caso.userId, assinatura: null }, detalhe);
      return { resultado: "ok", feito: { detalhe } };
    }
    return { resultado: "pix-nao-aceito" };
  }
  const assinatura = "assinatura" in feito.sincronia ? feito.sincronia.assinatura : null;
  if (assinatura) await mandarBoasVindasDaAssinatura(assinatura.id);
  const dono = assinatura?.userId ?? caso.userId;
  const comAcesso = dono ? await temAcessoAtivo(dono) : false;
  const detalhe = `o Pix virou a assinatura pré-paga; ${comAcesso ? "com acesso" : "sem acesso"} às aulas`;
  await concluirCaso(casoId, por, "aceitar-pix", { userId: dono, assinatura: assinatura?.id ?? null }, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}

/**
 * LIBERAR ACESSO PAGO POR FORA (bloco 4, passo 4d — decisão do operador, 29/10/2026, P120): o operador recebeu fora da
 * Stripe (um Pix direto, uma transferência). O acesso sai de uma assinatura PRÉ-PAGA de verdade, paga por fora
 * (`criarAssinaturaPagaPorFora`) e gravada pela sincronia — nunca de um desvio no gate. Não é cortesia (a decisão de 10/10
 * continua): fica no registro quem liberou, o plano e até quando. Com a trava da conta (a do checkout), e só para a conta
 * SEM acesso agora — a que tem não ganha uma segunda assinatura.
 */
export async function liberarPagoPorForaPeloOperador(contaId: string, plano: Plano, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const conta = await prisma.user.findUnique({ where: { id: contaId }, select: { id: true, email: true, name: true, deletedAt: true } });
  if (!conta || conta.deletedAt) return { resultado: "nao-encontrada" };
  const preco = (await buscarPrecos()).find((p) => p.plano === plano);
  if (!preco) return { resultado: "nada-a-fazer" };
  const jaLiberada = async (): Promise<Resultado<AcaoFeita>> => (await liberadaAgoraHaPouco(conta.id, plano, preco.centavos, por)) ?? { resultado: "ja-tem-acesso" };
  if (await temAcessoAtivo(conta.id)) return jaLiberada();
  const clienteId = await clienteDaConta({ id: conta.id, email: conta.email, nome: conta.name });
  if (!clienteId) return { resultado: "ocupada" };
  const clientes = [...new Set([clienteId, ...((await clientesDe({ conta: conta.id }))?.clientes ?? [])])];
  const criada = await transacaoDaCobranca(async (tx) => {
    if (!(await travarSeLivre(tx, conta.id))) return "ocupada" as const;
    // De novo, com a trava e pela mesma ligação: outro pedido pode ter liberado (ou o aluno pagado) no meio.
    if (await temAcessoAtivo(conta.id, tx)) return "ja-tem-acesso" as const;
    const aberto = await outroPagamentoAberto(tx, conta.id, clientes);
    if (aberto) return aberto;
    return criarAssinaturaPagaPorFora({ clienteId, precoId: preco.precoId, plano, userId: conta.id, operador: por.conta });
    // As idas à Stripe com a trava (as listas de cada cliente, os cancelamentos, a criação, a fatura): o tempo do Pix.
  }, TEMPO_DO_PIX);
  if (criada === "ja-tem-acesso") return jaLiberada();
  if (typeof criada === "string") return { resultado: criada };
  if (!criada.faturaPaga) {
    console.warn(`[stripe] painel: a fatura da assinatura paga por fora ${criada.id} (conta ${conta.id}) não se pagou por fora`);
    return { resultado: "nada-a-fazer" };
  }
  const sincronia = await sincronizarSeLivre(criada.id);
  const ate = sincronia && "assinatura" in sincronia ? sincronia.assinatura.pagoAte : null;
  const detalhe = `${plano} pago por fora; ${await temAcessoAtivo(conta.id) ? "com acesso" : "sem acesso"} às aulas${ate ? ` até ${ate.toISOString().slice(0, 10)}` : ""}`;
  // A nova tentativa de um pedido lento pode ter registrado no meio (`liberadaAgoraHaPouco`): uma linha só.
  if (!(await prisma.billingLog.findFirst({ where: { action: "liberar-pago-por-fora", stripeSubscriptionId: criada.id }, select: { id: true } }))) {
    await registrar(por, "liberar-pago-por-fora", { userId: conta.id, assinatura: criada.id, cliente: clienteId }, detalhe, preco.centavos);
  }
  return { resultado: "ok", feito: { detalhe } };
}

/**
 * NENHUM OUTRO PAGAMENTO ABERTO antes de liberar o pago por fora (achado P1 da revisão do bloco 4, 31/10/2026 — a regra do
 * checkout e do Pix: um pagamento aberto por vez). Em TODOS os clientes da conta: o Pix PAGO que ainda não virou assinatura
 * e a assinatura VIVA (a atrasada sem aulas, a pausada) recusam — liberar por cima cobraria o mesmo período duas vezes, e a
 * Stripe seguiria tentando o cartão da atrasada —; o cartão começado e não pago e o QR à espera morrem antes. Com a trava da
 * conta; a mesma ordem do Pix (`pagarComPix`): o Pix pago antes de qualquer cancelamento.
 */
async function outroPagamentoAberto(tx: Prisma.TransactionClient, contaId: string, clientes: string[]): Promise<"outra-assinatura-viva" | "pix-pago-esperando" | null> {
  // Primeiro CONFERE todos os clientes, sem cancelar nada — o que recusa em um não deixa cancelados os pagamentos do outro
  // (a conferência do revisor do bloco 4) —; só então os abertos morrem.
  const pendentes = new Map<string, PixPendente[]>();
  for (const cliente of clientes) {
    const pix = await listarPixDoCliente(cliente);
    pendentes.set(cliente, pix.pendentes);
    if (await pixPagoSemEspelho(tx, pix.pagos)) return "pix-pago-esperando";
    const vivas = (await assinaturasDoCliente(cliente)).filter((a) => a.status !== "canceled" && a.status !== "incomplete_expired");
    if (vivas.some((a) => a.status !== "incomplete")) return "outra-assinatura-viva";
    if (vivas.some((a) => a.pixPaymentIntentId)) return "pix-pago-esperando";
  }
  for (const cliente of clientes) {
    const aberta = await assinaturasAbertas(cliente, `conta ${contaId}, liberar pago por fora`);
    if (aberta) return "prePaga" in aberta ? "pix-pago-esperando" : "outra-assinatura-viva";
    if ("pago" in (await cancelarOutrosPix(cliente, pendentes.get(cliente) ?? []))) return "pix-pago-esperando";
  }
  return null;
}

/**
 * A LIBERAÇÃO QUE JÁ VALEU e ficou sem o registro (achado P2 da revisão do bloco 4): o pedido anterior criou a assinatura paga
 * por fora e caiu antes de responder; a nova tentativa acha a conta com acesso. Se o acesso é de uma paga por fora desta conta
 * nascida nos últimos 15 minutos, e o registro não a tem, ela é registrada agora e a resposta é "liberado". Nada: o 409 de
 * sempre. Em nome de QUEM LIBEROU (a marca da Stripe), e com a trava da conta — a da liberação: o pedido que ainda está
 * criando termina antes, e o registro não sai em dobro (a conferência do revisor do bloco 4).
 */
async function liberadaAgoraHaPouco(contaId: string, plano: Plano, centavos: number, por: PorQuem): Promise<Resultado<AcaoFeita> | null> {
  const recente = await prisma.subscription.findFirst({ where: { ownerUserId: contaId, paidOutOfBand: true, plan: plano, createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } }, orderBy: { createdAt: "desc" }, select: { stripeSubscriptionId: true, stripeCustomerId: true, currentPeriodEnd: true } });
  if (!recente) return null;
  const quemLiberou = (await operadorDaPagaPorFora(recente.stripeSubscriptionId)) ?? por.conta;
  const ate = recente.currentPeriodEnd;
  const detalhe = `${plano} pago por fora; com acesso às aulas${ate ? ` até ${ate.toISOString().slice(0, 10)}` : ""}`;
  return transacaoDaCobranca(async (tx): Promise<Resultado<AcaoFeita> | null> => {
    if (!(await travarSeLivre(tx, contaId))) return { resultado: "ocupada" };
    if (await tx.billingLog.findFirst({ where: { action: "liberar-pago-por-fora", stripeSubscriptionId: recente.stripeSubscriptionId }, select: { id: true } })) return null;
    await tx.billingLog.create({ data: { who: por.quem, actorUserId: quemLiberou, action: "liberar-pago-por-fora", userId: contaId, stripeSubscriptionId: recente.stripeSubscriptionId, stripeCustomerId: recente.stripeCustomerId, amount: centavos, detail: detalhe } });
    return { resultado: "ok", feito: { detalhe } };
  });
}

/**
 * LIBERAR DE NOVO (o conserto do caso "contestação", passo 4d — E7): só com a contestação GANHA pela escola, lida na Stripe
 * agora. A marca sai da assinatura (`tirarMarcaDeContestacao`), pela operação na assinatura, com a trava e a sincronia: o
 * período que a pessoa pagou volta a valer até o fim, e a assinatura continua cancelada. O caso fecha.
 */
export async function liberarDeNovoPeloOperador(casoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const caso = await prisma.billingCase.findUnique({ where: { id: casoId }, select: { kind: true, key: true, open: true, userId: true, stripeSubscriptionId: true } });
  if (!caso || !caso.open || !consertosDoCaso(caso.kind, caso.key).includes("liberar-de-novo") || !caso.stripeSubscriptionId) return { resultado: "nao-encontrada" };
  if ((await statusDaContestacao(caso.key.slice("du:".length))) !== "won") return { resultado: "contestacao-nao-ganha" };
  const assinatura = caso.stripeSubscriptionId;
  const operacao = await operarNaAssinatura(assinatura, () => tirarMarcaDeContestacao(assinatura));
  if (!operacao) return { resultado: "ocupada" };
  // Outra contestação desta assinatura não foi ganha (achado P1 da revisão do bloco 4): nada foi liberado, e o caso fica.
  if (operacao.feito === "outra-nao-ganha") return { resultado: "outra-contestacao-nao-ganha" };
  const dono = (await prisma.subscription.findUnique({ where: { stripeSubscriptionId: assinatura }, select: { ownerUserId: true } }))?.ownerUserId ?? caso.userId;
  const detalhe = `a escola ganhou a contestação: o período pago voltou a valer; ${dono && (await temAcessoAtivo(dono)) ? "com acesso" : "sem acesso"} às aulas`;
  await concluirCaso(casoId, por, "liberar-de-novo", { userId: dono, assinatura }, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}

/**
 * ACEITAR A PERDA (o conserto do caso "contestação", bloco 5, passo 5a): a escola não manda provas, e o banco encerra a
 * contestação como perdida — o dinheiro fica com a pessoa. Só a contestação ABERTA (`needs_response`), lida na Stripe agora:
 * o inquérito se resolve devolvendo o dinheiro (sem taxa), e a já decidida não muda. O acesso não muda aqui (o que o banco
 * tirou, a assinatura cancelada no "dinheiro saiu", fica como está). O caso fecha.
 */
export async function aceitarContestacaoPeloOperador(casoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const caso = await prisma.billingCase.findUnique({ where: { id: casoId }, select: { kind: true, key: true, open: true, userId: true, stripeSubscriptionId: true, amount: true } });
  if (!caso || !caso.open || !consertosDoCaso(caso.kind, caso.key).includes("aceitar-contestacao")) return { resultado: "nao-encontrada" };
  const contestacao = caso.key.slice("du:".length);
  if ((await statusDaContestacao(contestacao)) !== "needs_response") return { resultado: "contestacao-nao-aberta" };
  let depois: string;
  try {
    depois = await aceitarContestacao(contestacao);
  } catch (erro) {
    // O outro clique (outra aba) a fechou no meio: já está decidida (a conferência do revisor do bloco 4).
    if ((await statusDaContestacao(contestacao)) !== "needs_response") return { resultado: "contestacao-nao-aberta" };
    throw erro;
  }
  // Fechar é perder (`aceitarContestacao`): outra coisa é a Stripe fora do esperado — o caso fica aberto, e o erro avisa.
  if (depois !== "lost") throw new Error(`[stripe] a contestação ${contestacao} ficou ${depois} depois de aceita — conferir no painel da Stripe`);
  const detalhe = "a escola aceitou a perda: o dinheiro fica com a pessoa";
  await concluirCaso(casoId, por, "aceitar-contestacao", { userId: caso.userId, assinatura: caso.stripeSubscriptionId }, detalhe, caso.amount);
  return { resultado: "ok", feito: { detalhe } };
}

/** Os clientes da Stripe de uma conta, ou da ficha de um visitante. */
export async function clientesDe(quem: { conta: string } | { visitante: string }): Promise<{ clientes: string[]; conta: string | null } | null> {
  if ("visitante" in quem) {
    const ficha = await prisma.guestCheckout.findUnique({ where: { id: quem.visitante }, select: { stripeCustomerId: true, userId: true } });
    return ficha ? { clientes: [ficha.stripeCustomerId], conta: ficha.userId } : null;
  }
  const conta = await prisma.user.findUnique({ where: { id: quem.conta }, select: { id: true } });
  if (!conta) return null;
  const ids = new Set<string>();
  const logado = await prisma.stripeCustomer.findUnique({ where: { userId: conta.id }, select: { stripeCustomerId: true } });
  if (logado) ids.add(logado.stripeCustomerId);
  const visitante = await prisma.guestCheckout.findUnique({ where: { userId: conta.id }, select: { stripeCustomerId: true } });
  if (visitante) ids.add(visitante.stripeCustomerId);
  return { clientes: [...ids], conta: conta.id };
}

/**
 * CORRIGIR O CPF OU CNPJ (passo 3b): em cada cliente da Stripe da pessoa (vale para as próximas faturas). O número é
 * conferido no `core` (o dígito) e na Stripe; NUNCA vai para o registro.
 */
export async function corrigirDocumentoPeloOperador(quem: { conta: string } | { visitante: string }, texto: string, por: PorQuem): Promise<Resultado<AcaoFeita> | { resultado: "documento-invalido" }> {
  const documento = lerDocumentoFiscal(texto);
  if (!documento) return { resultado: "documento-invalido" };
  const de = await clientesDe(quem);
  if (!de || de.clientes.length === 0) return { resultado: "nao-encontrada" };
  try {
    for (const cliente of de.clientes) await trocarNumeroFiscal(cliente, documento);
  } catch (erro) {
    if (erro instanceof DocumentoRecusado) return { resultado: "documento-invalido" };
    throw erro;
  }
  const detalhe = `${documento.tipo === "cpf" ? "CPF" : "CNPJ"} corrigido`;
  await registrar(por, "corrigir-documento", { userId: de.conta, cliente: de.clientes[0] ?? null }, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}

/**
 * ENVIAR O LINK ao aluno por e-mail (passo 3b): o e-mail da conta (do nosso banco), com o botão para entrar e seguir à
 * tela certa — os mesmos links da ficha. A chave (por conta, link e minuto) segura o clique duplo.
 */
export async function enviarLinkPeloOperador(contaId: string, link: LinkParaOAluno, por: PorQuem, agora: Date = new Date()): Promise<Resultado<AcaoFeita>> {
  const conta = await prisma.user.findUnique({ where: { id: contaId }, select: { id: true, email: true, deletedAt: true } });
  if (!conta || conta.deletedAt) return { resultado: "nao-encontrada" };
  const endereco = link === "trocarCartao" ? enderecoDoSite(entrarPara("cartao")) : link === "reativar" ? enderecoDoSite(entrarPara("assinar")) : pixConfigurado() ? enderecoDoSite(TELA_DE_PAGAR_COM_PIX) : null;
  if (!endereco) return { resultado: "nada-a-fazer" };
  const t = (await getDict()).app.email.linkDoPainel[link];
  const envio = await enviarEmail({ para: conta.email, tipo: "link-do-painel", referencia: `conta:${conta.id} link:${link}`, chave: `link-do-painel/${conta.id}/${link}/${agora.toISOString().slice(0, 16)}`, mensagem: { assunto: t.assunto, titulo: t.titulo, paragrafos: [t.texto], botao: { texto: t.botao, endereco } } });
  const detalhe = envio.enviado || envio.motivo === "duplicado" ? `o link (${link}) foi enviado` : `o link (${link}) não saiu`;
  await registrar(por, "enviar-link", { userId: conta.id }, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}
