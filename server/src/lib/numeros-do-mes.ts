import type { NumerosDoMes } from "@jilson/core";
import { prisma } from "./prisma.js";
import { assinaturaDaAcesso } from "./acesso.js";
import { modoDaChave } from "./conferencia-da-cobranca.js";
import { devolvidoDesde, entrouDesde } from "./stripe-numeros.js";

// OS NÚMEROS DO MÊS (Fase 4, etapa 4.7b, bloco 6, passo 6c — decisão do operador, 31/10/2026, P143): a faixa no topo da
// Cobrança — os assinantes agora (mensal, anual, e o Pix e as pagas por fora), os novos e os encerrados no mês, os atrasados
// agora, o que entrou e o que foi devolvido. O mês é o de Brasília. Só leitura. Do espelho, só as assinaturas com conta e do
// MODO DA CHAVE (a de teste não entra no número de verdade); o dinheiro vem da Stripe — sem ela, os dois ficam vazios e o
// resto aparece.

/** O começo do mês de Brasília (UTC−3, sem horário de verão desde 2019) em que `agora` está. Função pura. */
export function inicioDoMes(agora: Date = new Date()): Date {
  const emBrasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return new Date(Date.UTC(emBrasilia.getUTCFullYear(), emBrasilia.getUTCMonth(), 1, 3, 0, 0));
}

/** Só as assinaturas do modo da chave da Stripe; sem chave com forma de chave, todas. */
function doModo(): { livemode?: boolean } {
  const modo = modoDaChave(process.env.STRIPE_SECRET_KEY, ["sk", "rk"]);
  return modo === null ? {} : { livemode: modo === "live" };
}

export async function numerosDoMes(agora: Date = new Date()): Promise<NumerosDoMes> {
  const desde = inicioDoMes(agora);
  const modo = doModo();
  const vivas = await prisma.subscription.findMany({
    where: { ...modo, ownerUserId: { not: null }, status: { notIn: ["incomplete", "incomplete_expired"] } },
    select: { status: true, currentPeriodEnd: true, plan: true, pixPaymentIntentId: true, paidOutOfBand: true },
  });
  const ativos = { mensal: 0, anual: 0, prePagas: 0, total: 0 };
  for (const a of vivas) {
    if (!assinaturaDaAcesso({ status: a.status, currentPeriodEnd: a.currentPeriodEnd }, agora)) continue;
    ativos.total++;
    if (a.pixPaymentIntentId !== null || a.paidOutOfBand) ativos.prePagas++;
    else if (a.plan === "anual") ativos.anual++;
    else if (a.plan === "mensal") ativos.mensal++;
  }
  const novos = await prisma.subscription.count({ where: { ...modo, ownerUserId: { not: null }, createdAt: { gte: desde }, status: { notIn: ["incomplete", "incomplete_expired"] } } });
  const atrasados = await prisma.subscription.count({ where: { ...modo, ownerUserId: { not: null }, status: { in: ["past_due", "unpaid"] } } });
  const encerradas = await prisma.billingLog.findMany({ where: { action: "customer.subscription.deleted", createdAt: { gte: desde }, stripeSubscriptionId: { not: null } }, distinct: ["stripeSubscriptionId"], select: { stripeSubscriptionId: true } });
  let entrou: number | null = null;
  let devolvido: number | null = null;
  try {
    [entrou, devolvido] = await Promise.all([entrouDesde(desde), devolvidoDesde(desde)]);
  } catch (erro) {
    console.warn(`[stripe] os números do mês: o dinheiro não veio da Stripe — ${erro instanceof Error ? erro.message : String(erro)}`);
    entrou = null;
    devolvido = null;
  }
  return { desde: desde.toISOString(), ativos, novos, encerradas: encerradas.length, atrasados, entrou, devolvido };
}
