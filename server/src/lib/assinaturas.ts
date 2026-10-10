import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { temAcessoAtivo } from "./acesso.js";
import { AssinaturaNaoEncontrada, assinaturasDoCliente, buscarAssinatura, type AssinaturaNaStripe, type AvisoDaStripe } from "./stripe.js";

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
//
// A SINCRONIA É UMA ROTINA SÓ (etapa 4.4, 10/10/2026): o aviso, o checkout (a Stripe diz que há
// assinatura e o espelho não dá acesso) e o admin (o aviso que se perdeu) passam todos por
// `sincronizar`, com a MESMA trava. Um segundo caminho de gravar o espelho seria o que diverge.
//
// PERDER O ACESSO DERRUBA A SESSÃO (CLAUDE.md → Access Architecture): se a conta TINHA acesso
// antes desta gravação e DEIXOU de ter depois, as sessões dela são apagadas na mesma transação.
// A comparação é o que protege quem só está tentando pagar: uma incompleta que expira, ou a
// assinatura antiga de quem já estava sem acesso, nunca deslogam ninguém. E isto NÃO é a
// fronteira: quem só deixa o período pago vencer não recebe aviso da Stripe e continua logado —
// quem tranca a aula é o gate, a cada pedido.

/** O que a sincronia fez com o espelho de UMA assinatura. */
export type Sincronia =
  | { resultado: "atualizada"; assinatura: AssinaturaNaStripe; perdeuAcesso: boolean }
  | { resultado: "sem-conta"; assinatura: AssinaturaNaStripe; motivo: "sem userId" | "conta inexistente" };

export type Desfecho = { resultado: "repetido" } | { resultado: "sem-assinatura" } | Sincronia;

/** A busca na Stripe roda dentro da transação: o tempo dela (até ~20 s com uma nova tentativa) cabe aqui. */
const TEMPO_DA_TRANSACAO = { maxWait: 10_000, timeout: 30_000 };

function eRepetido(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
}

/** Uma assinatura de cada vez: quem chega depois espera aqui, e só então busca na Stripe. */
function travar(tx: Prisma.TransactionClient, assinaturaId: string) {
  return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${assinaturaId}))`;
}

/** COM a trava desta assinatura já tomada por `tx`: o que a Stripe diz AGORA vira o espelho. */
async function sincronizar(tx: Prisma.TransactionClient, assinaturaId: string): Promise<Sincronia> {
  // Na Stripe, AGORA. Se ela não responder, a exceção sobe: nada é gravado.
  const agora = await buscarAssinatura(assinaturaId);
  const espelho = await tx.subscription.findUnique({ where: { stripeSubscriptionId: agora.id }, select: { id: true, ownerUserId: true } });
  const conta = !espelho && agora.userId ? await tx.user.findUnique({ where: { id: agora.userId }, select: { id: true } }) : null;
  // O dono de um espelho nunca muda: vale o que já está gravado, mesmo se a Stripe disser outro.
  const dono = espelho ? espelho.ownerUserId : (conta?.id ?? null);
  const dados = { status: agora.status, currentPeriodEnd: agora.pagoAte, stripeCustomerId: agora.clienteId, livemode: agora.livemode };
  const tinhaAcesso = dono !== null && (await temAcessoAtivo(dono, tx));

  if (espelho) await tx.subscription.update({ where: { id: espelho.id }, data: dados });
  else if (conta) await tx.subscription.create({ data: { ...dados, stripeSubscriptionId: agora.id, ownerUserId: conta.id } });
  else return { resultado: "sem-conta", assinatura: agora, motivo: agora.userId ? "conta inexistente" : "sem userId" };

  // O acesso de depois se lê pela TRANSAÇÃO (a gravação acima ainda não está no banco para mais
  // ninguém), e pela conta inteira: outra assinatura dela que ainda dê acesso segura a sessão.
  // `dono` é sempre um id de verdade aqui (`tinhaAcesso` só é sim com um) — nunca um filtro vazio,
  // que no Prisma apagaria as sessões de todo mundo.
  const perdeuAcesso = dono !== null && tinhaAcesso && !(await temAcessoAtivo(dono, tx));
  if (perdeuAcesso && dono !== null) await tx.session.deleteMany({ where: { userId: dono } });
  return { resultado: "atualizada", assinatura: agora, perdeuAcesso };
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
      await travar(tx, assinaturaId);
      // Com a trava: o mesmo aviso que esperava na fila já foi processado por quem veio antes.
      if (await tx.stripeEvent.findUnique({ where: { id: aviso.id }, select: { id: true } })) return { resultado: "repetido" };
      const sincronia = await sincronizar(tx, assinaturaId);
      // Marcado na MESMA transação do espelho — também quando não há conta: o aviso foi visto.
      await tx.stripeEvent.create({ data: marcar });
      return sincronia;
    }, TEMPO_DA_TRANSACAO);
  } catch (erro) {
    // O registro precisa dizer QUAL aviso e QUAL assinatura falharam (achado P2 da revisão) —
    // sem o corpo do aviso, que nunca vai para o registro.
    const motivo = erro instanceof Error ? erro.message : String(erro);
    throw new Error(`[stripe] aviso ${aviso.id} (assinatura ${assinaturaId}) falhou: ${motivo}`, { cause: erro });
  }
}

/**
 * A sincronia SEM aviso: quem pede é o checkout ou o admin (o aviso atrasou ou se perdeu). A
 * mesma trava e a mesma rotina do aviso; não marca nenhum `event.id`, então o aviso que chegar
 * depois é processado normalmente — e dá no mesmo, porque os dois leem a Stripe na hora.
 */
export async function sincronizarAssinatura(assinaturaId: string): Promise<Sincronia> {
  try {
    return await prisma.$transaction(async (tx): Promise<Sincronia> => {
      await travar(tx, assinaturaId);
      return sincronizar(tx, assinaturaId);
    }, TEMPO_DA_TRANSACAO);
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : String(erro);
    throw new Error(`[stripe] a sincronia da assinatura ${assinaturaId} falhou: ${motivo}`, { cause: erro });
  }
}

/** O que a sincronia de uma conta encontrou em CADA assinatura dela. */
export type Conferida = { id: string } & (Sincronia | { resultado: "nao-encontrada" });

/**
 * A SINCRONIA DE UMA CONTA — o que o admin força quando o aviso da Stripe se perdeu (etapa 4.4;
 * a Stripe reentrega por até 3 dias, e depois disso só isto recupera). Confere, uma a uma e
 * pela rotina de sempre, as assinaturas que a STRIPE lista para o cliente desta conta (as
 * últimas 20, de qualquer status) e as que o ESPELHO já conhece dela. Serve aos dois lados:
 * libera quem pagou e ficou trancado, e tira o acesso de quem a Stripe já encerrou.
 * A assinatura que a Stripe não conhece é RELATADA — o espelho dela nunca é apagado por aqui.
 * Qualquer outra falha sobe: o que já foi conferido fica gravado, e repetir não faz mal.
 */
export async function sincronizarConta(userId: string): Promise<Conferida[]> {
  // FECHA na dúvida, como o gate: no Prisma, um filtro vazio traria as assinaturas de todo mundo.
  if (typeof userId !== "string" || userId.length === 0) throw new Error("[stripe] sincronia de conta sem a conta");
  const [cliente, noEspelho] = await Promise.all([
    prisma.stripeCustomer.findUnique({ where: { userId }, select: { stripeCustomerId: true } }),
    prisma.subscription.findMany({ where: { ownerUserId: userId }, select: { stripeSubscriptionId: true }, orderBy: { id: "asc" } }),
  ]);
  const naStripe = cliente ? await assinaturasDoCliente(cliente.stripeCustomerId) : [];
  const ids = [...new Set([...naStripe.map((a) => a.id), ...noEspelho.map((a) => a.stripeSubscriptionId)])];

  const conferidas: Conferida[] = [];
  for (const id of ids) {
    try {
      conferidas.push({ id, ...(await sincronizarAssinatura(id)) });
    } catch (erro) {
      if (!(erro instanceof Error && erro.cause instanceof AssinaturaNaoEncontrada)) throw erro;
      conferidas.push({ id, resultado: "nao-encontrada" });
    }
  }
  return conferidas;
}
