import { useQuery } from "@tanstack/react-query";
import type { CobrancaDaFicha } from "@jilson/core";
import * as api from "@/lib/api";
import { dataCurta } from "@/lib/cobranca-admin";

// A FICHA DO ALUNO NO PAINEL DA COBRANÇA (Fase 4, etapa 4.7b, passo 1d). Admin fica em português, com o texto aqui
// (decisão do operador, 23/09/2026); o operador confere usando (31/10/2026).

export type QuemDaFicha = { conta: string } | { assinatura: number } | { visitante: string };

/** Quem a ficha mostra, tirado do endereço: `?conta=`, `?assinatura=` ou `?visitante=` — um só; senão, nada. */
export function quemDaFicha(parametros: URLSearchParams): QuemDaFicha | null {
  const conta = parametros.get("conta");
  const assinatura = parametros.get("assinatura");
  const visitante = parametros.get("visitante");
  if ([conta, assinatura, visitante].filter(Boolean).length !== 1) return null;
  if (conta) return { conta };
  if (visitante) return { visitante };
  if (assinatura && /^[1-9][0-9]*$/.test(assinatura)) return { assinatura: Number(assinatura) };
  return null;
}

/** O endereço da ficha de uma conta, de uma assinatura sem conta ou de um visitante que não terminou de assinar. */
export function enderecoDaFicha(quem: { conta: string | null; assinatura: number | null; visitante?: string | null }): string | null {
  if (quem.conta) return `/admin/cobranca/assinaturas/ficha?conta=${encodeURIComponent(quem.conta)}`;
  if (quem.assinatura) return `/admin/cobranca/assinaturas/ficha?assinatura=${quem.assinatura}`;
  if (quem.visitante) return `/admin/cobranca/assinaturas/ficha?visitante=${encodeURIComponent(quem.visitante)}`;
  return null;
}

/** O código da Stripe que a lista não acha sozinha (precisa perguntar à Stripe de quem é). */
export function precisaAcharNaStripe(busca: string): boolean {
  return /^(ch|in|du)_[A-Za-z0-9_]+$/.test(busca);
}

export function useFichaDoAdmin(quem: QuemDaFicha | null) {
  return useQuery({ queryKey: ["admin", "cobranca", "ficha", quem], queryFn: () => api.adminFichaDaCobranca(quem ?? { conta: "" }), enabled: quem !== null });
}

export function dinheiro(centavos: number, moeda: string): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: moeda.toUpperCase() });
}

/** O motivo da recusa, como o banco disse, em português. O que não estiver aqui aparece com o código. */
const MOTIVO: Partial<Record<string, string>> = {
  insufficient_funds: "sem saldo ou sem limite",
  expired_card: "cartão vencido",
  card_declined: "cartão recusado",
  generic_decline: "recusado pelo banco, sem motivo dito",
  do_not_honor: "o banco não autorizou",
  incorrect_cvc: "código de segurança errado",
  incorrect_number: "número do cartão errado",
  lost_card: "cartão dado como perdido",
  stolen_card: "cartão dado como roubado",
  pickup_card: "o banco pediu para reter o cartão",
  fraudulent: "o banco suspeitou de fraude",
  processing_error: "erro no processamento",
  authentication_required: "o banco pediu confirmação, e ela não aconteceu",
  card_velocity_exceeded: "o cartão passou do limite de tentativas",
  highest_risk_level: "barrado pela proteção contra fraude da Stripe",
  elevated_risk_level: "barrado pela proteção contra fraude da Stripe",
};
export function textoDoMotivo(codigo: string | null): string {
  if (!codigo) return "recusado";
  return MOTIVO[codigo] ?? `recusado (${codigo})`;
}

const SITUACAO_DA_CONTESTACAO: Partial<Record<string, string>> = {
  warning_needs_response: "o banco perguntou (inquérito) — precisa de resposta",
  warning_under_review: "inquérito em análise",
  warning_closed: "inquérito encerrado",
  needs_response: "precisa de resposta",
  under_review: "em análise no banco",
  won: "a escola ganhou",
  lost: "a escola perdeu",
};

/** O que aconteceu com a cobrança, numa frase. */
export function textoDaCobranca(cobranca: CobrancaDaFicha): string {
  switch (cobranca.situacao) {
    case "paga":
      return "Paga";
    case "falhou":
      return `Recusada: ${textoDoMotivo(cobranca.motivoDaFalha)}`;
    case "pendente":
      return "Esperando o pagamento";
    case "devolvida":
      return "Devolvida";
    case "devolvida-em-parte":
      return `Devolvida em parte (${dinheiro(cobranca.devolvido, cobranca.moeda)})`;
    case "contestada": {
      const c = cobranca.contestacao;
      if (!c) return "Contestada no banco";
      const situacao = SITUACAO_DA_CONTESTACAO[c.situacao] ?? c.situacao;
      return `Contestada no banco: ${situacao}${c.prazo ? ` · prazo ${dataCurta(c.prazo)}` : ""}`;
    }
  }
}

/** A forma de pagamento da cobrança. */
export function textoDaForma(cobranca: CobrancaDaFicha): string {
  if (cobranca.forma === "pix") return "Pix";
  if (cobranca.cartao) return `${cobranca.cartao.bandeira} •••• ${cobranca.cartao.final}`;
  return cobranca.forma === "cartao" ? "Cartão" : "Outra forma";
}

const EMAIL: Partial<Record<string, string>> = {
  BOAS_VINDAS: "Boas-vindas",
  CONFIRMADA: "Assinatura confirmada",
  COBRANCA_FALHOU: "A cobrança falhou",
  ANTES_DE_TRANCAR: "Antes de trancar as aulas",
  CANCELADA: "A assinatura terminou",
  PREPAGO_TERMINANDO: "Pix: o acesso está acabando",
};
export function textoDoEmail(tipo: string): string {
  return EMAIL[tipo] ?? tipo;
}
