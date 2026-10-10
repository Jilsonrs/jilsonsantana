import { DuracaoDoDesconto, type AssinarInput } from "@jilson/core";
import { prisma } from "./prisma.js";
import { temAcessoAtivo } from "./acesso.js";
import { sincronizarAssinatura } from "./assinaturas.js";
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

export type Conta = { id: string; email: string; nome: string | null };

export type Desfecho =
  | { resultado: "ja-assinante" }
  | { resultado: "codigo-invalido" }
  | { resultado: "ativa" }
  | { resultado: "pagar"; segredo: string; tipo: "pagamento" | "cartao" };

/** Encerradas: não cobram mais e não impedem uma assinatura nova. */
const ENCERRADAS: ReadonlySet<string> = new Set(["incomplete_expired", "canceled"]);

/** Até 4 idas à Stripe dentro da trava (10 s cada, com uma nova tentativa). */
const TEMPO_DA_TRANSACAO = { maxWait: 10_000, timeout: 90_000 };

/** O cliente desta conta na Stripe — o que já existe, ou um novo, gravado NA HORA (fora da transação da trava: se o resto falhar, ele fica). */
async function clienteDaConta(conta: Conta): Promise<string> {
  const guardado = await prisma.stripeCustomer.findUnique({ where: { userId: conta.id }, select: { stripeCustomerId: true } });
  if (guardado) return guardado.stripeCustomerId;
  const novo = await criarCliente({ userId: conta.id, email: conta.email, nome: conta.nome });
  await prisma.stripeCustomer.create({ data: { userId: conta.id, stripeCustomerId: novo.id, livemode: novo.livemode } });
  return novo.id;
}

/** Na Stripe a assinatura está DANDO acesso: se o espelho não dá, há alguém pagando e trancado fora. */
const DA_ACESSO_NA_STRIPE: ReadonlySet<string> = new Set(["active", "trialing", "past_due"]);

/** O que se decide COM a trava da conta. A assinatura viva sai da trava para ser sincronizada fora dela. */
type NaTrava = Desfecho | { resultado: "viva-na-stripe"; assinaturaId: string };

/**
 * A Stripe diz que a conta tem assinatura viva, e o espelho não dá acesso: o aviso atrasou ou se
 * perdeu, e há alguém que pode estar pagando e trancado fora (achado P1 da revisão de segurança
 * da etapa 4.2). SINCRONIZA — a mesma rotina do aviso, com a trava da assinatura — e só então
 * responde "já é assinante", agora com a aula aberta. Roda FORA da trava da conta: a sincronia
 * não cria nada na Stripe, e assim este pedido não segura duas conexões do banco.
 * Se a Stripe não responder, o erro SOBE (500): "tente de novo" é mais honesto que "já é
 * assinante" com a aula trancada — e a nova tentativa é o que conserta.
 */
async function sincronizarAViva(conta: Conta, assinaturaId: string): Promise<Desfecho> {
  const sincronia = await sincronizarAssinatura(assinaturaId);
  const { status } = sincronia.assinatura;
  if (await temAcessoAtivo(conta.id)) {
    console.info(`[stripe] checkout: a conta ${conta.id} estava sem o espelho da assinatura ${assinaturaId} (${status}); sincronizada, com acesso`);
    return { resultado: "ja-assinante" };
  }
  // Sincronizou e a conta segue sem acesso — e sem poder assinar de novo, porque a assinatura
  // continua aberta na Stripe. Precisa de gente nos dois casos, em voz alta:
  //   - ela dá acesso na Stripe: o espelho não nasceu para ESTA conta (sem `userId` lá, ou é de
  //     outro dono) — há alguém pagando e trancado fora;
  //   - ela não dá (não paga, ou pausada com o período vencido): a pessoa quer pagar e este
  //     caminho não deixa (achado da revisão de segurança da etapa 4.4 — pendência P60).
  const linha = `[stripe] checkout: a conta ${conta.id} tem a assinatura ${assinaturaId} (${status}) na Stripe e segue sem acesso depois da sincronia (${sincronia.resultado})`;
  console.error(`${linha}: ${DA_ACESSO_NA_STRIPE.has(status) ? "o assinante está trancado fora" : "quer assinar e não consegue"}`);
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

  const decisao = await prisma.$transaction(async (tx): Promise<NaTrava> => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`assinar:${conta.id}`}))`;
    // De novo, com a trava: o aviso da Stripe pode ter chegado enquanto este pedido esperava.
    if (await temAcessoAtivo(conta.id)) return { resultado: "ja-assinante" };

    const clienteId = await clienteDaConta(conta);
    const existentes = (await assinaturasDoCliente(clienteId)).filter((a) => !ENCERRADAS.has(a.status));
    const viva = existentes.find((a) => a.status !== "incomplete");
    // A Stripe diz que há assinatura; o espelho, que não dá acesso: sem criar outra — e a
    // sincronia, que conserta o espelho, roda depois de soltar esta trava (`sincronizarAViva`).
    if (viva) return { resultado: "viva-na-stripe", assinaturaId: viva.id };

    let assinatura: AssinaturaNoCheckout | null = null;
    for (const incompleta of existentes) {
      // A MESMA: o mesmo PREÇO (o de verdade, não um rótulo) e o mesmo código.
      const aMesma = incompleta.precoId === preco.precoId && incompleta.codigoId === codigoId && incompleta.segredoDoPagamento !== null;
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
