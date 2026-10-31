import type { MinhaCobranca } from "@jilson/core";
import { dinheiro } from "@/lib/assinar";
import { nomeDaBandeira } from "@/lib/faturamento";
import type { AppTexts } from "@/lib/language";

// MINHAS COBRANÇAS (Fase 4, etapa 4.7b, passo 6a — P144): o que a lista de Faturamento e o recibo da escola dizem de cada
// cobrança. Os dois leem daqui, para nunca dizerem coisas diferentes.

type Textos = AppTexts["faturamento"]["cobrancas"];

/** Como foi paga: "Cartão Visa final 4242", "Pix". */
export function formaDaCobranca(t: Textos, cobranca: MinhaCobranca): string {
  if (cobranca.forma === "pix") return t.pix;
  if (cobranca.forma === "cartao" && cobranca.cartao) {
    const bandeira = nomeDaBandeira(cobranca.cartao.bandeira);
    return (bandeira ? t.cartao.replace("{bandeira}", bandeira) : t.cartaoSemBandeira).replace("{final}", cobranca.cartao.final);
  }
  return t.outra;
}

/** Em que pé ela está: paga, devolvida (inteira ou em parte), contestada. */
export function situacaoDaCobranca(t: Textos, cobranca: MinhaCobranca): string {
  if (cobranca.situacao === "devolvida") return t.devolvida;
  if (cobranca.situacao === "devolvida-em-parte") return t.devolvidaEmParte.replace("{valor}", dinheiro(cobranca.devolvido, cobranca.moeda));
  if (cobranca.situacao === "contestada") return t.contestada;
  return t.paga;
}

/**
 * A página do recibo da escola (decisão do operador, 31/10/2026): no lugar da página de recibo da Stripe, que vinha em
 * inglês e levava à fatura com o CPF inteiro de quem pagou.
 */
export function enderecoDoRecibo(chave: string): string {
  return `/aluno/conta/faturamento/recibo/${encodeURIComponent(chave)}`;
}
