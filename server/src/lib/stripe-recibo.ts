import type Stripe from "stripe";
import { PLANOS, type Plano } from "@jilson/core";
import { erroSemMensagem, stripe } from "./stripe-cliente.js";
import { MARCA_DO_PREPAGO, METADADO_DO_PIX, planoDoPreco } from "./stripe.js";

// O QUE A STRIPE SABE DE UMA COBRANÇA, PARA O RECIBO DA ESCOLA (Fase 4, etapa 4.7b, passo 6a — decisões do operador,
// 31/10/2026). Só leitura, e só da cobrança que o recibo pediu — quem chama já conferiu que ela é de um cliente da conta
// da sessão. A cobrança do cartão é de uma FATURA (o plano e o período na linha do preço; o desconto, com o código; o
// crédito da troca de plano, numa linha negativa). A do Pix pré-pago não tem fatura: o plano está na marca do pagamento,
// o período na assinatura pré-paga que ele virou, e o Pix não aceita código promocional (`pix-pre-pago.ts`).

/** O que a fatura (ou o Pix) diz da cobrança. Valores em centavos; datas em segundos, como a Stripe. */
export type DetalhesDaCobranca = {
  plano: Plano | null;
  periodo: { de: number; ate: number } | null;
  /** O valor de cada linha: o preço (positivas) e o crédito da troca de plano (negativas). Vazio: não se sabe. */
  linhas: number[];
  descontos: { codigo: string | null; centavos: number }[];
};

const SEM_DETALHES: DetalhesDaCobranca = { plano: null, periodo: null, linhas: [], descontos: [] };

/** O plano escrito numa marca (o Pix pré-pago guarda o plano nela). Nada, se não for um plano. Função pura. */
function planoDaMarca(valor: string | undefined): Plano | null {
  return PLANOS.find((plano) => plano === valor) ?? null;
}

/** O que a FATURA diz: o plano e o período (da linha do preço), as linhas e os descontos, com o código. */
async function daFatura(faturaId: string): Promise<DetalhesDaCobranca> {
  const fatura = await stripe().invoices.retrieve(faturaId, { expand: ["discounts.promotion_code"] });
  const codigos = new Map<string, string>();
  for (const desconto of fatura.discounts) {
    if (typeof desconto === "string" || "deleted" in desconto) continue;
    const codigo = desconto.promotion_code;
    if (codigo && typeof codigo === "object") codigos.set(desconto.id, codigo.code);
  }
  const descontos = (fatura.total_discount_amounts ?? []).map((d) => ({ codigo: codigos.get(typeof d.discount === "string" ? d.discount : d.discount.id) ?? null, centavos: d.amount }));
  const doPreco = fatura.lines.data.find((linha) => linha.amount > 0 && linha.pricing?.price_details?.price);
  const precoId = doPreco?.pricing?.price_details?.price;
  const plano = precoId ? planoDoPreco(await stripe().prices.retrieve(typeof precoId === "string" ? precoId : precoId.id)) : null;
  return { plano, periodo: doPreco ? { de: doPreco.period.start, ate: doPreco.period.end } : null, linhas: fatura.lines.data.map((linha) => linha.amount), descontos };
}

/** O que o PIX pré-pago diz: o plano (a marca), o preço (o próprio valor) e o período (da assinatura que ele virou). */
async function doPix(cobranca: Stripe.Charge, pagamentoId: string): Promise<DetalhesDaCobranca> {
  const pagamento = await stripe().paymentIntents.retrieve(pagamentoId);
  const plano = planoDaMarca(pagamento.metadata[MARCA_DO_PREPAGO]);
  if (!plano) return SEM_DETALHES;
  const clienteId = typeof cobranca.customer === "string" ? cobranca.customer : cobranca.customer?.id;
  let periodo: DetalhesDaCobranca["periodo"] = null;
  if (clienteId) {
    const assinaturas = await stripe().subscriptions.list({ customer: clienteId, status: "all", limit: 100 });
    const item = assinaturas.data.find((a) => a.metadata[METADADO_DO_PIX] === pagamentoId)?.items.data[0];
    if (item) periodo = { de: item.current_period_start, ate: item.current_period_end };
  }
  return { plano, periodo, linhas: [cobranca.amount], descontos: [] };
}

/** Os detalhes de uma cobrança: da fatura dela, do Pix pré-pago, ou nenhum (uma cobrança que não é de nenhum dos dois). */
export async function detalhesDaCobranca(cobranca: Stripe.Charge): Promise<DetalhesDaCobranca> {
  const pagamentoId = typeof cobranca.payment_intent === "string" ? cobranca.payment_intent : cobranca.payment_intent?.id;
  if (!pagamentoId) return SEM_DETALHES;
  try {
    const lista = await stripe().invoicePayments.list({ payment: { type: "payment_intent", payment_intent: pagamentoId }, limit: 1 });
    const fatura = lista.data[0]?.invoice;
    if (fatura) return await daFatura(typeof fatura === "string" ? fatura : fatura.id);
    return await doPix(cobranca, pagamentoId);
  } catch (erro) {
    throw erroSemMensagem(erro, "a leitura dos detalhes do recibo");
  }
}
