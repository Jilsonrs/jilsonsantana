import { randomUUID } from "node:crypto";
import type { Prisma } from "./prisma.js";
import { DuracaoDoDesconto, type AssinarSemLoginInput } from "@jilson/core";
import { prisma } from "./prisma.js";
import { sincronizarSeLivre } from "./assinaturas.js";
import { cancelarPagamentosPixPendentes } from "./stripe-pix.js";
import { temAcessoAtivo } from "./acesso.js";
import { mandarBoasVindasDaAssinatura } from "./boas-vindas.js";
import { novaTentativa, resumoDaTentativa } from "./tentativa-do-visitante.js";
import { acertarNumeroFiscal, assinaturasDoCliente, chaveDoNumeroFiscal, buscarCodigo, buscarPrecos, cancelarIncompleta, criarAssinatura, criarClienteDoVisitante, DocumentoRecusado, type AssinaturaNoCheckout } from "./stripe.js";

// ASSINAR SEM CONTA (Fase 4, etapa 4.7, passo 4 — billing.md → *Assinar sem conta*; CLAUDE.md →
// Membership Gating). A regra é a do checkout de quem está logado (`checkout.ts`), com três
// diferenças, e a conta NÃO nasce aqui — nasce na rotina do espelho, quando o pagamento passa
// (`pedido-do-visitante.ts`):
//   1. o e-mail que JÁ TEM CONTA não assina por aqui: a tela avisa e manda entrar (decisão do
//      operador, 21/10/2026) — e isso se decide antes de qualquer ida à Stripe;
//   2. no lugar da conta, a FICHA DE ESPERA do e-mail, ligada a UM cliente da Stripe, que nasce com
//      o e-mail e o CPF ou CNPJ (o número só na Stripe); a trava é POR E-MAIL (`assinar-email:`), e
//      também não espera — ocupada, a resposta é "ocupada" na hora, sem segurar ligação do banco;
//   3. a tentativa em andamento só é REAPROVEITADA por quem traz o código dela (`tentativa`, que
//      só volta para quem a criou). Sem o código, a anterior é cancelada e nasce outra, com código
//      novo: o e-mail não é segredo, e quem soubesse o de alguém receberia o segredo do pagamento
//      dessa pessoa — e o cartão de um pagamento recusado aparece nele.
// Quem soubesse o e-mail de alguém ainda pode CANCELAR a tentativa dessa pessoa (ela clica de novo e
// segue): é o preço de não exigir conta, limitado pelo limite de tentativas por e-mail.
//
// DA REVISÃO DE SEGURANÇA DO PASSO (21/10/2026): o número fiscal só muda DENTRO da decisão, com a
// trava e depois de conferir que o cliente não tem assinatura viva — senão um terceiro trocaria o
// CPF de quem acabou de pagar, ou dois pedidos intercalados deixariam a fatura de uma pessoa com o
// número da outra; a ficha que já virou conta é tratada como conta (`userId`), e não só pelo e-mail;
// e o pagamento que a Stripe cancelou (10 recusas) nunca é reaproveitado.

export type DesfechoDoVisitante =
  /** O e-mail já tem conta — ou acabou de ganhar uma, com um pagamento que já tinha passado. */
  | { resultado: "ja-tem-conta" }
  /** Outro pedido deste e-mail está assinando agora (outra aba): nada foi feito — tentar de novo. */
  | { resultado: "ocupada" }
  | { resultado: "codigo-invalido" }
  /** A Stripe recusou o CPF ou CNPJ que o `core` aceitou: precisa de gente. */
  | { resultado: "documento-recusado" }
  /** O endereço já trouxe os e-mails novos do dia (cada um, um cliente novo na Stripe): esperar `segundos`. */
  | { resultado: "muitos-emails-novos"; segundos: number }
  | { resultado: "ativa"; tentativa: string }
  | { resultado: "pagar"; segredo: string; tipo: "pagamento" | "cartao"; tentativa: string };

/** A ficha do e-mail. `nova`: o cliente da Stripe acabou de nascer, já com o número fiscal desta tentativa. */
export type Ficha = { id: string; stripeCustomerId: string; nova: boolean };

/**
 * O que a ROTA passa: `antesDeCriarCliente` conta um cliente novo do endereço de quem pediu
 * (`contarClienteNovo`) e devolve em quantos segundos tentar de novo quando o dia já está cheio —
 * chamada só no instante em que um cliente novo vai mesmo nascer na Stripe.
 */
export type OpcoesDoVisitante = { antesDeCriarCliente?: (tx: Prisma.TransactionClient) => Promise<number | null> };

/** Encerradas: não cobram mais e não impedem uma assinatura nova. */
export const ENCERRADAS: ReadonlySet<string> = new Set(["incomplete_expired", "canceled"]);

/** Até 9 idas à Stripe dentro da trava (10 s cada, com uma nova tentativa): a lista, o Pix à espera (etapa 4.9), o número fiscal, cancelar e criar. */
const TEMPO_DA_TRANSACAO = { maxWait: 10_000, timeout: 120_000 };
/** Uma ida à Stripe na ficha: criar o cliente. */
const TEMPO_DA_FICHA = { maxWait: 10_000, timeout: 30_000 };

/** A trava deste e-mail, SEM ESPERAR — a mesma família da trava da conta (`checkout.ts`). */
export async function travarSeLivre(tx: Prisma.TransactionClient, email: string): Promise<boolean> {
  const [trava] = await tx.$queryRaw<{ livre: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtext(${`assinar-email:${email}`})) AS livre`;
  return trava?.livre === true;
}

/** Este e-mail já tem conta? AO PÉ DA LETRA, em minúsculas — como o login acha a conta (CLAUDE.md → Server). */
export async function temConta(db: Pick<Prisma.TransactionClient, "user">, email: string): Promise<boolean> {
  return (await db.user.findUnique({ where: { email }, select: { id: true } })) !== null;
}

/**
 * A ficha deste e-mail JÁ VIROU CONTA? A conta pode ter mudado de e-mail depois de nascer (quando
 * houver troca de e-mail): quem souber o e-mail antigo nunca opera no cliente da Stripe dela.
 */
export async function fichaComConta(db: Pick<Prisma.TransactionClient, "guestCheckout">, fichaId: string): Promise<boolean> {
  return (await db.guestCheckout.findUnique({ where: { id: fichaId }, select: { userId: true } }))?.userId != null;
}

/**
 * A ficha de espera deste e-mail — a que já existe (sem mexer no cliente da Stripe: o número fiscal
 * só muda na decisão, com a trava), ou uma nova, com o cliente novo já com o número fiscal, numa
 * transação curta só dela, com a trava do e-mail: se o resto falhar, ela fica, e um e-mail é sempre
 * UM cliente. Se a ficha já virou conta, quem diz é a decisão (`fichaComConta`).
 */
export async function fichaDoEmail(email: string, pedido: Pick<AssinarSemLoginInput, "documento">, opcoes: OpcoesDoVisitante): Promise<Ficha | "ocupada" | "ja-tem-conta" | { espera: number }> {
  // A que já existe volta como está — inclusive a que já virou conta: quem decide isso é a decisão,
  // com a trava (`fichaComConta`), num lugar só.
  const guardada = await prisma.guestCheckout.findUnique({ where: { email }, select: { id: true, stripeCustomerId: true } });
  if (guardada) return { ...guardada, nova: false };
  return prisma.$transaction(async (tx): Promise<Ficha | "ocupada" | "ja-tem-conta" | { espera: number }> => {
    if (!(await travarSeLivre(tx, email))) return "ocupada";
    if (await temConta(tx, email)) return "ja-tem-conta";
    // De novo, com a trava: o pedido que a tinha pode ter acabado de criar a ficha.
    const criada = await tx.guestCheckout.findUnique({ where: { email }, select: { id: true, stripeCustomerId: true } });
    if (criada) return { ...criada, nova: false };
    // Um e-mail novo é um cliente novo na Stripe: conta no teto do dia do endereço — só agora.
    // Pela MESMA transação (a trava está na mão): outra ligação aqui esgotaria o caixa da cópia.
    const espera = opcoes.antesDeCriarCliente ? await opcoes.antesDeCriarCliente(tx) : null;
    if (espera !== null) return { espera };
    const id = randomUUID();
    const cliente = await criarClienteDoVisitante({ pedido: id, email, documento: pedido.documento });
    await tx.guestCheckout.create({ data: { id, email, stripeCustomerId: cliente.id, livemode: cliente.livemode } });
    console.info(`[stripe] visitante: ficha ${id} criada, cliente ${cliente.id}`);
    return { id, stripeCustomerId: cliente.id, nova: true };
  }, TEMPO_DA_FICHA);
}

/** O que se decide COM a trava do e-mail. A assinatura viva sai da trava para ser sincronizada fora dela. */
type NaTrava = DesfechoDoVisitante | { resultado: "viva-na-stripe"; assinaturaId: string };

/**
 * A Stripe diz que a ficha tem assinatura VIVA: o pagamento passou, e o aviso ainda não chegou (ou
 * se perdeu). SINCRONIZA — é ali que a conta nasce — e responde "já tem conta": o caminho, agora, é
 * entrar. Fora da trava do e-mail e SEM ESPERAR a da assinatura, como no checkout (`checkout.ts`).
 */
export async function sincronizarAViva(email: string, assinaturaId: string): Promise<DesfechoDoVisitante> {
  const sincronia = await sincronizarSeLivre(assinaturaId);
  if (!sincronia) {
    console.info(`[stripe] visitante: a assinatura ${assinaturaId} está viva na Stripe, e o espelho dela está sendo acertado agora`);
    return { resultado: "ja-tem-conta" };
  }
  const conta = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (conta && (await temAcessoAtivo(conta.id))) {
    console.info(`[stripe] visitante: a assinatura ${assinaturaId} estava paga e sem o espelho; sincronizada, a conta ${conta.id} tem acesso`);
    // A conta pode ter nascido agora, nesta sincronia: as boas-vindas saem daqui (depois do commit).
    await mandarBoasVindasDaAssinatura(assinaturaId);
    return { resultado: "ja-tem-conta" };
  }
  // Viva e sem conta com acesso depois da sincronia: há alguém que pagou e não entra. Precisa de gente.
  console.error(`[stripe] visitante: a assinatura ${assinaturaId} (${sincronia.assinatura.status}) está viva na Stripe e segue sem conta com acesso depois da sincronia (${sincronia.resultado}${sincronia.resultado === "sem-conta" ? `: ${sincronia.motivo}` : ""}) — conferir no painel`);
  return { resultado: "ja-tem-conta" };
}

/** A decisão, COM a trava do e-mail: o que a Stripe diz do cliente, o número fiscal, e a tentativa. */
async function decidir(email: string, pedido: AssinarSemLoginInput, ficha: Ficha, precoId: string, codigoId: string | null, acaba: boolean): Promise<NaTrava> {
  return prisma.$transaction(async (tx): Promise<NaTrava> => {
    if (!(await travarSeLivre(tx, email))) return { resultado: "ocupada" };
    // De novo, com a trava e pela MESMA ligação: a conta pode ter nascido no meio.
    if ((await temConta(tx, email)) || (await fichaComConta(tx, ficha.id))) return { resultado: "ja-tem-conta" };

    const existentes = (await assinaturasDoCliente(ficha.stripeCustomerId)).filter((a) => !ENCERRADAS.has(a.status));
    // Viva: alguém já pagou. Nada aqui mexe no cliente dela — nem o número fiscal.
    const viva = existentes.find((a) => a.status !== "incomplete");
    if (viva) return { resultado: "viva-na-stripe", assinaturaId: viva.id };

    // UM PAGAMENTO ABERTO POR VEZ (etapa 4.9): o Pix à espera desta ficha morre quando o e-mail segue
    // por cartão — o QR copiado no app do banco podia ser pago depois (`checkout.ts` explica).
    await cancelarPagamentosPixPendentes(ficha.stripeCustomerId);

    // O número fiscal desta tentativa, na forma em que a fatura o guarda. Vai para a ficha do cliente
    // só DEPOIS do laço (abaixo).
    const numeroDoPedido = chaveDoNumeroFiscal(pedido.documento);

    let assinatura: AssinaturaNoCheckout | null = null;
    for (const incompleta of existentes) {
      // A MESMA: o código da tentativa que ESTE navegador recebeu, o mesmo preço, o mesmo código
      // promocional, o mesmo número fiscal NA FATURA DELA (o de quando nasceu — não o que a ficha tem
      // agora: achado P2 da revisão de segurança do passo 6) — e um pagamento que a Stripe ainda aceita.
      const aMesma =
        typeof pedido.tentativa === "string" &&
        incompleta.resumoDaTentativa === resumoDaTentativa(pedido.tentativa) &&
        incompleta.precoId === precoId &&
        incompleta.codigoId === codigoId &&
        incompleta.numeroFiscalDaFatura === numeroDoPedido &&
        incompleta.pagamentoCancelado !== true &&
        incompleta.segredoDoPagamento !== null;
      if (aMesma && !assinatura) {
        assinatura = incompleta;
        continue;
      }
      const ficou = await cancelarIncompleta(incompleta.id);
      if (ficou !== "incomplete_expired") {
        // Ela foi PAGA entre a lista e o cancelamento (outra aba, no mesmo instante): o
        // cancelamento encerrou uma assinatura paga. Precisa de gente: reembolso ou reativação.
        console.error(`[stripe] visitante: a assinatura ${incompleta.id} da ficha ${ficha.id} foi cancelada já PAGA (ficou ${ficou}) — conferir no painel`);
        return { resultado: "ja-tem-conta" };
      }
    }

    // O número fiscal desta tentativa na ficha do cliente — com a trava, antes de a assinatura (e a
    // primeira fatura dela) nascer, e só DEPOIS de o laço provar que nenhuma tentativa foi paga no meio
    // (A3 da revisão da etapa, 28/10/2026): antes, a paga entre a lista e o cancelamento ficava com a
    // ficha trocada pelo número do outro pedido. A ficha nova já nasceu com ele.
    if (!ficha.nova) await acertarNumeroFiscal(ficha.stripeCustomerId, pedido.documento);
    const reaproveitada = assinatura !== null;
    const tentativa = reaproveitada && pedido.tentativa ? pedido.tentativa : novaTentativa();
    // A tentativa vai SÓ ao navegador; a ficha e a assinatura na Stripe guardam o resumo dela.
    const resumo = resumoDaTentativa(tentativa);
    assinatura ??= await criarAssinatura({
      clienteId: ficha.stripeCustomerId,
      precoId,
      plano: pedido.plano,
      codigoId,
      visitante: { pedido: ficha.id, resumoDaTentativa: resumo, escolha: { novidades: pedido.novidades, origem: pedido.origem ?? null, campanha: pedido.campanha ?? null } },
    });
    // A Stripe recusou o desconto na criação (o código esgotou entre a prévia e o clique).
    if (!assinatura) return { resultado: "codigo-invalido" };
    // A tentativa nova passa a ser a da ficha (pelo resumo): é com o código dela que a tela de depois do pagamento pergunta.
    if (!reaproveitada) await tx.guestCheckout.update({ where: { id: ficha.id }, data: { tentativa: resumo } });
    console.info(`[stripe] visitante: ficha ${ficha.id}, plano ${pedido.plano} → assinatura ${assinatura.id} (${assinatura.status})${reaproveitada ? ", a mesma tentativa" : ""}`);

    if (assinatura.status === "incomplete" && assinatura.segredoDoPagamento) return { resultado: "pagar", segredo: assinatura.segredoDoPagamento, tipo: "pagamento", tentativa };
    if (assinatura.status === "active") {
      // Nada a pagar hoje (o código de 100%). Se o desconto acaba, a cobrança seguinte precisa de
      // um cartão: o site o guarda agora — a mesma regra do checkout de quem está logado.
      if (acaba && assinatura.segredoDoCartao) return { resultado: "pagar", segredo: assinatura.segredoDoCartao, tipo: "cartao", tentativa };
      return { resultado: "ativa", tentativa };
    }
    throw new Error(`[stripe] visitante: a assinatura ${assinatura.id} nasceu ${assinatura.status}, sem o que confirmar`);
  }, TEMPO_DA_TRANSACAO);
}

export async function assinarComoVisitante(pedido: AssinarSemLoginInput, opcoes: OpcoesDoVisitante = {}): Promise<DesfechoDoVisitante> {
  const email = pedido.email.toLowerCase();
  // Quem já tem conta nem chega à Stripe: a tela avisa e manda entrar (decisão do operador, 21/10/2026).
  if (await temConta(prisma, email)) return { resultado: "ja-tem-conta" };

  // Leituras, antes da trava: o preço do plano pedido e o código, se veio um.
  const [precos, codigo] = await Promise.all([buscarPrecos(), pedido.codigo ? buscarCodigo(pedido.codigo) : null]);
  const preco = precos.find((p) => p.plano === pedido.plano);
  if (!preco) throw new Error(`[stripe] plano ${pedido.plano} sem preço`);
  if (pedido.codigo && !codigo) return { resultado: "codigo-invalido" };
  const codigoId = codigo?.id ?? null;
  const acaba = codigo !== null && codigo.desconto.duracao !== DuracaoDoDesconto.PARA_SEMPRE;

  let decisao: NaTrava;
  try {
    const ficha = await fichaDoEmail(email, pedido, opcoes);
    if (ficha === "ocupada" || ficha === "ja-tem-conta") return { resultado: ficha };
    if ("espera" in ficha) return { resultado: "muitos-emails-novos", segundos: ficha.espera };
    decisao = await decidir(email, pedido, ficha, preco.precoId, codigoId, acaba);
  } catch (erro) {
    if (!(erro instanceof DocumentoRecusado)) throw erro;
    console.error(`${erro.message} — conferir o formato do número fiscal na Stripe`);
    return { resultado: "documento-recusado" };
  }
  return decisao.resultado === "viva-na-stripe" ? sincronizarAViva(email, decisao.assinaturaId) : decisao;
}

/**
 * "O PAGAMENTO JÁ VALEU?" — a pergunta da tela de depois do pagamento, que não tem login. Pelo
 * código da tentativa (que só quem a fez recebeu): sim quando a conta da ficha nasceu e o gate a
 * libera. Código desconhecido ou antigo, a mesma resposta de "ainda não": nada sobre ninguém.
 */
export async function pagamentoConfirmado(tentativa: string): Promise<boolean> {
  const ficha = await prisma.guestCheckout.findUnique({ where: { tentativa: resumoDaTentativa(tentativa) }, select: { userId: true } });
  return ficha?.userId ? temAcessoAtivo(ficha.userId) : false;
}
