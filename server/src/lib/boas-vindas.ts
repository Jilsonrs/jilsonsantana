import { getDict } from "./dict.js";
import { enviarEmail } from "./email.js";
import { prisma } from "./prisma.js";
import { temAcessoAtivo } from "./acesso.js";
import { enderecoDoSite } from "./endereco-do-site.js";

// O E-MAIL DE BOAS-VINDAS de quem assinou sem conta (Fase 4, etapa 4.7, passo 5 — decisão do
// operador, 21/10/2026): confirma a assinatura e diz como entrar. Não é preciso para começar (a senha
// nasce na tela de depois do pagamento), e é a única confirmação que a pessoa recebe (os e-mails de
// cobrança da Stripe estão desligados).
// QUANDO SAI: depois de uma sincronia da assinatura (o aviso da Stripe, o novo clique de quem já
// pagou, a conferência do admin) — DEPOIS do commit, fora de transação e de trava (CLAUDE.md →
// Membership Gating). Não depende da vez em que a conta nasce: qualquer sincronia seguinte tenta, até
// sair. UMA VEZ: a ficha guarda quando ele foi tomado (`boasVindasEnviadaEm`), e só um pedido toma;
// se o envio falha, a marca volta a vazio e o próximo aviso tenta de novo. A chave
// (`boas-vindas/<conta>`) segura as duas pontas no Resend por 24 h.
// NUNCA DERRUBA QUEM CHAMA: qualquer falha aqui vira alerta `[email]`, e o aviso da Stripe já ganho
// continua 200.

export async function mandarBoasVindasDaAssinatura(assinaturaId: string): Promise<void> {
  try {
    const espelho = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: assinaturaId }, select: { ownerUserId: true } });
    if (!espelho?.ownerUserId) return;
    // Só a conta que nasceu de uma ficha de espera (quem assinou sem conta).
    const ficha = await prisma.guestCheckout.findUnique({ where: { userId: espelho.ownerUserId }, select: { id: true, boasVindasEnviadaEm: true } });
    if (!ficha || ficha.boasVindasEnviadaEm) return;
    // "Sua assinatura está confirmada" só para quem tem acesso agora.
    if (!(await temAcessoAtivo(espelho.ownerUserId))) return;
    const tomada = await prisma.guestCheckout.updateMany({ where: { id: ficha.id, boasVindasEnviadaEm: null }, data: { boasVindasEnviadaEm: new Date() } });
    if (tomada.count !== 1) return;
    const conta = await prisma.user.findUnique({ where: { id: espelho.ownerUserId }, select: { id: true, email: true } });
    if (!conta) return;

    const t = (await getDict()).app.email.boasVindas;
    const entrar = enderecoDoSite("/login");
    const envio = await enviarEmail({
      para: conta.email,
      tipo: "boas-vindas",
      referencia: `conta:${conta.id} ficha:${ficha.id}`,
      chave: `boas-vindas/${conta.id}`,
      mensagem: { assunto: t.assunto, titulo: t.titulo, paragrafos: [t.confirmada, t.comoEntrar], ...(entrar ? { botao: { texto: t.botao, endereco: entrar } } : {}) },
    });
    // Falhou: a marca volta, e o próximo aviso da Stripe tenta de novo. "Duplicado" é o outro envio,
    // com a mesma chave, saindo — a marca fica.
    if (!envio.enviado && envio.motivo === "falhou") await prisma.guestCheckout.updateMany({ where: { id: ficha.id }, data: { boasVindasEnviadaEm: null } });
  } catch (erro) {
    console.error(`[email] as boas-vindas da assinatura ${assinaturaId} não saíram: ${erro instanceof Error ? erro.name : "falha sem tipo"}`);
  }
}
