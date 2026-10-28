import type Stripe from "stripe";
import type { Plano } from "@jilson/core";
import { erroSemMensagem, stripe } from "./stripe-cliente.js";
import { MARCA_DO_PREPAGO, METADADO_DO_PIX, metadadosDoVisitante, type PagamentoPrePago, type TentativaDoVisitante } from "./stripe.js";

// O PIX PRÉ-PAGO (Fase 4, etapa 4.9 — billing.md → *Formas de pagamento*; decisão do operador,
// 28/10/2026). Numa conta do Brasil a Stripe não cobra Pix de novo sozinha (sem Pix Automático) e
// recusa `pix` numa assinatura `[FATO — medido em 28/10/2026]`. Então o Pix é um PAGAMENTO SOLTO:
//   1. o site pede um pagamento Pix (`criarPagamentoPix`) — com a configuração de formas de pagamento
//      SÓ COM PIX (`STRIPE_PIX_CONFIGURATION`: a conta exige formas dinâmicas, e sem ela o campo
//      mostraria também o cartão, que aqui seria uma cobrança avulsa, não uma assinatura), o valor do
//      plano, a validade do QR, e nos metadados o PLANO (a marca de que é nosso), o preço e QUEM paga
//      (a conta, ou a ficha e a tentativa do visitante — os mesmos metadados da assinatura, para a
//      conta nascer dela do mesmo jeito);
//   2. quando o Pix CAI (`payment_intent.succeeded`), a rotina do espelho cria a ASSINATURA PRÉ-PAGA
//      (`criarAssinaturaPrePaga`): a mesma assinatura de sempre, `cancel_at_period_end: true` (termina
//      no fim do mês ou do ano, sem renovar), a primeira fatura PAGA POR FORA (`paid_out_of_band`) —
//      a Stripe a deixa ativa sem cartão nenhum `[FATO — medido]`. O gate, as telas e os e-mails
//      continuam lendo só o espelho.
// UM PIX, UMA ASSINATURA: a chave de idempotência da criação é o id do pagamento (a Stripe devolve a
// mesma assinatura por 24 h) e os metadados dela guardam esse id (`METADADO_DO_PIX`) — é por eles que o
// espelho e a busca (`assinaturaDoPagamentoPrePago`) a acham depois. A regra de quando cada camada é
// consultada mora em `assinaturas.ts` (`processarPixPrePago`).
// Pagar de novo é SÓ depois de o período acabar (decisão do operador, 28/10/2026): não há soma de tempo.

/** Quanto tempo o QR do Pix vale (proposta do agente; a decisão do operador vem na abertura do passo 2). */
export const VALIDADE_DO_PIX_EM_SEGUNDOS = 60 * 60;

/** O Pix está configurado? Sem a configuração só-Pix, as rotas do Pix respondem 503 — nunca abrem o campo com cartão. */
export function pixConfigurado(): boolean {
  return Boolean(process.env.STRIPE_PIX_CONFIGURATION);
}

function configuracaoDoPix(): string {
  const configuracao = process.env.STRIPE_PIX_CONFIGURATION;
  if (!configuracao) throw new Error("[stripe] Pix sem STRIPE_PIX_CONFIGURATION");
  return configuracao;
}

/** De quem é o pagamento: a conta logada (`userId`) ou a tentativa do visitante, que ainda não tem conta. */
export type PedidoDePix = { clienteId: string; precoId: string; plano: Plano; centavos: number } & ({ userId: string } | { visitante: TentativaDoVisitante });

/**
 * O pedido do pagamento Pix que vai à Stripe. Função pura, com teste — as linhas que nenhum outro
 * teste veria sumir: a configuração só-Pix (sem ela, o campo mostra cartão), a MARCA (sem ela, o
 * aviso não é nosso e a assinatura não nasce), o preço (é ele que a assinatura usa) e QUEM paga.
 */
export function paraPedidoDePix(pedido: PedidoDePix, configuracao: string): Stripe.PaymentIntentCreateParams {
  const deQuem = "visitante" in pedido ? metadadosDoVisitante(pedido.visitante) : { userId: pedido.userId };
  return {
    amount: pedido.centavos,
    currency: "brl",
    customer: pedido.clienteId,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    payment_method_configuration: configuracao,
    payment_method_options: { pix: { expires_after_seconds: VALIDADE_DO_PIX_EM_SEGUNDOS } },
    metadata: { ...deQuem, [MARCA_DO_PREPAGO]: pedido.plano, precoId: pedido.precoId },
  };
}

export type PagamentoPixCriado = { id: string; segredo: string; livemode: boolean };

/** Cria o pagamento Pix. O segredo vai SÓ para o site, que abre o QR com ele — nunca para o registro. */
export async function criarPagamentoPix(pedido: PedidoDePix): Promise<PagamentoPixCriado> {
  try {
    const pagamento = await stripe().paymentIntents.create(paraPedidoDePix(pedido, configuracaoDoPix()));
    if (!pagamento.client_secret) throw new Error("o pagamento nasceu sem segredo");
    return { id: pagamento.id, segredo: pagamento.client_secret, livemode: pagamento.livemode };
  } catch (erro) {
    throw erroSemMensagem(erro, "a criação do pagamento Pix");
  }
}

/**
 * O pedido da assinatura pré-paga que vai à Stripe. Função pura, com teste: `cancel_at_period_end`
 * (sem ele, a Stripe tentaria cobrar de novo, sem cartão), os metadados de QUEM paga (sem eles, a
 * conta do visitante não nasce) e o id do Pix (sem ele, o aviso repetido criaria outra).
 */
export function paraPedidoDeAssinaturaPrePaga(pagamento: PagamentoPrePago): Stripe.SubscriptionCreateParams {
  const deQuem = pagamento.visitante ? metadadosDoVisitante(pagamento.visitante) : pagamento.userId ? { userId: pagamento.userId } : {};
  return {
    customer: pagamento.clienteId,
    items: [{ price: pagamento.precoId, quantity: 1 }],
    payment_behavior: "default_incomplete",
    cancel_at_period_end: true,
    payment_settings: { payment_method_types: ["card"], save_default_payment_method: "off" },
    metadata: { ...deQuem, plano: pagamento.plano, [METADADO_DO_PIX]: pagamento.id },
    expand: ["latest_invoice"],
  };
}

/**
 * A assinatura pré-paga de um Pix que CAIU: cria (idempotente na Stripe pelo id do Pix, por 24 h) e
 * paga a primeira fatura por fora. Se a fatura já estiver paga (a criação repetida devolveu a mesma
 * assinatura), não paga de novo. Devolve o id da assinatura.
 */
export async function criarAssinaturaPrePaga(pagamento: PagamentoPrePago): Promise<string> {
  try {
    const assinatura = await stripe().subscriptions.create(paraPedidoDeAssinaturaPrePaga(pagamento), { idempotencyKey: `prepago:${pagamento.id}` });
    const fatura = assinatura.latest_invoice;
    const faturaId = typeof fatura === "string" ? fatura : (fatura?.id ?? null);
    const jaPaga = typeof fatura === "object" && fatura !== null && fatura.status === "paid";
    if (faturaId && !jaPaga) {
      try {
        await stripe().invoices.pay(faturaId, { paid_out_of_band: true }, { idempotencyKey: `prepago-fatura:${pagamento.id}` });
      } catch (erro) {
        // Dois ao mesmo tempo: o outro pagou no meio. Só o estado da fatura decide.
        if ((await stripe().invoices.retrieve(faturaId)).status !== "paid") throw erro;
      }
    }
    return assinatura.id;
  } catch (erro) {
    throw erroSemMensagem(erro, "a assinatura pré-paga do Pix");
  }
}

const ID_DE_PAGAMENTO = /^pi_[A-Za-z0-9]+$/;

/**
 * A assinatura pré-paga que um Pix JÁ virou, na Stripe (pelos metadados) — a cinta para o aviso que
 * chega depois de a chave de idempotência vencer (24 h). A busca da Stripe pode atrasar um pouco; é
 * por isso que o espelho é consultado antes dela (`assinaturas.ts`).
 */
export async function assinaturaDoPagamentoPrePago(pagamentoId: string): Promise<string | null> {
  if (!ID_DE_PAGAMENTO.test(pagamentoId)) return null;
  try {
    const encontradas = await stripe().subscriptions.search({ query: `metadata['${METADADO_DO_PIX}']:'${pagamentoId}'`, limit: 1 });
    return encontradas.data[0]?.id ?? null;
  } catch (erro) {
    throw erroSemMensagem(erro, "a busca da assinatura do Pix");
  }
}
