import Stripe from "stripe";
import type { CartaoDaAssinatura, Plano } from "@jilson/core";
import { AssinaturaNaoEncontrada, erroSemMensagem, paraAssinaturaNaStripe, planoDoPreco, stripe } from "./stripe.js";

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
  const { status, pagoAte } = paraAssinaturaNaStripe(assinatura);
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
    cartao: paraCartao(assinatura.default_payment_method) ?? paraCartao(padraoDoCliente),
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
