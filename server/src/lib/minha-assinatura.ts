import { PRAZO_DO_REEMBOLSO_EM_DIAS, SituacaoDoFaturamento, type CartaoTrocado, type MinhaAssinatura, type ReembolsoFeito, type RenovacaoParada } from "@jilson/core";
import { prisma } from "./prisma.js";
import { assinaturaDaAcesso, passouDoPrimeiroPagamento } from "./acesso.js";
import { operarNaAssinatura, sincronizarSeLivre } from "./assinaturas.js";
import { AssinaturaNaoEncontrada } from "./stripe.js";
import {
  buscarCartaoConfirmado,
  buscarDetalhes,
  buscarProximaCobranca,
  criarPedidoDeCartao,
  definirCartao,
  pagarFatura,
  pararRenovacao,
  retomarRenovacao,
  soltarOutrosCartoes,
  type DetalhesDaAssinatura,
  type MotivoDado,
  type PedidoDeCartao,
} from "./stripe-assinatura.js";
import { aDevolver, buscarOQueFoiPago, cancelarNaHora, devolver } from "./stripe-reembolso.js";
import { anularFatura, segredoDaFatura, soltarAgendamento } from "./stripe-plano.js";

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
 * A renovação está PARADA e ainda dá para voltar atrás? Só a assinatura viva, marcada para acabar:
 * a encerrada de vez (`canceled`) é estado final na Stripe — quem volta assina de novo. Uma regra
 * só, para a tela (que mostra "Manter a assinatura") e para a operação (que recusa).
 */
export function podeManter(detalhes: DetalhesDaAssinatura): boolean {
  return RENOVAM.has(detalhes.status) && detalhes.acabaEm !== null;
}

/**
 * Para qual plano esta assinatura pode MUDAR agora — ou nenhum. Só a que renova (a parada e a
 * atrasada, não), de um dos dois planos da escola, e sem troca já marcada. Uma regra só, para a
 * tela (que mostra "Mudar de plano") e para a operação (que recusa).
 */
export function outroPlano(detalhes: DetalhesDaAssinatura): "mensal" | "anual" | null {
  if (!renova(detalhes) || !detalhes.plano || !detalhes.itemId || detalhes.agendamentoId) return null;
  return detalhes.plano === "mensal" ? "anual" : "mensal";
}

const DIA = 24 * 60 * 60 * 1000;

/** A saída do reembolso, como a tela a recebe: quanto volta e até quando dá para pedir. */
type SaidaDoReembolso = { centavos: number; moeda: string; ate: string } | null;

/**
 * Até quando dá para pedir o reembolso: o prazo conta do PRIMEIRO DIA da assinatura, e trocar de
 * plano não o recomeça (decisões do operador, 10/10/2026). Função pura.
 */
export function prazoDoReembolso(detalhes: Pick<DetalhesDaAssinatura, "comecouEm">): Date | null {
  return detalhes.comecouEm ? new Date(detalhes.comecouEm.getTime() + PRAZO_DO_REEMBOLSO_EM_DIAS * DIA) : null;
}

/** Ainda está no prazo? Sem a data de início, NÃO — fecha na dúvida: é dinheiro saindo. Função pura. */
export function noPrazoDoReembolso(detalhes: Pick<DetalhesDaAssinatura, "comecouEm">, agora: Date = new Date()): boolean {
  const ate = prazoDoReembolso(detalhes);
  return ate !== null && agora.getTime() <= ate.getTime();
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
export function paraMinhaAssinatura(detalhes: DetalhesDaAssinatura, proxima: { centavos: number; moeda: string } | null, agora: Date = new Date(), reembolso: SaidaDoReembolso = null): MinhaAssinatura {
  if (!assinaturaDaAcesso({ status: detalhes.status, currentPeriodEnd: detalhes.pagoAte }, agora)) {
    return { situacao: SituacaoDoFaturamento.TERMINADA, terminouEm: iso(detalhes.pagoAte) };
  }
  // `podeParar` e `podeManter`: as MESMAS regras das operações (`renova`, `podeManter`) — a tela
  // nunca mostra um botão que o servidor vai recusar.
  const comum = { plano: detalhes.plano, preco: detalhes.preco, cartao: detalhes.cartao, aceitaCartao: aceitaCartaoNovo(detalhes), podeParar: renova(detalhes), podeManter: podeManter(detalhes), reembolso, podeMudarDePlano: outroPlano(detalhes) !== null, trocaMarcada: detalhes.trocaMarcada ? { plano: detalhes.trocaMarcada.plano, em: detalhes.trocaMarcada.em.toISOString() } : null };
  if (detalhes.status === "past_due") return { situacao: SituacaoDoFaturamento.ATRASADA, ...comum, proximaCobranca: null, acessoAte: null };
  if (renova(detalhes)) {
    const em = iso(detalhes.fimDoPeriodo);
    return { situacao: SituacaoDoFaturamento.ATIVA, ...comum, proximaCobranca: proxima && em ? { ...proxima, em } : null, acessoAte: null };
  }
  return { situacao: SituacaoDoFaturamento.VAI_CANCELAR, ...comum, proximaCobranca: null, acessoAte: iso(ateQuandoHaAcesso(detalhes)) };
}

/** Até quando há acesso, para a assinatura que não renova: a data marcada para acabar, ou o fim do que está pago. */
function ateQuandoHaAcesso(detalhes: DetalhesDaAssinatura): Date | null {
  return detalhes.acabaEm ?? detalhes.pagoAte;
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
export async function assinaturaDaConta(userId: string): Promise<{ resultado: "ok"; detalhes: DetalhesDaAssinatura } | { resultado: "nenhuma"; linhas: LinhaDoEspelho[] } | { resultado: "desconhecida" }> {
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
  const assinatura = paraMinhaAssinatura(detalhes, proxima, new Date(), await reembolsoDisponivel(detalhes));
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

/**
 * A saída do reembolso que a tela de cancelar mostra — ou nenhuma. Fora do prazo, a Stripe nem é
 * consultada; dentro dele, o valor é o que FALTA voltar de tudo o que foi pago nesta assinatura
 * (o mostrado é o devolvido). A assinatura de cortesia não pagou nada: não tem a saída.
 */
async function reembolsoDisponivel(detalhes: DetalhesDaAssinatura): Promise<SaidaDoReembolso> {
  const ate = prazoDoReembolso(detalhes);
  if (!ate || !noPrazoDoReembolso(detalhes)) return null;
  const pago = await buscarOQueFoiPago(detalhes.id);
  const centavos = aDevolver(pago);
  if (centavos <= 0 || !pago.moeda) return null;
  return { centavos, moeda: pago.moeda, ate: ate.toISOString() };
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

  // TODOS os outros cartões do cliente saem da Stripe, depois de o novo estar no lugar (abertura
  // do passo 7): o que era da assinatura, o confirmado e nunca aplicado, o padrão do cliente.
  // Se algum não sair, a troca valeu do mesmo jeito: é aviso.
  try {
    await soltarOutrosCartoes(pedido.clienteId, novo);
  } catch (erro) {
    console.warn(`[stripe] trocar cartão: um cartão antigo do cliente da assinatura ${detalhes.id} continuou guardado: ${erro instanceof Error ? erro.message : String(erro)}`);
  }

  // A cobrança estava atrasada: o cartão novo paga a fatura em aberto agora, sem esperar a
  // próxima tentativa da Stripe (decisão do operador, 11/10/2026).
  let pagou = false;
  let confirmar: string | null = null;
  if (detalhes.status === "past_due" && detalhes.faturaEmAbertoId) {
    const cobranca = await pagarFatura(detalhes.faturaEmAbertoId);
    pagou = cobranca === "paga";
    // O banco pede uma confirmação que só a pessoa dá: o site a completa com o segredo da fatura
    // (sessão b). Sem o segredo, a cobrança fica para as tentativas da Stripe — e fica registrado.
    if (cobranca === "pede-confirmacao") {
      try {
        confirmar = await segredoDaFatura(detalhes.faturaEmAbertoId);
      } catch (erro) {
        console.warn(`[stripe] trocar cartão: a fatura em aberto da assinatura ${detalhes.id} (conta ${userId}) pede confirmação do banco, e o segredo não veio: ${erro instanceof Error ? erro.message : String(erro)}`);
      }
      if (!confirmar) console.warn(`[stripe] trocar cartão: a fatura em aberto da assinatura ${detalhes.id} (conta ${userId}) pede confirmação do banco, e a tela não tem como completá-la`);
    }
    try {
      await sincronizarSeLivre(detalhes.id);
    } catch (erro) {
      // O cartão está trocado e a cobrança foi tentada: quem acerta o espelho, então, é o aviso
      // da Stripe, que chega de qualquer jeito. Aviso, e não uma falha da troca.
      console.warn(`[stripe] trocar cartão: a sincronia da assinatura ${detalhes.id} ficou para o aviso: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }
  console.info(`[stripe] trocar cartão: conta ${userId}, assinatura ${detalhes.id}${detalhes.faturaEmAbertoId && detalhes.status === "past_due" ? (pagou ? ", a fatura em aberto foi paga" : ", a fatura em aberto continua em aberto") : ""}`);
  return { resultado: "ok", cartao, pagou, confirmar };
}

// ── PARAR A RENOVAÇÃO E VOLTAR ATRÁS (passo 7) ───────────────────────────────────────────────
// "Cancelar" é PARAR A RENOVAÇÃO: a assinatura segue viva até o fim do período pago, o gate não
// muda (ele lê status e data, nunca a marca de acabar — CLAUDE.md → Membership Gating) e ninguém
// é deslogado. Voltar atrás tira a marca, sem cobrar nada. As duas: a Stripe e depois a sincronia,
// com a trava da assinatura (`operarNaAssinatura`) — sem esperar por ela.
// Repetir não faz mal: parar o que já está parado dá no mesmo (e só acrescenta o motivo, se veio
// um); manter o que já renova não chama nada.

/**
 * `sem-assinatura`: nada a parar ou a manter (nenhuma com acesso, ou já encerrada de vez).
 * `atrasada`: a cobrança está em aberto — o que cancelar faz ali é decisão do operador, pendente.
 * `ocupada`: a assinatura está sendo acertada neste instante; nada foi feito — tentar de novo.
 */
type NaoFeita = { resultado: "sem-assinatura" } | { resultado: "desconhecida" } | { resultado: "atrasada" } | { resultado: "ocupada" };

export type Parada = ({ resultado: "ok" } & RenovacaoParada) | NaoFeita;

/** Para a renovação da assinatura DESTA conta, com o motivo (opcional). O acesso continua até o fim do período pago. */
export async function pararMinhaRenovacao(userId: string, dado: MotivoDado): Promise<Parada> {
  const achada = await assinaturaDaConta(userId);
  if (achada.resultado === "desconhecida") return achada;
  if (achada.resultado === "nenhuma") return { resultado: "sem-assinatura" };
  const { detalhes } = achada;
  if (detalhes.status === "past_due") return { resultado: "atrasada" };
  // Só a que renova, ou a que já está parada e ainda pode voltar atrás (repetir não faz mal).
  if (!renova(detalhes) && !podeManter(detalhes)) return { resultado: "sem-assinatura" };
  const operacao = await operarNaAssinatura(detalhes.id, async () => {
    // QUEM ESTÁ SAINDO NÃO TROCA DE PLANO: a troca marcada para o fim do período é solta antes
    // (com ela a Stripe RECUSA parar a renovação — medido, 11/10/2026), e a troca na hora que
    // ficou esperando a confirmação do banco é anulada — senão ainda poderia ser cobrada.
    if (detalhes.agendamentoId) await soltarAgendamento(detalhes.agendamentoId);
    if (detalhes.faturaDaTrocaId) await anularFatura(detalhes.faturaDaTrocaId);
    return pararRenovacao(detalhes.id, dado);
  });
  if (!operacao) return { resultado: "ocupada" };
  // O motivo é da lista; o comentário é texto livre da pessoa e nunca vem para o registro.
  console.info(`[stripe] parar a renovação: conta ${userId}, assinatura ${detalhes.id}, motivo ${dado.motivo ?? "não dito"}`);
  return { resultado: "ok", acessoAte: iso(ateQuandoHaAcesso(operacao.feito)) };
}

export type Mantida = { resultado: "ok" } | NaoFeita;

/** Volta atrás: a assinatura DESTA conta, com a renovação parada, torna a renovar. Nada é cobrado. */
export async function manterMinhaAssinatura(userId: string): Promise<Mantida> {
  const achada = await assinaturaDaConta(userId);
  if (achada.resultado === "desconhecida") return achada;
  if (achada.resultado === "nenhuma") return { resultado: "sem-assinatura" };
  const { detalhes } = achada;
  // Já renova: não há o que desfazer (o segundo clique, ou a segunda aba).
  if (renova(detalhes)) return { resultado: "ok" };
  if (!podeManter(detalhes)) return { resultado: "sem-assinatura" };
  const operacao = await operarNaAssinatura(detalhes.id, () => retomarRenovacao(detalhes.id, detalhes.acabaNoFimDoPeriodo));
  if (!operacao) return { resultado: "ocupada" };
  console.info(`[stripe] manter a assinatura: conta ${userId}, assinatura ${detalhes.id}`);
  return { resultado: "ok" };
}

// ── O REEMBOLSO (passo 8 — billing.md → Reembolso) ───────────────────────────────────────────
// Dentro do prazo, a pessoa escolhe: parar a renovação e continuar, ou cancelar e receber o
// dinheiro de volta. Esta é a segunda saída (decisões do operador, 10 e 11/10/2026):
//   - devolve TUDO o que foi pago nesta assinatura (quem trocou de plano no prazo recebe as duas
//     cobranças) — a cortesia não tem o que devolver;
//   - o acesso termina NA HORA: a assinatura é encerrada, e o período devolvido deixa de contar
//     como pago no espelho (`faturaDevolvida`, em `stripe.ts`);
//   - a pessoa CONTINUA LOGADA (`manterSessao`): lê a confirmação e segue no site, sem as aulas;
//   - sem contador e sem recusa por reembolso repetido (a trava é a cláusula dos termos de uso).
// O PRAZO SE CONFERE AQUI, NO SERVIDOR, NA HORA DA AÇÃO — e de novo com a trava, junto com o que
// foi pago: a tela só mostra o que o servidor disse. A ordem é ENCERRAR e depois DEVOLVER: se a
// devolução falhar, a pessoa segue com o acesso do período que pagou, alguém é avisado
// (`console.error`, com etiqueta) e ela pode repetir — repetir não devolve duas vezes.

type Devolvido =
  | ({ resultado: "ok" } & ReembolsoFeito)
  /** O prazo passou — a pessoa ainda pode parar a renovação. */
  | { resultado: "fora-do-prazo" }
  /** Nada foi pago nesta assinatura (a cortesia), ou tudo já voltou. */
  | { resultado: "nada-a-devolver" }
  /** A assinatura foi ENCERRADA e a devolução não saiu: precisa de gente. */
  | { resultado: "devolucao-falhou" };

export type Reembolso = Devolvido | NaoFeita;

/** Encerra a assinatura DESTA conta na hora e devolve tudo o que foi pago nela. Só dentro do prazo. */
export async function reembolsarMinhaAssinatura(userId: string, dado: MotivoDado): Promise<Reembolso> {
  const achada = await assinaturaDaConta(userId);
  if (achada.resultado === "desconhecida") return achada;
  if (achada.resultado === "nenhuma") return { resultado: "sem-assinatura" };
  const { id } = achada.detalhes;
  // Fora do prazo, nem a trava é tomada. O que a pessoa causa sozinha é aviso.
  if (!noPrazoDoReembolso(achada.detalhes)) {
    console.warn(`[stripe] reembolso recusado: a assinatura ${id} (conta ${userId}) está fora do prazo`);
    return { resultado: "fora-do-prazo" };
  }
  const operacao = await operarNaAssinatura(
    id,
    async (): Promise<Devolvido> => {
      // COM A TRAVA, relido: o prazo, a situação e o que foi pago valem os de AGORA.
      const agora = await buscarDetalhes(id);
      if (!noPrazoDoReembolso(agora)) return { resultado: "fora-do-prazo" };
      const pago = await buscarOQueFoiPago(id);
      const centavos = aDevolver(pago);
      if (centavos <= 0 || !pago.moeda) return { resultado: "nada-a-devolver" };
      // Já encerrada (a devolução falhou da outra vez, ou foi encerrada pelo painel): só devolve.
      if (agora.status !== "canceled") await cancelarNaHora(id, dado);
      try {
        for (const pagamento of pago.pagamentos) await devolver(pagamento, { userId, assinaturaId: id });
      } catch (erro) {
        console.error(`[stripe] reembolso: a assinatura ${id} (conta ${userId}) foi ENCERRADA e a devolução falhou — conferir e devolver pelo painel da Stripe: ${erro instanceof Error ? erro.message : String(erro)}`);
        return { resultado: "devolucao-falhou" };
      }
      return { resultado: "ok", centavos, moeda: pago.moeda };
    },
    { manterSessao: true },
  );
  if (!operacao) return { resultado: "ocupada" };
  const feito = operacao.feito;
  if (feito.resultado === "ok") console.info(`[stripe] reembolso: conta ${userId}, assinatura ${id}, ${feito.centavos} centavos (${feito.moeda}) devolvidos, motivo ${dado.motivo ?? "não dito"}`);
  return feito;
}
