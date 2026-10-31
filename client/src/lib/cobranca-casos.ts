import type { TipoDeCasoDaLista } from "@jilson/core";

// "PRECISA DE VOCÊ" NO ADMIN (Fase 4, etapa 4.7b, passo 2c). Admin fica em português, com o texto aqui (decisão do
// operador, 23/09/2026); o operador confere usando (31/10/2026). O "o que resolve" é o da lista B do mapa aprovado.

export const TIPO_DO_CASO: Record<TipoDeCasoDaLista, string> = {
  PIX_EM_CONFERENCIA: "Pix pago que não virou assinatura",
  PAGO_SEM_ASSINATURA: "Dinheiro recebido sem assinatura",
  PAGOU_SEM_CONTA: "Pagou e está sem conta",
  DIVERGENCIA: "O site e a Stripe discordam",
  ATIVA_SEM_PERIODO_PAGO: "Ativa na Stripe sem período pago",
  COBRANCA_EM_ABERTO: "Cobrança em aberto que não foi anulada",
  DEVOLUCAO_FALHOU: "Devolução que falhou",
  TROCA_DE_PLANO: "Troca de plano com defeito",
  CONTESTACAO: "Contestação no banco",
  AVISO_DE_FRAUDE: "Aviso de fraude do banco",
  EMAIL_NAO_SAIU: "E-mail que não saiu",
  PEDIDO_DE_REEMBOLSO: "Pedido de reembolso",
};

export const O_QUE_RESOLVE: Record<TipoDeCasoDaLista, string> = {
  PIX_EM_CONFERENCIA: "Aceitar este Pix · Devolver",
  PAGO_SEM_ASSINATURA: "Devolver este pagamento · Liberar acesso pago por fora",
  PAGOU_SEM_CONTA: "Conferir na Stripe (a conta nasce) · Corrigir o e-mail",
  DIVERGENCIA: "Conferir na Stripe",
  ATIVA_SEM_PERIODO_PAGO: "Encerrar na hora",
  COBRANCA_EM_ABERTO: "Anular a cobrança em aberto",
  DEVOLUCAO_FALHOU: "Devolver de novo · Marcar como resolvida por fora",
  TROCA_DE_PLANO: "Devolver a diferença · Soltar o agendamento",
  CONTESTACAO: "Responder com provas · Aceitar a perda",
  AVISO_DE_FRAUDE: "Devolver e cancelar",
  EMAIL_NAO_SAIU: "Reenviar",
  PEDIDO_DE_REEMBOLSO: "Aprovar · Recusar, com a resposta",
};

/** O tipo de caso em português; o que não for um tipo conhecido, como veio. */
export function textoDoTipoDeCaso(tipo: string): string {
  return (TIPO_DO_CASO as Record<string, string>)[tipo] ?? tipo;
}
