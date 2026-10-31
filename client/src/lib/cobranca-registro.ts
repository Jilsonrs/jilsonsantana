import type { LinhaDoRegistro, QuemFezNoRegistro } from "@jilson/core";
import { NOME_DO_TIPO_DE_FRAUDE, pt } from "@jilson/core";
import { dinheiro } from "@/lib/cobranca-ficha";
import { TIPO_DO_CASO } from "@/lib/cobranca-casos";

// O REGISTRO DA COBRANÇA NO ADMIN (Fase 4, etapa 4.7b, passo 1f). Admin fica em português, com o texto aqui (decisão
// do operador, 23/09/2026); o operador confere usando (31/10/2026). Os motivos de cancelamento são os MESMOS que o
// aluno escolheu (o dicionário do app).

export const QUEM: Record<QuemFezNoRegistro, string> = { STRIPE: "Stripe", OPERADOR: "Você", ALUNO: "O aluno", RODADA: "A rodada de hora em hora", JILSONAI: "JilsonAI" };

const ACAO: Partial<Record<string, string>> = {
  "customer.subscription.created": "Assinatura criada",
  "customer.subscription.updated": "Assinatura mudou",
  "customer.subscription.deleted": "Assinatura terminou",
  "invoice.paid": "Cobrança paga",
  "invoice.payment_failed": "Cobrança recusada",
  "payment_intent.succeeded": "Pix pago",
  "charge.refunded": "Dinheiro devolvido",
  "refund.failed": "Devolução falhou",
  "charge.dispute.created": "Contestação no banco",
  "charge.dispute.funds_withdrawn": "Contestação: o dinheiro saiu",
  "radar.early_fraud_warning.created": "Aviso de fraude do banco",
  "caso-fechado": "Caso fechado",
};

const PEDACO: Partial<Record<string, string>> = {
  active: "ativa",
  trialing: "em teste grátis",
  past_due: "pagamento atrasado",
  unpaid: "não paga",
  canceled: "cancelada",
  incomplete: "esperando o primeiro pagamento",
  incomplete_expired: "expirou sem pagar",
  paused: "cobrança pausada",
  "vai-cancelar": "vai cancelar no fim do período",
  "perdeu-acesso": "perdeu o acesso",
  "conta-nasceu": "a conta nasceu",
  "sem-conta": "sem conta na escola",
  "devolucao-falhou": "a devolução falhou",
  inquerito: "inquérito (o banco só perguntou)",
  aberta: "aberta",
  "dinheiro-saiu": "o dinheiro saiu da conta",
  // O aviso de fraude (4.7b, passo 5c): a escola devolve, encerra e corta sozinha.
  "devolvido-como-fraude": "devolvido, marcado como fraude",
  "sem-devolucao:contestada": "nada devolvido: a cobrança já foi contestada",
  "sem-devolucao:ja-devolvida": "nada devolvido: já tinha voltado inteira",
  "sem-devolucao:nao-paga": "nada devolvido: a cobrança não está paga",
  "sem-devolucao:nao-encontrada": "nada devolvido: a Stripe não achou a cobrança",
  ...NOME_DO_TIPO_DE_FRAUDE,
};

/** O motivo de cancelamento como o aluno o leu. */
export function textoDoMotivoDeCancelamento(motivo: string): string {
  const motivos: Record<string, string> = pt.app.faturamento.cancelamento.motivos;
  return motivos[motivo] ?? motivo;
}

/** O que aconteceu, numa linha: o quê, o resumo traduzido e o valor. */
export function textoDaLinha(linha: LinhaDoRegistro): string {
  const acao = ACAO[linha.acao] ?? linha.acao;
  const pedacos = (linha.detalhe ?? "")
    .split(" · ")
    .filter(Boolean)
    .map((pedaco) => (pedaco.startsWith("motivo:") ? `motivo: ${textoDoMotivoDeCancelamento(pedaco.slice("motivo:".length))}` : (PEDACO[pedaco] ?? (TIPO_DO_CASO as Record<string, string>)[pedaco] ?? pedaco)));
  const valor = linha.centavos !== null ? dinheiro(linha.centavos, "brl") : null;
  return [acao, ...pedacos, valor].filter((parte): parte is string => parte !== null).join(" · ");
}

/** Quando, com a hora, no fuso de Brasília. */
export function quando(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
