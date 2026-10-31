import type Stripe from "stripe";
import type { Plano } from "@jilson/core";
import { erroSemMensagem, stripe } from "./stripe-cliente.js";
import { MARCA_DO_PREPAGO, METADADO_DO_PIX, METADADO_PAGO_POR_FORA, METADADOS_DO_VISITANTE, metadadosDoVisitante, pagamentoPrePagoDe, type PagamentoPrePago, type TentativaDoVisitante } from "./stripe.js";

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
// espelho e a lista das assinaturas do cliente (`assinaturasDoPix`) a acham depois. A regra de quando cada camada é
// consultada mora em `assinaturas.ts` (`processarPixPrePago`).
// Pagar de novo é SÓ depois de o período acabar (decisão do operador, 28/10/2026): não há soma de tempo.

/** Quanto tempo o QR do Pix vale: 1 hora (decisão do operador, 28/10/2026, na abertura do passo 2 da etapa 4.9). */
export const VALIDADE_DO_PIX_EM_SEGUNDOS = 60 * 60;

/** De quantos em quantos minutos a chave de repetição da Stripe muda (como `chaveDaDevolucao`, `stripe-reembolso.ts`). */
const JANELA_DA_CHAVE = 5 * 60 * 1000;

/**
 * A chave de repetição da criação (pelo id do Pix) e do pagar-por-fora (pelo id da FATURA — achado 5 da
 * segunda revisão: pelo Pix, duas faturas na mesma janela dividiriam a chave), com a JANELA de 5 minutos
 * (achado 5 do passo 6, 29/10/2026). A Stripe guarda por 24 h a primeira resposta de cada chave — INCLUSIVE
 * a falha (a lição de `chaveDaDevolucao`): com a chave fixa de antes, um 500 da Stripe na criação seria
 * devolvido de novo a cada reentrega do aviso, o dia inteiro. A janela é uma GRADE: uma nova tentativa
 * logo depois da virada cai noutra chave — por isso, antes de criar, a lista CONSISTENTE das assinaturas do
 * cliente (`assinaturasDoPix`) acha a que já nasceu. Função pura.
 */
export function chaveDoPrePago(oQue: "criar" | "fatura" | "aceitar", id: string, agora: Date = new Date()): string {
  return `prepago-${oQue}:${id}:${Math.floor(agora.getTime() / JANELA_DA_CHAVE)}`;
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
 * `chaveDoPrePago`) e garante a primeira fatura paga por fora. Devolve o id e se a fatura ficou PAGA — quem
 * chama não grava espelho de uma assinatura que não valeu (achado 3 da segunda revisão).
 */
export async function criarAssinaturaPrePaga(pagamento: PagamentoPrePago, quem: "aviso" | "operador" = "aviso"): Promise<{ id: string; faturaPaga: boolean }> {
  let assinatura: Stripe.Subscription;
  try {
    // A do OPERADOR ("Aceitar este Pix", 4.7b, passo 4c) tem a chave própria: a do aviso devolveria, na janela, a pré-paga que morreu.
    assinatura = await stripe().subscriptions.create(paraPedidoDeAssinaturaPrePaga(pagamento), { idempotencyKey: chaveDoPrePago(quem === "operador" ? "aceitar" : "criar", pagamento.id) });
  } catch (erro) {
    throw erroSemMensagem(erro, "a assinatura pré-paga do Pix");
  }
  const fatura = await garantirFaturaPaga(assinatura.id, assinatura.latest_invoice);
  return { id: assinatura.id, faturaPaga: fatura.status === "paid" };
}

/**
 * A ASSINATURA PAGA POR FORA (o "Liberar acesso pago por fora" do painel — decisão do operador, 29/10/2026, P120): o operador
 * recebeu fora da Stripe (um Pix direto, uma transferência), e o acesso sai de uma assinatura DE VERDADE — pré-paga como a
 * do Pix (`cancel_at_period_end`, sem cartão, a primeira fatura paga por fora), com a marca `pago_por_fora` (a conta do
 * operador) —, gravada pelo `sincronizar`. Nunca um desvio no gate. A chave de repetição (a conta e o plano, na janela)
 * segura o clique duplo.
 */
export async function criarAssinaturaPagaPorFora(pedido: { clienteId: string; precoId: string; plano: Plano; userId: string; operador: string }, agora: Date = new Date()): Promise<{ id: string; faturaPaga: boolean }> {
  let assinatura: Stripe.Subscription;
  try {
    assinatura = await stripe().subscriptions.create(
      {
        customer: pedido.clienteId,
        items: [{ price: pedido.precoId, quantity: 1 }],
        payment_behavior: "default_incomplete",
        cancel_at_period_end: true,
        payment_settings: { payment_method_types: ["card"], save_default_payment_method: "off" },
        metadata: { userId: pedido.userId, plano: pedido.plano, [METADADO_PAGO_POR_FORA]: pedido.operador },
        expand: ["latest_invoice"],
      },
      { idempotencyKey: `pago-por-fora:${pedido.userId}:${pedido.plano}:${Math.floor(agora.getTime() / JANELA_DA_CHAVE)}` },
    );
  } catch (erro) {
    throw erroSemMensagem(erro, "a assinatura paga por fora");
  }
  // A fatura que NÃO se pagou por fora deixa a assinatura incompleta e com a marca: ela morre agora (achado P2 da revisão do
  // bloco 4, 31/10/2026) — viva, o checkout por cartão podia reaproveitá-la, e a pessoa pagaria uma assinatura que não renova.
  let paga = false;
  try {
    paga = (await garantirFaturaPaga(assinatura.id, assinatura.latest_invoice)).status === "paid";
  } finally {
    if (!paga) await encerrarSeIncompleta(assinatura.id);
  }
  return { id: assinatura.id, faturaPaga: paga };
}

/**
 * Encerra a assinatura paga por fora que ficou INCOMPLETA — e só ela: relida agora, a que já vale (a fatura se pagou no meio
 * de uma falha de rede) fica. Se não der, é alerta: ela continua com a marca, e o checkout não a reaproveita
 * (`pagoPorFora`, `paraAssinaturaNoCheckout`).
 */
async function encerrarSeIncompleta(id: string): Promise<void> {
  try {
    if ((await stripe().subscriptions.retrieve(id)).status === "incomplete") await stripe().subscriptions.cancel(id);
  } catch (erro) {
    console.error(`[stripe] painel: a assinatura paga por fora ${id} não se pagou e NÃO foi encerrada — conferir no painel: ${erroSemMensagem(erro, "o encerramento da paga por fora incompleta").message}`);
  }
}

/** QUEM LIBEROU a assinatura paga por fora: a conta do operador na marca dela (`METADADO_PAGO_POR_FORA`), lida agora — ou nada. */
export async function operadorDaPagaPorFora(assinaturaId: string): Promise<string | null> {
  try {
    return (await stripe().subscriptions.retrieve(assinaturaId)).metadata[METADADO_PAGO_POR_FORA] || null;
  } catch (erro) {
    throw erroSemMensagem(erro, "a leitura da assinatura paga por fora");
  }
}

/** O que a fatura da pré-paga ficou: `paid`, ou o status que a Stripe diz quando não dá para pagar por fora. */
export type FaturaDaPrePaga = { fatura: string | null; status: string };

/**
 * A PRIMEIRA FATURA DA PRÉ-PAGA PAGA POR FORA — em TODO caminho, não só na criação (achado 5 do passo 6,
 * 29/10/2026): se a Stripe caiu entre o criar e o pagar, a reentrega do aviso acha a assinatura e, sem
 * isto, a sincronizaria `incomplete` — o aluno pagou o Pix e não entra. Lê a fatura (a dada, ou a última da
 * assinatura, buscada agora): `paid` → nada; `open` ou `draft` → paga por fora (idempotente na janela, pela
 * fatura); qualquer outra (anulada, incobrável) não se paga, e quem chama põe o Pix em conferência. Se o
 * pagar falhar e a fatura estiver paga (dois ao mesmo tempo), segue; se não, sobe sem a mensagem crua.
 */
export async function garantirFaturaPaga(assinaturaId: string, fatura?: Stripe.Invoice | string | null): Promise<FaturaDaPrePaga> {
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
      await stripe().invoices.pay(lida.id, { paid_out_of_band: true }, { idempotencyKey: chaveDoPrePago("fatura", lida.id) });
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

/** Nos metadados do Pix PAGO que não pôde virar assinatura sozinho: o motivo. É a marca do "em conferência". */
export const METADADO_EM_CONFERENCIA = "em_conferencia";

/**
 * Um Pix NOSSO já pago — e, se ele está EM CONFERÊNCIA (pagou e não pôde virar assinatura sozinho: o valor
 * não bate com o preço, ou a assinatura dele acabou sem ser paga — achado 4 da segunda revisão do passo 6,
 * 29/10/2026), o motivo. Em conferência, a pessoa vê o aviso dela e não paga de novo; o operador libera o
 * acesso ou devolve o Pix.
 */
export type PixPago = PagamentoPrePago & { emConferencia: string | null };

/** Os Pix NOSSOS de um cliente, lidos numa ida SÓ à Stripe: os pagos (sem os devolvidos por inteiro) e os à espera. */
export type PixDoCliente = { pagos: PixPago[]; pendentes: PixPendente[] };

/** O Pix foi devolvido por inteiro? Pela cobrança (vem expandida na lista). Na dúvida — sem a cobrança —, não. */
function devolvidoPorInteiro(pagamento: Stripe.PaymentIntent): boolean {
  const cobranca = pagamento.latest_charge;
  return typeof cobranca === "object" && cobranca !== null && cobranca.amount > 0 && cobranca.amount_refunded >= cobranca.amount;
}

/**
 * Os Pix de um cliente, separados (função pura, com teste). UMA lista para as duas perguntas — "há um Pix
 * pago?" e "há um QR à espera?" (achado 6 da segunda revisão, 29/10/2026): em duas idas, um Pix que caísse
 * entre elas não seria visto nem como pago nem como à espera, e o clique de quem soubesse só o e-mail
 * seguiria como se ninguém tivesse pago. O Pix DEVOLVIDO por inteiro não conta como pago (achado 1): ele
 * nunca vira assinatura, e a pessoa pode pagar de novo. Só `succeeded` é pago: o Pix é de notificação
 * imediata (`requires_action` → `succeeded` | `requires_payment_method`); `processing` não entra.
 */
export function paraPixDoCliente(pagamentos: Stripe.PaymentIntent[], clienteId: string): PixDoCliente {
  const nossos = pagamentos.filter((p) => Boolean(p.metadata[MARCA_DO_PREPAGO]));
  const pendentes = nossos
    .filter((p) => PENDENTES.has(p.status) && Boolean(p.client_secret))
    .map((p) => ({ id: p.id, segredo: p.client_secret ?? "", plano: p.metadata[MARCA_DO_PREPAGO] ?? "", precoId: p.metadata.precoId || null, resumoDaTentativa: p.metadata[METADADOS_DO_VISITANTE.tentativa] || null }));
  const pagos: PixPago[] = [];
  for (const p of nossos) {
    if (p.status !== "succeeded" || devolvidoPorInteiro(p)) continue;
    const pago = pagamentoPrePagoDe(p, `cliente ${clienteId}`);
    if (pago) pagos.push({ ...pago, emConferencia: p.metadata[METADADO_EM_CONFERENCIA] || null });
  }
  return { pagos, pendentes };
}

/** Os Pix NOSSOS deste cliente, numa ida só (`paraPixDoCliente`). Sem o Pix configurado não há Pix nenhum, e não vai à Stripe. */
export async function listarPixDoCliente(clienteId: string): Promise<PixDoCliente> {
  if (!pixConfigurado()) return { pagos: [], pendentes: [] };
  try {
    const lista = await stripe().paymentIntents.list({ customer: clienteId, limit: 20, expand: ["data.latest_charge"] });
    return paraPixDoCliente(lista.data, clienteId);
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

/** Um pagamento Pix lido AGORA: o status e, se for nosso, o Pix pré-pago — para o "outro" que foi pago no meio de um cancelamento. */
export async function lerPagamentoPix(id: string): Promise<{ status: string; pagamento: PagamentoPrePago | null }> {
  try {
    const pagamento = await stripe().paymentIntents.retrieve(id);
    return { status: pagamento.status, pagamento: pagamentoPrePagoDe(pagamento, `pagamento ${id}`) };
  } catch (erro) {
    throw erroSemMensagem(erro, "a leitura do pagamento Pix");
  }
}

/**
 * Põe o Pix EM CONFERÊNCIA: o motivo nos metadados dele — a marca dura, e o clique seguinte a lê na mesma
 * lista (`listarPixDoCliente`), sem processar de novo. Devolve se a marca é NOVA: quem chama alerta uma vez
 * só, não a cada clique (achado 4 da segunda revisão).
 */
export async function marcarEmConferencia(pagamentoId: string, motivo: string): Promise<boolean> {
  try {
    const pagamento = await stripe().paymentIntents.retrieve(pagamentoId);
    if (pagamento.metadata[METADADO_EM_CONFERENCIA]) return false;
    await stripe().paymentIntents.update(pagamentoId, { metadata: { [METADADO_EM_CONFERENCIA]: motivo.slice(0, 450) } });
    return true;
  } catch (erro) {
    throw erroSemMensagem(erro, "a marca de conferência do Pix");
  }
}

/** TIRA o Pix de conferência (o "Aceitar este Pix" do painel, 4.7b, passo 4c): a marca sai dos metadados dele. */
export async function tirarDeConferencia(pagamentoId: string): Promise<void> {
  try {
    await stripe().paymentIntents.update(pagamentoId, { metadata: { [METADADO_EM_CONFERENCIA]: "" } });
  } catch (erro) {
    throw erroSemMensagem(erro, "a saída do Pix da conferência");
  }
}

/** Uma assinatura pré-paga de um Pix, como a Stripe diz agora: o status e se a primeira fatura dela está paga. */
export type PrePagaDoPix = { id: string; status: string; faturaPaga: boolean };

/**
 * As assinaturas pré-pagas que um Pix já virou, pela LISTA das assinaturas do cliente — consistente, ao
 * contrário da busca por metadados, que atrasa (achado 5 da segunda revisão, 29/10/2026: com a busca, uma
 * nova tentativa logo depois de uma falha podia criar uma SEGUNDA assinatura para o mesmo Pix).
 */
export async function assinaturasDoPix(clienteId: string, pagamentoId: string): Promise<PrePagaDoPix[]> {
  try {
    const lista = await stripe().subscriptions.list({ customer: clienteId, status: "all", limit: 100, expand: ["data.latest_invoice"] });
    return lista.data
      .filter((a) => a.metadata[METADADO_DO_PIX] === pagamentoId)
      .map((a) => {
        const fatura = a.latest_invoice;
        return { id: a.id, status: a.status, faturaPaga: typeof fatura === "object" && fatura !== null && fatura.status === "paid" };
      });
  } catch (erro) {
    throw erroSemMensagem(erro, "a lista das assinaturas do Pix");
  }
}
