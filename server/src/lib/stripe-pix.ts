import type Stripe from "stripe";
import type { Plano } from "@jilson/core";
import { erroSemMensagem, stripe } from "./stripe-cliente.js";
import { MARCA_DO_PREPAGO, METADADO_DO_PIX, METADADOS_DO_VISITANTE, metadadosDoVisitante, pagamentoPrePagoDe, type PagamentoPrePago, type TentativaDoVisitante } from "./stripe.js";

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

/** Quanto tempo o QR do Pix vale: 1 hora (decisão do operador, 28/10/2026, na abertura do passo 2 da etapa 4.9). */
export const VALIDADE_DO_PIX_EM_SEGUNDOS = 60 * 60;

/** De quantos em quantos minutos a chave de repetição da Stripe muda (como `chaveDaDevolucao`, `stripe-reembolso.ts`). */
const JANELA_DA_CHAVE = 5 * 60 * 1000;

/**
 * A chave de repetição da criação e do pagar-por-fora: do Pix e da JANELA de 5 minutos (achado 5 do
 * passo 6, 29/10/2026). A Stripe guarda por 24 h a primeira resposta de cada chave — INCLUSIVE a falha
 * (a lição de `chaveDaDevolucao`): com a chave fixa de antes, um 500 da Stripe na criação seria devolvido
 * de novo a cada reentrega do aviso, o dia inteiro, e o aluno pagaria sem entrar. Com a janela, a reentrega
 * de segundos depois recebe a MESMA assinatura (a corrida que a chave protege), e a de minutos depois é
 * um pedido novo — que a busca pelos metadados (`assinaturaDoPagamentoPrePago`) já vê antes de criar.
 * Função pura.
 */
export function chaveDoPrePago(oQue: "criar" | "fatura", pagamentoId: string, agora: Date = new Date()): string {
  return `prepago-${oQue}:${pagamentoId}:${Math.floor(agora.getTime() / JANELA_DA_CHAVE)}`;
}

/** O Pix está configurado? Sem a configuração só-Pix, as rotas do Pix respondem 503 — nunca abrem o campo com cartão. */
export function pixConfigurado(): boolean {
  return Boolean(process.env.STRIPE_PIX_CONFIGURATION);
}

function configuracaoDoPix(): string {
  const configuracao = process.env.STRIPE_PIX_CONFIGURATION;
  if (!configuracao) throw new Error("[stripe] Pix sem STRIPE_PIX_CONFIGURATION");
  return configuracao;
}

/** A configuração só-Pix, para o site abrir o campo com ela — ou nada, quando o Pix não está configurado. */
export function configuracaoDoPixOuNada(): string | null {
  return process.env.STRIPE_PIX_CONFIGURATION || null;
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
 * A assinatura pré-paga de um Pix que CAIU: cria (idempotente na Stripe pelo id do Pix, na janela de
 * `chaveDoPrePago`) e garante a primeira fatura paga por fora. Devolve o id da assinatura.
 */
export async function criarAssinaturaPrePaga(pagamento: PagamentoPrePago): Promise<string> {
  let assinatura: Stripe.Subscription;
  try {
    assinatura = await stripe().subscriptions.create(paraPedidoDeAssinaturaPrePaga(pagamento), { idempotencyKey: chaveDoPrePago("criar", pagamento.id) });
  } catch (erro) {
    throw erroSemMensagem(erro, "a assinatura pré-paga do Pix");
  }
  await garantirFaturaPaga(assinatura.id, pagamento.id, assinatura.latest_invoice);
  return assinatura.id;
}

/** O que a fatura da pré-paga ficou: `paid`, ou o status que a Stripe diz quando não dá para pagar por fora. */
export type FaturaDaPrePaga = { fatura: string | null; status: string };

/**
 * A PRIMEIRA FATURA DA PRÉ-PAGA PAGA POR FORA — em TODO caminho, não só na criação (achado 5 do passo 6,
 * 29/10/2026): se a Stripe caiu entre o criar e o pagar, a reentrega do aviso acha a assinatura (no
 * espelho, ou pela busca) e, sem isto, a sincronizaria `incomplete` — o aluno pagou o Pix e não entra, e
 * em ~23 h a Stripe expira a assinatura. Lê a fatura (a dada, ou a última da assinatura, buscada agora):
 * `paid` → nada; `open` ou `draft` → paga por fora (idempotente na janela); qualquer outra (anulada,
 * incobrável) não se paga, e quem chama alerta pela falta de acesso. Se o pagar falhar e a fatura
 * estiver paga (dois ao mesmo tempo), segue; se não, sobe sem a mensagem crua da Stripe.
 */
export async function garantirFaturaPaga(assinaturaId: string, pagamentoId: string, fatura?: Stripe.Invoice | string | null): Promise<FaturaDaPrePaga> {
  try {
    let lida: Stripe.Invoice | null = typeof fatura === "object" && fatura !== null ? fatura : null;
    if (!lida) {
      const ultima = (await stripe().subscriptions.retrieve(assinaturaId, { expand: ["latest_invoice"] })).latest_invoice;
      lida = typeof ultima === "object" && ultima !== null ? ultima : null;
    }
    if (!lida) return { fatura: null, status: "sem-fatura" };
    if (lida.status === "paid") return { fatura: lida.id, status: "paid" };
    if (lida.status !== "open" && lida.status !== "draft") return { fatura: lida.id, status: lida.status ?? "?" };
    try {
      await stripe().invoices.pay(lida.id, { paid_out_of_band: true }, { idempotencyKey: chaveDoPrePago("fatura", pagamentoId) });
    } catch (erro) {
      // Dois ao mesmo tempo: o outro pagou no meio. Só o estado da fatura decide.
      if ((await stripe().invoices.retrieve(lida.id)).status !== "paid") throw erro;
    }
    return { fatura: lida.id, status: "paid" };
  } catch (erro) {
    throw erroSemMensagem(erro, "a fatura da assinatura pré-paga");
  }
}

/** Um pagamento Pix NOSSO ainda à espera (o QR aberto, ou vencido sem pagar). `precoId`: o preço de quando nasceu — só se reaproveita o do MESMO preço. */
export type PixPendente = { id: string; segredo: string; plano: string; precoId: string | null; resumoDaTentativa: string | null };
/** Os estados em que o pagamento ainda pode ser pago ou cancelado — nunca `processing` nem `succeeded`. */
const PENDENTES: ReadonlySet<string> = new Set(["requires_payment_method", "requires_confirmation", "requires_action"]);

/**
 * Os pagamentos Pix NOSSOS deste cliente ainda à espera: o novo clique segue com o do mesmo plano (o
 * mesmo QR), e cancela os outros — como o checkout cancela a incompleta de outro plano. Sem isto, dois
 * QRs abertos podiam ser pagos os dois.
 */
export async function pagamentosPixPendentes(clienteId: string): Promise<PixPendente[]> {
  try {
    const lista = await stripe().paymentIntents.list({ customer: clienteId, limit: 20 });
    return lista.data
      .filter((p) => PENDENTES.has(p.status) && Boolean(p.metadata[MARCA_DO_PREPAGO]) && Boolean(p.client_secret))
      .map((p) => ({ id: p.id, segredo: p.client_secret ?? "", plano: p.metadata[MARCA_DO_PREPAGO] ?? "", precoId: p.metadata.precoId || null, resumoDaTentativa: p.metadata[METADADOS_DO_VISITANTE.tentativa] || null }));
  } catch (erro) {
    throw erroSemMensagem(erro, "a lista dos pagamentos Pix do cliente");
  }
}

/** Cancela um pagamento Pix à espera. O que já foi pago (ou está em processamento) não se cancela: a Stripe recusa, e o erro sobe. */
export async function cancelarPagamentoPix(id: string): Promise<void> {
  try {
    await stripe().paymentIntents.cancel(id);
  } catch (erro) {
    throw erroSemMensagem(erro, "o cancelamento do pagamento Pix");
  }
}

/**
 * UM PAGAMENTO ABERTO POR VEZ, no sentido do cartão: quando a pessoa segue por CARTÃO (o checkout,
 * logado ou sem login), todo Pix NOSSO à espera deste cliente é cancelado — o QR copiado no app do
 * banco podia ser pago depois do cartão, e nasceriam duas assinaturas. Devolve quantos cancelou.
 * Sem o Pix configurado não há QR nenhum, e não vai à Stripe.
 */
export async function cancelarPagamentosPixPendentes(clienteId: string): Promise<number> {
  if (!pixConfigurado()) return 0;
  const pendentes = await pagamentosPixPendentes(clienteId);
  for (const pendente of pendentes) await cancelarPagamentoPix(pendente.id);
  return pendentes.length;
}

/**
 * OS PIX NOSSOS JÁ PAGOS deste cliente (achado 4 do passo 6, 29/10/2026): entre o Pix cair e o aviso
 * chegar (segundos; horas, se o aviso estiver falhando) a assinatura ainda não existe, e quem olhasse só
 * as assinaturas e os Pix à espera trataria a pessoa como quem nunca pagou — outro QR, outro cartão, a
 * tentativa da ficha trocada por um clique alheio. Quem chama processa cada um pela rotina do aviso
 * (`processarPixPago`, `assinaturas.ts`) antes de decidir. Só `succeeded`: o Pix é de notificação
 * imediata (`requires_action` → `succeeded` | `requires_payment_method`); `processing` não entra.
 * Sem o Pix configurado não há Pix nenhum, e não vai à Stripe (como `cancelarPagamentosPixPendentes`).
 */
export async function pagamentosPixPagos(clienteId: string): Promise<PagamentoPrePago[]> {
  if (!pixConfigurado()) return [];
  try {
    const lista = await stripe().paymentIntents.list({ customer: clienteId, limit: 20 });
    return lista.data
      .filter((p) => p.status === "succeeded" && Boolean(p.metadata[MARCA_DO_PREPAGO]))
      .map((p) => pagamentoPrePagoDe(p, `cliente ${clienteId}`))
      .filter((p): p is PagamentoPrePago => p !== null);
  } catch (erro) {
    throw erroSemMensagem(erro, "a lista dos pagamentos Pix pagos do cliente");
  }
}

/** Um pagamento Pix lido AGORA: o status e, se for nosso, o Pix pré-pago — para o "outro" que foi pago no meio de um cancelamento. */
export async function lerPagamentoPix(id: string): Promise<{ status: string; pagamento: PagamentoPrePago | null }> {
  try {
    const pagamento = await stripe().paymentIntents.retrieve(id);
    return { status: pagamento.status, pagamento: pagamentoPrePagoDe(pagamento, `pagamento ${id}`) };
  } catch (erro) {
    throw erroSemMensagem(erro, "a leitura do pagamento Pix");
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
