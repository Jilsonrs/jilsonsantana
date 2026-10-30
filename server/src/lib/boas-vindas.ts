import { nomeDaPessoaSchema } from "@jilson/core";
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

/**
 * Um PRIMEIRO NOME COMUM, o único que entra na saudação (decisão do operador, 30/10/2026, depois da revisão de
 * segurança): até 30 letras do português e das línguas europeias — o latim básico, o Latin-1 e o Latin
 * Extended-A, com acento —, e no máximo um hífen ou apóstrofo entre elas. Fica de fora o resto, inclusive as
 * letras de outros alfabetos que parecem ponto, dois-pontos, barra ou 8 (passam no "só letras" de quem assina).
 */
const PRIMEIRO_NOME_COMUM = /^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u017F]+(?:[-'\u2019][A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u017F]+)?$/u;
const TAMANHO_DO_PRIMEIRO_NOME = 30;

/**
 * O PRIMEIRO NOME para o título ("Olá, Maria!" — decisão do operador, 30/10/2026, P93), ou nada (o título sem
 * nome). O nome é o da FICHA — o digitado ao assinar, congelado quando a conta nasce —, nunca o da conta: o aluno
 * logado grava qualquer nome pela rota pronta `update-user` do Better Auth, e a chave do envio é a mesma (o
 * Resend recusa a mesma chave com outro conteúdo). Este e-mail vai a uma caixa que ninguém provou (P94): texto
 * livre no título seria a escola assinando o golpe de quem o escreveu — por isso a regra de quem assina
 * (`nomeDaPessoaSchema`) E a do nome comum. O acento digitado em dois caracteres é juntado antes (NFC).
 */
export function primeiroNomeDoTitulo(nome: string | null): string | null {
  const lido = nomeDaPessoaSchema.safeParse(nome);
  if (!lido.success) return null;
  const primeiro = lido.data.normalize("NFC").split(" ")[0] ?? "";
  return [...primeiro].length <= TAMANHO_DO_PRIMEIRO_NOME && PRIMEIRO_NOME_COMUM.test(primeiro) ? primeiro : null;
}

export async function mandarBoasVindasDaAssinatura(assinaturaId: string): Promise<void> {
  try {
    const espelho = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: assinaturaId }, select: { ownerUserId: true } });
    if (!espelho?.ownerUserId) return;
    // Só a conta que nasceu de uma ficha de espera (quem assinou sem conta).
    const ficha = await prisma.guestCheckout.findUnique({ where: { userId: espelho.ownerUserId }, select: { id: true, boasVindasEnviadaEm: true, nome: true } });
    if (!ficha || ficha.boasVindasEnviadaEm) return;
    // "Sua assinatura está confirmada" só para quem tem acesso agora.
    if (!(await temAcessoAtivo(espelho.ownerUserId))) return;
    const tomada = await prisma.guestCheckout.updateMany({ where: { id: ficha.id, boasVindasEnviadaEm: null }, data: { boasVindasEnviadaEm: new Date() } });
    if (tomada.count !== 1) return;
    const conta = await prisma.user.findUnique({ where: { id: espelho.ownerUserId }, select: { id: true, email: true } });
    if (!conta) return;

    const t = (await getDict()).app.email.boasVindas;
    const primeiroNome = primeiroNomeDoTitulo(ficha.nome);
    const titulo = primeiroNome ? t.titulo.replace("{nome}", () => primeiroNome) : t.tituloSemNome;
    const entrar = enderecoDoSite("/login");
    const envio = await enviarEmail({
      para: conta.email,
      tipo: "boas-vindas",
      referencia: `conta:${conta.id} ficha:${ficha.id}`,
      chave: `boas-vindas/${conta.id}`,
      mensagem: { assunto: t.assunto, titulo, paragrafos: [t.confirmada, t.comoEntrar], ...(entrar ? { botao: { texto: t.botao, endereco: entrar } } : {}) },
    });
    // Falhou: a marca volta, e o próximo aviso da Stripe tenta de novo. "Duplicado" é o outro envio,
    // com a mesma chave, saindo — a marca fica.
    if (!envio.enviado && envio.motivo === "falhou") await prisma.guestCheckout.updateMany({ where: { id: ficha.id }, data: { boasVindasEnviadaEm: null } });
  } catch (erro) {
    console.error(`[email] as boas-vindas da assinatura ${assinaturaId} não saíram: ${erro instanceof Error ? erro.name : "falha sem tipo"}`);
  }
}
