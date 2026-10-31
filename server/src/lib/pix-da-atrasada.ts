import type { PixInput } from "@jilson/core";
import { prisma } from "./prisma.js";
import { abrirCaso, TipoDeCaso } from "./casos.js";
import { cobrancaAtrasada } from "./acesso.js";
import { operarNaAssinatura, sincronizarSeLivre } from "./assinaturas.js";
import { travarSeLivre, type Conta } from "./checkout.js";
import { assinaturaDaConta } from "./minha-assinatura.js";
import { pagarComPix, type DesfechoDoPix } from "./pix-pre-pago.js";
import { acertarNumeroFiscal, DocumentoRecusado } from "./stripe.js";
import { buscarDetalhes } from "./stripe-assinatura.js";
import { anularFatura } from "./stripe-plano.js";
import { encerrarParaOPix } from "./stripe-reembolso.js";

// PAGAR COM PIX A COBRANÇA ATRASADA (Fase 4, etapa 4.9b, E14 — decisão do operador, P118, e a tela aprovada em
// 30/10/2026): quem está com a renovação do cartão atrasada e não tem outro cartão paga o MESMO plano com Pix. Numa conta
// do Brasil a Stripe não aceita Pix como forma de pagamento de uma assinatura (CLAUDE.md → Membership Gating): a
// atrasada se ENCERRA e o Pix é o pré-pago de sempre (`pix-pre-pago.ts`), cuja assinatura nasce quando o Pix cai.
// A ORDEM É A PROTEÇÃO:
//   1. o CPF ou CNPJ vai para a ficha do cliente ANTES de tudo, com a trava da conta — recusado, nada muda;
//   2. a atrasada se encerra COM A TRAVA dela (`operarNaAssinatura`, sem esperar), relida na Stripe: se a cobrança passou
//      no meio (outra aba trocou o cartão, ou uma tentativa da Stripe), nada se encerra;
//   3. só então a cobrança em aberto é ANULADA — anulada com a assinatura ainda viva, a Stripe a daria como `active` de
//      novo (medido, 11/10/2026). É o "um pagamento aberto por vez": o cartão não pode ser cobrado depois do Pix;
//   4. e o Pix sai pela porta de sempre, com o plano lido da assinatura — nunca do pedido. Antes, o espelho tem de dizer
//      "encerrada": se a sincronia da operação falhou, confere de novo; sem conseguir, "ocupada" — com o espelho velho, a
//      porta do Pix leria "ainda tem aulas" e responderia "já é assinante", sem QR (achado P2 da revisão do grupo 4).
// Encerrar só depois do Pix pago NÃO é seguro: enquanto a atrasada vive, a Stripe tenta o cartão de novo, e os dois
// seriam cobrados. O custo, escrito na tela: quem ainda estava nos 3 dias de tolerância fica sem as aulas até o Pix cair.
// A pessoa continua logada (como no cancelar com a cobrança atrasada): é ela que vai pagar o QR.

export type DesfechoDoPixDaAtrasada = DesfechoDoPix | { resultado: "nao-atrasada" };

type Encerramento = "encerrada" | "nao-atrasada" | "paga-no-meio";

/** O número fiscal na ficha do cliente leva até 3 idas à Stripe (a lista, o novo e a troca), com a trava da conta. */
const TEMPO_DO_DOCUMENTO = { maxWait: 10_000, timeout: 45_000 };

/** Pagar com Pix a cobrança atrasada da conta LOGADA. */
export async function pagarAAtrasadaComPix(conta: Conta, documento: PixInput["documento"]): Promise<DesfechoDoPixDaAtrasada> {
  const achada = await assinaturaDaConta(conta.id);
  if (achada.resultado !== "ok" || !cobrancaAtrasada(achada.detalhes) || !achada.detalhes.plano) return { resultado: "nao-atrasada" };
  const { id, plano, clienteId } = achada.detalhes;
  if (clienteId) {
    try {
      // Com a trava da conta (a mesma do checkout e do Pix — achado P3 da revisão do grupo 4): duas abas juntas trocariam o
      // número as duas, e a segunda tentaria apagar o que a primeira já apagou.
      const livre = await prisma.$transaction(async (tx) => {
        if (!(await travarSeLivre(tx, conta.id))) return false;
        await acertarNumeroFiscal(clienteId, documento);
        return true;
      }, TEMPO_DO_DOCUMENTO);
      if (!livre) return { resultado: "ocupada" };
    } catch (erro) {
      if (!(erro instanceof DocumentoRecusado)) throw erro;
      console.error(`${erro.message} — conferir o formato do número fiscal na Stripe (conta ${conta.id})`);
      return { resultado: "documento-recusado" };
    }
  }
  const operacao = await operarNaAssinatura(
    id,
    async (): Promise<Encerramento> => {
      const agora = await buscarDetalhes(id);
      if (!cobrancaAtrasada(agora)) return "nao-atrasada";
      await encerrarParaOPix(id);
      if (!agora.faturaEmAbertoId) return "encerrada";
      try {
        if ((await anularFatura(agora.faturaEmAbertoId)) === "paga") {
          console.error(`[stripe] pix da atrasada: a cobrança em aberto da assinatura ${id} (conta ${conta.id}) foi PAGA no instante do encerramento — a pessoa tem acesso até o fim do período pago, sem renovação; conferir no painel da Stripe`);
          await abrirCaso({ tipo: TipoDeCaso.PAGO_SEM_ASSINATURA, chave: `fatura:${agora.faturaEmAbertoId}`, urgente: false, conta: conta.id, assinatura: id, objeto: agora.faturaEmAbertoId, detalhe: "a cobrança em aberto foi paga no instante do encerramento para o Pix" });
          return "paga-no-meio";
        }
      } catch (erro) {
        console.error(`[stripe] pix da atrasada: a assinatura ${id} (conta ${conta.id}) foi encerrada e a cobrança em aberto NÃO foi anulada — anular pelo painel da Stripe antes que o cartão seja cobrado junto com o Pix: ${erro instanceof Error ? erro.message : String(erro)}`);
        await abrirCaso({ tipo: TipoDeCaso.COBRANCA_EM_ABERTO, chave: `fatura:${agora.faturaEmAbertoId}`, urgente: false, conta: conta.id, assinatura: id, objeto: agora.faturaEmAbertoId, detalhe: "encerrada para o Pix e a cobrança em aberto não foi anulada — o cartão ainda pode ser cobrado" });
      }
      return "encerrada";
    },
    { manterSessao: (feito) => feito === "encerrada" },
  );
  if (!operacao) return { resultado: "ocupada" };
  if (operacao.feito === "nao-atrasada") return { resultado: "nao-atrasada" };
  if (operacao.feito === "paga-no-meio") return { resultado: "ja-assinante" };
  if (!operacao.sincronia && !(await conferidaDeNovo(id))) return { resultado: "ocupada" };
  console.info(`[stripe] pix da atrasada: conta ${conta.id}, assinatura ${id} encerrada para pagar o plano ${plano} com Pix`);
  return pagarComPix(conta, { plano, documento });
}

/**
 * A sincronia da operação falhou: confere de novo, sem esperar a trava — e mantendo a sessão, como a operação (foi a própria
 * pessoa que encerrou, e é ela que vai pagar o QR). O espelho acertado → sim; ocupada ou falhou → não.
 */
async function conferidaDeNovo(assinaturaId: string): Promise<boolean> {
  try {
    return (await sincronizarSeLivre(assinaturaId, { manterSessao: true })) !== null;
  } catch (erro) {
    console.warn(`[stripe] pix da atrasada: a assinatura ${assinaturaId} foi encerrada e o espelho ainda não acertou: ${erro instanceof Error ? erro.message : String(erro)}`);
    return false;
  }
}
