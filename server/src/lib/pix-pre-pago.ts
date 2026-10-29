import type { PixInput, PixSemLoginInput } from "@jilson/core";
import { prisma } from "./prisma.js";
import { temAcessoAtivo } from "./acesso.js";
import { clienteDaConta, sincronizarAViva as sincronizarAVivaDaConta, travarSeLivre, type Conta } from "./checkout.js";
import { ENCERRADAS, fichaComConta, fichaDoEmail, sincronizarAViva as sincronizarAVivaDoEmail, temConta, travarSeLivre as travarEmailSeLivre, type OpcoesDoVisitante } from "./checkout-do-visitante.js";
import { novaTentativa, resumoDaTentativa } from "./tentativa-do-visitante.js";
import { acertarNumeroFiscal, assinaturasDoCliente, buscarPrecos, cancelarIncompleta, DocumentoRecusado } from "./stripe.js";
import { cancelarPagamentoPix, criarPagamentoPix, pagamentosPixPendentes, type PixPendente } from "./stripe-pix.js";

// PAGAR COM PIX, PRÉ-PAGO (Fase 4, etapa 4.9, passo 2 — billing.md → *Formas de pagamento*; decisões
// do operador, 28/10/2026). O clique no "Pagar com Pix" cria um PAGAMENTO SOLTO na Stripe
// (`stripe-pix.ts`) e devolve o segredo dele ao site, que mostra o QR; a assinatura pré-paga nasce
// quando o Pix CAI, no aviso da Stripe (`assinaturas.ts`) — nunca aqui. Aqui NADA grava o espelho.
// A mesma disciplina do checkout por cartão (`checkout.ts`, `checkout-do-visitante.ts`), e as mesmas
// peças dele:
//   - quem JÁ TEM ACESSO não paga de novo (pagar de novo é só DEPOIS de acabar — decisão (a));
//   - UMA CONTA É UM CLIENTE na Stripe; o visitante tem a FICHA do e-mail (e a conta nasce dela);
//   - tudo dentro da TRAVA (da conta, ou do e-mail), que NÃO ESPERA: ocupada → "ocupada";
//   - o que a STRIPE diz do cliente, antes do QR: uma assinatura VIVA (alguém já pagou — por cartão,
//     ou um Pix que caiu e cujo aviso ainda não chegou) é SINCRONIZADA fora da trava e a resposta é
//     "já é assinante" / "já tem conta", sem QR; o cartão começado e não pago (a incompleta) é
//     cancelado — UM PAGAMENTO ABERTO POR VEZ, nos dois sentidos (o checkout por cartão cancela o
//     Pix à espera): o cartão e o QR não ficam os dois à espera, senão podiam ser pagos os dois;
//   - o CPF ou CNPJ vai para a ficha do cliente ANTES do pagamento — também no QR reaproveitado: a
//     fatura só nasce quando o Pix cai, e leva o número de então;
//   - UM QR POR VEZ: o novo clique do MESMO plano segue com o Pix que já está à espera (o mesmo QR);
//     o de outro plano cancela o anterior antes de criar outro — dois QRs abertos podiam ser pagos os
//     dois. O visitante só segue com o Pix da MESMA tentativa (quem sabe só o e-mail não recebe o QR
//     de outra pessoa).
// SEM código promocional (decisão (b)): o desconto da Stripe é da assinatura, e o Pix é pagamento solto.

export type DesfechoDoPix =
  | { resultado: "ja-assinante" }
  /** Outro pedido desta conta (ou deste e-mail) está pagando agora (outra aba): nada foi feito. */
  | { resultado: "ocupada" }
  /** A conta tem uma assinatura com a cobrança atrasada, já sem as aulas: o caminho é trocar o cartão dela (como no checkout). */
  | { resultado: "atrasada" }
  /** A Stripe recusou o CPF ou CNPJ que o `core` aceitou: nada foi criado. */
  | { resultado: "documento-recusado" }
  | { resultado: "pagar"; segredo: string; tipo: "pix" };

export type DesfechoDoPixSemLogin =
  | { resultado: "ja-tem-conta" }
  | { resultado: "ocupada" }
  | { resultado: "documento-recusado" }
  | { resultado: "muitos-emails-novos"; segundos: number }
  | { resultado: "pagar"; segredo: string; tipo: "pix"; tentativa: string };

/** O que se decide COM a trava. A assinatura viva sai da trava para ser sincronizada fora dela (como no checkout). */
type VivaNaStripe = { resultado: "viva-na-stripe"; assinaturaId: string };

/** Até 9 idas à Stripe dentro da trava (10 s cada, com uma nova tentativa): as duas listas, os cancelamentos, o número fiscal e o QR. */
const TEMPO_DA_TRANSACAO = { maxWait: 10_000, timeout: 120_000 };

/**
 * O que a Stripe diz deste cliente, antes do QR. Uma assinatura VIVA sai para ser sincronizada fora
 * da trava (`viva`) — nada aqui mexe no cliente dela, nem o número fiscal (a regra do checkout). As
 * INCOMPLETAS (o cartão começado e não pago) são canceladas; a que foi PAGA entre a lista e o
 * cancelamento (outra aba, no mesmo instante) volta como `pagaNoMeio`: a pessoa tem acesso, e o
 * cancelamento de uma assinatura paga precisa de gente. Nada: o caminho está livre para o QR.
 */
async function assinaturasAbertas(clienteId: string, quem: string): Promise<{ viva: string } | { pagaNoMeio: string } | null> {
  const existentes = (await assinaturasDoCliente(clienteId)).filter((a) => !ENCERRADAS.has(a.status));
  const viva = existentes.find((a) => a.status !== "incomplete");
  if (viva) return { viva: viva.id };
  for (const incompleta of existentes) {
    const ficou = await cancelarIncompleta(incompleta.id);
    if (ficou !== "incomplete_expired") {
      console.error(`[stripe] pix: a assinatura ${incompleta.id} (${quem}) foi cancelada já PAGA (ficou ${ficou}) — conferir no painel`);
      return { pagaNoMeio: incompleta.id };
    }
  }
  return null;
}

/** O Pix à espera que o novo clique segue; os outros são cancelados. Devolve o que ficou, ou nada. */
async function umQrPorVez(clienteId: string, serve: (pendente: PixPendente) => boolean): Promise<PixPendente | null> {
  const pendentes = await pagamentosPixPendentes(clienteId);
  const mesmo = pendentes.find(serve) ?? null;
  for (const outro of pendentes) if (outro !== mesmo) await cancelarPagamentoPix(outro.id);
  return mesmo;
}

async function precoDoPlano(plano: PixInput["plano"]) {
  const precos = await buscarPrecos();
  const preco = precos.find((p) => p.plano === plano);
  if (!preco) throw new Error(`[stripe] plano ${plano} sem preço`);
  return preco;
}

/** Pagar com Pix, com a conta LOGADA. */
export async function pagarComPix(conta: Conta, pedido: PixInput): Promise<DesfechoDoPix> {
  if (await temAcessoAtivo(conta.id)) return { resultado: "ja-assinante" };
  const preco = await precoDoPlano(pedido.plano);
  const clienteId = await clienteDaConta(conta);
  if (clienteId === null) return { resultado: "ocupada" };
  let decisao: DesfechoDoPix | VivaNaStripe;
  try {
    decisao = await prisma.$transaction(async (tx): Promise<DesfechoDoPix | VivaNaStripe> => {
      if (!(await travarSeLivre(tx, conta.id))) return { resultado: "ocupada" };
      // De novo, com a trava, e pela MESMA ligação: o aviso da Stripe pode ter chegado no meio.
      if (await temAcessoAtivo(conta.id, tx)) return { resultado: "ja-assinante" };
      const aberta = await assinaturasAbertas(clienteId, `conta ${conta.id}`);
      if (aberta) return "viva" in aberta ? { resultado: "viva-na-stripe", assinaturaId: aberta.viva } : { resultado: "ja-assinante" };
      const pendente = await umQrPorVez(clienteId, (p) => p.plano === pedido.plano);
      await acertarNumeroFiscal(clienteId, pedido.documento);
      if (pendente) return { resultado: "pagar", segredo: pendente.segredo, tipo: "pix" };
      const pagamento = await criarPagamentoPix({ clienteId, precoId: preco.precoId, plano: pedido.plano, centavos: preco.centavos, userId: conta.id });
      console.info(`[stripe] pix: conta ${conta.id}, plano ${pedido.plano} → pagamento ${pagamento.id}`);
      return { resultado: "pagar", segredo: pagamento.segredo, tipo: "pix" };
    }, TEMPO_DA_TRANSACAO);
  } catch (erro) {
    if (!(erro instanceof DocumentoRecusado)) throw erro;
    console.error(`${erro.message} — conferir o formato do número fiscal na Stripe (conta ${conta.id})`);
    return { resultado: "documento-recusado" };
  }
  if (decisao.resultado !== "viva-na-stripe") return decisao;
  // A mesma sincronia do checkout por cartão, fora da trava: conserta o espelho e diz o que a conta é agora.
  const sincronia = await sincronizarAVivaDaConta(conta, decisao.assinaturaId);
  return sincronia.resultado === "atrasada" ? { resultado: "atrasada" } : { resultado: "ja-assinante" };
}

/** Pagar com Pix SEM CONTA: a ficha do e-mail, como no assinar sem login; a conta nasce quando o Pix cai. */
export async function pagarComPixSemLogin(pedido: PixSemLoginInput, opcoes: OpcoesDoVisitante = {}): Promise<DesfechoDoPixSemLogin> {
  const email = pedido.email.toLowerCase();
  // Quem já tem conta nem chega à Stripe: a tela avisa e manda entrar (decisão do operador, 21/10/2026).
  if (await temConta(prisma, email)) return { resultado: "ja-tem-conta" };
  const preco = await precoDoPlano(pedido.plano);
  // A tentativa que ESTE navegador recebeu, se veio uma: só com ela o QR anterior é reaproveitado.
  const tentativaAnterior = typeof pedido.tentativa === "string" ? pedido.tentativa : null;
  let decisao: DesfechoDoPixSemLogin | VivaNaStripe;
  try {
    const ficha = await fichaDoEmail(email, pedido, opcoes);
    if (ficha === "ocupada" || ficha === "ja-tem-conta") return { resultado: ficha };
    if ("espera" in ficha) return { resultado: "muitos-emails-novos", segundos: ficha.espera };
    decisao = await prisma.$transaction(async (tx): Promise<DesfechoDoPixSemLogin | VivaNaStripe> => {
      if (!(await travarEmailSeLivre(tx, email))) return { resultado: "ocupada" };
      if ((await temConta(tx, email)) || (await fichaComConta(tx, ficha.id))) return { resultado: "ja-tem-conta" };
      // Alguém já PAGOU por este e-mail: a sincronia faz a conta nascer, e o caminho passa a ser entrar.
      const aberta = await assinaturasAbertas(ficha.stripeCustomerId, `ficha ${ficha.id}`);
      if (aberta) return "viva" in aberta ? { resultado: "viva-na-stripe", assinaturaId: aberta.viva } : { resultado: "ja-tem-conta" };
      const resumoDaAnterior = tentativaAnterior === null ? null : resumoDaTentativa(tentativaAnterior);
      const pendente = await umQrPorVez(ficha.stripeCustomerId, (p) => p.plano === pedido.plano && resumoDaAnterior !== null && p.resumoDaTentativa === resumoDaAnterior);
      // A ficha nova já nasceu com o número desta tentativa.
      if (!ficha.nova) await acertarNumeroFiscal(ficha.stripeCustomerId, pedido.documento);
      if (pendente && tentativaAnterior !== null) return { resultado: "pagar", segredo: pendente.segredo, tipo: "pix", tentativa: tentativaAnterior };
      const tentativa = novaTentativa();
      const resumo = resumoDaTentativa(tentativa);
      const pagamento = await criarPagamentoPix({
        clienteId: ficha.stripeCustomerId,
        precoId: preco.precoId,
        plano: pedido.plano,
        centavos: preco.centavos,
        visitante: { pedido: ficha.id, resumoDaTentativa: resumo, escolha: { novidades: pedido.novidades, origem: pedido.origem ?? null, campanha: pedido.campanha ?? null } },
      });
      // A tentativa nova passa a ser a da ficha (pelo resumo): é com o código dela que a tela de depois do pagamento pergunta.
      await tx.guestCheckout.update({ where: { id: ficha.id }, data: { tentativa: resumo } });
      console.info(`[stripe] pix: ficha ${ficha.id}, plano ${pedido.plano} → pagamento ${pagamento.id}`);
      return { resultado: "pagar", segredo: pagamento.segredo, tipo: "pix", tentativa };
    }, TEMPO_DA_TRANSACAO);
  } catch (erro) {
    if (!(erro instanceof DocumentoRecusado)) throw erro;
    console.error(`${erro.message} — conferir o formato do número fiscal na Stripe`);
    return { resultado: "documento-recusado" };
  }
  if (decisao.resultado !== "viva-na-stripe") return decisao;
  // A mesma sincronia do assinar sem login, fora da trava: é ali que a conta nasce.
  await sincronizarAVivaDoEmail(email, decisao.assinaturaId);
  return { resultado: "ja-tem-conta" };
}
