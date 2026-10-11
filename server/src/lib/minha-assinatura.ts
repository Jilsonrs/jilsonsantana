import { SituacaoDoFaturamento, type CartaoTrocado, type MinhaAssinatura } from "@jilson/core";
import { prisma } from "./prisma.js";
import { assinaturaDaAcesso, passouDoPrimeiroPagamento } from "./acesso.js";
import { sincronizarSeLivre } from "./assinaturas.js";
import { AssinaturaNaoEncontrada } from "./stripe.js";
import {
  buscarCartaoConfirmado,
  buscarDetalhes,
  buscarProximaCobranca,
  criarPedidoDeCartao,
  definirCartao,
  pagarFatura,
  soltarCartao,
  type DetalhesDaAssinatura,
  type PedidoDeCartao,
} from "./stripe-assinatura.js";

// MINHA ASSINATURA (Fase 4, etapa 4.6 — billing.md; CLAUDE.md → Membership Gating). O que a tela
// de Faturamento e Assinatura lê e — a partir do passo 4 — as OPERAÇÕES sobre a assinatura
// (trocar o cartão, parar a renovação, devolver o dinheiro, mudar de plano). Moram aqui, e não
// na rota, porque o painel do admin (etapa 4.7b) e o JilsonAI vão chamar as mesmas.
//
// TRÊS REGRAS, e cada uma é uma fronteira:
//   1. O SITE NUNCA DIZ QUAL ASSINATURA. A conta é a da sessão; a assinatura é a que dá acesso a
//      ESSA conta, achada aqui, no espelho. Nenhum código da Stripe vem do navegador nem vai a ele.
//   2. A TELA LÊ A STRIPE NA HORA (o plano, a próxima cobrança, o cartão): o espelho guarda só o
//      que o gate lê, e continua com um escritor só (`assinaturas.ts`). Ler não grava nada — a
//      não ser quando descobre que o espelho dá um acesso que a Stripe diz que acabou: aí chama
//      a rotina de sincronia, como todo mundo ("em qualquer dúvida, recomputa").
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
 * Esta assinatura ACEITA cartão novo? Só a que ainda pode ser cobrada: a encerrada de vez
 * (`canceled`), ainda que com dias pagos, não cobra mais nada — não há onde pôr um cartão. Uma
 * regra só, para a tela (que mostra o botão) e para a operação (que recusa) nunca discordarem.
 */
export function aceitaCartaoNovo(detalhes: DetalhesDaAssinatura): boolean {
  return detalhes.status !== "canceled" && detalhes.clienteId !== null;
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
  const comum = { plano: detalhes.plano, preco: detalhes.preco, cartao: detalhes.cartao, aceitaCartao: aceitaCartaoNovo(detalhes) };
  if (detalhes.status === "past_due") return { situacao: SituacaoDoFaturamento.ATRASADA, ...comum, proximaCobranca: null, acessoAte: null };
  if (renova(detalhes)) {
    const em = iso(detalhes.fimDoPeriodo);
    return { situacao: SituacaoDoFaturamento.ATIVA, ...comum, proximaCobranca: proxima && em ? { ...proxima, em } : null, acessoAte: null };
  }
  return { situacao: SituacaoDoFaturamento.VAI_CANCELAR, ...comum, proximaCobranca: null, acessoAte: iso(detalhes.acabaEm ?? detalhes.pagoAte) };
}

type LinhaDoEspelho = { stripeSubscriptionId: string; status: string; currentPeriodEnd: Date | null };

/**
 * A assinatura que dá acesso a ESTA conta, como a Stripe diz agora. É por aqui que a leitura e
 * toda operação acham "a assinatura da conta": o espelho diz QUAIS são dela e quais dão acesso
 * (a regra do gate); a Stripe diz como está a mais recente que ela conhece.
 *   - `nenhuma`: nada no espelho dá acesso (vão as linhas, para a tela dizer "nunca" ou "terminou");
 *   - `desconhecida`: dá acesso, e a Stripe não a conhece (a de mentira do seed, ou uma do modo
 *     de teste pedida com a chave de verdade).
 * A Stripe fora do ar SOBE: ninguém decide nada com dado velho.
 */
async function assinaturaDaConta(userId: string): Promise<{ resultado: "ok"; detalhes: DetalhesDaAssinatura } | { resultado: "nenhuma"; linhas: LinhaDoEspelho[] } | { resultado: "desconhecida" }> {
  // FECHA na dúvida, como o gate: no Prisma, um filtro vazio traria as assinaturas de todo mundo.
  if (typeof userId !== "string" || userId.length === 0) throw new Error("[stripe] minha assinatura sem a conta");
  const linhas = await prisma.subscription.findMany({
    where: { ownerUserId: userId },
    select: { stripeSubscriptionId: true, status: true, currentPeriodEnd: true },
    orderBy: { id: "desc" },
  });
  const comAcesso = linhas.filter((linha) => assinaturaDaAcesso(linha));
  if (comAcesso.length === 0) return { resultado: "nenhuma", linhas };
  for (const linha of comAcesso) {
    let detalhes: DetalhesDaAssinatura;
    try {
      detalhes = await buscarDetalhes(linha.stripeSubscriptionId);
    } catch (erro) {
      if (erro instanceof AssinaturaNaoEncontrada) continue;
      throw erro;
    }
    // O dono é o do espelho — mas se a STRIPE diz que esta assinatura é de OUTRA conta, a linha
    // do espelho está errada, e ninguém lê nem troca o cartão de outra pessoa por ela (achado da
    // revisão de segurança, 11/10/2026). Precisa de gente: é erro, com etiqueta.
    if (detalhes.userId !== null && detalhes.userId !== userId) {
      console.error(`[stripe] minha assinatura: o espelho diz que a assinatura ${detalhes.id} é da conta ${userId}, e a Stripe diz que é da conta ${detalhes.userId}`);
      continue;
    }
    return { resultado: "ok", detalhes };
  }
  return { resultado: "desconhecida" };
}

/**
 * A conta tem acesso por uma assinatura que a Stripe NÃO CONHECE. Em produção isso é sempre
 * alguém com acesso sem assinatura na fonte canônica (a produção nunca teve chave de teste):
 * precisa de gente, é ERRO. Fora dela é a assinatura de mentira do seed: conhecido, é aviso.
 */
export function registrarAssinaturaDesconhecida(userId: string, onde: string, emProducao: boolean = process.env.NODE_ENV === "production"): void {
  const linha = `[stripe] ${onde}: a conta ${userId} tem acesso por uma assinatura que a Stripe não conhece`;
  if (emProducao) console.error(linha);
  else console.warn(linha);
}

/** `desconhecida`: a conta tem acesso por uma assinatura que a Stripe não conhece. */
export type Leitura = { resultado: "ok"; assinatura: MinhaAssinatura } | { resultado: "desconhecida" };

/**
 * A assinatura DESTA conta, para a tela. Sem nenhuma que dê acesso, a resposta sai do espelho e a
 * Stripe nem é consultada. A Stripe fora do ar SOBE: a tela mostra a falha, nunca um dado velho.
 */
export async function lerMinhaAssinatura(userId: string): Promise<Leitura> {
  const achada = await assinaturaDaConta(userId);
  if (achada.resultado === "desconhecida") return achada;
  if (achada.resultado === "nenhuma") {
    const pagas = achada.linhas.filter(passouDoPrimeiroPagamento);
    if (pagas.length === 0) return { resultado: "ok", assinatura: { situacao: SituacaoDoFaturamento.NENHUMA } };
    const fins = pagas.flatMap((linha) => (linha.currentPeriodEnd ? [linha.currentPeriodEnd.getTime()] : []));
    return { resultado: "ok", assinatura: { situacao: SituacaoDoFaturamento.TERMINADA, terminouEm: fins.length > 0 ? new Date(Math.max(...fins)).toISOString() : null } };
  }
  const { detalhes } = achada;
  const proxima = renova(detalhes) ? await buscarProximaCobranca(detalhes.id) : null;
  const assinatura = paraMinhaAssinatura(detalhes, proxima);
  // O ESPELHO dá acesso (foi por isso que chegamos aqui) e a STRIPE diz que acabou: o aviso do
  // fim se perdeu. Sem acertar agora, as aulas seguiriam abertas e "Reativar assinatura"
  // responderia "já é assinante" (achado da revisão de segurança, 11/10/2026). Pela rotina de
  // sempre, sem esperar a trava. Se não der, alguém segue com acesso sem pagar: é ERRO.
  if (assinatura.situacao === SituacaoDoFaturamento.TERMINADA) {
    try {
      await sincronizarSeLivre(detalhes.id);
      console.info(`[stripe] minha assinatura: o espelho da assinatura ${detalhes.id} (conta ${userId}) dava acesso e a Stripe diz que acabou; sincronizada`);
    } catch (erro) {
      console.error(`[stripe] minha assinatura: a conta ${userId} segue com acesso pelo espelho da assinatura ${detalhes.id}, que a Stripe diz que acabou, e a sincronia falhou: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }
  return { resultado: "ok", assinatura };
}

// ── TROCAR O CARTÃO (passo 4) ────────────────────────────────────────────────────────────────
// Em dois tempos, com o campo da Stripe no meio (o dado do cartão nunca passa pelo servidor):
//   1. PREPARAR: o servidor abre na Stripe um pedido de guardar cartão para o cliente da
//      assinatura desta conta, e entrega ao site só o segredo com que o campo o confirma;
//   2. APLICAR: o servidor lê NA STRIPE o cartão que esse pedido confirmou e o põe na
//      assinatura. O site não manda código de cartão nenhum — só "apliquei".
// Com a cobrança atrasada, o cartão novo já paga a fatura em aberto, e o espelho é acertado pela
// rotina de sempre — a que NÃO ESPERA a trava (`sincronizarSeLivre`): este pedido pode ser
// repetido à vontade, e esperar seguraria conexão do banco. Aqui NADA grava o espelho à mão: a
// troca do cartão não decide nada pelo espelho.
// Repetir não faz mal: aplicar duas vezes põe o mesmo cartão, e a fatura já paga não é cobrada.

/** `sem-assinatura`: a conta não tem assinatura que ainda possa ser cobrada. */
type SemOndePor = { resultado: "sem-assinatura" } | { resultado: "desconhecida" };

/** A assinatura desta conta que ACEITA cartão novo (`aceitaCartaoNovo`), e de quem é o pedido. */
async function ondePorOCartao(userId: string): Promise<{ resultado: "ok"; detalhes: DetalhesDaAssinatura; pedido: PedidoDeCartao } | SemOndePor> {
  const achada = await assinaturaDaConta(userId);
  if (achada.resultado === "desconhecida") return achada;
  if (achada.resultado === "nenhuma") return { resultado: "sem-assinatura" };
  const { detalhes } = achada;
  if (!aceitaCartaoNovo(detalhes) || !detalhes.clienteId) return { resultado: "sem-assinatura" };
  return { resultado: "ok", detalhes, pedido: { clienteId: detalhes.clienteId, userId, assinaturaId: detalhes.id } };
}

export type Preparo = { resultado: "ok"; segredo: string } | SemOndePor;

/** Abre o pedido de guardar cartão para a assinatura desta conta. O segredo vai SÓ na resposta. */
export async function prepararTrocaDeCartao(userId: string): Promise<Preparo> {
  const onde = await ondePorOCartao(userId);
  if (onde.resultado !== "ok") return onde;
  return { resultado: "ok", segredo: await criarPedidoDeCartao(onde.pedido) };
}

/** `sem-cartao-novo`: a Stripe não tem cartão confirmado para um pedido desta conta e desta assinatura. */
export type Troca = ({ resultado: "ok" } & CartaoTrocado) | SemOndePor | { resultado: "sem-cartao-novo" };

/** Põe na assinatura desta conta o cartão que o site acabou de confirmar — lido na Stripe, nunca do pedido. */
export async function aplicarCartaoNovo(userId: string): Promise<Troca> {
  const onde = await ondePorOCartao(userId);
  if (onde.resultado !== "ok") return onde;
  const { detalhes, pedido } = onde;
  const novo = await buscarCartaoConfirmado(pedido);
  if (!novo) return { resultado: "sem-cartao-novo" };
  const cartao = await definirCartao(detalhes.id, novo);

  // O cartão que foi trocado sai da Stripe. Se não sair, a troca valeu do mesmo jeito: é aviso.
  if (detalhes.cartaoId && detalhes.cartaoId !== novo) {
    try {
      await soltarCartao(detalhes.cartaoId);
    } catch (erro) {
      console.warn(`[stripe] trocar cartão: o cartão antigo da assinatura ${detalhes.id} continuou guardado: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }

  // A cobrança estava atrasada: o cartão novo paga a fatura em aberto agora, sem esperar a
  // próxima tentativa da Stripe (decisão do operador, 11/10/2026).
  let pagou = false;
  if (detalhes.status === "past_due" && detalhes.faturaEmAbertoId) {
    const cobranca = await pagarFatura(detalhes.faturaEmAbertoId);
    pagou = cobranca === "paga";
    // O banco pede uma confirmação que só a pessoa dá, e a tela ainda não a completa: a
    // assinatura tende ao cancelamento mesmo com o cartão trocado. Fica registrado, com quem.
    if (cobranca === "pede-confirmacao") console.warn(`[stripe] trocar cartão: a fatura em aberto da assinatura ${detalhes.id} (conta ${userId}) pede confirmação do banco, e a tela não a completa`);
    try {
      await sincronizarSeLivre(detalhes.id);
    } catch (erro) {
      // O cartão está trocado e a cobrança foi tentada: quem acerta o espelho, então, é o aviso
      // da Stripe, que chega de qualquer jeito. Aviso, e não uma falha da troca.
      console.warn(`[stripe] trocar cartão: a sincronia da assinatura ${detalhes.id} ficou para o aviso: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }
  console.info(`[stripe] trocar cartão: conta ${userId}, assinatura ${detalhes.id}${detalhes.faturaEmAbertoId && detalhes.status === "past_due" ? (pagou ? ", a fatura em aberto foi paga" : ", a fatura em aberto continua em aberto") : ""}`);
  return { resultado: "ok", cartao, pagou };
}
