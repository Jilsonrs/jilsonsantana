import Stripe from "stripe";
import { erroSemMensagem, stripe } from "./stripe.js";
import { abrirCaso, TipoDeCaso } from "./casos.js";

// MUDAR DE PLANO (Fase 4, etapa 4.6, sessão b — billing.md → Minha assinatura). Decisões do
// operador (11/10/2026): mensal → anual vale NA HORA, com o valor mostrado antes; anual → mensal
// vale NO FIM do ano já pago, e dá para desistir. Quem decide SE pode é `meu-plano.ts`; aqui é
// só a ida à Stripe, e toda ida sobe por `erroSemMensagem`.
// `[FATO — medido na área restrita, 11/10/2026]`
//   - NA HORA: `update` com o preço novo no item e `pending_if_incomplete` — a assinatura só
//     muda SE o pagamento passar —, com o período recomeçando no dia da troca. A PRÉVIA usa a
//     conta por tempo da Stripe (`paraPedidoDeTroca`); a COBRANÇA usa o plano cheio e um crédito
//     de valor fixo (`paraPedidoDeCobrar`), para sair exatamente no valor mostrado.
//   - O `update` NÃO é inofensivo quando repetido (achado da revisão de segurança, 11/10/2026):
//     aplicado a uma assinatura que já virou anual, ele fatura outro ano. Por isso vai com chave
//     de repetição própria (`chaveDaTroca`), e nem é feito se o item já está no preço novo.
//   - Se o banco pede confirmação OU o cartão é recusado, a resposta vem igual (200, a troca
//     pendente, a fatura em aberto): distingue-se pelo PAGAMENTO da fatura. Confirmado o pagamento,
//     a Stripe aplica a troca sozinha. Desistir é ANULAR a fatura da troca.
//   - NO FIM DO PERÍODO: um agendamento com duas fases (a atual e a do plano novo). O desconto só
//     sobrevive se as fases o levarem. Com agendamento, a Stripe recusa mexer no cancelamento
//     direto na assinatura: antes, soltar o agendamento.

/**
 * A marca dos agendamentos que o NOSSO fluxo de mudar de plano cria (achado da revisão de
 * segurança, 11/10/2026): só eles são soltos pelas operações do aluno. Um agendamento posto pelo
 * painel da Stripe não some porque o aluno mudou de plano.
 */
export const MARCA_DA_TROCA = "troca-de-plano";

/** O que a troca na hora precisa: a assinatura, o item dela e o preço novo. */
export type TrocaNaHora = { assinaturaId: string; itemId: string; precoId: string };

/**
 * Como a troca na hora vai à Stripe — o mesmo na prévia e na troca. Função pura, com teste.
 * `billing_cycle_anchor: { type: "now" }` — O PERÍODO DO PLANO NOVO COMEÇA NO DIA DA TROCA
 * (decisão do operador, 11/10/2026): a pessoa paga o plano novo inteiro, menos o que sobrou do
 * período já pago, e a cobrança seguinte vem um período inteiro depois. `[FATO — medido com o
 * relógio de teste, 11/10/2026]` sem isto a Stripe mantém o aniversário da assinatura: o anual
 * sai proporcional aos dias que faltam até lá, e a cobrança seguinte chega antes de um ano.
 * `[FATOS — medidos]` nesta versão da Stripe o campo é um OBJETO (o texto solto `"now"` volta
 * "Invalid object"), e com ele a Stripe RECUSA o instante da conta (`proration_date`): a conta
 * é sempre a do momento do pedido. É este o pedido da PRÉVIA — o valor que a tela mostra. A
 * cobrança vai por `paraPedidoDeCobrar`, que não depende do instante.
 */
export function paraPedidoDeTroca(troca: TrocaNaHora): Pick<Stripe.SubscriptionUpdateParams, "items" | "proration_behavior" | "billing_cycle_anchor"> {
  return { items: [{ id: troca.itemId, price: troca.precoId }], proration_behavior: "always_invoice", billing_cycle_anchor: { type: "now" } };
}

/** O crédito de valor fixo que entra na fatura da troca: quanto, em que moeda e sob qual produto. */
export type CreditoFixo = { centavos: number; moeda: string; produtoId: string };

/**
 * Como a troca vai à Stripe para COBRAR EXATAMENTE o valor mostrado (decisão do operador,
 * 11/10/2026: "cobra o que mostrou pela primeira vez"). Função pura, com teste.
 * SEM a conta por tempo da Stripe (`proration_behavior: "none"`): ela descontaria o que sobra do
 * mês no instante do pedido, que já não é o da tela. O plano novo entra CHEIO, e o desconto
 * entra como UMA linha de crédito de valor fixo, no MESMO pedido. `[FATOS — medidos na área
 * restrita, 11/10/2026]` a fatura sai com o cheio menos o crédito; `discountable: false` é o que
 * impede o cupom da assinatura de mexer no crédito (sem isso, um cupom de 50% o corta pela
 * metade); e, anulada a fatura, não sobra item nenhum no cliente.
 */
export function paraPedidoDeCobrar(troca: TrocaNaHora, credito: CreditoFixo | null): Pick<Stripe.SubscriptionUpdateParams, "items" | "proration_behavior" | "billing_cycle_anchor" | "add_invoice_items"> {
  const pedido: Pick<Stripe.SubscriptionUpdateParams, "items" | "proration_behavior" | "billing_cycle_anchor"> = { items: [{ id: troca.itemId, price: troca.precoId }], proration_behavior: "none", billing_cycle_anchor: { type: "now" } };
  if (!credito) return pedido;
  return { ...pedido, add_invoice_items: [{ price_data: { currency: credito.moeda, product: credito.produtoId, unit_amount: -credito.centavos }, quantity: 1, discountable: false }] };
}

/**
 * Quanto se paga HOJE para trocar na hora, e quando é a cobrança seguinte — a conta é da Stripe
 * (o plano novo inteiro, menos o que sobrou do período pago). Não muda nada.
 */
export async function calcularTroca(troca: TrocaNaHora): Promise<{ centavosHoje: number; moeda: string; proximaEm: Date | null }> {
  try {
    const fatura = await stripe().invoices.createPreview({ subscription: troca.assinaturaId, subscription_details: paraPedidoDeTroca(troca) });
    const fins = fatura.lines.data.map((linha) => linha.period.end);
    return { centavosHoje: fatura.amount_due, moeda: fatura.currency, proximaEm: fins.length > 0 ? new Date(Math.max(...fins) * 1000) : null };
  } catch (erro) {
    throw erroSemMensagem(erro, "a prévia da troca de plano");
  }
}

/**
 * O que deu a troca na hora. `confirmar`: o banco pediu uma confirmação — a assinatura NÃO mudou,
 * e só muda se o site completar o pagamento com este segredo. `recusado`: o cartão não passou — a
 * assinatura não mudou, e a fatura da troca (se ficou uma) precisa ser anulada.
 */
export type DesfechoDaTroca = { estado: "trocado" } | { estado: "confirmar"; segredo: string; faturaId: string } | { estado: "recusado"; faturaId: string | null };

/** Em que pé está o pagamento de uma fatura: o do ÚLTIMO pagamento dela — ou nada, se não há. */
export async function situacaoDoPagamento(faturaId: string): Promise<string | null> {
  try {
    const fatura = await stripe().invoices.retrieve(faturaId, { expand: ["payments.data.payment.payment_intent"] });
    const pagamento = fatura.payments?.data[0]?.payment.payment_intent;
    return pagamento && typeof pagamento !== "string" ? pagamento.status : null;
  } catch (erro) {
    throw erroSemMensagem(erro, "a leitura do pagamento da troca");
  }
}

/**
 * A CHAVE DE REPETIÇÃO da troca (achado da revisão de segurança, 11/10/2026). Se a Stripe demorar
 * e o pedido "falhar" do nosso lado com a cobrança ainda andando, a pessoa clica de novo: com a
 * MESMA chave, a Stripe devolve o resultado do primeiro pedido em vez de cobrar outra vez.
 * A chave leva a ÚLTIMA FATURA de antes da troca — é o que a faz mudar depois de cada tentativa
 * que chegou a criar fatura (recusada, ou esperando o banco e desfeita): a tentativa seguinte é
 * uma tentativa de verdade, e não a repetição da resposta antiga. Função pura, com teste.
 */
export function chaveDaTroca(troca: TrocaNaHora, ultimaFaturaId: string | null, cobrar: number): string {
  return `troca-de-plano:${troca.assinaturaId}:${troca.precoId}:${ultimaFaturaId ?? "sem-fatura"}:${cobrar}`;
}

/**
 * Troca o plano NA HORA, cobrando EXATAMENTE `cobrar` centavos — e a assinatura só muda se o
 * pagamento passar. Só o pagamento que PEDE A CONFIRMAÇÃO DO BANCO, e com segredo para o site
 * completar, vira `confirmar`; qualquer outra pendência é recusa — na dúvida, nada fica para ser
 * cobrado depois.
 */
export async function trocarAgora(troca: TrocaNaHora, cobrar: number): Promise<DesfechoDaTroca> {
  // O valor a cobrar é um número inteiro de centavos, nunca negativo: quem chama já conferiu, e
  // aqui é a última porta (um `NaN` passaria por toda comparação e cobraria o plano cheio).
  if (!Number.isInteger(cobrar) || cobrar < 0) throw new Error(`[stripe] a troca de plano da assinatura ${troca.assinaturaId}: valor a cobrar inválido`);
  // O plano novo CHEIO (a conta da Stripe, já com o desconto da assinatura) não depende do
  // instante: o crédito é o que falta para a fatura dar exatamente o valor a cobrar. E a
  // assinatura como está AGORA: de onde sai a última fatura (para a chave de repetição).
  let cheio: Stripe.Invoice;
  let preco: Stripe.Price;
  let antes: Stripe.Subscription;
  try {
    [cheio, preco, antes] = await Promise.all([
      stripe().invoices.createPreview({ subscription: troca.assinaturaId, subscription_details: paraPedidoDeCobrar(troca, null) }),
      stripe().prices.retrieve(troca.precoId),
      stripe().subscriptions.retrieve(troca.assinaturaId),
    ]);
  } catch (erro) {
    throw erroSemMensagem(erro, "a conta do plano novo");
  }
  // JÁ ESTÁ no plano novo — um pedido anterior, dado como perdido, chegou à Stripe enquanto este
  // andava: a troca valeu, e repetir o `update` faturaria outro período inteiro.
  if (antes.items.data.some((item) => item.id === troca.itemId && item.price.id === troca.precoId)) return { estado: "trocado" };
  const ultimaFaturaId = typeof antes.latest_invoice === "string" ? antes.latest_invoice : (antes.latest_invoice?.id ?? null);
  const centavos = cheio.amount_due - cobrar;
  // Nunca se cobra MAIS que o plano novo inteiro: um crédito negativo seria uma cobrança a mais.
  if (centavos < 0) throw new Error(`[stripe] a troca de plano da assinatura ${troca.assinaturaId}: o valor a cobrar (${cobrar}) é maior que o plano novo inteiro (${cheio.amount_due})`);
  const credito = centavos > 0 ? { centavos, moeda: cheio.currency, produtoId: typeof preco.product === "string" ? preco.product : preco.product.id } : null;
  let assinatura: Stripe.Subscription;
  try {
    assinatura = await stripe().subscriptions.update(troca.assinaturaId, { ...paraPedidoDeCobrar(troca, credito), payment_behavior: "pending_if_incomplete", expand: ["latest_invoice.confirmation_secret"] }, { idempotencyKey: chaveDaTroca(troca, ultimaFaturaId, cobrar) });
  } catch (erro) {
    // O cartão recusado costuma voltar como troca pendente (abaixo); se vier como erro, é o mesmo desfecho.
    if (erro instanceof Stripe.errors.StripeCardError) return { estado: "recusado", faturaId: null };
    throw erroSemMensagem(erro, "a troca de plano");
  }
  // A FATURA DA TROCA TEM QUE DAR O VALOR MOSTRADO. A fatura da troca é a última fatura, se ela
  // é OUTRA que não a de antes (não depende do motivo que a Stripe escreve nela). Se um dia o
  // valor não bater (um imposto por cima, uma regra nova da Stripe), ninguém confirma no banco um
  // valor que não leu: a pendente é anulada e a troca falha; a que foi cobrada vira alerta.
  const ultima = assinatura.latest_invoice;
  const nova = typeof ultima === "object" && ultima !== null && ultima.id !== ultimaFaturaId ? ultima : null;
  let pendente = Boolean(assinatura.pending_update);
  if (nova && nova.amount_due !== cobrar) {
    if (pendente) {
      let desfecho: "anulada" | "paga" | "falhou";
      try {
        desfecho = await anularFatura(nova.id);
      } catch {
        desfecho = "falhou";
      }
      const oQueHouve = `a fatura saiu com ${nova.amount_due} centavos e o valor mostrado era ${cobrar}`;
      if (desfecho === "anulada") throw new Error(`[stripe] a troca de plano da assinatura ${troca.assinaturaId}: ${oQueHouve} — anulada, nada foi cobrado`);
      if (desfecho === "falhou") throw new Error(`[stripe] a troca de plano da assinatura ${troca.assinaturaId}: ${oQueHouve}, e ela CONTINUA EM ABERTO — anular pelo painel da Stripe`);
      // `paga`: a pessoa confirmou no banco no mesmo instante — a troca valeu, no valor errado.
      pendente = false;
    }
    console.error(`[stripe] mudar de plano: a assinatura ${troca.assinaturaId} foi cobrada em ${nova.amount_due} centavos, e o valor mostrado era ${cobrar} — conferir no painel da Stripe`);
    await abrirCaso({ tipo: TipoDeCaso.TROCA_DE_PLANO, chave: `sub:${troca.assinaturaId}`, urgente: false, assinatura: troca.assinaturaId, centavos: nova.amount_due - cobrar, detalhe: `cobrado ${nova.amount_due} centavos e mostrado ${cobrar}` });
  }
  if (!pendente) return { estado: "trocado" };
  const fatura = assinatura.latest_invoice;
  if (!fatura || typeof fatura === "string") return { estado: "recusado", faturaId: typeof fatura === "string" ? fatura : null };
  const segredo = fatura.confirmation_secret?.client_secret;
  let situacao: string | null = null;
  try {
    situacao = await situacaoDoPagamento(fatura.id);
  } catch {
    // A troca pendente e a fatura JÁ existem na Stripe: se nem ler o pagamento deu, é recusa —
    // quem chama anula a fatura (achado da revisão de segurança, 11/10/2026). Subir o erro
    // deixaria a fatura do plano novo em aberto por um dia.
  }
  if (segredo && situacao === "requires_action") return { estado: "confirmar", segredo, faturaId: fatura.id };
  return { estado: "recusado", faturaId: fatura.id };
}

/**
 * ANULA a fatura em aberto de uma troca que não se completou: é o que desfaz a troca pendente
 * (nada mais pode ser cobrado por ela). Se a fatura já não está aberta, quem diz o que houve é
 * ela, relida: anulada → feito; PAGA → a troca se completou no mesmo instante (`paga`).
 */
export async function anularFatura(faturaId: string): Promise<"anulada" | "paga"> {
  try {
    await stripe().invoices.voidInvoice(faturaId);
    return "anulada";
  } catch (erro) {
    if (erro instanceof Stripe.errors.StripeInvalidRequestError) {
      let relida: string | null = null;
      try {
        relida = (await stripe().invoices.retrieve(faturaId)).status;
      } catch {
        // Nem reler deu: vale o erro de anular, abaixo.
      }
      if (relida === "void") return "anulada";
      if (relida === "paid") return "paga";
    }
    throw erroSemMensagem(erro, "a anulação da fatura da troca");
  }
}

/** O segredo com que o site completa a confirmação do banco de uma fatura em aberto — ou nenhum. */
export async function segredoDaFatura(faturaId: string): Promise<string | null> {
  try {
    return (await stripe().invoices.retrieve(faturaId, { expand: ["confirmation_secret"] })).confirmation_secret?.client_secret ?? null;
  } catch (erro) {
    throw erroSemMensagem(erro, "a leitura do segredo da fatura");
  }
}

type Fase = Stripe.SubscriptionSchedule.Phase;
type FaseNova = Stripe.SubscriptionScheduleUpdateParams.Phase;

/** Os descontos de uma fase, no formato em que voltam à Stripe. */
function descontosDaFase(fase: Fase): NonNullable<FaseNova["discounts"]> {
  const descontos: NonNullable<FaseNova["discounts"]> = [];
  for (const d of fase.discounts ?? []) {
    const [cupom, desconto, codigo] = [d.coupon, d.discount, d.promotion_code].map((v) => (typeof v === "string" ? v : (v?.id ?? null)));
    if (desconto) descontos.push({ discount: desconto });
    else if (cupom) descontos.push({ coupon: cupom });
    else if (codigo) descontos.push({ promotion_code: codigo });
  }
  return descontos;
}

/**
 * As duas fases da troca marcada: a ATUAL, igual ao que a assinatura já é, até o fim do período
 * pago; e a do plano novo, por um mês — depois dela o agendamento solta a assinatura, que segue
 * no plano novo. OS DESCONTOS VÃO NAS DUAS: sem isso a cortesia viraria cobrança. Função pura,
 * com teste. *(Quando a escola ligar o imposto automático — etapa 4.8 —, conferir que as fases
 * o levam.)*
 */
export function paraFasesDaTroca(atual: Fase, precoNovoId: string): FaseNova[] {
  const descontos = descontosDaFase(atual);
  return [
    { items: atual.items.map((item) => ({ price: typeof item.price === "string" ? item.price : item.price.id, quantity: item.quantity ?? 1 })), start_date: atual.start_date, end_date: atual.end_date, discounts: descontos },
    { items: [{ price: precoNovoId, quantity: 1 }], duration: { interval: "month", interval_count: 1 }, discounts: descontos },
  ];
}

/**
 * MARCA a troca de plano para o fim do período pago: até lá nada muda e nada é cobrado. Se a
 * segunda ida falhar, o agendamento recém-criado é solto — um agendamento pela metade impediria
 * a pessoa de parar a renovação. Devolve quando a troca vale.
 */
export async function agendarTroca(assinaturaId: string, precoNovoId: string): Promise<Date> {
  let agendamento: Stripe.SubscriptionSchedule;
  try {
    agendamento = await stripe().subscriptionSchedules.create({ from_subscription: assinaturaId });
  } catch (erro) {
    throw erroSemMensagem(erro, "a criação do agendamento da troca");
  }
  const atual = agendamento.phases[0];
  try {
    if (!atual) throw new Error("[stripe] o agendamento da troca veio sem a fase atual");
    await stripe().subscriptionSchedules.update(agendamento.id, { end_behavior: "release", proration_behavior: "none", phases: paraFasesDaTroca(atual, precoNovoId), metadata: { para: MARCA_DA_TROCA } });
    return new Date(atual.end_date * 1000);
  } catch (erro) {
    try {
      await stripe().subscriptionSchedules.release(agendamento.id);
    } catch {
      console.error(`[stripe] mudar de plano: o agendamento pela metade da assinatura ${assinaturaId} não foi solto — soltar pelo painel da Stripe`);
      await abrirCaso({ tipo: TipoDeCaso.TROCA_DE_PLANO, chave: `agendamento:${agendamento.id}`, urgente: false, assinatura: assinaturaId, objeto: agendamento.id, detalhe: "o agendamento da troca ficou pela metade e não foi solto" });
    }
    throw erroSemMensagem(erro, "o agendamento da troca");
  }
}

/** SOLTA o agendamento: a troca marcada é desfeita, e a assinatura segue como está. */
export async function soltarAgendamento(agendamentoId: string): Promise<void> {
  try {
    await stripe().subscriptionSchedules.release(agendamentoId);
  } catch (erro) {
    throw erroSemMensagem(erro, "a soltura do agendamento da troca");
  }
}
