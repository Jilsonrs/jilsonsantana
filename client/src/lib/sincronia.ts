import { ResultadoDaSincronia, type AssinaturaConferida } from "@jilson/core";
import { codigoDoErro } from "@/lib/course-form";

// O QUE A TELA "ASSINATURAS" DO ADMIN DIZ (Fase 4, etapa 4.4). Admin fica em português, com o
// texto aqui (decisão do operador, 23/09/2026). RASCUNHO do agente: o operador revisa.

// A situação que a Stripe dá à assinatura, em português. O que não estiver aqui (um status que
// ela inventar) aparece como veio.
const SITUACAO: Partial<Record<string, string>> = {
  active: "Ativa",
  trialing: "Em teste grátis",
  past_due: "Pagamento atrasado, em novas tentativas",
  paused: "Cobrança pausada",
  canceled: "Cancelada",
  unpaid: "Não paga",
  incomplete: "Aguardando o primeiro pagamento",
  incomplete_expired: "Primeiro pagamento não concluído",
};

/** A linha que descreve UMA assinatura conferida. */
export function descricaoDaConferida(assinatura: AssinaturaConferida): string {
  if (assinatura.resultado === ResultadoDaSincronia.NAO_ENCONTRADA) return "A Stripe não conhece esta assinatura.";
  const situacao = assinatura.status ? (SITUACAO[assinatura.status] ?? assinatura.status) : "Sem situação";
  const pagoAte = assinatura.pagoAte ? ` · paga até ${new Date(assinatura.pagoAte).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : "";
  const semConta = assinatura.resultado === ResultadoDaSincronia.SEM_CONTA ? " · a Stripe não diz de que conta ela é: confira no painel da Stripe" : "";
  return `${situacao}${pagoAte}${semConta}`;
}

/** A frase de quando a conferência falha, pelo motivo que o servidor deu. */
export function mensagemDeErroDaSincronia(erro: unknown): string {
  const motivo = codigoDoErro(erro);
  if (motivo === "ContaNaoEncontrada") return "Não existe conta com esse e-mail.";
  if (motivo === "NaoConfigurado") return "A Stripe não está configurada neste ambiente.";
  return "Não foi possível conferir na Stripe. Tente de novo.";
}
