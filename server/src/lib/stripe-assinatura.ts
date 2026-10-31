import Stripe from "stripe";
import type { CartaoDaAssinatura, MotivoDoCancelamento, Plano } from "@jilson/core";
import { AssinaturaNaoEncontrada, erroSemMensagem, FORMAS_DE_PAGAMENTO, paraAssinaturaNaStripe, planoDoPreco, quandoAcaba, stripe, METADADO_DO_PIX } from "./stripe.js";
import { periodoDevolvido } from "./stripe-devolucao.js";
import { MARCA_DA_TROCA } from "./stripe-plano.js";

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
  /** O primeiro dia da assinatura: é dele que se conta o prazo do reembolso (trocar de plano não o muda). */
  comecouEm: Date | null;
  /** Marcada para acabar (no fim do período, ou numa data): não renova. */
  acabaEm: Date | null;
  /** Marcada para acabar NO FIM DO PERÍODO (e não numa data avulsa, posta pelo painel): diz como se desfaz. */
  acabaNoFimDoPeriodo: boolean;
  cartao: CartaoDaAssinatura | null;
  /** O cliente da Stripe que esta assinatura cobra — é dele o cartão novo. Não sai do servidor. */
  clienteId: string | null;
  /** A conta da escola que a STRIPE diz ser a dona (a que o checkout gravou lá) — ou nenhuma. Não sai do servidor. */
  userId: string | null;
  /** O Pix PRÉ-PAGO de que ela nasceu (etapa 4.9): vazio na recorrente. É ele que diz "pré-paga" à tela e às operações. Não sai do servidor. */
  pixPaymentIntentId: string | null;
  /** A última fatura, se ainda está em aberto (a cobrança falhou): é a que o cartão novo paga. Não sai do servidor. */
  faturaEmAbertoId: string | null;
  /** O item da assinatura (ela tem um só): é nele que o preço troca. Não sai do servidor. */
  itemId: string | null;
  /** O agendamento preso à assinatura (a troca marcada para o fim do período). Não sai do servidor. */
  agendamentoId: string | null;
  /** O agendamento foi criado pelo NOSSO fluxo de mudar de plano (e não pelo painel da Stripe): só esse é solto ao mudar de plano ou desistir. */
  agendamentoNosso: boolean;
  /** A troca de plano MARCADA para o fim do período pago: para qual plano e quando. Só a do NOSSO agendamento — é a que a tela deixa desfazer. */
  trocaMarcada: { plano: Plano; em: Date } | null;
  /** A fatura em aberto de uma troca na hora que NÃO se completou (o banco pediu confirmação). Não sai do servidor. */
  faturaDaTrocaId: string | null;
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
 * escolhe qual cobrar. `devolvida`: a última fatura foi devolvida por inteiro — a mesma conta do
 * espelho (`paraAssinaturaNaStripe`), para a tela e o gate nunca discordarem.
 */
export function paraDetalhesDaAssinatura(assinatura: Stripe.Subscription, devolvida: boolean = false): DetalhesDaAssinatura {
  const { status, pagoAte, clienteId, userId, pixPaymentIntentId } = paraAssinaturaNaStripe(assinatura, devolvida);
  const daAssinatura = assinatura.default_payment_method;
  const fatura = assinatura.latest_invoice;
  const itens = assinatura.items.data;
  const preco = itens[0]?.price;
  const plano = preco ? planoDoPreco(preco) : null;
  const fimDoPeriodo = itens.length > 0 ? new Date(Math.max(...itens.map((i) => i.current_period_end)) * 1000) : null;
  // A mesma conta do espelho (`quandoAcaba`): o painel e a tela do aluno nunca discordam de quando ela acaba.
  const acabaEm = quandoAcaba(assinatura);
  const doCliente = assinatura.customer;
  const padraoDoCliente = typeof doCliente === "object" && !doCliente.deleted ? doCliente.invoice_settings.default_payment_method : null;
  // O agendamento é NOSSO quando leva a marca que `agendarTroca` grava (achado da revisão de
  // segurança, 11/10/2026): um que foi posto pelo painel da Stripe não é mostrado como "troca
  // marcada" nem solto quando o aluno muda de plano.
  const nosso = typeof assinatura.schedule === "object" && assinatura.schedule !== null && assinatura.schedule.metadata?.para === MARCA_DA_TROCA;
  return {
    id: assinatura.id,
    status,
    pagoAte,
    plano,
    preco: plano && preco && preco.unit_amount !== null ? { centavos: preco.unit_amount, moeda: preco.currency } : null,
    fimDoPeriodo,
    comecouEm: typeof assinatura.start_date === "number" ? new Date(assinatura.start_date * 1000) : null,
    acabaEm,
    acabaNoFimDoPeriodo: assinatura.cancel_at_period_end,
    cartao: paraCartao(daAssinatura) ?? paraCartao(padraoDoCliente),
    clienteId,
    userId,
    pixPaymentIntentId: pixPaymentIntentId ?? null,
    faturaEmAbertoId: typeof fatura === "object" && fatura !== null && fatura.status === "open" ? fatura.id : null,
    itemId: itens[0]?.id ?? null,
    agendamentoId: typeof assinatura.schedule === "string" ? assinatura.schedule : (assinatura.schedule?.id ?? null),
    agendamentoNosso: nosso,
    trocaMarcada: nosso ? paraTrocaMarcada(assinatura.schedule, plano) : null,
    // SÓ a fatura da própria troca (achado da revisão de segurança, 11/10/2026): se a renovação
    // falhar com uma troca ainda pendente, a "última fatura em aberto" passa a ser a da
    // RENOVAÇÃO — e anulá-la com a assinatura viva a devolveria a `active`, sem pagar.
    faturaDaTrocaId: assinatura.pending_update && typeof fatura === "object" && fatura !== null && fatura.status === "open" && fatura.billing_reason === "subscription_update" ? fatura.id : null,
  };
}

/**
 * A troca de plano que o agendamento vai fazer — ou nenhuma. É a fase que começa quando a atual
 * termina, se o preço dela é de OUTRO plano. Precisa do agendamento com `phases.items.price`
 * expandido; sem isso (só o id), nenhuma. Função pura.
 */
export function paraTrocaMarcada(agendamento: Stripe.Subscription["schedule"], planoDeHoje: Plano | null): { plano: Plano; em: Date } | null {
  if (!agendamento || typeof agendamento === "string") return null;
  const fimDaAtual = agendamento.current_phase?.end_date;
  if (!fimDaAtual) return null;
  const proxima = agendamento.phases.find((fase) => fase.start_date === fimDaAtual);
  const preco = proxima?.items[0]?.price;
  if (!preco || typeof preco === "string" || preco.deleted) return null;
  const plano = planoDoPreco(preco);
  if (!plano || plano === planoDeHoje) return null;
  return { plano, em: new Date(fimDaAtual * 1000) };
}

/**
 * O que toda leitura dos detalhes pede junto: sem isto a tela não teria cartão nem "pago até" —
 * e os pagamentos da última fatura, para saber se ela foi devolvida, e o agendamento com o preço
 * de cada fase, para saber se há uma troca de plano marcada (`[FATO — medido, 11/10/2026]` a
 * Stripe aceita expandir até ali).
 */
const COM_OS_DETALHES = ["latest_invoice.payments", "default_payment_method", "customer.invoice_settings.default_payment_method", "schedule.phases.items.price"];

/** Os detalhes, já sabendo se a última fatura foi devolvida (uma ida a mais à Stripe, só quando há o que conferir). */
async function comADevolucao(assinatura: Stripe.Subscription): Promise<DetalhesDaAssinatura> {
  return paraDetalhesDaAssinatura(assinatura, await periodoDevolvido(assinatura, assinatura.metadata[METADADO_DO_PIX] || null));
}

/** A assinatura como a Stripe diz AGORA, para a tela. A que ela não conhece: `AssinaturaNaoEncontrada`. */
export async function buscarDetalhes(id: string): Promise<DetalhesDaAssinatura> {
  try {
    return await comADevolucao(await stripe().subscriptions.retrieve(id, { expand: COM_OS_DETALHES }));
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

/**
 * Tira da Stripe TODOS os cartões do cliente, menos este (abertura do passo 7 — achado da revisão
 * de segurança, 11/10/2026): o que era da assinatura, o que foi confirmado e nunca aplicado (aba
 * fechada, segunda aba) e o padrão do cliente. Cartão que a pessoa substituiu não fica guardado.
 * Um que não saia não segura os outros: tenta todos, e a falha sobe no fim. Devolve quantos saíram.
 */
export async function soltarOutrosCartoes(clienteId: string, manter: string): Promise<number> {
  // FECHA na dúvida: sem saber qual manter, tiraria o cartão que acabou de entrar.
  if (!clienteId || !manter) throw new Error("[stripe] a remoção dos cartões antigos sem o cliente ou sem o cartão a manter");
  let outros: string[];
  try {
    const lista = await stripe().customers.listPaymentMethods(clienteId, { type: "card", limit: 100 });
    outros = lista.data.map((forma) => forma.id).filter((id) => id !== manter);
  } catch (erro) {
    throw erroSemMensagem(erro, "a lista dos cartões do cliente");
  }
  let falha: unknown = null;
  let sairam = 0;
  for (const id of outros) {
    try {
      await stripe().paymentMethods.detach(id);
      sairam += 1;
    } catch (erro) {
      falha ??= erro;
    }
  }
  if (falha) throw erroSemMensagem(falha, "a remoção de um cartão antigo");
  return sairam;
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

// PARAR A RENOVAÇÃO E DESFAZER (passo 7 — billing.md → Reembolso e Cancelamento dentro do site).
// Parar é MARCAR a assinatura para acabar no fim do período pago (`cancel_at_period_end`), nunca
// encerrá-la: ela segue `active`, o gate não muda, e dá para voltar atrás sem pagar nada. O MOTIVO
// fica guardado na Stripe, em cada assinatura: a lista dela é fixa (oito valores), então vai o
// par mais próximo no campo dela e o NOSSO motivo, exato, em `metadata.motivo` — é o que o painel
// da escola (etapa 4.7b) vai contar. O comentário é texto livre do aluno: vai à Stripe e NUNCA ao
// registro.

/** O par de cada motivo na lista fixa da Stripe. "Já aprendi o que precisava" não tem par: é "outro". */
const MOTIVO_NA_STRIPE: Record<MotivoDoCancelamento, Stripe.SubscriptionUpdateParams.CancellationDetails.Feedback> = {
  caro: "too_expensive",
  "sem-tempo": "unused",
  "ja-aprendi": "other",
  "sem-conteudo": "missing_features",
  outro: "other",
};

/** O que a pessoa disse ao cancelar — os dois são opcionais. */
export type MotivoDado = { motivo?: MotivoDoCancelamento; comentario?: string };

/** O motivo no formato da Stripe, só com o que foi dito. Função pura. */
export function paraMotivoNaStripe(dado: MotivoDado): { cancellation_details?: { feedback?: Stripe.SubscriptionUpdateParams.CancellationDetails.Feedback; comment?: string }; metadata?: { motivo: string } } {
  const comentario = dado.comentario?.trim();
  if (!dado.motivo && !comentario) return {};
  return {
    cancellation_details: { ...(dado.motivo ? { feedback: MOTIVO_NA_STRIPE[dado.motivo] } : {}), ...(comentario ? { comment: comentario } : {}) },
    ...(dado.motivo ? { metadata: { motivo: dado.motivo } } : {}),
  };
}

/**
 * O pedido de parar a renovação. Função pura, com teste. Só vai o que foi dito: repetir o pedido
 * sem motivo não apaga o motivo dado antes (repetir não faz mal).
 */
export function paraPedidoDeParar(dado: MotivoDado): Stripe.SubscriptionUpdateParams {
  return { cancel_at_period_end: true, ...paraMotivoNaStripe(dado) };
}

/**
 * O pedido de voltar atrás. Função pura, com teste. Desfaz a marca que existe — a do fim do
 * período, ou a data avulsa (as duas juntas a Stripe recusa) — e APAGA o motivo: quem ficou não
 * cancelou, e um motivo velho contaria como cancelamento no painel.
 */
export function paraPedidoDeManter(acabaNoFimDoPeriodo: boolean): Stripe.SubscriptionUpdateParams {
  return {
    ...(acabaNoFimDoPeriodo ? { cancel_at_period_end: false } : { cancel_at: "" }),
    cancellation_details: { feedback: "", comment: "" },
    metadata: { motivo: "" },
  };
}

/** Marca a assinatura para acabar no fim do período pago. Devolve-a como a Stripe passou a dizer. */
export async function pararRenovacao(id: string, dado: MotivoDado): Promise<DetalhesDaAssinatura> {
  try {
    return await comADevolucao(await stripe().subscriptions.update(id, { ...paraPedidoDeParar(dado), expand: COM_OS_DETALHES }));
  } catch (erro) {
    throw erroSemMensagem(erro, "a parada da renovação");
  }
}

/** Tira a marca de acabar: a assinatura volta a renovar. Devolve-a como a Stripe passou a dizer. */
export async function retomarRenovacao(id: string, acabaNoFimDoPeriodo: boolean): Promise<DetalhesDaAssinatura> {
  try {
    return await comADevolucao(await stripe().subscriptions.update(id, { ...paraPedidoDeManter(acabaNoFimDoPeriodo), expand: COM_OS_DETALHES }));
  } catch (erro) {
    throw erroSemMensagem(erro, "a retomada da renovação");
  }
}
