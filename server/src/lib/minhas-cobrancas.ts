import type Stripe from "stripe";
import type { MinhaCobranca, MinhasCobrancas } from "@jilson/core";
import { prisma } from "./prisma.js";
import { clientesDaConta, paraCobrancaDaFicha } from "./ficha-da-cobranca.js";
import { cobrancasDoCliente } from "./stripe-ficha.js";

// MINHAS COBRANÇAS (Fase 4, etapa 4.7b, passo 6a — decisão do operador, 31/10/2026, P144): o aluno vê as próprias
// cobranças que passaram e abre o recibo de cada uma, em Faturamento. A MESMA leitura da ficha do admin — os clientes da
// conta e as cobranças de cada um —, com a conta da SESSÃO, nunca do pedido. Só o que passou: a recusa e o pendente ficam
// na ficha do admin.

/** Uma cobrança da Stripe como o aluno a vê — nada, se ela não passou. O recibo, só com endereço `https`. Função pura. */
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
    recibo: daFicha.recibo?.startsWith("https://") ? daFicha.recibo : null,
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
