import { TOLERANCIA_DA_COBRANCA_ATRASADA_EM_DIAS } from "@jilson/core";
import { Prisma, prisma, SubscriptionEmailKind } from "./prisma.js";
import { assinaturaDaAcesso, aulasAbertasAte, cobrancaAtrasada, encerradaDeVez, STATUS_VIVOS, temAcessoAtivo } from "./acesso.js";
import { enviarEmail, type TipoDeEmail } from "./email.js";
import { getDict } from "./dict.js";
import { sincronizarSeLivre } from "./assinaturas.js";
import { AssinaturaNaoEncontrada, buscarAssinatura, type AssinaturaNaStripe } from "./stripe.js";
import { montarAvisoDaCobranca, type EmailDevido } from "../views/email-da-cobranca.js";
import { enderecoDoSite } from "./endereco-do-site.js";
import { pixConfigurado } from "./stripe-pix.js";

// OS E-MAILS DA COBRANÇA (Fase 4, etapa 4.7, passo 7 — decisões do operador, 28/10/2026;
// billing.md → *Régua de inadimplência*). UMA regra decide qual e-mail é devido AGORA, pelo espelho
// da assinatura (que a sincronia acabou de gravar com o que a Stripe diz):
//   - COBRANÇA ATRASADA, antes do último dia → "a cobrança falhou": a próxima tentativa da Stripe e
//     até quando as aulas ficam abertas, com o botão de trocar o cartão;
//   - COBRANÇA ATRASADA, no último dia antes de as aulas trancarem → "antes de trancar";
//   - já trancada → nada: as outras tentativas não mandam e-mail (decisão (a)), e o de cancelada vem
//     quando elas acabam;
//   - CANCELADA (`canceled` — a assinatura que foi paga; a que expirou sem o primeiro pagamento é
//     `incomplete_expired` e não recebe nada: decisão (b)) e JÁ SEM DIAS PAGOS → "sua assinatura
//     terminou", com o botão de reativar. Com dias pagos (o cancelamento na hora, pelo painel), nada
//     até o período acabar — o texto diz que o acesso acabou;
//   - a PRÉ-PAGA (Pix, etapa 4.9, passo 4 — decisão do operador, 28/10/2026: "3 dias antes"), ativa e
//     a até 3 dias do fim do acesso → "está acabando", sem botão (pagar de novo é só depois de acabar);
//     quando acaba, a Stripe a encerra e sai o "terminou" de sempre, com o botão de reativar;
//   - a assinatura que NASCEU há pouco (E18 — decisão do operador, P127) → "sua assinatura está
//     confirmada", uma vez: no cartão, o plano e quando renova; no Pix, até quando vai o acesso. A de
//     quem assinou sem conta não recebe: as boas-vindas já confirmam.
// QUEM CHAMA: o aviso da Stripe, depois do commit, em todo aviso da assinatura (`stripe-webhook.ts`),
// e a rodada de hora em hora do agendador (etapa 4.7, passo 7b), que é quem manda o "antes de trancar"
// e o que ficou para trás. Fora de transação e de trava (CLAUDE.md → *Membership Gating*).
// UMA VEZ CADA — a MARCA (`subscription_email`, única por assinatura + tipo + a falha a que o e-mail
// se refere): quem a cria é quem manda; o envio confirmado grava `sentAt`. PENDENTE (tomada e sem a
// confirmação) há mais que o prazo é RETOMADA pela vez seguinte — quem a tomou caiu no meio (revisão
// da etapa, 28/10/2026); a chave do Resend é a mesma marca em texto, então nem assim sai em dobro. O
// envio que FALHA devolve a marca na hora. E o e-mail que NUNCA será devido — a conta que cancelou e já
// assinou de novo (reativar seria errado), a conta excluída — CONSOME a marca sem envio: sem isso a
// rodada voltaria a essa assinatura toda hora, para sempre (P1 da revisão da etapa).
// NUNCA LANÇA: qualquer falha vira alerta `[email]`, e o aviso da Stripe já ganho continua 200.

const DIA_EM_MS = 24 * 60 * 60 * 1000;
/** O "antes de trancar" sai no último dia antes de as aulas trancarem (decisão do operador, 28/10/2026: "1 dia antes"). */
export const ANTECEDENCIA_DO_AVISO_EM_MS = DIA_EM_MS;
/** O "está acabando" da pré-paga sai quando faltam até 3 dias para o fim do acesso (decisão do operador, 28/10/2026). */
export const ANTECEDENCIA_DO_PREPAGO_EM_MS = 3 * DIA_EM_MS;
/** Uma marca PENDENTE há mais que isto é retomada: quem a tomou caiu entre tomar e confirmar o envio. */
export const PRAZO_DA_MARCA_PENDENTE_EM_MS = 15 * 60 * 1000;
/** A rodada para de pegar assinaturas depois disto: o job tem 5 minutos, e cada uma pode levar ~40 s. */
export const PRAZO_DA_RODADA_EM_MS = 240_000;
/**
 * Até onde a rodada do agendador olha para trás: os dias de tolerância da cobrança atrasada (depois
 * deles, as aulas já trancaram e não há e-mail devido) — e a cancelada há menos tempo que isso.
 */
const JANELA_DA_RODADA_EM_MS = TOLERANCIA_DA_COBRANCA_ATRASADA_EM_DIAS * DIA_EM_MS;
/** A referência do e-mail de cancelada: a assinatura só termina uma vez. */
const FIM = "fim";
/** A referência do e-mail de confirmação: a assinatura só começa uma vez. */
const INICIO = "inicio";
/**
 * A confirmação só para a assinatura que NASCEU há pouco (o espelho com menos que isto — E18): quem já assinava antes da
 * publicação, ou renova, nunca recebe "sua assinatura está confirmada".
 */
export const JANELA_DA_CONFIRMACAO_EM_MS = 2 * DIA_EM_MS;

/**
 * Qual e-mail da cobrança é devido AGORA para esta assinatura, pelo espelho dela. Função pura.
 * A referência dos dois da cobrança atrasada é o instante da falha (o "pago até" de uma atrasada,
 * que não muda enquanto ela continua atrasada — `assinaturas.ts`): uma falha nova é outro e-mail.
 * A cancelada que ainda tem dias pagos não deve nada AINDA: deve quando o período acabar.
 */
export function emailDevido(espelho: { status: string; currentPeriodEnd: Date | null; pixPaymentIntentId?: string | null; createdAt?: Date }, agora: Date = new Date()): EmailDevido | null {
  if (cobrancaAtrasada(espelho)) {
    const trancaEm = aulasAbertasAte(espelho);
    if (!espelho.currentPeriodEnd || !trancaEm || trancaEm <= agora) return null;
    const ultimoDia = trancaEm.getTime() - agora.getTime() <= ANTECEDENCIA_DO_AVISO_EM_MS;
    return { tipo: ultimoDia ? SubscriptionEmailKind.ANTES_DE_TRANCAR : SubscriptionEmailKind.COBRANCA_FALHOU, referencia: espelho.currentPeriodEnd.toISOString(), trancaEm };
  }
  // A PRÉ-PAGA ativa (etapa 4.9): a até 3 dias do fim do acesso, "está acabando" — a referência é o fim
  // (um período, um e-mail). Antes disso, nada; acabou, quem fala é a cancelada.
  if (espelho.status === "active" && espelho.pixPaymentIntentId && espelho.currentPeriodEnd) {
    const falta = espelho.currentPeriodEnd.getTime() - agora.getTime();
    if (falta > 0 && falta <= ANTECEDENCIA_DO_PREPAGO_EM_MS) return { tipo: SubscriptionEmailKind.PREPAGO_TERMINANDO, referencia: espelho.currentPeriodEnd.toISOString(), trancaEm: espelho.currentPeriodEnd };
  }
  if (encerradaDeVez(espelho) && !assinaturaDaAcesso(espelho, agora)) return { tipo: SubscriptionEmailKind.CANCELADA, referencia: FIM, trancaEm: null };
  // A CONFIRMAÇÃO (E18 — decisão do operador P127): a assinatura que dá acesso pelo status e nasceu há pouco. No Pix, a
  // data é o fim do acesso pago.
  if (STATUS_VIVOS.has(espelho.status) && espelho.createdAt && agora.getTime() - espelho.createdAt.getTime() <= JANELA_DA_CONFIRMACAO_EM_MS) {
    return { tipo: SubscriptionEmailKind.CONFIRMADA, referencia: INICIO, trancaEm: espelho.pixPaymentIntentId ? espelho.currentPeriodEnd : null };
  }
  return null;
}

const TIPO_DO_ENVIO: Record<SubscriptionEmailKind, TipoDeEmail> = {
  COBRANCA_FALHOU: "cobranca-falhou",
  ANTES_DE_TRANCAR: "antes-de-trancar",
  CANCELADA: "assinatura-cancelada",
  PREPAGO_TERMINANDO: "prepago-terminando",
  CONFIRMADA: "assinatura-confirmada",
};

type MarcaGravada = { kind: SubscriptionEmailKind; reference: string; sentAt: Date | null; createdAt: Date };

/** Esta marca já resolve o e-mail devido? Enviada (ou consumida), ou pendente ainda dentro do prazo. Função pura. */
export function marcaResolve(marcas: ReadonlyArray<MarcaGravada>, devido: EmailDevido, agora: Date = new Date()): boolean {
  const limite = agora.getTime() - PRAZO_DA_MARCA_PENDENTE_EM_MS;
  return marcas.some((m) => m.kind === devido.tipo && m.reference === devido.referencia && (m.sentAt !== null || m.createdAt.getTime() > limite));
}

const chaveDaMarca = (assinaturaId: number, devido: EmailDevido) => ({ subscriptionId: assinaturaId, kind: devido.tipo, reference: devido.referencia });

/**
 * Toma a marca deste e-mail: o id dela, ou nada se outro já a tem. Já existe e está PENDENTE há mais
 * que o prazo → retoma (o `createdAt` vira agora: é o novo prazo); enviada, ou pendente recente → nada.
 */
async function tomar(assinaturaId: number, devido: EmailDevido): Promise<number | null> {
  try {
    const marca = await prisma.subscriptionEmail.create({ data: chaveDaMarca(assinaturaId, devido), select: { id: true } });
    return marca.id;
  } catch (erro) {
    if (!(erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002")) throw erro;
  }
  const retomada = await prisma.subscriptionEmail.updateMany({
    where: { ...chaveDaMarca(assinaturaId, devido), sentAt: null, createdAt: { lt: new Date(Date.now() - PRAZO_DA_MARCA_PENDENTE_EM_MS) } },
    data: { createdAt: new Date() },
  });
  if (retomada.count !== 1) return null;
  const marca = await prisma.subscriptionEmail.findUnique({ where: { subscriptionId_kind_reference: chaveDaMarca(assinaturaId, devido) }, select: { id: true } });
  return marca?.id ?? null;
}

/** Este e-mail NUNCA será devido: a marca fica como resolvida, sem envio — a rodada não volta aqui. */
async function consumir(assinaturaId: number, devido: EmailDevido, motivo: string, assinatura: string): Promise<void> {
  const chave = chaveDaMarca(assinaturaId, devido);
  try {
    await prisma.subscriptionEmail.upsert({ where: { subscriptionId_kind_reference: chave }, create: { ...chave, sentAt: new Date() }, update: { sentAt: new Date() } });
  } catch (erro) {
    // Dois ao mesmo tempo: o outro já a criou, e o `update` do outro ou o deste a resolve.
    if (!(erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002")) throw erro;
  }
  console.info(`[avisos] a assinatura ${assinatura} não recebe o e-mail "${TIPO_DO_ENVIO[devido.tipo]}": ${motivo}`);
}

/**
 * Manda o e-mail da cobrança que for devido AGORA para esta assinatura — UMA vez. `naStripe`: a
 * assinatura como a Stripe acabou de dizer na sincronia (a data da próxima tentativa e o motivo do
 * fim vêm dela). Nunca lança.
 */
export async function avisarSobreAAssinatura(naStripe: AssinaturaNaStripe, agora: Date = new Date()): Promise<void> {
  try {
    const espelho = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: naStripe.id }, select: { id: true, ownerUserId: true, status: true, currentPeriodEnd: true, pixPaymentIntentId: true, createdAt: true } });
    if (!espelho?.ownerUserId) return;
    const devido = emailDevido(espelho, agora);
    if (!devido) return;
    const conta = await prisma.user.findUnique({ where: { id: espelho.ownerUserId }, select: { id: true, email: true, deletedAt: true } });
    // A conta excluída a pedido do titular (LGPD) não recebe mais nada da escola — nunca.
    if (!conta || conta.deletedAt) return consumir(espelho.id, devido, "a conta foi excluída", naStripe.id);
    // "Sua assinatura terminou — reative" para quem JÁ ASSINOU DE NOVO (esta não dá aulas, mas a conta
    // tem acesso por outra) seria errado — e é o retorno que a escola quer. Nunca.
    if (devido.tipo === SubscriptionEmailKind.CANCELADA && (await temAcessoAtivo(conta.id))) return consumir(espelho.id, devido, "a conta tem acesso por outra assinatura", naStripe.id);
    // A atrasada que a pessoa encerrou para pagar com Pix (E14): "terminou — reative" para quem está pagando agora seria errado.
    if (devido.tipo === SubscriptionEmailKind.CANCELADA && naStripe.trocadaPorPix) return consumir(espelho.id, devido, "a pessoa a encerrou para pagar com Pix", naStripe.id);
    // A confirmação é de quem assinou LOGADO (E18): a assinatura de que a conta nasceu sem login recebe as boas-vindas
    // (`boas-vindas.ts`, que roda antes desta). Elas são UMA por ficha: ainda não saíram, ou saíram depois de esta
    // assinatura nascer → são desta. Saíram antes → são de uma assinatura anterior, e esta (a pessoa assinou de novo,
    // logada) recebe a confirmação.
    if (devido.tipo === SubscriptionEmailKind.CONFIRMADA) {
      const ficha = await prisma.guestCheckout.findUnique({ where: { userId: conta.id }, select: { boasVindasEnviadaEm: true } });
      if (ficha && (!ficha.boasVindasEnviadaEm || ficha.boasVindasEnviadaEm >= espelho.createdAt)) return consumir(espelho.id, devido, "a assinatura é a das boas-vindas", naStripe.id);
    }

    // Montado ANTES de tomar a marca: uma falha aqui não deixa a marca presa sem e-mail.
    const mensagem = montarAvisoDaCobranca(devido, naStripe, agora, (await getDict()).app.email, enderecoDoSite, pixConfigurado());
    const marca = await tomar(espelho.id, devido);
    if (marca === null) return;
    const tipo = TIPO_DO_ENVIO[devido.tipo];
    const envio = await enviarEmail({
      para: conta.email,
      tipo,
      referencia: `conta:${conta.id} assinatura:${naStripe.id}`,
      chave: `${tipo}/${espelho.id}/${devido.referencia}`,
      mensagem,
    });
    // Enviado: a marca fica confirmada. Falhou: a marca sai, e a vez seguinte (outro aviso, ou a
    // rodada do agendador) tenta de novo. "Duplicado" é o outro envio, com a mesma chave, saindo
    // agora — a marca fica pendente, e é o outro que a confirma (ou a rodada a retoma).
    if (envio.enviado) await prisma.subscriptionEmail.updateMany({ where: { id: marca }, data: { sentAt: new Date() } });
    else if (envio.motivo === "falhou") await prisma.subscriptionEmail.deleteMany({ where: { id: marca } });
  } catch (erro) {
    console.error(`[email] o e-mail da cobrança da assinatura ${naStripe.id} não saiu: ${erro instanceof Error ? erro.name : "falha sem tipo"}`);
  }
}

/** O que a rodada fez: as assinaturas conferidas na Stripe, as ocupadas, as que a Stripe não conhece, as adiadas pelo prazo e as que falharam. */
export type Rodada = { conferidas: number; ocupadas: number; desconhecidas: number; adiadas: number; falhas: number };

/**
 * A RODADA DO AGENDADOR (etapa 4.7, passo 7b — de hora em hora, pelo job `jilson-prod-avisos`,
 * `tarefas/avisos-da-cobranca.ts`). Procura as assinaturas com um e-mail da cobrança devido que ainda
 * não saiu — a atrasada com as aulas ainda abertas, a cancelada há pouco, a cancelada com dias pagos
 * cujo período acabou agora, a PRÉ-PAGA a até 3 dias do fim (etapa 4.9) e a que nasceu há pouco (a
 * confirmação, E18) — e passa cada uma à regra:
 *   - a ATRASADA é conferida na Stripe AGORA (`sincronizarSeLivre`: o pagamento pode ter passado e o
 *     aviso dele ter se perdido; ocupada, fica para a próxima rodada, sem esperar a trava);
 *   - a CANCELADA é estado final na Stripe: só se LÊ (`buscarAssinatura`, para o motivo do fim), sem
 *     regravar o espelho — regravar renovaria o `updatedAt` que a escolheu, e ela voltaria toda hora.
 * O que já tem marca resolvida nem vai à Stripe. Para de pegar assinaturas quando o prazo acaba (o job
 * tem 5 minutos): as que sobram ficam para a próxima hora, com um aviso. Uma assinatura que falha não
 * para as outras: vira alerta e conta em `falhas`; a que a Stripe não conhece (apagada no painel, ou
 * de outro modo) é só aviso, em `desconhecidas` — alerta a cada hora gastaria o teto do dia do monitor.
 */
export async function rodadaDosAvisos(agora: Date = new Date(), prazoEmMs: number = PRAZO_DA_RODADA_EM_MS): Promise<Rodada> {
  const limiteDoRelogio = Date.now() + prazoEmMs;
  const desde = new Date(agora.getTime() - JANELA_DA_RODADA_EM_MS);
  const candidatas = await prisma.subscription.findMany({
    where: {
      owner: { deletedAt: null },
      OR: [
        { status: "past_due", currentPeriodEnd: { gt: desde } },
        { status: "canceled", OR: [{ updatedAt: { gt: desde } }, { currentPeriodEnd: { gt: desde, lte: agora } }] },
        // A pré-paga perto do fim: conferida na Stripe como a atrasada (o Pix pode ter sido devolvido).
        { status: "active", pixPaymentIntentId: { not: null }, currentPeriodEnd: { gt: agora, lte: new Date(agora.getTime() + ANTECEDENCIA_DO_PREPAGO_EM_MS) } },
        // A que nasceu há pouco (E18): a confirmação que não saiu no aviso (o envio falhou) sai aqui.
        { status: { in: [...STATUS_VIVOS] }, createdAt: { gt: new Date(agora.getTime() - JANELA_DA_CONFIRMACAO_EM_MS) } },
      ],
    },
    select: { stripeSubscriptionId: true, status: true, currentPeriodEnd: true, pixPaymentIntentId: true, createdAt: true, emails: { select: { kind: true, reference: true, sentAt: true, createdAt: true } } },
    orderBy: { id: "asc" },
  });
  const rodada: Rodada = { conferidas: 0, ocupadas: 0, desconhecidas: 0, adiadas: 0, falhas: 0 };
  for (const candidata of candidatas) {
    const devido = emailDevido(candidata, agora);
    // Nada devido, ou já resolvido: nem vai à Stripe.
    if (!devido || marcaResolve(candidata.emails, devido, agora)) continue;
    if (Date.now() >= limiteDoRelogio) {
      rodada.adiadas++;
      continue;
    }
    try {
      if (encerradaDeVez(candidata)) {
        const naStripe = await buscarAssinatura(candidata.stripeSubscriptionId);
        rodada.conferidas++;
        await avisarSobreAAssinatura(naStripe, agora);
        continue;
      }
      const sincronia = await sincronizarSeLivre(candidata.stripeSubscriptionId);
      if (!sincronia) {
        rodada.ocupadas++;
        continue;
      }
      rodada.conferidas++;
      if (sincronia.resultado === "atualizada") await avisarSobreAAssinatura(sincronia.assinatura, agora);
    } catch (erro) {
      if (erro instanceof AssinaturaNaoEncontrada || (erro instanceof Error && erro.cause instanceof AssinaturaNaoEncontrada)) {
        rodada.desconhecidas++;
        console.warn(`[avisos] a Stripe não conhece a assinatura ${candidata.stripeSubscriptionId}: sem e-mail (apagada no painel, ou de outro modo)`);
        continue;
      }
      rodada.falhas++;
      console.error(`[avisos] a rodada não conferiu a assinatura ${candidata.stripeSubscriptionId}: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }
  if (rodada.adiadas > 0) console.warn(`[avisos] a rodada parou pelo prazo (${Math.round(prazoEmMs / 1000)} s): ${rodada.adiadas} assinatura(s) ficaram para a próxima`);
  return rodada;
}
