import type { PlanosDaAssinatura, PreviaDaAssinatura, PreviaInput } from "@jilson/core";
import { buscarCodigo, buscarPrecos, calcularPrevia, chavePublicavel, FORMAS_DE_PAGAMENTO } from "./stripe.js";
import { getDict } from "./dict.js";

// O QUE A TELA DE ASSINAR MOSTRA ANTES DO CLIQUE — os planos e a prévia do código promocional —,
// igual para quem está logado (`routes/billing.ts`, etapa 4.2) e para quem não está
// (`routes/billing-sem-login.ts`, etapa 4.7, passo 4). O valor mostrado é o cobrado: os preços vêm
// da Stripe, pela lookup key, e a conta do código é a prévia da fatura dela.

/** Os dois planos com o valor da Stripe e a chave do campo do cartão. Nada: a chave publicável falta ou está trocada. */
export async function lerPlanos(): Promise<PlanosDaAssinatura | null> {
  const chave = chavePublicavel();
  if (!chave) return null;
  const [precos, dict] = await Promise.all([buscarPrecos(), getDict()]);
  return {
    chavePublicavel: chave,
    planos: precos.map(({ plano, centavos, moeda }) => ({ plano, centavos, moeda })),
    formasDePagamento: [...FORMAS_DE_PAGAMENTO],
    // A lista do cartão de preço da home, com as edições do admin (o `getDict`): um texto só para os
    // dois lugares — mudou no admin, muda nos dois (decisão do operador, 27/10/2026).
    incluido: { itens: [...dict.home.pricing.features], frase: dict.home.pricing.footer },
  };
}

/**
 * Quanto fica HOJE com o código, pela conta da Stripe. Nada: o código não existe, venceu, esgotou
 * ou não vale para esta compra — a mesma resposta, sem dizer qual dos casos. O código digitado não
 * vai para o registro.
 */
export async function lerPrevia(pedido: PreviaInput): Promise<PreviaDaAssinatura | null> {
  const [precos, codigo] = await Promise.all([buscarPrecos(), buscarCodigo(pedido.codigo)]);
  // O preço é o do PLANO pedido, achado aqui: o corpo não tem como apontar outro.
  const preco = precos.find((p) => p.plano === pedido.plano);
  if (!preco) throw new Error(`[stripe] plano ${pedido.plano} sem preço`);
  const previa = codigo ? await calcularPrevia(preco.precoId, codigo.id) : null;
  if (!codigo || !previa) return null;
  return { centavosHoje: previa.centavosHoje, moeda: previa.moeda, desconto: codigo.desconto };
}
