import type { Prisma } from "./prisma.js";
import { generateId } from "better-auth";
import { Role } from "@jilson/core";
import { assinaturaDaAcesso } from "./acesso.js";
import type { AssinaturaNaStripe } from "./stripe.js";

// A CONTA QUE NASCE NO PAGAMENTO (Fase 4, etapa 4.7, passo 4 — billing.md → *Assinar sem conta*;
// CLAUDE.md → Auth: o cadastro continua fechado, e quem cria a conta é o aviso da Stripe, depois do
// pagamento). Quem assina sem conta deixa uma FICHA DE ESPERA (`GuestCheckout`): o e-mail, ligado a
// um cliente da Stripe. A assinatura dele leva o id da ficha (`metadata.pedido`). Quando a rotina
// do espelho (`assinaturas.ts`, a ÚNICA que grava o espelho) encontra uma assinatura assim, sem
// espelho e sem conta, é AQUI que se decide de quem ela é — e a conta pode nascer.
//
// TUDO NA TRANSAÇÃO DO ESPELHO, COM A TRAVA DA ASSINATURA: a conta, a ligação com o cliente da
// Stripe, a ficha marcada e o espelho entram juntos ou não entram. Se algo falhar no meio, nada
// fica, a rota do aviso responde 5xx e a Stripe entrega de novo — e dá certo da próxima vez.
//
// SÓ COM O PAGAMENTO FEITO: a assinatura tem que dar acesso pela regra do GATE (`assinaturaDaAcesso`)
// — a incompleta, a tentativa que nunca foi paga, não cria conta nenhuma.
//
// A CONTA NASCE SEM SENHA: não há como entrar nela (o login responde "e-mail ou senha inválidos",
// como numa senha errada) até a pessoa criar a senha pelo e-mail (etapa 4.7, passo 5). O e-mail vai
// em MINÚSCULAS, como o Better Auth grava e busca — com outra grafia, o login nunca a acharia.

/** Por que a assinatura de um visitante NÃO ganhou conta. */
export type SemContaDoVisitante =
  /** A assinatura aponta uma ficha que não existe (apagada, ou de outro banco). */
  | "pedido inexistente"
  /** A assinatura é de OUTRO cliente da Stripe que não o da ficha: não se liga a conta de ninguém. */
  | "pedido de outro cliente"
  /** Ainda não foi paga: a tentativa em andamento — o normal de toda assinatura de visitante. */
  | "aguardando o pagamento"
  /** O e-mail da ficha ganhou conta entre a ficha e o pagamento: precisa de gente para ligar. */
  | "o e-mail já tem conta";

export type DonoDoPedido = { id: string; nova: boolean } | { motivo: SemContaDoVisitante };

/**
 * A conta desta assinatura de VISITANTE — COM a trava da assinatura e DENTRO da transação do
 * espelho (`tx`). A ficha que já tem conta devolve a conta dela (outra assinatura da mesma ficha);
 * senão, paga e com o e-mail livre, a conta NASCE: com o e-mail da ficha, papel de aluno, e o que o
 * visitante escolheu na tentativa paga (novidades e origem).
 */
export async function contaDoPedido(tx: Prisma.TransactionClient, pedidoId: string, assinatura: AssinaturaNaStripe): Promise<DonoDoPedido> {
  const pedido = await tx.guestCheckout.findUnique({
    where: { id: pedidoId },
    select: { id: true, email: true, stripeCustomerId: true, livemode: true, userId: true },
  });
  if (!pedido) return { motivo: "pedido inexistente" };
  // A ficha é de UM cliente da Stripe: uma assinatura de outro cliente que diga ser desta ficha não
  // ganha a conta dela (só o nosso servidor escreve a ficha na Stripe — isto é a segunda trava).
  if (pedido.stripeCustomerId !== assinatura.clienteId) return { motivo: "pedido de outro cliente" };
  // A conta já nasceu, de outra assinatura desta ficha: é ela.
  if (pedido.userId) return { id: pedido.userId, nova: false };
  if (!assinaturaDaAcesso({ status: assinatura.status, currentPeriodEnd: assinatura.pagoAte })) return { motivo: "aguardando o pagamento" };

  const email = pedido.email.toLowerCase();
  // O e-mail ganhou conta DEPOIS da ficha (a tela recusa e-mail que já tem conta antes de ir à
  // Stripe — decisão do operador, 21/10/2026): não se liga o pagamento à conta de outra pessoa sem
  // gente olhando. Quem chama grita no registro, porque há alguém pagando e sem acesso.
  if (await tx.user.findUnique({ where: { email }, select: { id: true } })) return { motivo: "o e-mail já tem conta" };

  const id = generateId();
  const escolha = assinatura.doVisitante ?? { novidades: false, origem: null, campanha: null };
  await tx.user.create({
    data: {
      id,
      email,
      role: Role.MEMBER,
      marketingConsent: escolha.novidades,
      acquisitionSource: escolha.origem,
      acquisitionCampaign: escolha.campanha,
    },
  });
  // Uma conta é sempre UM cliente na Stripe: o da ficha passa a ser o da conta (o checkout de quem
  // está logado e "Minha assinatura" o acham por aqui).
  await tx.stripeCustomer.create({ data: { userId: id, stripeCustomerId: pedido.stripeCustomerId, livemode: pedido.livemode } });
  // A ficha volta a apontar para a tentativa que PAGOU (achado 4 do passo 6 da 4.9, 29/10/2026): um
  // clique posterior com o mesmo e-mail e sem o código (de outra aba — ou de outra pessoa) troca a
  // tentativa da ficha, e sem isto "o pagamento já valeu?" e a senha de depois de pagar responderiam a
  // ESSA tentativa, não à que pagou. O resumo vem da assinatura (os metadados que o nosso servidor
  // gravou), nunca do pedido.
  await tx.guestCheckout.update({ where: { id: pedido.id }, data: { userId: id, ...(assinatura.resumoDaTentativa ? { tentativa: assinatura.resumoDaTentativa } : {}) } });
  return { id, nova: true };
}
