import { generateId } from "better-auth";
import { prisma } from "./prisma.js";
import { auth } from "./auth.js";
import { temAcessoAtivo } from "./acesso.js";
import { resumoDaTentativa } from "./tentativa-do-visitante.js";
import { getDict } from "./dict.js";
import { enviarEmail } from "./email.js";
import { enderecoDoSite } from "./endereco-do-site.js";

// A SENHA LOGO DEPOIS DE PAGAR (Fase 4, etapa 4.7, passo 5 — decisão do operador, 21/10/2026: "na
// própria tela, logo após pagar"; a pessoa já entra para estudar, e o e-mail não é preciso para
// começar). Quem pede é a tela de depois do pagamento (passo 6), com o código da TENTATIVA — que só
// o navegador que pagou recebeu (`checkout-do-visitante.ts`). As travas:
//   - só a conta que NASCEU daquele pagamento (a ficha da tentativa com a conta) e que tem acesso;
//   - só até 24 horas depois de a conta nascer (`PRAZO_DA_SENHA_DEPOIS_DE_PAGAR_EM_HORAS`);
//   - UMA vez: a ficha guarda quando a tentativa criou a senha (`senhaCriadaEm`) — a marca vale
//     mesmo que a linha de senha suma um dia. Depois, quem quiser trocar usa o código no e-mail
//     ("Esqueci minha senha");
//   - só enquanto o e-mail NÃO foi confirmado por outro caminho: se o dono entrou pelo código (ou
//     criou a senha pelo "Esqueci minha senha") antes, a tentativa não cria senha — quem a guardou
//     pode não ser o dono (revisão de segurança, 21/10/2026);
//   - uma de cada vez por conta, SEM ESPERAR (dois cliques juntos nunca criam duas senhas).
// A senha é embaralhada pelo próprio Better Auth (`$context.password.hash`) — a mesma conta que o
// login confere —, e a conta de senha nasce como ele a cria (`accountId` = id da conta).
// O E-MAIL FICA CONFIRMADO AQUI (decisão do operador, P94, 21/10/2026: "se tem a senha é porque foi
// a pessoa que criou"; o código é só mais uma forma de entrar, e a senha continua valendo). Sem
// isso, o Better Auth apagaria esta senha e as sessões na primeira entrada pelo código (ele faz isso
// com toda conta de e-mail não confirmado, sem opção para desligar). Consequência: o `emailVerified`
// NÃO prova que a caixa é da pessoa — as novidades precisam de confirmação própria (P96).

export const PRAZO_DA_SENHA_DEPOIS_DE_PAGAR_EM_HORAS = 24;
const PRAZO_EM_MS = PRAZO_DA_SENHA_DEPOIS_DE_PAGAR_EM_HORAS * 60 * 60 * 1000;

export type DesfechoDaSenha =
  | { resultado: "criada"; contaId: string; email: string }
  /** A tentativa não é de um pagamento que valeu (desconhecida, ainda sem conta, ou a conta sem acesso). */
  | { resultado: "nao-confirmado" }
  /** Passaram as 24 horas: o caminho é o código no e-mail. */
  | { resultado: "prazo-vencido" }
  /** O e-mail foi confirmado por outro caminho (o código): a senha, agora, é pelo "Esqueci minha senha". */
  | { resultado: "email-confirmado" }
  | { resultado: "ja-tem-senha" }
  | { resultado: "ocupada" };

export async function criarSenhaDepoisDePagar(tentativa: string, senha: string): Promise<DesfechoDaSenha> {
  const ficha = await prisma.guestCheckout.findUnique({ where: { tentativa: resumoDaTentativa(tentativa) }, select: { id: true, userId: true, senhaCriadaEm: true } });
  if (!ficha?.userId) return { resultado: "nao-confirmado" };
  const conta = await prisma.user.findUnique({ where: { id: ficha.userId }, select: { id: true, email: true, createdAt: true, emailVerified: true } });
  if (!conta || !(await temAcessoAtivo(conta.id))) return { resultado: "nao-confirmado" };
  if (Date.now() - conta.createdAt.getTime() > PRAZO_EM_MS) return { resultado: "prazo-vencido" };
  // A marca antes do e-mail confirmado: quem já criou a senha aqui (e confirmou o e-mail com ela) ouve "já tem senha".
  if (ficha.senhaCriadaEm) return { resultado: "ja-tem-senha" };
  if (conta.emailVerified) return { resultado: "email-confirmado" };

  // Embaralhada ANTES da trava: o embaralhar demora, e a trava segura uma ligação com o banco.
  const embaralhada = await (await auth.$context).password.hash(senha);
  const desfecho = await prisma.$transaction(async (tx): Promise<DesfechoDaSenha> => {
    const [trava] = await tx.$queryRaw<{ livre: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtext(${`senha:${conta.id}`})) AS livre`;
    if (!trava?.livre) return { resultado: "ocupada" };
    if (await tx.account.findFirst({ where: { userId: conta.id, providerId: "credential" }, select: { id: true } })) return { resultado: "ja-tem-senha" };
    // De novo, COM a trava: o dono pode ter entrado pelo código entre a primeira conferência e aqui.
    if ((await tx.user.findUnique({ where: { id: conta.id }, select: { emailVerified: true } }))?.emailVerified) return { resultado: "email-confirmado" };
    // A marca da vez: só um pedido a toma — e ela fica mesmo que a linha de senha suma depois.
    const tomada = await tx.guestCheckout.updateMany({ where: { id: ficha.id, senhaCriadaEm: null }, data: { senhaCriadaEm: new Date() } });
    if (tomada.count !== 1) return { resultado: "ja-tem-senha" };
    await tx.account.create({ data: { id: generateId(), accountId: conta.id, providerId: "credential", userId: conta.id, password: embaralhada } });
    // O e-mail confirmado (P94, acima): é o que faz a senha sobreviver à primeira entrada pelo código.
    await tx.user.update({ where: { id: conta.id }, data: { emailVerified: true } });
    return { resultado: "criada", contaId: conta.id, email: conta.email };
  });
  // O AVISO NA CAIXA (E16 — decisão do operador P123; texto aprovado em 30/10/2026): DEPOIS do commit, fora da trava, pela
  // porta de sempre (que nunca lança), com a chave estável da conta — a senha nasce uma vez só.
  if (desfecho.resultado === "criada") await avisarSenhaCriada(desfecho.contaId, desfecho.email);
  return desfecho;
}

/** O e-mail "uma senha foi criada", para o `User.email` lido do nosso banco. Nunca lança (`enviarEmail`). */
async function avisarSenhaCriada(contaId: string, email: string): Promise<void> {
  const t = (await getDict()).app.email.senhaCriada;
  const entrar = enderecoDoSite("/login");
  await enviarEmail({
    para: email,
    tipo: "senha-criada",
    referencia: `conta:${contaId}`,
    chave: `senha-criada/${contaId}`,
    mensagem: { assunto: t.assunto, titulo: t.titulo, paragrafos: [t.criada, t.naoFoiVoce], ...(entrar ? { botao: { texto: t.botao, endereco: entrar } } : {}) },
  });
}
