import type { PixInput } from "@jilson/core";
import { cobrancaAtrasada } from "./acesso.js";
import { operarNaAssinatura } from "./assinaturas.js";
import type { Conta } from "./checkout.js";
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
//   1. o CPF ou CNPJ vai para a ficha do cliente ANTES de tudo — recusado, nada muda;
//   2. a atrasada se encerra COM A TRAVA dela (`operarNaAssinatura`, sem esperar), relida na Stripe: se a cobrança passou
//      no meio (outra aba trocou o cartão, ou uma tentativa da Stripe), nada se encerra;
//   3. só então a cobrança em aberto é ANULADA — anulada com a assinatura ainda viva, a Stripe a daria como `active` de
//      novo (medido, 11/10/2026). É o "um pagamento aberto por vez": o cartão não pode ser cobrado depois do Pix;
//   4. e o Pix sai pela porta de sempre, com o plano lido da assinatura — nunca do pedido.
// Encerrar só depois do Pix pago NÃO é seguro: enquanto a atrasada vive, a Stripe tenta o cartão de novo, e os dois
// seriam cobrados. O custo, escrito na tela: quem ainda estava nos 3 dias de tolerância fica sem as aulas até o Pix cair.
// A pessoa continua logada (como no cancelar com a cobrança atrasada): é ela que vai pagar o QR.

export type DesfechoDoPixDaAtrasada = DesfechoDoPix | { resultado: "nao-atrasada" };

type Encerramento = "encerrada" | "nao-atrasada" | "paga-no-meio";

/** Pagar com Pix a cobrança atrasada da conta LOGADA. */
export async function pagarAAtrasadaComPix(conta: Conta, documento: PixInput["documento"]): Promise<DesfechoDoPixDaAtrasada> {
  const achada = await assinaturaDaConta(conta.id);
  if (achada.resultado !== "ok" || !cobrancaAtrasada(achada.detalhes) || !achada.detalhes.plano) return { resultado: "nao-atrasada" };
  const { id, plano, clienteId } = achada.detalhes;
  if (clienteId) {
    try {
      await acertarNumeroFiscal(clienteId, documento);
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
          return "paga-no-meio";
        }
      } catch (erro) {
        console.error(`[stripe] pix da atrasada: a assinatura ${id} (conta ${conta.id}) foi encerrada e a cobrança em aberto NÃO foi anulada — anular pelo painel da Stripe antes que o cartão seja cobrado junto com o Pix: ${erro instanceof Error ? erro.message : String(erro)}`);
      }
      return "encerrada";
    },
    { manterSessao: (feito) => feito === "encerrada" },
  );
  if (!operacao) return { resultado: "ocupada" };
  if (operacao.feito === "nao-atrasada") return { resultado: "nao-atrasada" };
  if (operacao.feito === "paga-no-meio") return { resultado: "ja-assinante" };
  console.info(`[stripe] pix da atrasada: conta ${conta.id}, assinatura ${id} encerrada para pagar o plano ${plano} com Pix`);
  return pagarComPix(conta, { plano, documento });
}
