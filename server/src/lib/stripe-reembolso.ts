import Stripe from "stripe";
import { COMENTARIO_DA_TROCA_POR_PIX, erroSemMensagem, METADADO_DA_CONTESTACAO, stripe } from "./stripe.js";
import { abrirCaso, TipoDeCaso } from "./casos.js";
import { cobrancaDoPagamento, pagamentosDaFatura } from "./stripe-devolucao.js";
import { paraMotivoNaStripe, type MotivoDado } from "./stripe-assinatura.js";
import { anularFatura } from "./stripe-plano.js";

// O REEMBOLSO (Fase 4, etapa 4.6, sessão b — billing.md → Reembolso). A terceira parte da nossa
// fronteira com a Stripe: o que foi pago numa assinatura, encerrá-la na hora e devolver o
// dinheiro. Decisões do operador (10 e 11/10/2026): o reembolso devolve TUDO o que foi pago
// naquela assinatura (quem trocou de plano no prazo recebe as duas cobranças) e corta o acesso na
// hora. Quem decide SE pode (o prazo, de quem é) é `minha-assinatura.ts`; aqui é só a ida à
// Stripe, e toda ida sobe por `erroSemMensagem`.
// `[FATO — medido na área restrita, 11/10/2026]` a fatura devolvida continua `paid`; a cobrança
// é que diz quanto voltou; devolver de novo o que já voltou é recusado (`charge_already_refunded`);
// a mesma chave de repetição devolve a MESMA devolução; encerrar na hora sem crédito não gera
// fatura nova; a assinatura de cortesia tem fatura paga de valor zero e NENHUM pagamento.

/** Um pagamento de uma fatura desta assinatura: quanto cobrou e quanto disso já voltou. */
export type Pagamento = { pagamentoId: string; centavos: number; devolvido: number };

/** Tudo o que foi pago numa assinatura. `moeda` vazia: nada foi pago (a cortesia). */
export type OQueFoiPago = { moeda: string | null; pagamentos: Pagamento[] };

/** Quanto ainda há a devolver: o que foi cobrado, menos o que já voltou. Função pura. */
export function aDevolver(pago: OQueFoiPago): number {
  return pago.pagamentos.reduce((soma, p) => soma + Math.max(0, p.centavos - p.devolvido), 0);
}

/**
 * Tudo o que foi PAGO nesta assinatura: as faturas pagas dela (até 100 — uma por período, mais a
 * da troca de plano) e a cobrança de cada pagamento. É daqui que saem o valor mostrado na tela e
 * o que a operação devolve: o mostrado é o devolvido.
 * DA MAIS ANTIGA PARA A MAIS NOVA (achado da revisão de segurança, 11/10/2026): é a ordem em que
 * a operação devolve. O espelho deixa de dar acesso quando a ÚLTIMA fatura volta por inteiro; se
 * ela voltasse primeiro e a seguinte falhasse, a pessoa ficaria sem acesso, com dinheiro por
 * receber e sem poder repetir.
 */
export async function buscarOQueFoiPago(assinaturaId: string): Promise<OQueFoiPago> {
  let faturas: Stripe.Invoice[];
  try {
    faturas = (await stripe().invoices.list({ subscription: assinaturaId, status: "paid", limit: 100, expand: ["data.payments"] })).data;
  } catch (erro) {
    throw erroSemMensagem(erro, "a lista das faturas pagas da assinatura");
  }
  const pagamentos: Pagamento[] = [];
  let moeda: string | null = null;
  for (const fatura of [...faturas].sort((a, b) => a.created - b.created)) {
    if (fatura.amount_paid <= 0) continue;
    for (const pagamentoId of pagamentosDaFatura(fatura)) {
      pagamentos.push({ pagamentoId, ...(await cobrancaDoPagamento(pagamentoId)) });
      moeda ??= fatura.currency;
    }
  }
  return { moeda, pagamentos };
}

/**
 * O que foi pago numa assinatura PRÉ-PAGA (etapa 4.9, passo 3): a primeira fatura dela foi paga POR FORA, e o
 * dinheiro está no pagamento Pix de que ela nasceu — é dele que o reembolso devolve. Um pagamento só; a moeda
 * é a da cobrança. Sem cobrança (o Pix não caiu — não acontece numa pré-paga), nada foi pago.
 */
export async function buscarOQueFoiPagoNoPix(pagamentoId: string): Promise<OQueFoiPago> {
  let cobranca: Stripe.Charge | string | null;
  try {
    cobranca = (await stripe().paymentIntents.retrieve(pagamentoId, { expand: ["latest_charge"] })).latest_charge;
  } catch (erro) {
    throw erroSemMensagem(erro, "a leitura da cobrança do Pix");
  }
  if (!cobranca || typeof cobranca === "string" || cobranca.amount <= 0) return { moeda: null, pagamentos: [] };
  return { moeda: cobranca.currency, pagamentos: [{ pagamentoId, centavos: cobranca.amount, devolvido: cobranca.amount_refunded }] };
}

/**
 * ENCERRA a assinatura na hora — é o que o reembolso faz, e nunca "parar a renovação": sem
 * crédito proporcional e sem fatura nova (o dinheiro volta pela devolução, por inteiro). O motivo
 * vai junto; o motivo exato da escola (`metadata.motivo`) é gravado depois e, se falhar, é só
 * aviso: a assinatura encerrada ainda aceita essa gravação, e ela não segura um reembolso.
 */
export async function cancelarNaHora(assinaturaId: string, dado: MotivoDado): Promise<void> {
  const { cancellation_details, metadata } = paraMotivoNaStripe(dado);
  try {
    await stripe().subscriptions.cancel(assinaturaId, { prorate: false, invoice_now: false, ...(cancellation_details ? { cancellation_details } : {}) });
  } catch (erro) {
    throw erroSemMensagem(erro, "o encerramento da assinatura");
  }
  if (!metadata) return;
  try {
    await stripe().subscriptions.update(assinaturaId, { metadata });
  } catch (erro) {
    console.warn(`[stripe] reembolso: o motivo da assinatura ${assinaturaId} não foi gravado: ${erroSemMensagem(erro, "a gravação do motivo").message}`);
  }
}

/**
 * A ASSINATURA CONTESTADA (E7 da revisão ampla da cobrança; decisões do operador P122 e de 30/10/2026): primeiro a marca
 * (`METADADO_DA_CONTESTACAO`, que faz o período não contar como pago), e só então o cancelamento na hora — sem crédito
 * nem fatura nova, e o cartão contestado nunca mais é cobrado. Na ordem inversa, a cancelada sem marca daria acesso até
 * o fim do período. A assinatura já encerrada não se cancela de novo (a reentrega do aviso). Valer uma vez só é garantido
 * pela marca (a mesma, gravar de novo não muda nada) e pela encerrada que não se cancela de novo — por isso SEM chave de
 * repetição `[FATO — medido na área restrita, 30/10/2026, na prova do E14]`: na marca, a chave devolveria a resposta
 * GUARDADA da primeira vez (a assinatura ainda viva), e o cancelamento repetido de uma já cancelada dá 404
 * `resource_missing` (a Stripe ignora a chave nele) — o aviso que voltasse em menos de 5 minutos, depois de uma falha no
 * meio, falharia até a janela virar. Sem chave, a resposta da marca é a de agora. Depois de cancelar, a fatura EM ABERTO
 * de uma atrasada é anulada (como no cancelar do aluno), para não ser mais tentada no cartão contestado; se não der, é
 * alerta, e o cancelamento vale. A recusa sobe sem a mensagem crua.
 */
export async function cancelarPorContestacao(assinaturaId: string, contestacaoId: string): Promise<void> {
  let faturaEmAberto: string | null = null;
  try {
    const marcada = await stripe().subscriptions.update(assinaturaId, { metadata: { [METADADO_DA_CONTESTACAO]: contestacaoId }, expand: ["latest_invoice"] });
    if (marcada.status === "canceled" || marcada.status === "incomplete_expired") return;
    const fatura = marcada.latest_invoice;
    faturaEmAberto = typeof fatura === "object" && fatura !== null && fatura.status === "open" ? fatura.id : null;
    await stripe().subscriptions.cancel(assinaturaId, { prorate: false, invoice_now: false, cancellation_details: { comment: `Contestação ${contestacaoId}` } });
  } catch (erro) {
    throw erroSemMensagem(erro, "o cancelamento da assinatura contestada");
  }
  if (!faturaEmAberto) return;
  try {
    if ((await anularFatura(faturaEmAberto)) === "paga") {
      console.error(`[stripe] contestação ${contestacaoId}: a cobrança em aberto da assinatura ${assinaturaId} foi PAGA no instante do cancelamento — conferir no painel da Stripe`);
      await abrirCaso({ tipo: TipoDeCaso.PAGO_SEM_ASSINATURA, chave: `fatura:${faturaEmAberto}`, urgente: false, assinatura: assinaturaId, objeto: faturaEmAberto, detalhe: `a cobrança em aberto foi paga no instante do cancelamento pela contestação ${contestacaoId}` });
    }
  } catch (erro) {
    console.error(`[stripe] contestação ${contestacaoId}: a assinatura ${assinaturaId} foi cancelada e a cobrança em aberto NÃO foi anulada — anular pelo painel da Stripe: ${erro instanceof Error ? erro.message : String(erro)}`);
    await abrirCaso({ tipo: TipoDeCaso.COBRANCA_EM_ABERTO, chave: `fatura:${faturaEmAberto}`, urgente: false, assinatura: assinaturaId, objeto: faturaEmAberto, detalhe: `cancelada pela contestação ${contestacaoId} e a cobrança em aberto não foi anulada` });
  }
}

/**
 * ENCERRA NA HORA a assinatura ATRASADA que a pessoa vai pagar com Pix (4.9b, E14 — decisão do operador, P118): sem crédito
 * e sem fatura nova, como o cancelar com a cobrança atrasada, com o comentário `COMENTARIO_DA_TROCA_POR_PIX` — é ele que
 * cala o e-mail de "terminou", e vai no mesmo pedido do encerramento. Quem anula a cobrança em aberto é quem chama, depois
 * disto: anulada com a assinatura ainda viva, a Stripe a dá como `active` de novo (medido, 11/10/2026).
 * SEM chave de repetição `[FATO — medido na área restrita, 30/10/2026]`: a Stripe a ignora no encerramento, e encerrar de
 * novo a já encerrada dá 404 `resource_missing`. Quem chama relê a assinatura com a trava e só encerra a atrasada.
 */
export async function encerrarParaOPix(assinaturaId: string): Promise<void> {
  try {
    await stripe().subscriptions.cancel(assinaturaId, { prorate: false, invoice_now: false, cancellation_details: { comment: COMENTARIO_DA_TROCA_POR_PIX } });
  } catch (erro) {
    throw erroSemMensagem(erro, "o encerramento da assinatura atrasada para o Pix");
  }
}

/** De quem é a devolução — vai gravado nela, para quem olhar o painel da Stripe. */
export type DonoDaDevolucao = { userId: string; assinaturaId: string };

/** O pedido de devolução que vai à Stripe: o que FALTA voltar deste pagamento. Função pura, com teste. */
export function paraPedidoDeDevolucao(pagamento: Pagamento, dono: DonoDaDevolucao): Stripe.RefundCreateParams {
  return {
    payment_intent: pagamento.pagamentoId,
    amount: pagamento.centavos - pagamento.devolvido,
    reason: "requested_by_customer",
    metadata: { para: "reembolso", userId: dono.userId, assinatura: dono.assinaturaId },
  };
}

/** De quantos em quantos minutos a chave de repetição muda. */
const JANELA_DA_CHAVE = 5 * 60 * 1000;

/**
 * A chave de repetição da devolução: do pagamento, do quanto já tinha voltado e da JANELA de 5
 * minutos. A Stripe guarda por 24 h a primeira resposta de cada chave — inclusive a FALHA (achado
 * da revisão de segurança, 11/10/2026): com uma chave fixa, "pode repetir" devolveria o mesmo
 * erro o dia inteiro. Com a janela, o pedido repetido em seguida recebe a mesma devolução, e o de
 * minutos depois é um pedido novo — que a Stripe não deixa passar do que foi cobrado. Função pura.
 */
export function chaveDaDevolucao(pagamento: Pagamento, agora: Date = new Date()): string {
  return `reembolso-${pagamento.pagamentoId}-${pagamento.devolvido}-${Math.floor(agora.getTime() / JANELA_DA_CHAVE)}`;
}

/**
 * Devolve o que falta deste pagamento. REPETIR NÃO DEVOLVE DUAS VEZES: a chave de repetição
 * (`chaveDaDevolucao`), a trava da assinatura e a própria Stripe, que não devolve mais do que
 * cobrou — o que ela diz que já voltou por inteiro conta como feito. Devolução que nasce `failed`
 * sobe; a que nasce `pending` vale, e se falhar depois quem avisa é o aviso da Stripe.
 */
export async function devolver(pagamento: Pagamento, dono: DonoDaDevolucao): Promise<void> {
  if (pagamento.centavos - pagamento.devolvido <= 0) return;
  try {
    const devolucao = await stripe().refunds.create(paraPedidoDeDevolucao(pagamento, dono), { idempotencyKey: chaveDaDevolucao(pagamento) });
    if (devolucao.status === "failed" || devolucao.status === "canceled") throw new Error(`[stripe] a devolução nasceu ${devolucao.status}`);
  } catch (erro) {
    if (erro instanceof Stripe.errors.StripeInvalidRequestError && erro.code === "charge_already_refunded") return;
    throw erroSemMensagem(erro, "a devolução do pagamento");
  }
}

/** Uma cobrança que o painel devolve (passo 4a): de quem é, quanto foi e quanto já voltou. */
export type CobrancaParaDevolver = { id: string; cliente: string | null; pagamentoId: string | null; centavos: number; devolvido: number; moeda: string; paga: boolean };

/** A COBRANÇA, lida na Stripe agora — ou nenhuma, se a Stripe não a conhece. */
export async function lerCobranca(cobrancaId: string): Promise<CobrancaParaDevolver | null> {
  try {
    const c = await stripe().charges.retrieve(cobrancaId);
    return {
      id: c.id,
      cliente: typeof c.customer === "string" ? c.customer : (c.customer?.id ?? null),
      pagamentoId: typeof c.payment_intent === "string" ? c.payment_intent : (c.payment_intent?.id ?? null),
      centavos: c.amount,
      devolvido: c.amount_refunded,
      moeda: c.currency,
      paga: c.paid && c.status === "succeeded",
    };
  } catch (erro) {
    if (erro instanceof Stripe.errors.StripeInvalidRequestError && erro.code === "resource_missing") return null;
    throw erroSemMensagem(erro, "a leitura da cobrança");
  }
}

/**
 * DEVOLVE UMA PARTE (ou tudo o que falta) de uma cobrança — o "Devolver um pagamento" do painel (passo 4a, P139). A
 * chave de repetição leva a cobrança, o que já tinha voltado e o valor: o clique duplo não devolve duas vezes, e a
 * segunda parte, depois da primeira, é outro pedido. A Stripe recusa devolver mais do que falta.
 */
export async function devolverParte(cobranca: CobrancaParaDevolver, centavos: number, dono: { userId: string | null; assinaturaId: string | null; operador: string }, agora: Date = new Date()): Promise<void> {
  const metadata: Record<string, string> = { para: "painel", operador: dono.operador };
  if (dono.userId) metadata.userId = dono.userId;
  if (dono.assinaturaId) metadata.assinatura = dono.assinaturaId;
  try {
    const devolucao = await stripe().refunds.create(
      { charge: cobranca.id, amount: centavos, reason: "requested_by_customer", metadata },
      { idempotencyKey: `painel-devolucao-${cobranca.id}-${cobranca.devolvido}-${centavos}-${Math.floor(agora.getTime() / JANELA_DA_CHAVE)}` },
    );
    if (devolucao.status === "failed" || devolucao.status === "canceled") throw new Error(`[stripe] a devolução nasceu ${devolucao.status}`);
  } catch (erro) {
    throw erroSemMensagem(erro, "a devolução da cobrança");
  }
}

/**
 * De que ASSINATURA é este pagamento — para o aviso de dinheiro devolvido, que só traz a cobrança.
 * O caminho é pagamento → fatura → assinatura. Nenhuma: o pagamento não é de fatura de assinatura.
 */
export async function assinaturaDoPagamento(pagamentoId: string): Promise<string | null> {
  try {
    const lista = await stripe().invoicePayments.list({ payment: { type: "payment_intent", payment_intent: pagamentoId }, limit: 1, expand: ["data.invoice"] });
    const fatura = lista.data[0]?.invoice;
    if (!fatura || typeof fatura === "string" || fatura.deleted) return null;
    const assinatura = fatura.parent?.subscription_details?.subscription;
    if (!assinatura) return null;
    return typeof assinatura === "string" ? assinatura : assinatura.id;
  } catch (erro) {
    throw erroSemMensagem(erro, "a busca da assinatura do pagamento");
  }
}
