import type { Prisma } from "./prisma.js";
import { DuracaoDoDesconto, type AssinarInput } from "@jilson/core";
import { prisma } from "./prisma.js";
import { assinaturaDaAcesso, cobrancaAtrasada, temAcessoAtivo } from "./acesso.js";
import { sincronizarSeLivre } from "./assinaturas.js";
import { assinaturasDoCliente, buscarCodigo, buscarPrecos, cancelarIncompleta, criarAssinatura, criarCliente, type AssinaturaNoCheckout } from "./stripe.js";

// ASSINAR COM A CONTA LOGADA (Fase 4, etapa 4.2 — billing.md; CLAUDE.md → Membership Gating).
// A regra, na ordem — e tudo dentro de UMA TRAVA POR CONTA (dois cliques, ou duas abas, nunca
// correm juntos; é a mesma trava de transação do aviso, `assinaturas.ts`):
//   1. quem JÁ TEM ACESSO não assina de novo (`temAcessoAtivo()`, a fonte única);
//   2. UMA CONTA É UM CLIENTE na Stripe: acha em `stripe_customer`, ou cria e grava;
//   3. o que a STRIPE diz deste cliente, agora — o espelho pode estar atrasado:
//        - uma assinatura VIVA (nem incompleta, nem encerrada) → já é assinante — e, como o
//          espelho não deu acesso, SINCRONIZA antes de responder (etapa 4.4, `sincronizarAViva`);
//        - uma INCOMPLETA do mesmo preço e do mesmo código → é ela (o cartão recusado e a nova
//          tentativa não criam outra);
//        - incompleta de outro plano ou código → cancela, e só então cria a nova;
//   4. cria a assinatura, incompleta até o SITE confirmar o pagamento.
// Aqui NADA grava o espelho à mão: quem grava é a rotina do aviso da Stripe (`assinaturas.ts`) —
// a que o aviso chama, e a que este arquivo chama quando o aviso atrasou ou se perdeu.
// O dinheiro não corre risco em nenhuma falha no meio: sem a confirmação do site não há cobrança,
// e a incompleta que sobrar expira sozinha na Stripe.
//
// A TRAVA NÃO ESPERA (etapa 4.7, passo 2 — achados P1 das revisões de segurança da 4.2 e da 4.4):
// quem esperasse a trava esperaria SEGURANDO uma ligação com o banco, e vários pedidos juntos
// esgotariam as ligações — o site parava para todo mundo. Com a conta ocupada (outro pedido dela
// assinando), a resposta é "ocupada" na hora, sem ir à Stripe; o novo clique segue com a mesma
// assinatura. E, com a trava na mão, tudo passa pela MESMA ligação: pedir outra ali dentro, com
// esta presa, podia esperar uma ligação que não vinha.

export type Conta = { id: string; email: string; nome: string | null };

export type Desfecho =
  | { resultado: "ja-assinante" }
  /** Outro pedido desta conta está assinando agora (outra aba): nada foi feito — tentar de novo. */
  | { resultado: "ocupada" }
  /** A conta tem uma assinatura com a cobrança atrasada, já sem as aulas: não se assina de novo — troca-se o cartão dela. */
  | { resultado: "atrasada" }
  | { resultado: "codigo-invalido" }
  | { resultado: "ativa" }
  | { resultado: "pagar"; segredo: string; tipo: "pagamento" | "cartao" };

/** Encerradas: não cobram mais e não impedem uma assinatura nova. */
const ENCERRADAS: ReadonlySet<string> = new Set(["incomplete_expired", "canceled"]);

/** Até 4 idas à Stripe dentro da trava (10 s cada, com uma nova tentativa). */
const TEMPO_DA_TRANSACAO = { maxWait: 10_000, timeout: 90_000 };
/** Uma ida à Stripe (criar o cliente), com uma nova tentativa. */
const TEMPO_DO_CLIENTE = { maxWait: 10_000, timeout: 30_000 };

/** A trava desta conta, SEM ESPERAR: livre, fica com este pedido até a transação acabar; ocupada, devolve não. */
async function travarSeLivre(tx: Prisma.TransactionClient, contaId: string): Promise<boolean> {
  const [trava] = await tx.$queryRaw<{ livre: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtext(${`assinar:${contaId}`})) AS livre`;
  return trava?.livre === true;
}

/**
 * O cliente desta conta na Stripe — o que já existe, ou um novo, criado e gravado NUMA TRANSAÇÃO
 * CURTA SÓ DELE, com a trava da conta: se o resto do checkout falhar, ele fica gravado, e uma
 * conta é sempre UM cliente. Nada: outro pedido desta conta está assinando agora.
 */
async function clienteDaConta(conta: Conta): Promise<string | null> {
  const guardado = await prisma.stripeCustomer.findUnique({ where: { userId: conta.id }, select: { stripeCustomerId: true } });
  if (guardado) return guardado.stripeCustomerId;
  return prisma.$transaction(async (tx): Promise<string | null> => {
    if (!(await travarSeLivre(tx, conta.id))) return null;
    // De novo, com a trava: o pedido que a tinha pode ter acabado de criar o cliente.
    const criado = await tx.stripeCustomer.findUnique({ where: { userId: conta.id }, select: { stripeCustomerId: true } });
    if (criado) return criado.stripeCustomerId;
    const novo = await criarCliente({ userId: conta.id, email: conta.email, nome: conta.nome });
    await tx.stripeCustomer.create({ data: { userId: conta.id, stripeCustomerId: novo.id, livemode: novo.livemode } });
    return novo.id;
  }, TEMPO_DO_CLIENTE);
}

/** O que se decide COM a trava da conta. A assinatura viva sai da trava para ser sincronizada fora dela. */
type NaTrava = Desfecho | { resultado: "viva-na-stripe"; assinaturaId: string };

/**
 * A Stripe diz que a conta tem assinatura viva, e o espelho não dá acesso: o aviso atrasou ou se
 * perdeu, e há alguém que pode estar pagando e trancado fora (achado P1 da revisão de segurança
 * da etapa 4.2). SINCRONIZA — a mesma rotina do aviso, com a trava da assinatura — e só então
 * responde "já é assinante", agora com a aula aberta. Roda FORA da trava da conta: a sincronia
 * não cria nada na Stripe, e assim este pedido não segura duas conexões do banco.
 * A sincronia NÃO ESPERA a trava da assinatura (etapa 4.7, passo 2): o aluno pode repetir o
 * clique à vontade, e esperar seguraria uma ligação com o banco. Ocupada — o aviso da Stripe, ou
 * outro pedido, está acertando o espelho AGORA —, a resposta é "já é assinante", que é o que a
 * Stripe acabou de dizer: a tela relê o gate e mostra o que ele diz. Nunca "não foi possível" a
 * quem pode ter acabado de pagar (achado da revisão de segurança do passo; CLAUDE.md → *a tela de
 * cobrança só afirma o que o servidor disse*).
 * Se a Stripe não responder, o erro SOBE (500): "tente de novo" é mais honesto que "já é
 * assinante" com a aula trancada — e a nova tentativa é o que conserta.
 */
async function sincronizarAViva(conta: Conta, assinaturaId: string): Promise<Desfecho> {
  const sincronia = await sincronizarSeLivre(assinaturaId);
  if (!sincronia) {
    console.info(`[stripe] checkout: a conta ${conta.id} tem a assinatura ${assinaturaId} viva na Stripe, e o espelho dela está sendo acertado agora`);
    return { resultado: "ja-assinante" };
  }
  const { status } = sincronia.assinatura;
  if (await temAcessoAtivo(conta.id)) {
    console.info(`[stripe] checkout: a conta ${conta.id} estava sem o espelho da assinatura ${assinaturaId} (${status}); sincronizada, com acesso`);
    return { resultado: "ja-assinante" };
  }
  // A COBRANÇA ATRASADA há mais de 3 dias (etapa 4.6b): o espelho TEM a assinatura, ela é DESTA
  // conta e não dá aulas — é o esperado, não um defeito. Ela continua viva na Stripe: o caminho é
  // trocar o cartão dela, em Faturamento e Assinatura. (Sem o espelho para esta conta, o caso é
  // o de baixo: precisa de gente.)
  const noEspelho = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: assinaturaId }, select: { ownerUserId: true, status: true } });
  if (noEspelho?.ownerUserId === conta.id && cobrancaAtrasada(noEspelho)) {
    console.info(`[stripe] checkout: a conta ${conta.id} tem a assinatura ${assinaturaId} com a cobrança atrasada e já sem aulas; o caminho é trocar o cartão`);
    return { resultado: "atrasada" };
  }
  // Sincronizou e a conta segue sem acesso — e sem poder assinar de novo, porque a assinatura
  // continua aberta na Stripe. Precisa de gente nos dois casos, em voz alta:
  //   - ela dá acesso na Stripe: o espelho não nasceu para ESTA conta (sem `userId` lá, ou é de
  //     outro dono) — há alguém pagando e trancado fora;
  //   - ela não dá (não paga, ou pausada com o período vencido): a pessoa quer pagar e este
  //     caminho não deixa (achado da revisão de segurança da etapa 4.4 — pendência P60).
  const linha = `[stripe] checkout: a conta ${conta.id} tem a assinatura ${assinaturaId} (${status}) na Stripe e segue sem acesso depois da sincronia (${sincronia.resultado})`;
  // "Dá acesso" é a regra do GATE, aplicada ao que a Stripe diz — nunca uma lista de status à parte.
  console.error(`${linha}: ${assinaturaDaAcesso({ status, currentPeriodEnd: sincronia.assinatura.pagoAte }) ? "o assinante está trancado fora" : "quer assinar e não consegue"}`);
  return { resultado: "ja-assinante" };
}

export async function assinar(conta: Conta, pedido: AssinarInput): Promise<Desfecho> {
  // Quem já tem acesso nem chega à Stripe: senão a resposta diria a um assinante se um código
  // promocional existe (400) ou não (409) — achado da revisão de segurança, 10/10/2026.
  if (await temAcessoAtivo(conta.id)) return { resultado: "ja-assinante" };

  // Leituras, antes da trava: o preço do plano pedido e o código, se veio um.
  const [precos, codigo] = await Promise.all([buscarPrecos(), pedido.codigo ? buscarCodigo(pedido.codigo) : null]);
  const preco = precos.find((p) => p.plano === pedido.plano);
  if (!preco) throw new Error(`[stripe] plano ${pedido.plano} sem preço`);
  if (pedido.codigo && !codigo) return { resultado: "codigo-invalido" };
  const codigoId = codigo?.id ?? null;
  const clienteId = await clienteDaConta(conta);
  if (clienteId === null) return { resultado: "ocupada" };

  const decisao = await prisma.$transaction(async (tx): Promise<NaTrava> => {
    if (!(await travarSeLivre(tx, conta.id))) return { resultado: "ocupada" };
    // De novo, com a trava, e pela MESMA ligação: o aviso da Stripe pode ter chegado no meio.
    if (await temAcessoAtivo(conta.id, tx)) return { resultado: "ja-assinante" };

    const existentes = (await assinaturasDoCliente(clienteId)).filter((a) => !ENCERRADAS.has(a.status));
    const viva = existentes.find((a) => a.status !== "incomplete");
    // A Stripe diz que há assinatura; o espelho, que não dá acesso: sem criar outra — e a
    // sincronia, que conserta o espelho, roda depois de soltar esta trava (`sincronizarAViva`).
    if (viva) return { resultado: "viva-na-stripe", assinaturaId: viva.id };

    let assinatura: AssinaturaNoCheckout | null = null;
    for (const incompleta of existentes) {
      // A MESMA: o mesmo PREÇO (o de verdade, não um rótulo), o mesmo código — e um pagamento que a
      // Stripe ainda aceita: depois de 10 recusas ela o cancela, e a assinatura continua aberta com o
      // segredo morto (medido na área restrita, 21/10/2026 — achado do passo 4 da etapa 4.7;
      // correção autorizada pelo operador no mesmo dia). Entregá-lo de novo prenderia o aluno.
      const aMesma = incompleta.precoId === preco.precoId && incompleta.codigoId === codigoId && incompleta.pagamentoCancelado !== true && incompleta.segredoDoPagamento !== null;
      if (aMesma && !assinatura) {
        assinatura = incompleta;
        continue;
      }
      const ficou = await cancelarIncompleta(incompleta.id);
      if (ficou !== "incomplete_expired") {
        // Ela foi PAGA entre a lista e o cancelamento (outra aba, no mesmo instante): o
        // cancelamento encerrou uma assinatura paga. Precisa de gente: reembolso ou reativação.
        console.error(`[stripe] checkout: a assinatura ${incompleta.id} da conta ${conta.id} foi cancelada já PAGA (ficou ${ficou}) — conferir no painel`);
        return { resultado: "ja-assinante" };
      }
    }

    assinatura ??= await criarAssinatura({ clienteId, userId: conta.id, precoId: preco.precoId, plano: pedido.plano, codigoId });
    // A Stripe recusou o desconto na criação (o código esgotou entre a prévia e o clique).
    if (!assinatura) return { resultado: "codigo-invalido" };
    console.info(`[stripe] checkout: conta ${conta.id}, plano ${pedido.plano} → assinatura ${assinatura.id} (${assinatura.status})`);

    if (assinatura.status === "incomplete" && assinatura.segredoDoPagamento) return { resultado: "pagar", segredo: assinatura.segredoDoPagamento, tipo: "pagamento" };
    if (assinatura.status === "active") {
      // Nada a pagar hoje. Com desconto PARA SEMPRE, nada a pagar nunca: sem cartão (decisão do
      // operador, 09/10/2026 — o cupom de 100%). Se o desconto acaba, a cobrança seguinte
      // precisa de um cartão: o site o guarda agora.
      const acaba = codigo !== null && codigo.desconto.duracao !== DuracaoDoDesconto.PARA_SEMPRE;
      if (acaba && assinatura.segredoDoCartao) return { resultado: "pagar", segredo: assinatura.segredoDoCartao, tipo: "cartao" };
      return { resultado: "ativa" };
    }
    throw new Error(`[stripe] checkout: a assinatura ${assinatura.id} nasceu ${assinatura.status}, sem o que confirmar`);
  }, TEMPO_DA_TRANSACAO);

  return decisao.resultado === "viva-na-stripe" ? sincronizarAViva(conta, decisao.assinaturaId) : decisao;
}
