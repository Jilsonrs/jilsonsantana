import Stripe from "stripe";
import { DuracaoDoDesconto, PLANOS, formatarDocumentoFiscal, type DescontoDoCodigo, type DocumentoFiscal, type Plano, type TipoDeDocumento } from "@jilson/core";
import { erroSemMensagem, stripe } from "./stripe-cliente.js";
import { periodoDevolvido } from "./stripe-devolucao.js";

// A biblioteca já com a chave e o erro sem a mensagem dela moram em `stripe-cliente.ts`, e saem
// por aqui para quem já os importava deste arquivo.
export { erroSemMensagem, stripe };

// A NOSSA FRONTEIRA COM A STRIPE (Fase 4, etapa 4.1 — billing.md; CLAUDE.md → Membership
// Gating). Tudo que fala com a Stripe passa por aqui — e, para gerir uma assinatura que já
// existe (etapa 4.6), por `stripe-assinatura.ts`, a outra metade desta fronteira. As chaves vivem SÓ no ambiente do
// servidor (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) e nunca vão para o site nem para o
// registro. Os testes simulam SÓ o que vai à rede (`buscarAssinatura`); a verificação do aviso
// roda de verdade.
//
// A versão da API é a que a biblioteca fixa (`stripe@23.0.0` → 2026-09-30). Dois fatos dela que
// este arquivo usa (context7 /websites/stripe e os tipos da biblioteca, 09/10/2026): o fim do
// período fica em CADA ITEM da assinatura (não mais na assinatura), e a fatura aponta a
// assinatura em `parent.subscription_details.subscription`.

/**
 * O aviso da Stripe, já verificado: só o que o servidor usa. `pagamento`: o aviso de DINHEIRO
 * DEVOLVIDO fala de uma cobrança, não de uma assinatura — a assinatura se acha pelo pagamento.
 * `devolucaoFalhou`: uma devolução que tinha sido aceita FALHOU depois — o dinheiro não voltou.
 */
export type AvisoDaStripe = { id: string; tipo: string; assinatura: string | null; pagamento?: string | null; devolucaoFalhou?: boolean; pagamentoPrePago?: PagamentoPrePago | null };

/**
 * O PIX PRÉ-PAGO que CAIU (etapa 4.9 — billing.md → *Formas de pagamento*): o aviso
 * `payment_intent.succeeded` de um pagamento NOSSO, marcado nos metadados com o plano
 * (`MARCA_DO_PREPAGO`). É dele que a assinatura pré-paga nasce (`stripe-pix.ts`, `assinaturas.ts`).
 */
export type PagamentoPrePago = {
  id: string;
  plano: Plano;
  precoId: string;
  clienteId: string;
  livemode: boolean;
  centavos: number;
  /** A conta logada que pagou — ou a tentativa do visitante (a ficha, o resumo e a escolha), como na assinatura. */
  userId: string | null;
  visitante: TentativaDoVisitante | null;
};
/** Nos metadados do pagamento Pix: a chave cujo valor é o PLANO. Pagamento sem ela não é nosso. */
export const MARCA_DO_PREPAGO = "prepago";
/** Nos metadados da assinatura pré-paga: o id do pagamento Pix de que ela nasceu. */
export const METADADO_DO_PIX = "pix_payment_intent";

/** A assinatura como a Stripe diz AGORA, no formato que o espelho guarda. */
export type AssinaturaNaStripe = {
  id: string;
  status: string;
  /**
   * Até quando está PAGO — é o `currentPeriodEnd` do espelho, que a regra do gate lê ("o
   * período já foi pago", CLAUDE.md → Membership Gating). Quando uma renovação falha, a Stripe
   * já avançou o período ANTES de cobrar: o fim do período atual seria um mês não pago. Por
   * isso: última fatura paga → o fim do período atual; senão → o COMEÇO dele, que é onde o
   * último período pago terminou. A fatura DEVOLVIDA POR INTEIRO não conta como paga (etapa
   * 4.6): na Stripe ela continua `paid`, e quem diz que o dinheiro voltou é a cobrança.
   */
  pagoAte: Date | null;
  clienteId: string | null;
  /** A conta da escola, que o NOSSO checkout grava na assinatura e no cliente da Stripe. */
  userId: string | null;
  /**
   * A ficha de espera do VISITANTE (etapa 4.7, passo 4): quem assinou sem conta. É por ela que a
   * conta nasce quando o pagamento passa (`pedido-do-visitante.ts`). Vazio: não veio de um
   * visitante (ou a assinatura já tem conta).
   */
  pedido?: string | null;
  /** O que o visitante escolheu NAQUELA tentativa — vai na assinatura, presa à que foi paga. */
  doVisitante?: DadosDoVisitante;
  /**
   * Assinatura de verdade (`true`) ou do MODO DE TESTE (`false`). Até o lançamento o site no
   * ar usa as chaves de teste (plano, Fase 4, etapa 4.3); no GO-LIVE, as de teste saem do banco
   * de produção (Fase 7) — senão dariam acesso para sempre (achado P2 da revisão, 09/10/2026).
   */
  livemode: boolean;
  /**
   * Quando a Stripe vai tentar cobrar de novo a última fatura, ainda aberta (`next_payment_attempt`
   * — etapa 4.7, passo 7). Vazio: nenhuma tentativa marcada (elas acabaram, ou a fatura não está
   * aberta). Só para o texto do e-mail da cobrança que falhou: nunca decide acesso.
   */
  proximaTentativa?: Date | null;
  /** Encerrada porque as tentativas de cobrança acabaram (`cancellation_details.reason`). Só escolhe o texto do e-mail. */
  encerradaSemPagamento?: boolean;
  /** O Pix pré-pago de que ela nasceu (etapa 4.9), pelos metadados; vazio = recorrente. */
  pixPaymentIntentId?: string | null;
};

/**
 * O que a assinatura de um VISITANTE carrega para a conta que vai nascer dela (etapa 4.7, passo 4):
 * a caixa "quero receber novidades" (desmarcada de fábrica — LGPD: sem a marca, é não) e de onde
 * a pessoa veio (o UTM do primeiro acesso). Vai na assinatura, e não na ficha de espera, porque
 * cada tentativa leva a escolha de quem a fez: vale a da tentativa que foi PAGA.
 */
export type DadosDoVisitante = { novidades: boolean; origem: string | null; campanha: string | null };

/** As chaves desses dados na `metadata` da assinatura — quem escreve (o checkout do visitante) e quem lê usam as mesmas. */
export const METADADOS_DO_VISITANTE = { pedido: "pedido", tentativa: "tentativa", novidades: "novidades", origem: "origem", campanha: "campanha" } as const;
/** O valor de "quero receber novidades" marcado. Qualquer outro (ou nenhum) é NÃO. */
export const NOVIDADES_SIM = "sim";

/** A Stripe está configurada para cobrar? Sem a chave secreta, a tela de assinar não abre. */
export function cobrancaConfigurada(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * A chave que o SITE usa para abrir o campo do cartão. Não é segredo, mas sai daqui (etapa 4.2):
 * trocar de ambiente é trocar variável num lugar só. Só sai se tiver cara de chave publicável
 * (`pk_`): a SECRETA colada na variável errada nunca vai ao navegador — sem ela, não há tela.
 */
export function chavePublicavel(): string | null {
  const chave = process.env.STRIPE_PUBLISHABLE_KEY;
  return chave && chave.startsWith("pk_") ? chave : null;
}

// OS PREÇOS SE ACHAM PELA LOOKUP KEY, nunca por ID nem por nome (convenção da etapa 4.0): não há
// código de preço para colar em nenhum ambiente, e no lançamento basta repetir as mesmas chaves
// na conta de verdade.
const CHAVE_DO_PRECO: Record<Plano, string> = { mensal: "assinatura_mensal", anual: "assinatura_anual" };
const INTERVALO: Record<Plano, Stripe.Price.Recurring.Interval> = { mensal: "month", anual: "year" };

/**
 * De que plano é este preço — pelo INTERVALO da cobrança, e não pela lookup key: a chave passa
 * para o preço novo quando o valor do plano muda, e quem assinou antes continua no preço antigo,
 * sem chave. Preço que não renova por mês nem por ano (de um em um): nenhum. Função pura.
 */
export function planoDoPreco(preco: Stripe.Price): Plano | null {
  if (preco.recurring?.interval_count !== 1) return null;
  return PLANOS.find((plano) => INTERVALO[plano] === preco.recurring?.interval) ?? null;
}

/** O preço de um plano como a Stripe diz AGORA. O `precoId` não sai do servidor. */
export type PrecoDoPlano = { plano: Plano; precoId: string; centavos: number; moeda: string };

/**
 * Os dois planos, a partir dos preços da Stripe. LANÇA se um faltar ou vier trocado (a chave do
 * mensal num preço que renova por ano): a tela mostraria "mensal" numa cobrança anual. Função pura.
 */
export function paraPrecosDosPlanos(precos: Stripe.Price[]): PrecoDoPlano[] {
  return PLANOS.map((plano) => {
    const preco = precos.find((p) => p.lookup_key === CHAVE_DO_PRECO[plano]);
    const certo = preco && preco.active && preco.unit_amount !== null && preco.recurring?.interval === INTERVALO[plano] && preco.recurring.interval_count === 1;
    if (!certo || preco.unit_amount === null) throw new Error(`[stripe] o preço do plano ${plano} (${CHAVE_DO_PRECO[plano]}) não existe, está inativo ou veio trocado`);
    return { plano, precoId: preco.id, centavos: preco.unit_amount, moeda: preco.currency };
  });
}

/** Os preços dos dois planos, lidos da Stripe: o valor mostrado é o valor cobrado. */
export async function buscarPrecos(): Promise<PrecoDoPlano[]> {
  try {
    const precos = await stripe().prices.list({ lookup_keys: Object.values(CHAVE_DO_PRECO), active: true, limit: 10 });
    return paraPrecosDosPlanos(precos.data);
  } catch (erro) {
    throw erroSemMensagem(erro, "a busca dos preços");
  }
}

/** O código promocional como a tela o descreve. O `id` não sai do servidor. */
export type CodigoPromocional = { id: string; desconto: DescontoDoCodigo };

// A duração na Stripe é uma lista ABERTA (os tipos da `stripe@23.0.0` aceitam valor novo): o que
// não estiver aqui não tem como ser descrito na tela, e o código é tratado como inválido.
const DURACAO: Partial<Record<string, DuracaoDoDesconto>> = {
  forever: DuracaoDoDesconto.PARA_SEMPRE,
  once: DuracaoDoDesconto.UMA_VEZ,
  repeating: DuracaoDoDesconto.POR_MESES,
};

/** O código promocional da Stripe (com o cupom expandido) no formato da tela — ou nada. Função pura. */
export function paraCodigoPromocional(codigo: Stripe.PromotionCode): CodigoPromocional | null {
  const cupom = codigo.promotion.coupon;
  if (!codigo.active || typeof cupom !== "object" || cupom === null || !cupom.valid) return null;
  const duracao = DURACAO[cupom.duration];
  if (!duracao || (cupom.percent_off === null && cupom.amount_off === null)) return null;
  const meses = duracao === DuracaoDoDesconto.POR_MESES ? cupom.duration_in_months : null;
  return { id: codigo.id, desconto: { percentual: cupom.percent_off, centavos: cupom.amount_off, duracao, meses } };
}

/** O código promocional que o aluno digitou, se existir e ainda valer (a Stripe não diferencia maiúsculas). */
export async function buscarCodigo(codigo: string): Promise<CodigoPromocional | null> {
  try {
    const achados = await stripe().promotionCodes.list({ code: codigo, active: true, limit: 1, expand: ["data.promotion.coupon"] });
    const achado = achados.data[0];
    return achado ? paraCodigoPromocional(achado) : null;
  } catch (erro) {
    throw erroSemMensagem(erro, "a busca do código promocional");
  }
}

/**
 * Quanto se paga HOJE por este plano com este código — a conta é da Stripe (a prévia da fatura),
 * nunca nossa: o valor mostrado é o valor cobrado. Não gasta uso do código. Devolve nada quando
 * a Stripe recusa o DESCONTO nesta compra (outra moeda, valor mínimo); qualquer outra falha sobe.
 */
export async function calcularPrevia(precoId: string, codigoId: string): Promise<{ centavosHoje: number; moeda: string } | null> {
  try {
    const fatura = await stripe().invoices.createPreview({
      subscription_details: { items: [{ price: precoId, quantity: 1 }] },
      discounts: [{ promotion_code: codigoId }],
    });
    return { centavosHoje: fatura.total, moeda: fatura.currency };
  } catch (erro) {
    if (erro instanceof Stripe.errors.StripeInvalidRequestError && erro.param?.startsWith("discounts")) return null;
    throw erroSemMensagem(erro, "a prévia da assinatura");
  }
}

/** Uma assinatura como o CHECKOUT a vê na Stripe, agora: só o que ele decide com ela. */
export type AssinaturaNoCheckout = {
  id: string;
  status: string;
  /**
   * O PREÇO de verdade do item da assinatura — é por ele que uma nova tentativa reaproveita a
   * incompleta, nunca por um rótulo: se o preço do plano mudar, a incompleta antiga cobraria o
   * valor velho com a tela mostrando o novo (achado da revisão de segurança, 10/10/2026).
   */
  precoId: string | null;
  /** O código promocional com que o NOSSO checkout a criou (metadata). */
  codigoId: string | null;
  /** O segredo para o site confirmar o pagamento de hoje — só com a fatura ainda aberta. */
  segredoDoPagamento: string | null;
  /** O segredo para o site guardar o cartão quando hoje não há o que pagar. */
  segredoDoCartao: string | null;
  /**
   * O RESUMO da tentativa do VISITANTE com que ela nasceu (etapa 4.7, passo 4; só o resumo desde o
   * passo 6b — `tentativa-do-visitante.ts`). Só quem traz a tentativa segue com ela: sem isso, quem
   * soubesse o e-mail de alguém receberia o segredo do pagamento dessa pessoa.
   */
  resumoDaTentativa?: string | null;
  /**
   * A Stripe CANCELOU o pagamento de hoje desta assinatura (etapa 4.7, passo 4). `[FATO — medido na
   * área restrita, 21/10/2026]` depois de 10 recusas no mesmo pagamento ela o cancela sozinha, e a
   * assinatura continua incompleta, com a fatura aberta e o segredo do pagamento morto: entregar esse
   * segredo de novo deixaria a pessoa presa num pagamento que não aceita mais cartão nenhum.
   */
  pagamentoCancelado?: boolean;
  /**
   * O número fiscal do Brasil com que a FATURA desta assinatura foi fechada (`chaveDoNumeroFiscal`), ou
   * nada. É com ele — e não com o que a ficha do cliente tem agora — que se decide reaproveitar uma
   * incompleta (achado P2 da revisão de segurança do passo 6, 27/10/2026): um clique que trocou o
   * número na ficha e falhou antes de cancelar a incompleta antiga deixaria a fatura dela com o número
   * antigo, e o clique seguinte, com o número novo, ouviria "não mudou".
   */
  numeroFiscalDaFatura?: string | null;
};

/** O número fiscal como chave de comparação: o tipo da Stripe e o número com a pontuação de costume. Função pura. */
export function chaveDoNumeroFiscal(documento: DocumentoFiscal): string {
  const numero = paraNumeroFiscal(documento);
  return `${numero.type}:${numero.value}`;
}

/** A assinatura da Stripe (com a fatura e o pedido de cartão expandidos) no formato do checkout. Função pura. */
export function paraAssinaturaNoCheckout(assinatura: Stripe.Subscription): AssinaturaNoCheckout {
  const fatura = assinatura.latest_invoice;
  const aberta = typeof fatura === "object" && fatura !== null && fatura.status === "open";
  const cartao = assinatura.pending_setup_intent;
  const segredo = aberta ? (fatura.confirmation_secret?.client_secret ?? null) : null;
  const pagamentoDeHoje = segredo?.split("_secret_")[0] ?? null;
  const cancelado = (aberta ? (fatura.payments?.data ?? []) : []).some((p) => {
    const doPagamento = p.payment.payment_intent;
    return p.status === "canceled" && (typeof doPagamento === "string" ? doPagamento : doPagamento?.id) === pagamentoDeHoje;
  });
  return {
    id: assinatura.id,
    status: assinatura.status,
    precoId: assinatura.items.data[0]?.price.id ?? null,
    codigoId: assinatura.metadata.codigo || null,
    segredoDoPagamento: segredo,
    segredoDoCartao: typeof cartao === "object" && cartao !== null ? cartao.client_secret : null,
    resumoDaTentativa: assinatura.metadata[METADADOS_DO_VISITANTE.tentativa] || null,
    pagamentoCancelado: pagamentoDeHoje !== null && cancelado,
    numeroFiscalDaFatura: numeroFiscalDoBrasil(typeof fatura === "object" && fatura !== null ? fatura.customer_tax_ids : null),
  };
}

// Os pagamentos da fatura vêm junto para o checkout saber se a Stripe cancelou o de hoje (`pagamentoCancelado`).
const DO_CHECKOUT = ["latest_invoice.confirmation_secret", "latest_invoice.payments", "pending_setup_intent"];

export type ContaDoCliente = { userId: string; email: string; nome: string | null };

/** O pedido de cliente que vai à Stripe. Função pura, com teste: sem o `userId` aqui, todo pagante vira "sem conta". */
export function paraPedidoDeCliente(conta: ContaDoCliente): Stripe.CustomerCreateParams {
  return { email: conta.email, name: conta.nome ?? undefined, metadata: { userId: conta.userId } };
}

/**
 * Um cliente novo na Stripe para esta conta. O `userId` vai no cliente: é por ele que o aviso
 * liga a assinatura à conta (`assinaturas.ts`). Quem garante UM cliente por conta é a tabela
 * `stripe_customer` e a trava do checkout — sem chave de repetição aqui, de propósito: ela
 * devolveria por 24 h o MESMO cliente, mesmo depois de ele ser apagado no painel.
 */
export async function criarCliente(conta: ContaDoCliente): Promise<{ id: string; livemode: boolean }> {
  try {
    const cliente = await stripe().customers.create(paraPedidoDeCliente(conta));
    return { id: cliente.id, livemode: cliente.livemode };
  } catch (erro) {
    throw erroSemMensagem(erro, "a criação do cliente");
  }
}

// O CLIENTE DO VISITANTE (etapa 4.7, passo 4 — billing.md → *Assinar sem conta*): nasce com o
// e-mail e o CPF ou CNPJ, ANTES da assinatura — a primeira fatura é fechada quando a assinatura
// nasce, e leva o número fiscal que o cliente tiver naquela hora. O número fica SÓ na Stripe
// (decisão do operador, 12/10/2026). A Stripe confere só o formato (`tax_id_invalid`), nunca na
// Receita: o dígito quem confere é o `core` (`lerDocumentoFiscal`), antes de chegar aqui.

/** O tipo do número fiscal do Brasil na Stripe. */
const TIPO_NA_STRIPE: Record<TipoDeDocumento, Stripe.CustomerCreateParams.TaxIdDatum.Type> = { cpf: "br_cpf", cnpj: "br_cnpj" };

/** O número fiscal como vai à Stripe: o tipo dela e o número com a pontuação de costume. Função pura. */
export function paraNumeroFiscal(documento: DocumentoFiscal): { type: Stripe.CustomerCreateParams.TaxIdDatum.Type; value: string } {
  return { type: TIPO_NA_STRIPE[documento.tipo], value: formatarDocumentoFiscal(documento) };
}

export type ClienteDoVisitante = { pedido: string; email: string; documento: DocumentoFiscal };

/** O pedido de cliente do visitante. Função pura, com teste: sem a ficha aqui, a conta não nasceria da assinatura criada no painel. */
export function paraPedidoDeClienteDoVisitante(cliente: ClienteDoVisitante): Stripe.CustomerCreateParams {
  return { email: cliente.email, tax_id_data: [paraNumeroFiscal(cliente.documento)], metadata: { [METADADOS_DO_VISITANTE.pedido]: cliente.pedido } };
}

/**
 * A Stripe recusou o número fiscal (`tax_id_invalid`) — que o `core` já tinha conferido. Precisa de
 * gente (o formato mudou? o CNPJ com letras?), e quem assina lê "confira o número". Só o tipo na mensagem.
 */
export class DocumentoRecusado extends Error {
  constructor(tipo: TipoDeDocumento) {
    super(`[stripe] a Stripe recusou o ${tipo.toUpperCase()} que o core aceitou`);
    this.name = "DocumentoRecusado";
  }
}

function recusouODocumento(erro: unknown): boolean {
  return erro instanceof Stripe.errors.StripeInvalidRequestError && erro.code === "tax_id_invalid";
}

/** Um cliente novo na Stripe para a ficha do visitante, com o e-mail e o número fiscal. */
export async function criarClienteDoVisitante(cliente: ClienteDoVisitante): Promise<{ id: string; livemode: boolean }> {
  try {
    const criado = await stripe().customers.create(paraPedidoDeClienteDoVisitante(cliente));
    return { id: criado.id, livemode: criado.livemode };
  } catch (erro) {
    if (recusouODocumento(erro)) throw new DocumentoRecusado(cliente.documento.tipo);
    throw erroSemMensagem(erro, "a criação do cliente do visitante");
  }
}

/** O número do Brasil entre os números fiscais (de uma fatura), como `chaveDoNumeroFiscal`. Função pura. */
function numeroFiscalDoBrasil(numeros: ReadonlyArray<{ type: string; value: string | null }> | null | undefined): string | null {
  const doBrasil = (numeros ?? []).find((n) => (n.type === "br_cpf" || n.type === "br_cnpj") && n.value);
  return doBrasil ? `${doBrasil.type}:${doBrasil.value}` : null;
}

/**
 * Deixa no cliente o número fiscal desta tentativa (quem corrigiu o CPF entre um clique e outro):
 * igual ao que já está, nada; diferente, entra o novo e saem os do Brasil que estavam. Devolve se
 * MUDOU — e aí a tentativa anterior não serve mais, porque a fatura dela leva o número antigo.
 */
export async function acertarNumeroFiscal(clienteId: string, documento: DocumentoFiscal): Promise<boolean> {
  const novo = paraNumeroFiscal(documento);
  try {
    const guardados = (await stripe().customers.listTaxIds(clienteId, { limit: 20 })).data.filter((t) => t.type === "br_cpf" || t.type === "br_cnpj");
    if (guardados.length === 1 && guardados[0]?.type === novo.type && guardados[0].value === novo.value) return false;
    await stripe().customers.createTaxId(clienteId, novo);
    for (const antigo of guardados) await stripe().customers.deleteTaxId(clienteId, antigo.id);
    return true;
  } catch (erro) {
    if (recusouODocumento(erro)) throw new DocumentoRecusado(documento.tipo);
    throw erroSemMensagem(erro, "a troca do número fiscal do cliente");
  }
}

/** As assinaturas deste cliente na Stripe, AGORA — de qualquer status (as últimas 20). */
export async function assinaturasDoCliente(clienteId: string): Promise<AssinaturaNoCheckout[]> {
  try {
    const lista = await stripe().subscriptions.list({ customer: clienteId, status: "all", limit: 20, expand: DO_CHECKOUT.map((campo) => `data.${campo}`) });
    return lista.data.map(paraAssinaturaNoCheckout);
  } catch (erro) {
    throw erroSemMensagem(erro, "a lista de assinaturas do cliente");
  }
}

/**
 * Cancela uma assinatura que estava INCOMPLETA e devolve o status em que ela ficou.
 * `[FATO — medido na área restrita, 10/10/2026]` a incompleta vai para `incomplete_expired`, e a
 * fatura dela é anulada. Qualquer outro status quer dizer que ela NÃO estava mais incompleta.
 */
export async function cancelarIncompleta(id: string): Promise<string> {
  try {
    return (await stripe().subscriptions.cancel(id)).status;
  } catch (erro) {
    throw erroSemMensagem(erro, "o cancelamento da assinatura incompleta");
  }
}

// AS FORMAS DE PAGAMENTO DA ASSINATURA — uma lista só, aqui. Nesta etapa, cartão; o Pix (etapa
// 4.9) é um item a mais, com o mandato. O SITE recebe esta mesma lista (`GET /api/billing/planos`)
// para abrir o campo de pagamento: as duas pontas nunca discordam.
export const FORMAS_DE_PAGAMENTO: Stripe.SubscriptionCreateParams.PaymentSettings.PaymentMethodType[] = ["card"];

/**
 * A tentativa do VISITANTE (etapa 4.7, passo 4): a ficha de espera, o código desta tentativa e o
 * que ele escolheu — tudo na assinatura, para a conta nascer dela com a escolha de quem PAGOU.
 */
export type TentativaDoVisitante = { pedido: string; resumoDaTentativa: string; escolha: DadosDoVisitante };

/** De quem é a assinatura: a conta logada (`userId`) ou a tentativa do visitante, que ainda não tem conta. */
export type PedidoDeAssinatura = { clienteId: string; precoId: string; plano: Plano; codigoId: string | null } & ({ userId: string } | { visitante: TentativaDoVisitante });

/** O que a tentativa do visitante grava na assinatura (e no pagamento Pix, etapa 4.9). Valor vazio não vai (a Stripe não o guarda). */
export function metadadosDoVisitante({ pedido, resumoDaTentativa, escolha }: TentativaDoVisitante): Record<string, string> {
  const M = METADADOS_DO_VISITANTE;
  return {
    [M.pedido]: pedido,
    // Só o RESUMO (passo 6b): o painel e os avisos da Stripe nunca levam a tentativa.
    [M.tentativa]: resumoDaTentativa,
    [M.novidades]: escolha.novidades ? NOVIDADES_SIM : "nao",
    ...(escolha.origem ? { [M.origem]: escolha.origem } : {}),
    ...(escolha.campanha ? { [M.campanha]: escolha.campanha } : {}),
  };
}

/**
 * O pedido de assinatura que vai à Stripe. Função pura, com teste — é aqui que moram as linhas que
 * nenhum outro teste veria sumir: o DESCONTO (sem ele, o aluno paga o valor cheio com o código
 * aplicado na tela), o `userId` (sem ele, quem pagou fica sem conta) e, na do visitante, a ficha e
 * a escolha dele (sem elas, a conta não nasce, ou nasce com o consentimento errado).
 */
export function paraPedidoDeAssinatura(pedido: PedidoDeAssinatura): Stripe.SubscriptionCreateParams {
  const deQuem = "visitante" in pedido ? metadadosDoVisitante(pedido.visitante) : { userId: pedido.userId };
  return {
    customer: pedido.clienteId,
    items: [{ price: pedido.precoId, quantity: 1 }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription", payment_method_types: FORMAS_DE_PAGAMENTO },
    discounts: pedido.codigoId ? [{ promotion_code: pedido.codigoId }] : undefined,
    metadata: { ...deQuem, plano: pedido.plano, ...(pedido.codigoId ? { codigo: pedido.codigoId } : {}) },
    expand: DO_CHECKOUT,
  };
}

/**
 * Cria a assinatura — INCOMPLETA até o site confirmar o pagamento (`default_incomplete`); com
 * nada a pagar hoje, a Stripe já a devolve ativa. O `userId`, o plano e o código vão na
 * assinatura: o primeiro liga à conta; o código diz se uma nova tentativa pode usar a mesma.
 * Devolve nada quando a Stripe recusa o desconto nesta compra.
 */
export async function criarAssinatura(pedido: PedidoDeAssinatura): Promise<AssinaturaNoCheckout | null> {
  try {
    return paraAssinaturaNoCheckout(await stripe().subscriptions.create(paraPedidoDeAssinatura(pedido)));
  } catch (erro) {
    // A Stripe recusou o DESCONTO nesta compra (o código esgotou entre a prévia e o clique, é de
    // outro cliente, só vale na primeira compra): nada, como na prévia — e não um erro 500, que
    // diria ao navegador que o código existe (achado da revisão de segurança, 10/10/2026).
    // `[FATO — medido na área restrita, 19/10/2026]` o código ESGOTADO vem com `param` =
    // `promotion_code` (e sem `code`), não com o `discounts…` das outras recusas.
    if (pedido.codigoId && erro instanceof Stripe.errors.StripeInvalidRequestError && (erro.param?.startsWith("discounts") || erro.param === "promotion_code")) {
      // Um rastro, que não alerta: um código de campanha mal configurado (produto errado, só na
      // primeira compra) passa na prévia e é recusado aqui — sem esta linha, ninguém descobriria.
      // O id do código, nunca o que o aluno digitou nem a mensagem da Stripe.
      console.warn(`[stripe] checkout: a Stripe recusou o código ${pedido.codigoId} ao criar a assinatura (campo ${erro.param ?? "-"}, código ${erro.code ?? "-"})`);
      return null;
    }
    throw erroSemMensagem(erro, "a criação da assinatura");
  }
}

/** A Stripe está configurada para receber avisos? Sem o segredo, NENHUM aviso é aceito. */
export function avisosConfigurados(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

/** De que assinatura o aviso fala — ou nenhuma (aviso que não mexe em assinatura). */
function assinaturaDoAviso(evento: Stripe.Event): string | null {
  switch (evento.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return evento.data.object.id;
    case "invoice.paid":
    case "invoice.payment_failed": {
      const assinatura = evento.data.object.parent?.subscription_details?.subscription;
      if (!assinatura) return null;
      return typeof assinatura === "string" ? assinatura : assinatura.id;
    }
    default:
      return null;
  }
}

/**
 * De que PAGAMENTO o aviso fala — só o de dinheiro devolvido (`charge.refunded`, etapa 4.6). A
 * cobrança não diz de que fatura nem de que assinatura é `[FATO — medido na área restrita,
 * 11/10/2026]`: quem acha a assinatura é o servidor, pelo pagamento (`stripe-reembolso.ts`).
 */
function pagamentoDoAviso(evento: Stripe.Event): string | null {
  // A devolução que mudou de situação também: se FALHOU, o período volta a contar como pago, e
  // o espelho tem que saber — pela sincronia de sempre.
  if (evento.type !== "charge.refunded" && !eAvisoDeDevolucao(evento)) return null;
  const pagamento = evento.data.object.payment_intent;
  if (!pagamento) return null;
  return typeof pagamento === "string" ? pagamento : pagamento.id;
}

type AvisoDeDevolucao = Extract<Stripe.Event, { type: "refund.failed" | "refund.updated" | "charge.refund.updated" }>;
function eAvisoDeDevolucao(evento: Stripe.Event): evento is AvisoDeDevolucao {
  return evento.type === "refund.failed" || evento.type === "refund.updated" || evento.type === "charge.refund.updated";
}

/**
 * Uma devolução que a Stripe tinha aceitado FALHOU depois (achado da revisão de segurança,
 * 11/10/2026): o dinheiro não voltou ao aluno, e sem isto quem descobriria seria ele.
 */
function devolucaoQueFalhou(evento: Stripe.Event): boolean {
  return eAvisoDeDevolucao(evento) && evento.data.object.status === "failed";
}

/**
 * O Pix PRÉ-PAGO que caiu — só o `payment_intent.succeeded` de um pagamento NOSSO, com o plano nos
 * metadados (`MARCA_DO_PREPAGO`); qualquer outro pagamento é de outra coisa e não é nosso. Função
 * pura, com teste. O que vem incompleto (sem preço ou sem cliente) é ignorado em voz alta: a
 * assinatura não nasceria certa.
 */
export function pagamentoPrePagoDoAviso(evento: Stripe.Event): PagamentoPrePago | null {
  if (evento.type !== "payment_intent.succeeded") return null;
  const pagamento = evento.data.object;
  const m = pagamento.metadata ?? {};
  const plano = m[MARCA_DO_PREPAGO];
  if (!plano || !(PLANOS as readonly string[]).includes(plano)) return null;
  const clienteId = typeof pagamento.customer === "string" ? pagamento.customer : (pagamento.customer?.id ?? null);
  const precoId = m.precoId || null;
  if (!clienteId || !precoId) {
    console.warn(`[stripe] aviso ${evento.id}: o pagamento pré-pago ${pagamento.id} veio sem ${clienteId ? "preço" : "cliente"} — ignorado`);
    return null;
  }
  const M = METADADOS_DO_VISITANTE;
  const visitante: TentativaDoVisitante | null = m[M.pedido] && m[M.tentativa]
    ? { pedido: m[M.pedido], resumoDaTentativa: m[M.tentativa], escolha: { novidades: m[M.novidades] === NOVIDADES_SIM, origem: m[M.origem] || null, campanha: m[M.campanha] || null } }
    : null;
  // Seguro: `plano` acabou de ser conferido contra a lista dos planos.
  return { id: pagamento.id, plano: plano as Plano, precoId, clienteId, livemode: pagamento.livemode, centavos: pagamento.amount, userId: m.userId || null, visitante };
}

/**
 * Verifica que o aviso veio da Stripe — sobre o CORPO CRU, byte a byte (se ele passar pelo
 * `express.json()` antes, a verificação falha). Lança se a assinatura não confere. NUNCA aceita
 * aviso sem verificar: sem o segredo, quem chama recusa antes (`avisosConfigurados`).
 */
export function verificarAviso(corpo: unknown, cabecalho: string | undefined): AvisoDaStripe {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segredo) throw new Error("Stripe sem STRIPE_WEBHOOK_SECRET");
  if (!Buffer.isBuffer(corpo) || !cabecalho) throw new Error("aviso sem corpo cru ou sem assinatura");
  const evento = Stripe.webhooks.constructEvent(corpo, cabecalho, segredo);
  return { id: evento.id, tipo: evento.type, assinatura: assinaturaDoAviso(evento), pagamento: pagamentoDoAviso(evento), devolucaoFalhou: devolucaoQueFalhou(evento), pagamentoPrePago: pagamentoPrePagoDoAviso(evento) };
}

/**
 * O formato do espelho, a partir da assinatura da Stripe (com `customer` e `latest_invoice`
 * expandidos). Função pura. `devolvida`: a última fatura foi devolvida por inteiro
 * (`faturaDevolvida`) — o período dela deixa de contar como pago.
 */
export function paraAssinaturaNaStripe(assinatura: Stripe.Subscription, devolvida: boolean = false): AssinaturaNaStripe {
  const itens = assinatura.items.data;
  let pagoAte: Date | null = null;
  if (itens.length > 0) {
    const fatura = assinatura.latest_invoice;
    const paga = typeof fatura === "object" && fatura !== null && fatura.status === "paid" && !devolvida;
    const segundos = paga ? Math.max(...itens.map((i) => i.current_period_end)) : Math.min(...itens.map((i) => i.current_period_start));
    pagoAte = new Date(segundos * 1000);
  }
  const doCliente = assinatura.customer;
  const clienteId = typeof doCliente === "string" ? doCliente : doCliente.id;
  const metadadosDoCliente = typeof doCliente === "object" && !doCliente.deleted ? doCliente.metadata : undefined;
  const userId = assinatura.metadata.userId || metadadosDoCliente?.userId || null;
  // A ficha do visitante vai na assinatura e no cliente (etapa 4.7, passo 4): a do cliente cobre a
  // assinatura que alguém crie para ele no painel da Stripe antes de a conta nascer.
  const M = METADADOS_DO_VISITANTE;
  const pedido = assinatura.metadata[M.pedido] || metadadosDoCliente?.[M.pedido] || null;
  const doVisitante: DadosDoVisitante = {
    novidades: assinatura.metadata[M.novidades] === NOVIDADES_SIM,
    origem: assinatura.metadata[M.origem] || null,
    campanha: assinatura.metadata[M.campanha] || null,
  };
  // A COBRANÇA PAUSADA vira `paused` no espelho (achado P1 da revisão, 09/10/2026): a Stripe
  // mantém `status: active` durante a pausa (os tipos da `stripe@23.0.0` dizem isso), e o gate
  // libera `active` sem olhar data — seria acesso de graça a pausa inteira. Como `paused`, vale a
  // segunda metade do gate: o acesso vai até o fim do período pago, como a regra já diz
  // ("cobre cancelamento e pausa com uma regra só" — CLAUDE.md → Membership Gating).
  const status = assinatura.pause_collection ? "paused" : assinatura.status;
  // Para os e-mails da cobrança (etapa 4.7, passo 7). A data se lê na fatura buscada AGORA, e não no
  // aviso da falha: com as automações da Stripe ela não vem nele (context7 /websites/stripe, 28/10/2026).
  const ultima = assinatura.latest_invoice;
  const proxima = typeof ultima === "object" && ultima !== null && ultima.status === "open" ? ultima.next_payment_attempt : null;
  const proximaTentativa = proxima ? new Date(proxima * 1000) : null;
  const encerradaSemPagamento = assinatura.cancellation_details?.reason === "payment_failed";
  // O Pix pré-pago de que ela nasceu (etapa 4.9): vazio na recorrente.
  const pixPaymentIntentId = assinatura.metadata[METADADO_DO_PIX] || null;
  return { id: assinatura.id, status, pagoAte, clienteId, userId, pedido, doVisitante, livemode: assinatura.livemode, proximaTentativa, encerradaSemPagamento, pixPaymentIntentId };
}

/**
 * A Stripe NÃO CONHECE esta assinatura (etapa 4.4): foi apagada lá, nunca existiu (a assinatura
 * de teste do seed), ou é do outro modo — de teste, pedida com a chave de verdade. Erro com nome
 * próprio para a sincronia do admin RELATAR o caso em vez de falhar inteira; nunca é motivo para
 * apagar o espelho. Só o id na mensagem.
 */
export class AssinaturaNaoEncontrada extends Error {
  constructor(id: string) {
    super(`[stripe] a Stripe não conhece a assinatura ${id}`);
    this.name = "AssinaturaNaoEncontrada";
  }
}

/** A assinatura como a Stripe diz AGORA — o espelho se recalcula daqui, nunca do retrato do aviso. */
export async function buscarAssinatura(id: string): Promise<AssinaturaNaStripe> {
  try {
    const assinatura = await stripe().subscriptions.retrieve(id, { expand: ["customer", "latest_invoice.payments"] });
    // A pré-paga (etapa 4.9): o período devolvido é o do Pix de que ela nasceu, não o da fatura (paga por fora).
    return paraAssinaturaNaStripe(assinatura, await periodoDevolvido(assinatura, assinatura.metadata[METADADO_DO_PIX] || null));
  } catch (erro) {
    if (erro instanceof Stripe.errors.StripeInvalidRequestError && erro.code === "resource_missing") throw new AssinaturaNaoEncontrada(id);
    // Era a única ida à Stripe que subia com a mensagem dela — e o aviso a cola no registro
    // (`assinaturas.ts`). Achado da revisão de segurança da etapa 4.2, 10/10/2026.
    throw erroSemMensagem(erro, "a busca da assinatura");
  }
}
