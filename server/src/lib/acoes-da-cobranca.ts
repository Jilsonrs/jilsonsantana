import type { AcaoFeita, ConferenciaPelaFicha, FichaQuery } from "@jilson/core";
import { prisma, QuemFez, TipoDeCaso } from "./prisma.js";
import { AssinaturaNaoEncontrada, buscarAssinatura } from "./stripe.js";
import { buscarDetalhes } from "./stripe-assinatura.js";
import { manterAssinaturaDe, pararRenovacaoDe } from "./minha-assinatura.js";
import { sincronizarAssinatura, sincronizarConta, sincronizarPedido, type Conferida } from "./assinaturas.js";
import { temAcessoAtivo } from "./acesso.js";
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
export type NaoFeita = "nao-encontrada" | "ocupada" | "pre-paga" | "nada-a-fazer" | "stripe-nao-conhece";
export type Resultado<T> = { resultado: "ok"; feito: T } | { resultado: NaoFeita };

/** Grava a ação no registro: quem fez, em quem e o que a Stripe respondeu (sem dado pessoal). */
async function registrar(por: PorQuem, acao: string, alvo: { userId?: string | null; assinatura?: string | null; cliente?: string | null }, detalhe: string): Promise<void> {
  const conta = alvo.userId ? await prisma.user.findUnique({ where: { id: alvo.userId }, select: { id: true } }) : null;
  await prisma.billingLog.create({ data: { who: por.quem, actorUserId: por.conta, action: acao, userId: conta?.id ?? null, stripeSubscriptionId: alvo.assinatura ?? null, stripeCustomerId: alvo.cliente ?? null, detail: detalhe } });
}

/** A linha do espelho e os detalhes da assinatura na Stripe, agora. */
async function naStripe(espelhoId: number) {
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
  const feita = await pararRenovacaoDe(detalhes, linha.ownerUserId ?? "sem-conta", {});
  if (feita.resultado === "ocupada" || feita.resultado === "pre-paga") return { resultado: feita.resultado };
  if (feita.resultado !== "ok") return { resultado: "nada-a-fazer" };
  const detalhe = feita.terminou ? "terminou agora (a cobrança estava atrasada)" : `não renova; acesso até ${feita.acessoAte?.slice(0, 10) ?? "o fim do período"}`;
  await registrar(por, "cancelar", { userId: linha.ownerUserId, assinatura: linha.stripeSubscriptionId, cliente: linha.stripeCustomerId }, detalhe);
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
