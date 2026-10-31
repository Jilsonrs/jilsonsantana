import type Stripe from "stripe";
import type { ReciboDaEscola } from "@jilson/core";
import { chaveDaCobranca, chaveDoRecibo, cobrancasDaConta, paraMinhaCobranca } from "./minhas-cobrancas.js";
import { detalhesDaCobranca, type DetalhesDaCobranca } from "./stripe-recibo.js";

// O RECIBO DA ESCOLA (Fase 4, etapa 4.7b, passo 6a — decisões do operador, 31/10/2026: no lugar do recibo da Stripe, que
// vinha em inglês e levava à fatura com o CPF inteiro de quem pagou; e com os itens que ele escolheu — o número, a data, a
// escola, quem assina, o plano e o período, o preço, o desconto com o código, o total pago, a forma, a situação e as
// dúvidas). A cobrança se acha pela chave, SÓ entre as da conta da sessão; os detalhes vêm da Stripe na hora.

/** O número do recibo, para a pessoa e o suporte: a chave inteira, "81DD-3FD1-33E6-F9FB" — único por recibo (decisão do operador, 31/10/2026). Função pura. */
export function numeroDoRecibo(chave: string): string {
  return (chave.toUpperCase().match(/.{1,4}/g) ?? []).join("-");
}

const soma = (valores: number[]) => valores.reduce((total, valor) => total + valor, 0);

/**
 * O recibo de uma cobrança que passou — nada, se ela não passou. O preço e o que saiu dele (o desconto e o crédito da troca
 * de plano) só quando a conta FECHA com o total pago: nunca um recibo com a conta errada. Função pura.
 */
export function paraRecibo(cobranca: Stripe.Charge, detalhes: DetalhesDaCobranca): ReciboDaEscola | null {
  const minha = paraMinhaCobranca(cobranca);
  if (!minha) return null;
  const { chave, ...resto } = minha;
  const preco = soma(detalhes.linhas.filter((valor) => valor > 0));
  const credito = -soma(detalhes.linhas.filter((valor) => valor < 0));
  const fecha = detalhes.linhas.length > 0 && preco - soma(detalhes.descontos.map((d) => d.centavos)) - credito === minha.centavos;
  return {
    ...resto,
    numero: numeroDoRecibo(chave),
    plano: detalhes.plano,
    periodo: detalhes.periodo ? { de: new Date(detalhes.periodo.de * 1000).toISOString(), ate: new Date(detalhes.periodo.ate * 1000).toISOString() } : null,
    detalhe: fecha ? { preco, descontos: detalhes.descontos, credito } : null,
  };
}

/** O recibo da cobrança desta chave, entre as da conta — nada, se a chave não é de uma cobrança dela que passou. */
export async function reciboDaConta(contaId: string, chave: string): Promise<ReciboDaEscola | null> {
  const cobranca = (await cobrancasDaConta(contaId)).find((c) => chaveDaCobranca(c) === chave && paraMinhaCobranca(c) !== null);
  return cobranca ? paraRecibo(cobranca, await detalhesDaCobranca(cobranca)) : null;
}

/** O recibo do PAGAMENTO, entre as cobranças da conta — para o e-mail (decisão do operador, 31/10/2026). Nada, se não passou. */
export async function reciboDoPagamento(contaId: string, pagamentoId: string): Promise<ReciboDaEscola | null> {
  return reciboDaConta(contaId, chaveDoRecibo(pagamentoId));
}
