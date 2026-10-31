import { NOME_DA_BANDEIRA, type Dict, type ReciboDaEscola } from "@jilson/core";
import { prisma } from "./prisma.js";
import { getDict } from "./dict.js";
import { enviarEmail } from "./email.js";
import { enderecoDoSite } from "./endereco-do-site.js";
import { reciboDoPagamento } from "./recibo.js";
import { diaNoEmail } from "../views/email-da-cobranca.js";
import type { AssinaturaNaStripe, FaturaPaga } from "./stripe.js";

// O RECIBO POR E-MAIL (Fase 4, etapa 4.7b, passo 6a — decisões do operador, 31/10/2026): em TODO pagamento, o recibo vai no
// corpo do e-mail. Ao assinar, embaixo da confirmação (ou das boas-vindas, de quem assinou sem conta) — um e-mail só; na
// renovação e na troca de plano, um e-mail próprio, "Recebemos seu pagamento". O recibo é o MESMO da tela (`recibo.ts`),
// achado pelo pagamento entre as cobranças da conta, e o botão abre o da escola, para imprimir. Nada de CPF, e nada do que
// a pessoa digitou (o nome fica fora do e-mail). NUNCA LANÇA: sem o recibo, a confirmação sai sem ele.

/** Os motivos de fatura que recebem o e-mail próprio: a renovação e a troca de plano. A primeira vai na confirmação. */
const MOTIVOS_DO_EMAIL_PROPRIO = new Set(["subscription_cycle", "subscription_update"]);

const dinheiro = (centavos: number, moeda: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda.toUpperCase() }).format(centavos / 100);

/** O recibo em linhas de texto, para o corpo do e-mail — os mesmos itens e textos da tela. Função pura. */
export function linhasDoRecibo(recibo: ReciboDaEscola, t: Dict["app"]["faturamento"]): string[] {
  const r = t.recibo;
  const c = t.cobrancas;
  const valor = (centavos: number) => dinheiro(centavos, recibo.moeda);
  const abatido = (centavos: number) => r.abatimento.replace("{valor}", valor(centavos));
  const item = recibo.plano === "mensal" ? r.planoMensal : recibo.plano === "anual" ? r.planoAnual : r.semPlano;
  const periodo = recibo.periodo ? r.periodo.replace("{de}", diaNoEmail(new Date(recibo.periodo.de))).replace("{ate}", diaNoEmail(new Date(recibo.periodo.ate))) : null;
  const bandeira = recibo.cartao ? NOME_DA_BANDEIRA[recibo.cartao.bandeira] : undefined;
  const forma = recibo.forma === "pix" ? c.pix : recibo.cartao ? (bandeira ? c.cartao.replace("{bandeira}", bandeira) : c.cartaoSemBandeira).replace("{final}", recibo.cartao.final) : c.outra;
  const linhas = [`${r.titulo} — ${r.numero.replace("{numero}", recibo.numero).replace("{data}", diaNoEmail(new Date(recibo.em)))}`, `${r.emitente} · ${r.cnpj} · ${r.site}`, periodo ? `${item} — ${periodo}` : item];
  if (recibo.detalhe) {
    linhas.push(`${r.preco}: ${valor(recibo.detalhe.preco)}`);
    for (const d of recibo.detalhe.descontos) linhas.push(`${d.codigo ? r.desconto.replace("{codigo}", d.codigo) : r.descontoSemCodigo}: ${abatido(d.centavos)}`);
    if (recibo.detalhe.credito > 0) linhas.push(`${r.credito}: ${abatido(recibo.detalhe.credito)}`);
  }
  linhas.push(`${r.total}: ${valor(recibo.centavos)}`, `${r.forma}: ${forma}`, r.duvidas);
  return linhas;
}

/** O endereço do recibo na escola, pelo número (que é a chave em maiúsculas, em grupos). Função pura. */
export function caminhoDoRecibo(recibo: ReciboDaEscola): string {
  return `/aluno/conta/faturamento/recibo/${recibo.numero.replace(/-/g, "").toLowerCase()}`;
}

/** O pagamento cujo recibo vai na confirmação: o Pix de que a pré-paga nasceu, ou o da última fatura paga. Função pura. */
export function pagamentoDaConfirmacao(naStripe: Pick<AssinaturaNaStripe, "pixPaymentIntentId" | "ultimaFaturaPaga">): string | null {
  return naStripe.pixPaymentIntentId ?? naStripe.ultimaFaturaPaga?.pagamento ?? null;
}

export type ReciboNoEmail = { numero: string; linhas: string[]; endereco: string | null };

/** O recibo deste pagamento, pronto para o e-mail — ou nada (o pagamento não é da conta, ou a Stripe não respondeu). Nunca lança. */
export async function reciboNoEmail(contaId: string, pagamentoId: string | null): Promise<ReciboNoEmail | null> {
  if (!pagamentoId) return null;
  try {
    const recibo = await reciboDoPagamento(contaId, pagamentoId);
    if (!recibo) return null;
    return { numero: recibo.numero, linhas: linhasDoRecibo(recibo, (await getDict()).app.faturamento), endereco: enderecoDoSite(caminhoDoRecibo(recibo)) };
  } catch (erro) {
    console.warn(`[email] o recibo do pagamento da conta ${contaId} ficou fora do e-mail: ${erro instanceof Error ? erro.name : "falha sem tipo"}`);
    return null;
  }
}

/**
 * "RECEBEMOS SEU PAGAMENTO" — a renovação e a troca de plano, com o recibo. Só a fatura que é a ÚLTIMA paga da assinatura
 * (a Stripe acabou de dizer), e uma vez por pagamento (a chave é o número do recibo). Depois do commit, fora de transação.
 */
export async function mandarReciboDoPagamento(naStripe: AssinaturaNaStripe, fatura: FaturaPaga): Promise<void> {
  try {
    if (!fatura.motivo || !MOTIVOS_DO_EMAIL_PROPRIO.has(fatura.motivo)) return;
    if (naStripe.ultimaFaturaPaga?.fatura !== fatura.id) return;
    const espelho = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: naStripe.id }, select: { ownerUserId: true } });
    if (!espelho?.ownerUserId) return;
    const conta = await prisma.user.findUnique({ where: { id: espelho.ownerUserId }, select: { id: true, email: true, deletedAt: true } });
    if (!conta || conta.deletedAt) return;
    const recibo = await reciboNoEmail(conta.id, naStripe.ultimaFaturaPaga.pagamento);
    if (!recibo) return;
    const t = (await getDict()).app.email.pagamentoRecebido;
    await enviarEmail({
      para: conta.email,
      tipo: "pagamento-recebido",
      referencia: `conta:${conta.id} assinatura:${naStripe.id}`,
      chave: `pagamento-recebido/${recibo.numero}`,
      mensagem: { assunto: t.assunto, titulo: t.titulo, paragrafos: [t.texto, ...recibo.linhas], ...(recibo.endereco ? { botao: { texto: t.botao, endereco: recibo.endereco } } : {}) },
    });
  } catch (erro) {
    console.error(`[email] o recibo da fatura ${fatura.id} não saiu: ${erro instanceof Error ? erro.name : "falha sem tipo"}`);
  }
}
