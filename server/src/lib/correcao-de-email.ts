import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { Role, TENTATIVAS_DO_CODIGO, VALIDADE_DO_CODIGO_EM_MINUTOS, type CodigoDoEmailEnviado, type EmailCorrigido } from "@jilson/core";
import { Prisma, prisma } from "./prisma.js";
import { getDict } from "./dict.js";
import { enviarEmail } from "./email.js";
import { transacaoDaCobranca } from "./casos.js";
import { travarSeLivre as travarAConta } from "./checkout.js";
import { travarSeLivre as travarOEmail, temConta } from "./checkout-do-visitante.js";
import { apagarTentativaDoEmail } from "./quem-nao-terminou.js";
import { trocarEmailDoCliente } from "./stripe.js";
import { registrar, type PorQuem } from "./acoes-da-cobranca.js";

// CORRIGIR O E-MAIL (Fase 4, etapa 4.7b, passo 3c — decisão do operador, 29/10/2026, P121: a conta que nasceu com o
// e-mail digitado errado se corrige pelo admin, sem devolver, "com o código no e-mail novo"). Em dois pedidos do admin:
//   1. o e-mail certo → um código de 6 números vai PARA ELE (o pedido fica guardado só com o resumo do código, pelos
//      mesmos 10 minutos e 3 tentativas do código de entrar);
//   2. o código que a pessoa recebeu (ela o passa a quem a atende) → a troca.
// É A PORTA DE TOMAR CONTA. As travas (aprovadas com o plano da 4.7b): o e-mail novo não pode ser de outra conta; a troca
// encerra todas as sessões; a ficha do visitante e o cliente da Stripe passam ao e-mail novo; fica no registro quem trocou
// e quando (sem os e-mails). E a SENHA SAI junto com as sessões: quem leu o e-mail errado pode ter entrado por ele e
// criado uma — a pessoa entra pelo código no e-mail novo, que o código acabou de provar (por isso ele fica confirmado).
// A tentativa SEM pagamento que o e-mail novo tenha deixado (a pessoa tentou de novo com o e-mail certo) sai antes, pela
// regra da limpeza dos 7 dias; com pagamento, a troca não segue. A troca do Better Auth continua desligada para o aluno.
// O código vai a um e-mail que NÃO é de conta nenhuma: a exceção decidida pelo operador (P121), pedida só pelo admin e só
// com texto fixo (CLAUDE.md → Membership Gating).

/** O que não deu — cada um vira um status com nome na rota. */
export type NaoCorrigido = "nao-encontrada" | "conta-de-admin" | "mesmo-email" | "email-de-outra-conta" | "email-nao-saiu" | "sem-pedido" | "codigo-errado" | "pagamento-no-email-novo" | "ocupada";

/** A troca vai à Stripe (até dois clientes) com as travas na mão. */
const TEMPO_DA_TROCA = { maxWait: 10_000, timeout: 45_000 };

/**
 * A CONTA DE ADMIN (e a do próprio operador) não se corrige por aqui (revisão de segurança do bloco 3): com uma sessão de
 * admin roubada, a troca daria a conta de admin a quem a roubou, para sempre — ela apaga a senha e as sessões do operador.
 */
function contaDeAdmin(conta: { id: string; role: string }, por: PorQuem): boolean {
  return conta.role === Role.ADMIN || conta.id === por.conta;
}

/** O resumo do código, preso à conta e ao e-mail novo: o mesmo número não vale para outro pedido. Função pura. */
export function resumoDoCodigo(contaId: string, email: string, codigo: string): string {
  return createHash("sha256").update(`${contaId}\n${email}\n${codigo}`).digest("hex");
}

/** 1. O CÓDIGO vai ao e-mail certo. Um pedido novo substitui o anterior (e o código dele deixa de valer). */
export async function pedirCodigoDoEmailNovo(contaId: string, emailDigitado: string, por: PorQuem): Promise<{ resultado: "ok"; feito: CodigoDoEmailEnviado } | { resultado: NaoCorrigido }> {
  const email = emailDigitado.toLowerCase();
  const conta = await prisma.user.findUnique({ where: { id: contaId }, select: { id: true, email: true, role: true, deletedAt: true } });
  if (!conta || conta.deletedAt) return { resultado: "nao-encontrada" };
  if (contaDeAdmin(conta, por)) return { resultado: "conta-de-admin" };
  if (conta.email === email) return { resultado: "mesmo-email" };
  if (await temConta(prisma, email)) return { resultado: "email-de-outra-conta" };
  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const dados = { newEmail: email, codeHash: resumoDoCodigo(conta.id, email, codigo), attempts: 0, expiresAt: new Date(Date.now() + VALIDADE_DO_CODIGO_EM_MINUTOS * 60_000), requestedBy: por.conta };
  await prisma.emailCorrection.upsert({ where: { userId: conta.id }, create: { userId: conta.id, ...dados }, update: dados });
  const t = (await getDict()).app.email;
  const envio = await enviarEmail({
    para: email,
    tipo: "codigo-do-email-novo",
    referencia: `conta:${conta.id}`,
    mensagem: {
      assunto: t.codigoDoEmailNovo.assunto.replace("{codigo}", codigo),
      titulo: t.codigoDoEmailNovo.titulo,
      paragrafos: [t.codigoDoEmailNovo.texto, codigo, t.codigo.validade.replace("{minutos}", String(VALIDADE_DO_CODIGO_EM_MINUTOS)), t.codigoDoEmailNovo.naoFoiVoce],
    },
  });
  if (!envio.enviado) {
    // O código que não chegou não vale: o pedido sai, e o admin pede outro.
    await prisma.emailCorrection.deleteMany({ where: { userId: conta.id, codeHash: dados.codeHash } });
    return { resultado: "email-nao-saiu" };
  }
  await registrar(por, "codigo-do-email-novo", { userId: conta.id }, "o código foi ao e-mail novo");
  return { resultado: "ok", feito: { minutos: VALIDADE_DO_CODIGO_EM_MINUTOS } };
}

/**
 * O código confere com o pedido guardado? A tentativa conta ANTES de comparar, num comando só (revisão de segurança do
 * bloco 3): N pedidos juntos nunca comparam mais códigos que as tentativas que sobram. A errada que esgota as tentativas
 * apaga o pedido.
 */
async function conferirOCodigo(contaId: string, email: string, codigo: string): Promise<"ok" | "sem-pedido" | "codigo-errado"> {
  const [contada] = await prisma.$queryRaw<{ attempts: number; codeHash: string }[]>`
    UPDATE "email_correction" SET "attempts" = "attempts" + 1
     WHERE "userId" = ${contaId} AND "newEmail" = ${email} AND "attempts" < ${TENTATIVAS_DO_CODIGO} AND "expiresAt" > now()
     RETURNING "attempts", "codeHash"`;
  if (!contada) return "sem-pedido";
  const guardado = Buffer.from(contada.codeHash, "hex");
  const dado = Buffer.from(resumoDoCodigo(contaId, email, codigo), "hex");
  if (guardado.length === dado.length && timingSafeEqual(guardado, dado)) return "ok";
  if (contada.attempts >= TENTATIVAS_DO_CODIGO) await prisma.emailCorrection.deleteMany({ where: { userId: contaId, codeHash: contada.codeHash } });
  return "codigo-errado";
}

/** 2. A TROCA, com o código. */
export async function corrigirEmailComCodigo(contaId: string, emailDigitado: string, codigo: string, por: PorQuem): Promise<{ resultado: "ok"; feito: EmailCorrigido } | { resultado: NaoCorrigido }> {
  const email = emailDigitado.toLowerCase();
  const conferido = await conferirOCodigo(contaId, email, codigo);
  if (conferido !== "ok") return { resultado: conferido };
  const tentativa = await apagarTentativaDoEmail(email);
  if (tentativa === "com-pagamento" || tentativa === "outro-modo") return { resultado: "pagamento-no-email-novo" };
  if (tentativa === "ocupada" || tentativa === "adiada") return { resultado: "ocupada" };
  try {
    return await transacaoDaCobranca(async (tx): Promise<{ resultado: "ok"; feito: EmailCorrigido } | { resultado: NaoCorrigido }> => {
      // As travas que não esperam: a da conta (a do checkout e do Pix) e as dos dois e-mails (a do assinar sem conta).
      if (!(await travarAConta(tx, contaId))) return { resultado: "ocupada" };
      const conta = await tx.user.findUnique({ where: { id: contaId }, select: { id: true, email: true, role: true, deletedAt: true } });
      if (!conta || conta.deletedAt) return { resultado: "nao-encontrada" };
      if (contaDeAdmin(conta, por)) return { resultado: "conta-de-admin" };
      if (!(await travarOEmail(tx, email)) || !(await travarOEmail(tx, conta.email))) return { resultado: "ocupada" };
      // Relido com as travas: o pedido conferido (um pedido novo, no meio, o substituiria) e o e-mail novo ainda livre —
      // de conta e de tentativa (uma nova pode ter nascido depois da limpeza acima).
      const pedido = await tx.emailCorrection.findUnique({ where: { userId: contaId }, select: { codeHash: true } });
      if (pedido?.codeHash !== resumoDoCodigo(contaId, email, codigo)) return { resultado: "sem-pedido" };
      if (await temConta(tx, email)) return { resultado: "email-de-outra-conta" };
      if (await tx.guestCheckout.findUnique({ where: { email }, select: { id: true } })) return { resultado: "ocupada" };
      // A Stripe ANTES do banco: se ela falhar, nada muda aqui — e repetir dá no mesmo.
      const clientes = new Set<string>();
      const logado = await tx.stripeCustomer.findUnique({ where: { userId: contaId }, select: { stripeCustomerId: true } });
      if (logado) clientes.add(logado.stripeCustomerId);
      const ficha = await tx.guestCheckout.findUnique({ where: { userId: contaId }, select: { stripeCustomerId: true } });
      if (ficha) clientes.add(ficha.stripeCustomerId);
      for (const cliente of clientes) await trocarEmailDoCliente(cliente, email);
      await tx.user.update({ where: { id: contaId }, data: { email, emailVerified: true } });
      await tx.session.deleteMany({ where: { userId: contaId } });
      await tx.account.deleteMany({ where: { userId: contaId, providerId: "credential" } });
      await tx.guestCheckout.updateMany({ where: { userId: contaId }, data: { email } });
      await tx.emailCorrection.delete({ where: { userId: contaId } });
      await tx.billingLog.create({ data: { who: por.quem, actorUserId: por.conta, action: "corrigir-email", userId: contaId, stripeCustomerId: [...clientes][0] ?? null, detail: "e-mail corrigido; as sessões e a senha antigas encerradas" } });
      return { resultado: "ok", feito: { email } };
    }, TEMPO_DA_TROCA);
  } catch (erro) {
    // O e-mail ganho por outra conta no meio (a conta do visitante nasce com a trava da assinatura, não com a do e-mail).
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") return { resultado: "email-de-outra-conta" };
    throw erro;
  }
}
