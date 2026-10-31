import Stripe from "stripe";
import { erroSemMensagem, stripe } from "./stripe-cliente.js";

// A FICHA DO ALUNO NO PAINEL DA COBRANÇA — a leitura na Stripe (Fase 4, etapa 4.7b, passo 1c). Fronteira com a
// Stripe, como `stripe.ts` e `stripe-assinatura.ts`: só LÊ, nunca muda nada. Toda ida sobe por `erroSemMensagem` (a
// mensagem da Stripe não vai ao registro). Quem monta o que a tela vê é `ficha-da-cobranca.ts`.

/** O cliente, as 100 cobranças mais recentes dele, a contestação de cada cobrança contestada e os Pix gerados e não pagos. */
export type ClienteNaStripe = {
  cliente: Stripe.Customer | null;
  cobrancas: Stripe.Charge[];
  maisCobrancas: boolean;
  contestacoes: Map<string, Stripe.Dispute>;
  pixEsperando: Stripe.PaymentIntent[];
};

const NENHUM: ClienteNaStripe = { cliente: null, cobrancas: [], maisCobrancas: false, contestacoes: new Map(), pixEsperando: [] };

/** O Pix gerado e não pago: o pagamento esperando, com o QR aberto (etapa 4.7b, passo 1e). Função pura. */
export function pixEsperandoPagamento(pagamento: Stripe.PaymentIntent): boolean {
  return pagamento.status === "requires_action" && pagamento.next_action?.type === "pix_display_qr_code";
}

function naoExiste(erro: unknown): boolean {
  return erro instanceof Stripe.errors.StripeInvalidRequestError && erro.code === "resource_missing";
}

/**
 * O que a ficha mostra de UM cliente da Stripe: o cliente (com os números fiscais e o cartão padrão expandidos), as
 * cobranças de cartão e de Pix, e — só das contestadas — a contestação (o prazo e o motivo). O cliente apagado, ou que
 * a Stripe não conhece, volta vazio.
 */
export async function lerClienteNaStripe(clienteId: string): Promise<ClienteNaStripe> {
  try {
    const cliente = await stripe().customers.retrieve(clienteId, { expand: ["tax_ids", "invoice_settings.default_payment_method"] });
    if (cliente.deleted) return NENHUM;
    const lista = await stripe().charges.list({ customer: clienteId, limit: 100 });
    const contestacoes = new Map<string, Stripe.Dispute>();
    for (const cobranca of lista.data) {
      if (!cobranca.disputed) continue;
      const [contestacao] = (await stripe().disputes.list({ charge: cobranca.id, limit: 1 })).data;
      if (contestacao) contestacoes.set(cobranca.id, contestacao);
    }
    // Os Pix gerados e não pagos não têm cobrança ainda: só o pagamento esperando (passo 1e).
    const pagamentos = await stripe().paymentIntents.list({ customer: clienteId, limit: 20 });
    return { cliente, cobrancas: lista.data, maisCobrancas: lista.has_more, contestacoes, pixEsperando: pagamentos.data.filter(pixEsperandoPagamento) };
  } catch (erro) {
    if (naoExiste(erro)) return NENHUM;
    throw erroSemMensagem(erro, "a leitura do cliente para a ficha");
  }
}

/**
 * As cobranças de UM cliente (as 100 mais novas), para a tela do aluno (etapa 4.7b, passo 6a). O cliente apagado, ou que a
 * Stripe não conhece, não tem nenhuma.
 */
export async function cobrancasDoCliente(clienteId: string): Promise<Stripe.Charge[]> {
  try {
    return (await stripe().charges.list({ customer: clienteId, limit: 100 })).data;
  } catch (erro) {
    if (naoExiste(erro)) return [];
    throw erroSemMensagem(erro, "a leitura das cobranças do cliente");
  }
}

/**
 * De que cliente é o código da Stripe que veio num alerta: a cobrança (`ch_`), a fatura (`in_`), a contestação
 * (`du_`) ou o pagamento (`pi_`). Nenhum, se a Stripe não o conhece ou ele não tem cliente.
 */
export async function clienteDoCodigo(codigo: string): Promise<string | null> {
  const id = (cliente: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null => (cliente === null ? null : typeof cliente === "string" ? cliente : cliente.id);
  try {
    if (codigo.startsWith("ch_")) return id((await stripe().charges.retrieve(codigo)).customer);
    if (codigo.startsWith("in_")) return id((await stripe().invoices.retrieve(codigo)).customer);
    if (codigo.startsWith("pi_")) return id((await stripe().paymentIntents.retrieve(codigo)).customer);
    if (codigo.startsWith("du_")) {
      const contestacao = await stripe().disputes.retrieve(codigo, { expand: ["charge"] });
      return typeof contestacao.charge === "string" ? id((await stripe().charges.retrieve(contestacao.charge)).customer) : id(contestacao.charge.customer);
    }
    return null;
  } catch (erro) {
    if (naoExiste(erro)) return null;
    throw erroSemMensagem(erro, "a busca do código da Stripe");
  }
}
