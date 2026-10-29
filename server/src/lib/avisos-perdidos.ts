import type Stripe from "stripe";
import { prisma } from "./prisma.js";
import { processarAviso } from "./assinaturas.js";
import { depoisDoAviso } from "./depois-do-aviso.js";
import { avisoEmFormatoAntigo, avisosDaStripe, paraAviso } from "./stripe.js";

// A CONFERÊNCIA DOS AVISOS DA STRIPE (E1 da revisão ampla da cobrança, 29/10/2026 — plano → etapa 4.9b). A rodada de
// hora em hora pergunta à Stripe pelos avisos dos tipos que o site trata e processa, pela MESMA rotina do endereço de
// avisos (`processarAviso` e `depoisDoAviso`), os que o site não registrou (`stripe_event`). É o que pega, sem
// ninguém precisar olhar o painel: o aviso que o endereço não assina (foi o caso do Pix até a P112), o segredo
// trocado (todo aviso recusado), o endereço desligado, e o aviso que falhou e cuja reentrega ainda não veio. A
// Stripe é a fonte: a lista vem da API, autenticada — não há assinatura a conferir. Um alerta por rodada, com texto
// fixo (o Sentry junta as rodadas num alerta só); os ids vão no registro.
// Processar duas vezes não faz mal: a marca do `event.id` (e a trava da assinatura) faz do segundo um "repetido".

/** A entrega normal leva segundos: o aviso mais novo que isto ainda pode estar chegando, e a rodada o deixa. */
export const ESPERA_DA_ENTREGA_MS = 10 * 60_000;
/**
 * Quanto para trás a rodada confere: os 3 dias em que a Stripe tenta entregar. Um aviso mais velho que isso sem
 * registro exige o endereço E a rodada parados por 3 dias. *Reabre se a rodada ficar parada mais que isso (o alerta
 * de "a rodada não rodou" é a P126), ou se a lista passar do máximo com frequência.*
 */
export const JANELA_DA_CONFERENCIA_MS = 3 * 24 * 60 * 60_000;
/** O máximo de avisos lidos por rodada (a lista vem dos mais novos): bem acima do que a escola gera em 3 dias. */
export const MAXIMO_DA_LISTA = 2_000;
/** O tempo da conferência dentro do job (5 min no total; a rodada dos e-mails fica com o resto — `tarefas/`). */
export const PRAZO_DA_CONFERENCIA_EM_MS = 60_000;

/**
 * O que a conferência fez: os avisos lidos da Stripe, os sem registro, os processados agora, os que falharam, os que
 * ficaram para a próxima rodada, e os de fatura num formato antigo da API, que ela não processa (C3).
 */
export type ConferenciaDosAvisos = { conferidos: number; perdidos: number; processados: number; falhas: number; adiados: number; formatoAntigo: number };

export async function conferirAvisosPerdidos(agora: number = Date.now(), prazoEmMs: number = PRAZO_DA_CONFERENCIA_EM_MS): Promise<ConferenciaDosAvisos> {
  const inicio = Date.now();
  let eventos: Stripe.Event[];
  try {
    eventos = await avisosDaStripe(new Date(agora - JANELA_DA_CONFERENCIA_MS), new Date(agora - ESPERA_DA_ENTREGA_MS), MAXIMO_DA_LISTA);
  } catch (erro) {
    console.error(`[stripe] rodada: não consegui conferir os avisos da Stripe — ${erro instanceof Error ? erro.message : String(erro)}`);
    return { conferidos: 0, perdidos: 0, processados: 0, falhas: 1, adiados: 0, formatoAntigo: 0 };
  }
  if (eventos.length >= MAXIMO_DA_LISTA) console.warn(`[stripe] rodada: a lista dos avisos chegou ao máximo (${MAXIMO_DA_LISTA}); os mais velhos dos 3 dias não foram conferidos`);
  const vistos = new Set((await prisma.stripeEvent.findMany({ where: { id: { in: eventos.map((evento) => evento.id) } }, select: { id: true } })).map((marca) => marca.id));
  // Os mais velhos primeiro (a lista vem dos mais novos): a ordem em que a Stripe os teria entregado.
  const perdidos = eventos.filter((evento) => !vistos.has(evento.id)).sort((a, b) => a.created - b.created);
  const resultado: ConferenciaDosAvisos = { conferidos: eventos.length, perdidos: perdidos.length, processados: 0, falhas: 0, adiados: 0, formatoAntigo: 0 };
  if (perdidos.length === 0) return resultado;

  console.error("[stripe] rodada: há avisos da Stripe que o site não processou (não chegaram ao endereço de avisos, ou falharam ao chegar) — processados agora pela rodada; conferir as entregas do endereço de avisos no painel da Stripe (Workbench → Webhooks)");
  for (const evento of perdidos) {
    if (Date.now() - inicio >= prazoEmMs) {
      resultado.adiados += 1;
      continue;
    }
    // O aviso de fatura num formato antigo da API (C3 da revisão do grupo 1): processado, seria marcado "sem
    // assinatura" e a reentrega de verdade viraria "repetido". Fica SEM marca, com o alerta abaixo.
    if (avisoEmFormatoAntigo(evento)) {
      resultado.formatoAntigo += 1;
      console.warn(`[stripe] rodada: o aviso ${evento.id} (${evento.type}) veio na versão ${evento.api_version ?? "?"} da API, sem o "parent" da fatura — não processado`);
      continue;
    }
    const aviso = paraAviso(evento);
    try {
      const desfecho = await processarAviso(aviso);
      await depoisDoAviso(aviso, desfecho);
      resultado.processados += 1;
      console.info(`[stripe] rodada: o aviso ${evento.id} (${evento.type}), de ${new Date(evento.created * 1000).toISOString()}, processado agora: ${desfecho.resultado}`);
    } catch (erro) {
      resultado.falhas += 1;
      console.warn(`[stripe] rodada: o aviso ${evento.id} (${evento.type}) falhou também na rodada — fica para a próxima: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }
  if (resultado.falhas > 0) console.error("[stripe] rodada: avisos da Stripe que o site não processou falharam também na rodada — ficam para a próxima; conferir o registro da rodada");
  if (resultado.formatoAntigo > 0) console.error("[stripe] rodada: avisos de fatura num formato antigo da API da Stripe ficaram sem processar — a versão padrão da conta é anterior à 2025-03-31.basil; conferir a versão no Workbench (o espelho dessas assinaturas se acerta pelos avisos da assinatura e pelo \"Conferir na Stripe\")");
  if (resultado.adiados > 0) console.warn(`[stripe] rodada: ${resultado.adiados} aviso(s) sem registro ficaram para a próxima rodada (o prazo da conferência acabou)`);
  return resultado;
}
