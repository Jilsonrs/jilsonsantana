import Stripe from "stripe";

// A BIBLIOTECA DA STRIPE, JÁ COM A CHAVE (Fase 4 — billing.md; CLAUDE.md → Membership Gating).
// Num arquivo só dela (etapa 4.6, sessão b) para que TODA ida à Stripe — inclusive as do próprio
// `stripe.ts`, como a busca da assinatura que alimenta o espelho — possa rodar de verdade nos
// testes, com só a rede trocada por dublê. Quem fala com a Stripe continua sendo a fronteira
// (`stripe.ts`, `stripe-assinatura.ts`, `stripe-devolucao.ts`, `stripe-reembolso.ts`): rota,
// regra e tela nunca importam daqui.

/**
 * A versão da API da Stripe com que a biblioteca fala — e em que o site lê os avisos (C3 da revisão do grupo 1,
 * 29/10/2026): o endereço de avisos precisa estar nela (`conferencia-da-cobranca.ts`), e o aviso lido pela API na
 * rodada vem na versão de quando nasceu (`avisoEmFormatoAntigo`, `stripe.ts`).
 */
export const VERSAO_DA_API: string = Stripe.API_VERSION;

let cliente: Stripe | null = null;
/** A biblioteca da Stripe, já com a chave. Só a fronteira com a Stripe a usa. */
export function stripe(): Stripe {
  const chave = process.env.STRIPE_SECRET_KEY;
  if (!chave) throw new Error("Stripe sem STRIPE_SECRET_KEY");
  // Tempo limite curto: a busca roda dentro da transação do aviso (`assinaturas.ts`), que segura
  // uma conexão do banco enquanto espera. Sem resposta, o aviso falha e a Stripe entrega de novo.
  cliente ??= new Stripe(chave, { timeout: 10_000, maxNetworkRetries: 1 });
  return cliente;
}

/**
 * O erro da Stripe SEM a mensagem dela, que pode trazer um pedaço da chave ou dado do cliente —
 * e o que sobe daqui vai para o registro. Ficam o tipo, o código e o status. Função pura.
 */
export function erroSemMensagem(erro: unknown, oQue: string): Error {
  if (!(erro instanceof Stripe.errors.StripeError)) return erro instanceof Error ? erro : new Error(`[stripe] ${oQue} falhou`);
  const codigo = erro.code ? ` (${erro.code})` : "";
  const status = erro.statusCode ? `, status ${erro.statusCode}` : "";
  return new Error(`[stripe] ${oQue} falhou: ${erro.type}${codigo}${status}`);
}
