import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { buscarAssinatura, type AssinaturaNaStripe, type AvisoDaStripe } from "./stripe.js";

// O ESPELHO DA ASSINATURA (Fase 4, etapa 4.1 — CLAUDE.md → Membership Gating). A assinatura da
// Stripe é a CANÔNICA; a nossa é o espelho que o gate (`temAcessoAtivo()`) lê. Cada aviso:
//   1. repetido (o `event.id` já processado) → nada;
//   2. UMA ASSINATURA DE CADA VEZ (achado P1 da revisão de segurança, 09/10/2026): dois avisos
//      diferentes da mesma assinatura, processados juntos, gravariam na ordem em que as
//      transações fecham — e a resposta VELHA da Stripe ("atrasada") podia sobrescrever a NOVA
//      ("cancelada"); como assinatura cancelada não gera mais aviso, o acesso ficaria liberado
//      para sempre. Por isso tudo — a trava, a busca na Stripe, a leitura e a gravação — roda
//      numa transação só, que começa travando ESTA assinatura (`pg_advisory_xact_lock`: a trava
//      de TRANSAÇÃO, que solta sozinha no fim — a de sessão não serve com o pooler do Neon);
//   3. a assinatura é buscada NA STRIPE, agora — nunca o retrato do aviso, que pode chegar fora
//      de ordem;
//   4. o aviso fica marcado e o espelho é atualizado na MESMA transação. Se algo falhar, nada
//      fica marcado, a rota responde 5xx e a Stripe entrega de novo — é ela quem insiste (sem
//      fila nossa, CLAUDE.md → Background Jobs).
// A assinatura se liga à conta pelo `userId` que o NOSSO checkout grava na Stripe (etapa 4.2).
// Sem ele, e sem espelho anterior, o aviso fica registrado e o espelho não nasce — e a rota
// registra o caso em voz alta (o visitante que assina sem conta é a etapa 4.7). O dono de um
// espelho nunca muda.

export type Desfecho =
  | { resultado: "repetido" }
  | { resultado: "sem-assinatura" }
  | { resultado: "atualizada"; assinatura: AssinaturaNaStripe }
  | { resultado: "sem-conta"; assinatura: AssinaturaNaStripe; motivo: "sem userId" | "conta inexistente" };

/** A busca na Stripe roda dentro da transação: o tempo dela (até ~20 s com uma nova tentativa) cabe aqui. */
const TEMPO_DA_TRANSACAO = { maxWait: 10_000, timeout: 30_000 };

function eRepetido(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
}

export async function processarAviso(aviso: AvisoDaStripe): Promise<Desfecho> {
  if (await prisma.stripeEvent.findUnique({ where: { id: aviso.id }, select: { id: true } })) return { resultado: "repetido" };
  const marcar = { id: aviso.id, type: aviso.tipo };

  if (!aviso.assinatura) {
    try {
      await prisma.stripeEvent.create({ data: marcar });
    } catch (erro) {
      // O mesmo aviso, entregue duas vezes ao mesmo tempo: o segundo esbarra no id.
      if (eRepetido(erro)) return { resultado: "repetido" };
      throw erro;
    }
    return { resultado: "sem-assinatura" };
  }

  const assinaturaId = aviso.assinatura;
  try {
    return await prisma.$transaction(async (tx): Promise<Desfecho> => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${assinaturaId}))`;
      // Com a trava: o mesmo aviso que esperava na fila já foi processado por quem veio antes.
      if (await tx.stripeEvent.findUnique({ where: { id: aviso.id }, select: { id: true } })) return { resultado: "repetido" };

      // Na Stripe, AGORA. Se ela não responder, a exceção sobe e a Stripe entrega de novo.
      const agora = await buscarAssinatura(assinaturaId);
      const espelho = await tx.subscription.findUnique({ where: { stripeSubscriptionId: agora.id }, select: { id: true } });
      const conta = !espelho && agora.userId ? await tx.user.findUnique({ where: { id: agora.userId }, select: { id: true } }) : null;
      const dados = { status: agora.status, currentPeriodEnd: agora.pagoAte, stripeCustomerId: agora.clienteId, livemode: agora.livemode };

      await tx.stripeEvent.create({ data: marcar });
      if (espelho) await tx.subscription.update({ where: { id: espelho.id }, data: dados });
      else if (conta) await tx.subscription.create({ data: { ...dados, stripeSubscriptionId: agora.id, ownerUserId: conta.id } });
      else return { resultado: "sem-conta", assinatura: agora, motivo: agora.userId ? "conta inexistente" : "sem userId" };
      return { resultado: "atualizada", assinatura: agora };
    }, TEMPO_DA_TRANSACAO);
  } catch (erro) {
    // O registro precisa dizer QUAL aviso e QUAL assinatura falharam (achado P2 da revisão) —
    // sem o corpo do aviso, que nunca vai para o registro.
    const motivo = erro instanceof Error ? erro.message : String(erro);
    throw new Error(`[stripe] aviso ${aviso.id} (assinatura ${assinaturaId}) falhou: ${motivo}`, { cause: erro });
  }
}
