import type Stripe from "stripe";
import { erroSemMensagem, stripe } from "./stripe-cliente.js";

// A FATURA DEVOLVIDA POR INTEIRO NÃO CONTA COMO PAGA (etapa 4.6, sessão b — billing.md →
// Reembolso). `[FATO — medido na área restrita, 11/10/2026]` devolvido o dinheiro, a fatura
// continua `paid`, com o mesmo `amount_paid`, e o pagamento dela continua `paid`: quem sabe da
// devolução é a COBRANÇA (`amount_refunded`), e a Stripe não deixa expandir até ela a partir da
// assinatura (quatro níveis). Por isso são duas idas: a assinatura com os pagamentos da última
// fatura, e a cobrança de cada pagamento. Devolução PARCIAL continua contando como paga.

/** Os pagamentos (por cartão) que quitaram esta fatura — os ids, para ler a cobrança de cada um. Função pura. */
export function pagamentosDaFatura(fatura: Stripe.Invoice): string[] {
  const ids: string[] = [];
  for (const item of fatura.payments?.data ?? []) {
    if (item.status !== "paid") continue;
    const pagamento = item.payment.payment_intent;
    if (!pagamento) continue;
    ids.push(typeof pagamento === "string" ? pagamento : pagamento.id);
  }
  return ids;
}

/** Quanto este pagamento cobrou e quanto disso já voltou — a conta é da cobrança. */
export async function cobrancaDoPagamento(pagamentoId: string): Promise<{ centavos: number; devolvido: number }> {
  try {
    const cobranca = (await stripe().paymentIntents.retrieve(pagamentoId, { expand: ["latest_charge"] })).latest_charge;
    if (!cobranca || typeof cobranca === "string") return { centavos: 0, devolvido: 0 };
    return { centavos: cobranca.amount, devolvido: cobranca.amount_refunded };
  } catch (erro) {
    throw erroSemMensagem(erro, "a leitura da cobrança do pagamento");
  }
}

/**
 * Esta fatura foi DEVOLVIDA POR INTEIRO? Só a paga, de valor maior que zero e com pagamento lido
 * (precisa vir com `payments` expandido). Na dúvida — sem pagamento para ler —, NÃO: conta como
 * paga, que era a regra antes de existir reembolso; errar para esse lado nunca tranca quem pagou.
 */
export async function faturaDevolvida(fatura: string | Stripe.Invoice | null | undefined): Promise<boolean> {
  if (!fatura || typeof fatura === "string" || fatura.status !== "paid" || fatura.amount_paid <= 0) return false;
  const pagamentos = pagamentosDaFatura(fatura);
  if (pagamentos.length === 0) return false;
  let devolvido = 0;
  for (const id of pagamentos) devolvido += (await cobrancaDoPagamento(id)).devolvido;
  return devolvido >= fatura.amount_paid;
}

/**
 * O PIX PRÉ-PAGO devolvido por inteiro (etapa 4.9, passo 3): a primeira fatura da pré-paga foi paga POR FORA,
 * sem cobrança nela — o dinheiro está no pagamento Pix de que ela nasceu. Devolvido ele, o período deixa de
 * contar como pago. Na dúvida (sem cobrança para ler), NÃO — como na fatura.
 */
export async function pixDevolvido(pagamentoId: string): Promise<boolean> {
  const { centavos, devolvido } = await cobrancaDoPagamento(pagamentoId);
  return centavos > 0 && devolvido >= centavos;
}

/** O período desta assinatura foi devolvido? A recorrente, pela última fatura; a PRÉ-PAGA, pelo Pix de que nasceu. */
export async function periodoDevolvido(assinatura: Stripe.Subscription, pixPaymentIntentId: string | null): Promise<boolean> {
  return pixPaymentIntentId ? pixDevolvido(pixPaymentIntentId) : faturaDevolvida(assinatura.latest_invoice);
}
