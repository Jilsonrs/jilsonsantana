import { generateId } from "better-auth";
import { prisma } from "./prisma.js";
import { auth } from "./auth.js";
import { temAcessoAtivo } from "./acesso.js";

// A SENHA LOGO DEPOIS DE PAGAR (Fase 4, etapa 4.7, passo 5 — decisão do operador, 21/10/2026: "na
// própria tela, logo após pagar"; a pessoa já entra para estudar, e o e-mail não é preciso para
// começar). Quem pede é a tela de depois do pagamento (passo 6), com o código da TENTATIVA — que só
// o navegador que pagou recebeu (`checkout-do-visitante.ts`). As travas:
//   - só a conta que NASCEU daquele pagamento (a ficha da tentativa com a conta) e que tem acesso;
//   - só enquanto ela NÃO TEM senha: a primeira, e uma vez — depois, quem quiser trocar usa o código
//     no e-mail ("Esqueci minha senha");
//   - só até 24 horas depois de a conta nascer (`PRAZO_DA_SENHA_DEPOIS_DE_PAGAR_EM_HORAS`);
//   - uma de cada vez por conta, SEM ESPERAR (dois cliques juntos nunca criam duas senhas).
// A senha é embaralhada pelo próprio Better Auth (`$context.password.hash`) — a mesma conta que o
// login confere —, e a conta de senha nasce como ele a cria (`accountId` = id da conta).
// O e-mail NÃO fica confirmado por aqui: quem digitou o e-mail pode não ser o dono dele (decisão do
// operador: confirma no primeiro uso de um código).

export const PRAZO_DA_SENHA_DEPOIS_DE_PAGAR_EM_HORAS = 24;
const PRAZO_EM_MS = PRAZO_DA_SENHA_DEPOIS_DE_PAGAR_EM_HORAS * 60 * 60 * 1000;

export type DesfechoDaSenha =
  | { resultado: "criada"; contaId: string; email: string }
  /** A tentativa não é de um pagamento que valeu (desconhecida, ainda sem conta, ou a conta sem acesso). */
  | { resultado: "nao-confirmado" }
  /** Passaram as 24 horas: o caminho é o código no e-mail. */
  | { resultado: "prazo-vencido" }
  | { resultado: "ja-tem-senha" }
  | { resultado: "ocupada" };

export async function criarSenhaDepoisDePagar(tentativa: string, senha: string): Promise<DesfechoDaSenha> {
  const ficha = await prisma.guestCheckout.findUnique({ where: { tentativa }, select: { userId: true } });
  if (!ficha?.userId) return { resultado: "nao-confirmado" };
  const conta = await prisma.user.findUnique({ where: { id: ficha.userId }, select: { id: true, email: true, createdAt: true } });
  if (!conta || !(await temAcessoAtivo(conta.id))) return { resultado: "nao-confirmado" };
  if (Date.now() - conta.createdAt.getTime() > PRAZO_EM_MS) return { resultado: "prazo-vencido" };

  // Embaralhada ANTES da trava: o embaralhar demora, e a trava segura uma ligação com o banco.
  const embaralhada = await (await auth.$context).password.hash(senha);
  return prisma.$transaction(async (tx): Promise<DesfechoDaSenha> => {
    const [trava] = await tx.$queryRaw<{ livre: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtext(${`senha:${conta.id}`})) AS livre`;
    if (!trava?.livre) return { resultado: "ocupada" };
    if (await tx.account.findFirst({ where: { userId: conta.id, providerId: "credential" }, select: { id: true } })) return { resultado: "ja-tem-senha" };
    await tx.account.create({ data: { id: generateId(), accountId: conta.id, providerId: "credential", userId: conta.id, password: embaralhada } });
    return { resultado: "criada", contaId: conta.id, email: conta.email };
  });
}
