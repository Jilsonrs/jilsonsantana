import Stripe from "stripe";

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
