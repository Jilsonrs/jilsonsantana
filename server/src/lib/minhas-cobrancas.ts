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
 * A chave do recibo: o começo do resumo (SHA-256) do código da cobrança — a mesma para a mesma cobrança, e sem nenhum
 * código da Stripe no navegador. Ela só acha o recibo dentro das cobranças da conta da sessão. Função pura.
 */
export function chaveDoRecibo(cobrancaId: string): string {
  return createHash("sha256").update(cobrancaId).digest("hex").slice(0, 16);
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
    chave: chaveDoRecibo(cobranca.id),
  };
}

/** As cobranças que passaram, da conta, da mais nova à mais antiga. */
export async function minhasCobrancas(contaId: string): Promise<MinhasCobrancas> {
  const assinaturas = await prisma.subscription.findMany({ where: { ownerUserId: contaId }, select: { stripeCustomerId: true } });
  const clientes = await clientesDaConta(contaId, assinaturas.map((a) => a.stripeCustomerId));
  const cobrancas: MinhaCobranca[] = [];
  for (const cliente of clientes) {
    for (const cobranca of await cobrancasDoCliente(cliente)) {
      const minha = paraMinhaCobranca(cobranca);
      if (minha) cobrancas.push(minha);
    }
  }
  return { cobrancas: cobrancas.sort((a, b) => b.em.localeCompare(a.em)) };
}
