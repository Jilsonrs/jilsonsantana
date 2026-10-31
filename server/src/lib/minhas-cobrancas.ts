import { createHash } from "node:crypto";
import type Stripe from "stripe";
import type { MinhaCobranca, MinhasCobrancas } from "@jilson/core";
import { prisma } from "./prisma.js";
import { clientesDaConta, paraCobrancaDaFicha } from "./ficha-da-cobranca.js";
import { cobrancasDoCliente } from "./stripe-ficha.js";

// MINHAS COBRANÇAS (Fase 4, etapa 4.7b, passo 6a — decisão do operador, 31/10/2026, P144): o aluno vê as próprias
// cobranças que passaram e abre o recibo de cada uma, em Faturamento — o recibo da ESCOLA (decisão dele, 31/10/2026), e não
// o da Stripe, que vinha em inglês e levava à fatura com o CPF inteiro de quem pagou (provado na área de teste). A MESMA
// leitura da ficha do admin — os clientes da conta e as cobranças de cada um —, com a conta da SESSÃO, nunca do pedido. Só
// o que passou: a recusa e o pendente ficam na ficha do admin.

/**
 * A chave do recibo: o começo do resumo (SHA-256) do código do PAGAMENTO — a mesma para o mesmo pagamento, e sem nenhum
 * código da Stripe no navegador. É dela que sai o número do recibo (único por recibo — decisão do operador, 31/10/2026).
 * Ela só acha o recibo dentro das cobranças da conta da sessão. Função pura.
 */
export function chaveDoRecibo(pagamentoId: string): string {
  return createHash("sha256").update(pagamentoId).digest("hex").slice(0, 16);
}

/** A chave do recibo de uma cobrança: pelo pagamento dela (o mesmo que o e-mail conhece), ou pela própria cobrança, sem pagamento. Função pura. */
export function chaveDaCobranca(cobranca: Stripe.Charge): string {
  const pagamento = typeof cobranca.payment_intent === "string" ? cobranca.payment_intent : cobranca.payment_intent?.id;
  return chaveDoRecibo(pagamento ?? cobranca.id);
}

/** Uma cobrança da Stripe como o aluno a vê — nada, se ela não passou. Função pura. */
export function paraMinhaCobranca(cobranca: Stripe.Charge): MinhaCobranca | null {
  const daFicha = paraCobrancaDaFicha(cobranca);
  if (daFicha.situacao === "falhou" || daFicha.situacao === "pendente") return null;
  return {
    em: daFicha.em,
    centavos: daFicha.centavos,
    moeda: daFicha.moeda,
    forma: daFicha.forma,
    cartao: daFicha.cartao,
    situacao: daFicha.situacao,
    devolvido: daFicha.devolvido,
    chave: chaveDaCobranca(cobranca),
  };
}

/** As cobranças dos clientes da conta, como a Stripe as dá — as que passaram e as que não. */
export async function cobrancasDaConta(contaId: string): Promise<Stripe.Charge[]> {
  const assinaturas = await prisma.subscription.findMany({ where: { ownerUserId: contaId }, select: { stripeCustomerId: true } });
  const clientes = await clientesDaConta(contaId, assinaturas.map((a) => a.stripeCustomerId));
  const cobrancas: Stripe.Charge[] = [];
  for (const cliente of clientes) cobrancas.push(...(await cobrancasDoCliente(cliente)));
  return cobrancas;
}

/** As cobranças que passaram, da conta, da mais nova à mais antiga. */
export async function minhasCobrancas(contaId: string): Promise<MinhasCobrancas> {
  const cobrancas = (await cobrancasDaConta(contaId)).map(paraMinhaCobranca).filter((c): c is MinhaCobranca => c !== null);
  return { cobrancas: cobrancas.sort((a, b) => b.em.localeCompare(a.em)) };
}
