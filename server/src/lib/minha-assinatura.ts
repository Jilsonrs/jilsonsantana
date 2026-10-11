import { SituacaoDoFaturamento, type MinhaAssinatura } from "@jilson/core";
import { prisma } from "./prisma.js";
import { assinaturaDaAcesso, passouDoPrimeiroPagamento } from "./acesso.js";
import { AssinaturaNaoEncontrada } from "./stripe.js";
import { buscarDetalhes, buscarProximaCobranca, type DetalhesDaAssinatura } from "./stripe-assinatura.js";

// MINHA ASSINATURA (Fase 4, etapa 4.6 — billing.md; CLAUDE.md → Membership Gating). O que a tela
// de Faturamento e Assinatura lê e — a partir do passo 4 — as OPERAÇÕES sobre a assinatura
// (trocar o cartão, parar a renovação, devolver o dinheiro, mudar de plano). Moram aqui, e não
// na rota, porque o painel do admin (etapa 4.7b) e o JilsonAI vão chamar as mesmas.
//
// TRÊS REGRAS, e cada uma é uma fronteira:
//   1. O SITE NUNCA DIZ QUAL ASSINATURA. A conta é a da sessão; a assinatura é a que dá acesso a
//      ESSA conta, achada aqui, no espelho. Nenhum código da Stripe vem do navegador nem vai a ele.
//   2. A TELA LÊ A STRIPE NA HORA (o plano, a próxima cobrança, o cartão): o espelho guarda só o
//      que o gate lê, e continua com um escritor só (`assinaturas.ts`). Ler não grava nada.
//   3. "TEM ACESSO?" é a regra do gate (`assinaturaDaAcesso`), a mesma que tranca a aula — a tela
//      nunca faz uma segunda conta de quem tem acesso.

/** Renovam sozinhas, se não estiverem marcadas para acabar. */
const RENOVAM: ReadonlySet<string> = new Set(["active", "trialing"]);

const iso = (data: Date | null): string | null => (data ? data.toISOString() : null);

/** Esta assinatura vai gerar uma próxima cobrança? Só para ela se pede a prévia à Stripe. */
export function renova(detalhes: DetalhesDaAssinatura): boolean {
  return RENOVAM.has(detalhes.status) && detalhes.acabaEm === null;
}

/**
 * O que a Stripe diz, no formato da tela. Função pura.
 *   - sem acesso pela regra do gate → terminada;
 *   - a última cobrança falhou (`past_due`) → atrasada: o acesso continua, e o que a tela oferece
 *     é trocar o cartão;
 *   - renova → ativa, com a próxima cobrança;
 *   - o resto tem acesso até uma data e não renova: a renovação parada (`active` com a marca de
 *     acabar) e a assinatura já encerrada, ou com a cobrança pausada, ainda com dias pagos.
 */
export function paraMinhaAssinatura(detalhes: DetalhesDaAssinatura, proxima: { centavos: number; moeda: string } | null, agora: Date = new Date()): MinhaAssinatura {
  if (!assinaturaDaAcesso({ status: detalhes.status, currentPeriodEnd: detalhes.pagoAte }, agora)) {
    return { situacao: SituacaoDoFaturamento.TERMINADA, terminouEm: iso(detalhes.pagoAte) };
  }
  const comum = { plano: detalhes.plano, preco: detalhes.preco, cartao: detalhes.cartao };
  if (detalhes.status === "past_due") return { situacao: SituacaoDoFaturamento.ATRASADA, ...comum, proximaCobranca: null, acessoAte: null };
  if (renova(detalhes)) {
    const em = iso(detalhes.fimDoPeriodo);
    return { situacao: SituacaoDoFaturamento.ATIVA, ...comum, proximaCobranca: proxima && em ? { ...proxima, em } : null, acessoAte: null };
  }
  return { situacao: SituacaoDoFaturamento.VAI_CANCELAR, ...comum, proximaCobranca: null, acessoAte: iso(detalhes.acabaEm ?? detalhes.pagoAte) };
}

/** `desconhecida`: a conta tem acesso por uma assinatura que a Stripe não conhece (a de mentira do seed, ou uma do modo de teste pedida com a chave de verdade). */
export type Leitura = { resultado: "ok"; assinatura: MinhaAssinatura } | { resultado: "desconhecida" };

/**
 * A assinatura DESTA conta, para a tela. Sem nenhuma que dê acesso, a resposta sai do espelho e a
 * Stripe nem é consultada. Com acesso, vale a mais recente que a Stripe conhece. A Stripe fora do
 * ar SOBE: a tela mostra a falha, nunca um dado velho.
 */
export async function lerMinhaAssinatura(userId: string): Promise<Leitura> {
  // FECHA na dúvida, como o gate: no Prisma, um filtro vazio traria as assinaturas de todo mundo.
  if (typeof userId !== "string" || userId.length === 0) throw new Error("[stripe] minha assinatura sem a conta");
  const linhas = await prisma.subscription.findMany({
    where: { ownerUserId: userId },
    select: { stripeSubscriptionId: true, status: true, currentPeriodEnd: true },
    orderBy: { id: "desc" },
  });
  const comAcesso = linhas.filter((linha) => assinaturaDaAcesso(linha));
  if (comAcesso.length === 0) {
    const pagas = linhas.filter(passouDoPrimeiroPagamento);
    if (pagas.length === 0) return { resultado: "ok", assinatura: { situacao: SituacaoDoFaturamento.NENHUMA } };
    const fins = pagas.flatMap((linha) => (linha.currentPeriodEnd ? [linha.currentPeriodEnd.getTime()] : []));
    return { resultado: "ok", assinatura: { situacao: SituacaoDoFaturamento.TERMINADA, terminouEm: fins.length > 0 ? new Date(Math.max(...fins)).toISOString() : null } };
  }
  for (const linha of comAcesso) {
    let detalhes: DetalhesDaAssinatura;
    try {
      detalhes = await buscarDetalhes(linha.stripeSubscriptionId);
    } catch (erro) {
      if (erro instanceof AssinaturaNaoEncontrada) continue;
      throw erro;
    }
    const proxima = renova(detalhes) ? await buscarProximaCobranca(detalhes.id) : null;
    return { resultado: "ok", assinatura: paraMinhaAssinatura(detalhes, proxima) };
  }
  return { resultado: "desconhecida" };
}
