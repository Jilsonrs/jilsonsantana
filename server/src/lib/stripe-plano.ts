import Stripe from "stripe";
import { erroSemMensagem, stripe } from "./stripe.js";

// MUDAR DE PLANO (Fase 4, etapa 4.6, sessão b — billing.md → Minha assinatura). Decisões do
// operador (11/10/2026): mensal → anual vale NA HORA, com o valor mostrado antes; anual → mensal
// vale NO FIM do ano já pago, e dá para desistir. Quem decide SE pode é `meu-plano.ts`; aqui é
// só a ida à Stripe, e toda ida sobe por `erroSemMensagem`.
// `[FATO — medido na área restrita, 11/10/2026]`
//   - NA HORA: `update` com o preço novo no item, `always_invoice` e `pending_if_incomplete` —
//     cobra a diferença agora (a conta é da Stripe) e a assinatura só muda SE o pagamento passar.
//     Com o MESMO instante de conta (`proration_date`) na prévia e na troca, o cobrado é o mostrado.
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

/** O que a troca na hora precisa: a assinatura, o item dela, o preço novo e o instante da conta (segundos). */
export type TrocaNaHora = { assinaturaId: string; itemId: string; precoId: string; em: number };

/** Como a troca na hora vai à Stripe — o mesmo na prévia e na troca. Função pura, com teste. */
export function paraPedidoDeTroca(troca: TrocaNaHora): Pick<Stripe.SubscriptionUpdateParams, "items" | "proration_behavior" | "proration_date"> {
  return { items: [{ id: troca.itemId, price: troca.precoId }], proration_behavior: "always_invoice", proration_date: troca.em };
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
 * Troca o plano NA HORA: cobra a diferença agora, e a assinatura só muda se o pagamento passar.
 * Só o pagamento que PEDE A CONFIRMAÇÃO DO BANCO, e com segredo para o site completar, vira
 * `confirmar`; qualquer outra pendência é recusa — na dúvida, nada fica para ser cobrado depois.
 */
export async function trocarAgora(troca: TrocaNaHora): Promise<DesfechoDaTroca> {
  let assinatura: Stripe.Subscription;
  try {
    assinatura = await stripe().subscriptions.update(troca.assinaturaId, { ...paraPedidoDeTroca(troca), payment_behavior: "pending_if_incomplete", expand: ["latest_invoice.confirmation_secret"] });
  } catch (erro) {
    // O cartão recusado costuma voltar como troca pendente (abaixo); se vier como erro, é o mesmo desfecho.
    if (erro instanceof Stripe.errors.StripeCardError) return { estado: "recusado", faturaId: null };
    throw erroSemMensagem(erro, "a troca de plano");
  }
  if (!assinatura.pending_update) return { estado: "trocado" };
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
