import { Prisma, prisma, SubscriptionEmailKind } from "./prisma.js";
import { aulasAbertasAte, cobrancaAtrasada, encerradaDeVez, temAcessoAtivo } from "./acesso.js";
import { enviarEmail, type TipoDeEmail } from "./email.js";
import { getDict } from "./dict.js";
import { montarAvisoDaCobranca, type EmailDevido } from "../views/email-da-cobranca.js";
import type { AssinaturaNaStripe } from "./stripe.js";

// OS E-MAILS DA COBRANÇA (Fase 4, etapa 4.7, passo 7 — decisões do operador, 28/10/2026;
// billing.md → *Régua de inadimplência*). UMA regra decide qual e-mail é devido AGORA, pelo espelho
// da assinatura (que a sincronia acabou de gravar com o que a Stripe diz):
//   - COBRANÇA ATRASADA, antes do último dia → "a cobrança falhou": a próxima tentativa da Stripe e
//     até quando as aulas ficam abertas, com o botão de trocar o cartão;
//   - COBRANÇA ATRASADA, no último dia antes de as aulas trancarem → "antes de trancar";
//   - já trancada → nada: as outras tentativas não mandam e-mail (decisão (a)), e o de cancelada vem
//     quando elas acabam;
//   - CANCELADA (`canceled` — a assinatura que foi paga; a que expirou sem o primeiro pagamento é
//     `incomplete_expired` e não recebe nada: decisão (b)) → "sua assinatura terminou", com o botão de
//     reativar; só com a conta já sem aulas, porque o texto diz que o acesso acabou.
// QUEM CHAMA: o aviso da Stripe, depois do commit, em todo aviso da assinatura (`stripe-webhook.ts`),
// e a rodada de hora em hora do agendador (etapa 4.7, passo 7b), que é quem manda o "antes de trancar"
// e o que ficou para trás. Fora de transação e de trava (CLAUDE.md → *Membership Gating*).
// UMA VEZ CADA: quem cria a marca (`subscription_email`, única por assinatura + tipo + a falha a que
// o e-mail se refere) é quem manda; se o envio falha, a marca sai, e a vez seguinte tenta de novo. A
// chave do Resend é a mesma marca, em texto (`<tipo>/<assinatura>/<referência>`), estável entre
// quem chama: duas pontas ao mesmo tempo não mandam o mesmo e-mail duas vezes.
// NUNCA LANÇA: qualquer falha vira alerta `[email]`, e o aviso da Stripe já ganho continua 200.

const DIA_EM_MS = 24 * 60 * 60 * 1000;
/** O "antes de trancar" sai no último dia antes de as aulas trancarem (decisão do operador, 28/10/2026: "1 dia antes"). */
export const ANTECEDENCIA_DO_AVISO_EM_MS = DIA_EM_MS;
/** A referência do e-mail de cancelada: a assinatura só termina uma vez. */
const FIM = "fim";

/**
 * Qual e-mail da cobrança é devido AGORA para esta assinatura, pelo espelho dela. Função pura.
 * A referência dos dois da cobrança atrasada é o instante da falha (o "pago até" de uma atrasada,
 * que não muda enquanto ela continua atrasada — `assinaturas.ts`): uma falha nova é outro e-mail.
 */
export function emailDevido(espelho: { status: string; currentPeriodEnd: Date | null }, agora: Date = new Date()): EmailDevido | null {
  if (cobrancaAtrasada(espelho)) {
    const trancaEm = aulasAbertasAte(espelho);
    if (!espelho.currentPeriodEnd || !trancaEm || trancaEm <= agora) return null;
    const ultimoDia = trancaEm.getTime() - agora.getTime() <= ANTECEDENCIA_DO_AVISO_EM_MS;
    return { tipo: ultimoDia ? SubscriptionEmailKind.ANTES_DE_TRANCAR : SubscriptionEmailKind.COBRANCA_FALHOU, referencia: espelho.currentPeriodEnd.toISOString(), trancaEm };
  }
  if (encerradaDeVez(espelho)) return { tipo: SubscriptionEmailKind.CANCELADA, referencia: FIM, trancaEm: null };
  return null;
}

const TIPO_DO_ENVIO: Record<SubscriptionEmailKind, TipoDeEmail> = {
  COBRANCA_FALHOU: "cobranca-falhou",
  ANTES_DE_TRANCAR: "antes-de-trancar",
  CANCELADA: "assinatura-cancelada",
};

/** Toma a marca deste e-mail: o id dela, ou nada se outro já a tomou. */
async function tomar(assinaturaId: number, devido: EmailDevido): Promise<number | null> {
  try {
    const marca = await prisma.subscriptionEmail.create({ data: { subscriptionId: assinaturaId, kind: devido.tipo, reference: devido.referencia }, select: { id: true } });
    return marca.id;
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") return null;
    throw erro;
  }
}

/**
 * Manda o e-mail da cobrança que for devido AGORA para esta assinatura — UMA vez. `naStripe`: a
 * assinatura como a Stripe acabou de dizer na sincronia (a data da próxima tentativa e o motivo do
 * fim vêm dela). Nunca lança.
 */
export async function avisarSobreAAssinatura(naStripe: AssinaturaNaStripe, agora: Date = new Date()): Promise<void> {
  try {
    const espelho = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: naStripe.id }, select: { id: true, ownerUserId: true, status: true, currentPeriodEnd: true } });
    if (!espelho?.ownerUserId) return;
    const devido = emailDevido(espelho, agora);
    if (!devido) return;
    // "O acesso às aulas foi encerrado" só quando foi: a cancelada com dias pagos (o cancelamento na
    // hora, pelo painel da Stripe) espera o período acabar — a rodada do agendador a pega então.
    if (devido.tipo === SubscriptionEmailKind.CANCELADA && (await temAcessoAtivo(espelho.ownerUserId))) return;
    const conta = await prisma.user.findUnique({ where: { id: espelho.ownerUserId }, select: { id: true, email: true, deletedAt: true } });
    // A conta excluída a pedido do titular (LGPD) não recebe mais nada da escola.
    if (!conta || conta.deletedAt) return;

    // Montado ANTES de tomar a marca: uma falha aqui não deixa a marca presa sem e-mail.
    const mensagem = montarAvisoDaCobranca(devido, naStripe, agora, (await getDict()).app.email);
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
    // Falhou: a marca sai, e a vez seguinte (outro aviso, ou a rodada do agendador) tenta de novo.
    // "Duplicado" é o outro envio, com a mesma chave, saindo agora — a marca fica.
    if (!envio.enviado && envio.motivo === "falhou") await prisma.subscriptionEmail.deleteMany({ where: { id: marca } });
  } catch (erro) {
    console.error(`[email] o e-mail da cobrança da assinatura ${naStripe.id} não saiu: ${erro instanceof Error ? erro.name : "falha sem tipo"}`);
  }
}
