import Stripe from "stripe";
import type { CartaoDaAssinatura, Plano } from "@jilson/core";
import { AssinaturaNaoEncontrada, erroSemMensagem, FORMAS_DE_PAGAMENTO, paraAssinaturaNaStripe, planoDoPreco, stripe } from "./stripe.js";

// GERIR UMA ASSINATURA QUE JÁ EXISTE (Fase 4, etapa 4.6 — billing.md → Minha assinatura). A
// outra metade da nossa fronteira com a Stripe (`stripe.ts` é a de assinar e a do espelho): o que
// a tela de Faturamento e Assinatura lê e as ações do aluno sobre a assinatura dele. Os testes
// simulam SÓ o que vai à rede; as funções que traduzem a resposta da Stripe são puras e rodam
// de verdade. Toda ida à Stripe sobe por `erroSemMensagem`: a mensagem dela não vai ao registro.
// Nenhum id daqui chega ao navegador — quem monta a resposta da tela é `minha-assinatura.ts`.

/** A assinatura como a Stripe diz AGORA, com o que a tela de Faturamento e Assinatura mostra. */
export type DetalhesDaAssinatura = {
  id: string;
  /** Como o ESPELHO o guarda (a cobrança pausada é `paused`) — a mesma conta de `stripe.ts`. */
  status: string;
  /** Até quando está PAGO — a mesma conta do espelho, para a tela e o gate nunca discordarem. */
  pagoAte: Date | null;
  plano: Plano | null;
  /** O preço cheio do plano, sem desconto. Vazio quando o preço não é de nenhum dos dois planos. */
  preco: { centavos: number; moeda: string } | null;
  /** O fim do período corrente: é quando a Stripe cobra a renovação. */
  fimDoPeriodo: Date | null;
  /** Marcada para acabar (no fim do período, ou numa data): não renova. */
  acabaEm: Date | null;
  cartao: CartaoDaAssinatura | null;
  /** O cliente da Stripe que esta assinatura cobra — é dele o cartão novo. Não sai do servidor. */
  clienteId: string | null;
  /** A conta da escola que a STRIPE diz ser a dona (a que o checkout gravou lá) — ou nenhuma. Não sai do servidor. */
  userId: string | null;
  /** O cartão que ela cobra hoje, se for o DELA (e não o padrão do cliente). Não sai do servidor. */
  cartaoId: string | null;
  /** A última fatura, se ainda está em aberto (a cobrança falhou): é a que o cartão novo paga. Não sai do servidor. */
  faturaEmAbertoId: string | null;
};

/** O cartão no formato da tela — nunca o número, nem o código dele na Stripe. Função pura. */
export function paraCartao(forma: string | Stripe.PaymentMethod | null | undefined): CartaoDaAssinatura | null {
  if (!forma || typeof forma === "string" || !forma.card) return null;
  return { bandeira: forma.card.brand, final: forma.card.last4, mes: forma.card.exp_month, ano: forma.card.exp_year };
}

/**
 * A assinatura da Stripe (com `latest_invoice`, `default_payment_method` e o cartão padrão do
 * cliente expandidos) no formato da tela. Função pura.
 * O CARTÃO é o da assinatura; sem ele, o padrão do cliente — é a mesma ordem em que a Stripe
 * escolhe qual cobrar.
 */
export function paraDetalhesDaAssinatura(assinatura: Stripe.Subscription): DetalhesDaAssinatura {
  const { status, pagoAte, clienteId, userId } = paraAssinaturaNaStripe(assinatura);
  const daAssinatura = assinatura.default_payment_method;
  const fatura = assinatura.latest_invoice;
  const itens = assinatura.items.data;
  const preco = itens[0]?.price;
  const plano = preco ? planoDoPreco(preco) : null;
  const fimDoPeriodo = itens.length > 0 ? new Date(Math.max(...itens.map((i) => i.current_period_end)) * 1000) : null;
  const acabaEm = assinatura.cancel_at !== null ? new Date(assinatura.cancel_at * 1000) : assinatura.cancel_at_period_end ? fimDoPeriodo : null;
  const doCliente = assinatura.customer;
  const padraoDoCliente = typeof doCliente === "object" && !doCliente.deleted ? doCliente.invoice_settings.default_payment_method : null;
  return {
    id: assinatura.id,
    status,
    pagoAte,
    plano,
    preco: plano && preco && preco.unit_amount !== null ? { centavos: preco.unit_amount, moeda: preco.currency } : null,
    fimDoPeriodo,
    acabaEm,
    cartao: paraCartao(daAssinatura) ?? paraCartao(padraoDoCliente),
    clienteId,
    userId,
    cartaoId: typeof daAssinatura === "string" ? daAssinatura : (daAssinatura?.id ?? null),
    faturaEmAbertoId: typeof fatura === "object" && fatura !== null && fatura.status === "open" ? fatura.id : null,
  };
}

/** A assinatura como a Stripe diz AGORA, para a tela. A que ela não conhece: `AssinaturaNaoEncontrada`. */
export async function buscarDetalhes(id: string): Promise<DetalhesDaAssinatura> {
  try {
    const assinatura = await stripe().subscriptions.retrieve(id, { expand: ["latest_invoice", "default_payment_method", "customer.invoice_settings.default_payment_method"] });
    return paraDetalhesDaAssinatura(assinatura);
  } catch (erro) {
    if (erro instanceof Stripe.errors.StripeInvalidRequestError && erro.code === "resource_missing") throw new AssinaturaNaoEncontrada(id);
    throw erroSemMensagem(erro, "a busca dos detalhes da assinatura");
  }
}

/**
 * Quanto a Stripe vai cobrar na RENOVAÇÃO — a conta é dela (a prévia da próxima fatura, já com o
 * desconto e o saldo do cliente), nunca nossa: o valor mostrado é o valor cobrado. Devolve nada
 * quando não há próxima fatura (a assinatura não renova).
 */
export async function buscarProximaCobranca(id: string): Promise<{ centavos: number; moeda: string } | null> {
  try {
    const fatura = await stripe().invoices.createPreview({ subscription: id });
    return { centavos: fatura.amount_due, moeda: fatura.currency };
  } catch (erro) {
    if (erro instanceof Stripe.errors.StripeInvalidRequestError && erro.code === "invoice_upcoming_none") return null;
    throw erroSemMensagem(erro, "a prévia da próxima cobrança");
  }
}

// TROCAR O CARTÃO (passo 4). O cartão novo é guardado pelo campo da Stripe, no site, contra um
// PEDIDO DE GUARDAR CARTÃO que o servidor abre para o cliente da assinatura — e que leva de
// quem é e para qual assinatura. Depois, quem escolhe qual cartão vai para a assinatura é o
// SERVIDOR, lendo na Stripe os pedidos desse cliente: o site nunca manda o código de um cartão.

/** De quem é e para qual assinatura é o cartão novo. */
export type PedidoDeCartao = { clienteId: string; userId: string; assinaturaId: string };

/** A marca dos pedidos que o NOSSO fluxo de trocar o cartão abre. */
const TROCAR_CARTAO = "trocar-cartao";

/**
 * O pedido de guardar cartão que vai à Stripe. Função pura, com teste: sem a conta e a
 * assinatura aqui, o servidor não teria como saber depois que o cartão confirmado é deste pedido.
 * `allowed_payment_method_types`: a mesma lista com que a assinatura é criada — o nome antigo
 * (`payment_method_types`) não existe mais nesta versão da API (tipos da `stripe@23.0.0`).
 */
export function paraPedidoDeCartao(pedido: PedidoDeCartao): Stripe.SetupIntentCreateParams {
  return {
    customer: pedido.clienteId,
    allowed_payment_method_types: [...FORMAS_DE_PAGAMENTO],
    // O cartão vai ser cobrado nas renovações, sem a pessoa na tela.
    usage: "off_session",
    metadata: { para: TROCAR_CARTAO, userId: pedido.userId, assinatura: pedido.assinaturaId },
  };
}

/** Abre na Stripe o pedido de guardar cartão e devolve o segredo com que o SITE o confirma. */
export async function criarPedidoDeCartao(pedido: PedidoDeCartao): Promise<string> {
  try {
    const criado = await stripe().setupIntents.create(paraPedidoDeCartao(pedido));
    if (!criado.client_secret) throw new Error("[stripe] o pedido de guardar cartão veio sem segredo");
    return criado.client_secret;
  } catch (erro) {
    throw erroSemMensagem(erro, "o pedido de guardar cartão");
  }
}

/** Por quanto tempo um pedido de guardar cartão vale para ser aplicado: a troca é coisa de minutos. */
const VALIDADE_DO_PEDIDO_DE_CARTAO = 60 * 60 * 1000;

/**
 * O cartão que o site acabou de confirmar para ESTE pedido — ou nenhum. Função pura, com teste:
 * é ela que impede um cartão de ir para a assinatura errada. Só vale o pedido que DEU CERTO, que
 * é do nosso fluxo e que foi aberto para esta conta, este cliente e esta assinatura. A lista vem
 * da Stripe com o mais novo primeiro: vale o primeiro que servir.
 * E só o pedido ABERTO HÁ POUCO (achado da revisão de segurança, 11/10/2026): sem prazo, chamar
 * "aplicar" semanas depois reporia um cartão antigo por cima do atual — e tiraria o atual.
 */
export function escolherCartaoConfirmado(pedidos: Stripe.SetupIntent[], pedido: PedidoDeCartao, agora: number = Date.now()): string | null {
  for (const candidato of pedidos) {
    const doCliente = typeof candidato.customer === "string" ? candidato.customer : candidato.customer?.id;
    const m = candidato.metadata ?? {};
    const recente = candidato.created * 1000 >= agora - VALIDADE_DO_PEDIDO_DE_CARTAO;
    const serve = recente && candidato.status === "succeeded" && doCliente === pedido.clienteId && m.para === TROCAR_CARTAO && m.userId === pedido.userId && m.assinatura === pedido.assinaturaId;
    if (!serve) continue;
    const forma = candidato.payment_method;
    const formaId = typeof forma === "string" ? forma : forma?.id;
    if (formaId) return formaId;
  }
  return null;
}

/** O cartão novo deste pedido, lido na Stripe (os 10 pedidos mais recentes do cliente). */
export async function buscarCartaoConfirmado(pedido: PedidoDeCartao): Promise<string | null> {
  try {
    const lista = await stripe().setupIntents.list({ customer: pedido.clienteId, limit: 10 });
    return escolherCartaoConfirmado(lista.data, pedido);
  } catch (erro) {
    throw erroSemMensagem(erro, "a busca do cartão confirmado");
  }
}

/** Põe este cartão como o da assinatura: é ele que a Stripe cobra dali em diante. Devolve-o no formato da tela. */
export async function definirCartao(assinaturaId: string, formaId: string): Promise<CartaoDaAssinatura | null> {
  try {
    const assinatura = await stripe().subscriptions.update(assinaturaId, { default_payment_method: formaId, expand: ["default_payment_method"] });
    return paraCartao(assinatura.default_payment_method);
  } catch (erro) {
    throw erroSemMensagem(erro, "a troca do cartão da assinatura");
  }
}

/** Tira da Stripe o cartão que foi trocado: cartão que a pessoa substituiu não fica guardado. */
export async function soltarCartao(formaId: string): Promise<void> {
  try {
    await stripe().paymentMethods.detach(formaId);
  } catch (erro) {
    throw erroSemMensagem(erro, "a remoção do cartão antigo");
  }
}

/**
 * O que deu a cobrança da fatura em aberto. `recusada`: a Stripe segue tentando sozinha, já com o
 * cartão novo. `pede-confirmacao`: o banco quer uma confirmação que só a pessoa dá, e nada no
 * site a completa ainda — as novas tentativas da Stripe tendem a parar no mesmo ponto.
 */
export type CobrancaDaFatura = "paga" | "recusada" | "pede-confirmacao";

/**
 * Cobra AGORA a fatura em aberto, com o cartão da assinatura. Cartão recusado e confirmação
 * pedida pelo banco não são falha nossa: voltam como desfecho. Qualquer outra recusa pode ser a
 * fatura PAGA NO MESMO INSTANTE (a tentativa da própria Stripe, ou um segundo pedido): quem diz
 * é a fatura, relida — pagar duas vezes a mesma fatura a Stripe não deixa. O resto sobe.
 */
export async function pagarFatura(faturaId: string): Promise<CobrancaDaFatura> {
  try {
    return (await stripe().invoices.pay(faturaId)).status === "paid" ? "paga" : "recusada";
  } catch (erro) {
    if (erro instanceof Stripe.errors.StripeCardError) return "recusada";
    if (erro instanceof Stripe.errors.StripeInvalidRequestError) {
      if (erro.code === "invoice_payment_intent_requires_action") return "pede-confirmacao";
      let relida: string | null = null;
      try {
        relida = (await stripe().invoices.retrieve(faturaId)).status;
      } catch {
        // Nem reler deu: vale o erro da cobrança, abaixo.
      }
      if (relida === "paid") return "paga";
    }
    throw erroSemMensagem(erro, "a cobrança da fatura em aberto");
  }
}
