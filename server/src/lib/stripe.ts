import Stripe from "stripe";
import { PLANOS, type Plano } from "@jilson/core";

// A NOSSA FRONTEIRA COM A STRIPE (Fase 4, etapa 4.1 — billing.md; CLAUDE.md → Membership
// Gating). Tudo que fala com a Stripe passa por aqui. As chaves vivem SÓ no ambiente do
// servidor (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) e nunca vão para o site nem para o
// registro. Os testes simulam SÓ o que vai à rede (`buscarAssinatura`); a verificação do aviso
// roda de verdade.
//
// A versão da API é a que a biblioteca fixa (`stripe@23.0.0` → 2026-09-30). Dois fatos dela que
// este arquivo usa (context7 /websites/stripe e os tipos da biblioteca, 09/10/2026): o fim do
// período fica em CADA ITEM da assinatura (não mais na assinatura), e a fatura aponta a
// assinatura em `parent.subscription_details.subscription`.

/** O aviso da Stripe, já verificado: só o que o servidor usa. */
export type AvisoDaStripe = { id: string; tipo: string; assinatura: string | null };

/** A assinatura como a Stripe diz AGORA, no formato que o espelho guarda. */
export type AssinaturaNaStripe = {
  id: string;
  status: string;
  /**
   * Até quando está PAGO — é o `currentPeriodEnd` do espelho, que a regra do gate lê ("o
   * período já foi pago", CLAUDE.md → Membership Gating). Quando uma renovação falha, a Stripe
   * já avançou o período ANTES de cobrar: o fim do período atual seria um mês não pago. Por
   * isso: última fatura paga → o fim do período atual; senão → o COMEÇO dele, que é onde o
   * último período pago terminou.
   */
  pagoAte: Date | null;
  clienteId: string | null;
  /** A conta da escola, que o NOSSO checkout grava na assinatura e no cliente da Stripe. */
  userId: string | null;
  /**
   * Assinatura de verdade (`true`) ou do MODO DE TESTE (`false`). Até o lançamento o site no
   * ar usa as chaves de teste (plano, Fase 4, etapa 4.3); no GO-LIVE, as de teste saem do banco
   * de produção (Fase 7) — senão dariam acesso para sempre (achado P2 da revisão, 09/10/2026).
   */
  livemode: boolean;
};

let cliente: Stripe | null = null;
function stripe(): Stripe {
  const chave = process.env.STRIPE_SECRET_KEY;
  if (!chave) throw new Error("Stripe sem STRIPE_SECRET_KEY");
  // Tempo limite curto: a busca roda dentro da transação do aviso (`assinaturas.ts`), que segura
  // uma conexão do banco enquanto espera. Sem resposta, o aviso falha e a Stripe entrega de novo.
  cliente ??= new Stripe(chave, { timeout: 10_000, maxNetworkRetries: 1 });
  return cliente;
}

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

/**
 * O erro da Stripe SEM a mensagem dela, que pode trazer um pedaço da chave ou dado do cliente —
 * e o que sobe daqui vai para o registro. Ficam o tipo, o código e o status. Função pura.
 */
export function erroSemMensagem(erro: unknown, oQue: string): Error {
  if (!(erro instanceof Stripe.errors.StripeError)) return erro instanceof Error ? erro : new Error(`[stripe] ${oQue} falhou`);
  const codigo = erro.code ? ` (${erro.code})` : "";
  const status = erro.statusCode ? `, status ${erro.statusCode}` : "";
  return new Error(`[stripe] ${oQue} falhou: ${erro.type}${codigo}${status}`);
}

// OS PREÇOS SE ACHAM PELA LOOKUP KEY, nunca por ID nem por nome (convenção da etapa 4.0): não há
// código de preço para colar em nenhum ambiente, e no lançamento basta repetir as mesmas chaves
// na conta de verdade.
const CHAVE_DO_PRECO: Record<Plano, string> = { mensal: "assinatura_mensal", anual: "assinatura_anual" };
const INTERVALO: Record<Plano, Stripe.Price.Recurring.Interval> = { mensal: "month", anual: "year" };

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
 * Verifica que o aviso veio da Stripe — sobre o CORPO CRU, byte a byte (se ele passar pelo
 * `express.json()` antes, a verificação falha). Lança se a assinatura não confere. NUNCA aceita
 * aviso sem verificar: sem o segredo, quem chama recusa antes (`avisosConfigurados`).
 */
export function verificarAviso(corpo: unknown, cabecalho: string | undefined): AvisoDaStripe {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segredo) throw new Error("Stripe sem STRIPE_WEBHOOK_SECRET");
  if (!Buffer.isBuffer(corpo) || !cabecalho) throw new Error("aviso sem corpo cru ou sem assinatura");
  const evento = Stripe.webhooks.constructEvent(corpo, cabecalho, segredo);
  return { id: evento.id, tipo: evento.type, assinatura: assinaturaDoAviso(evento) };
}

/** O formato do espelho, a partir da assinatura da Stripe (com `customer` e `latest_invoice` expandidos). Função pura. */
export function paraAssinaturaNaStripe(assinatura: Stripe.Subscription): AssinaturaNaStripe {
  const itens = assinatura.items.data;
  let pagoAte: Date | null = null;
  if (itens.length > 0) {
    const fatura = assinatura.latest_invoice;
    const paga = typeof fatura === "object" && fatura !== null && fatura.status === "paid";
    const segundos = paga ? Math.max(...itens.map((i) => i.current_period_end)) : Math.min(...itens.map((i) => i.current_period_start));
    pagoAte = new Date(segundos * 1000);
  }
  const doCliente = assinatura.customer;
  const clienteId = typeof doCliente === "string" ? doCliente : doCliente.id;
  const userIdDoCliente = typeof doCliente === "object" && !doCliente.deleted ? doCliente.metadata.userId : undefined;
  const userId = assinatura.metadata.userId || userIdDoCliente || null;
  // A COBRANÇA PAUSADA vira `paused` no espelho (achado P1 da revisão, 09/10/2026): a Stripe
  // mantém `status: active` durante a pausa (os tipos da `stripe@23.0.0` dizem isso), e o gate
  // libera `active` sem olhar data — seria acesso de graça a pausa inteira. Como `paused`, vale a
  // segunda metade do gate: o acesso vai até o fim do período pago, como a regra já diz
  // ("cobre cancelamento e pausa com uma regra só" — CLAUDE.md → Membership Gating).
  const status = assinatura.pause_collection ? "paused" : assinatura.status;
  return { id: assinatura.id, status, pagoAte, clienteId, userId, livemode: assinatura.livemode };
}

/** A assinatura como a Stripe diz AGORA — o espelho se recalcula daqui, nunca do retrato do aviso. */
export async function buscarAssinatura(id: string): Promise<AssinaturaNaStripe> {
  const assinatura = await stripe().subscriptions.retrieve(id, { expand: ["customer", "latest_invoice"] });
  return paraAssinaturaNaStripe(assinatura);
}
