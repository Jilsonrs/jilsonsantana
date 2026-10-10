import { useQuery } from "@tanstack/react-query";
import { DuracaoDoDesconto, type DescontoDoCodigo, type LanguageCode, type Plano } from "@jilson/core";
import { getPlanosDaAssinatura, getPreviaDaAssinatura, getSituacaoDaAssinatura } from "@/lib/api";
import type { AppTexts } from "@/lib/language";

// ASSINAR (Fase 4, etapa 4.2): os endereços, o dinheiro por extenso e as três leituras da tela.

export { TELA_DE_ASSINAR, TELA_DE_CONCLUIDO } from "@jilson/core";

const LOCAL: Record<LanguageCode, string> = { pt: "pt-BR", en: "en-US" };

/** O valor como o aluno lê: "R$ 99,90" em português, "R$99.90" em inglês. Os centavos vêm do servidor. */
export function dinheiro(centavos: number, moeda: string, idioma: LanguageCode): string {
  return new Intl.NumberFormat(LOCAL[idioma], { style: "currency", currency: moeda.toUpperCase() }).format(centavos / 100);
}

/** O desconto do código por extenso: "100% de desconto em todas as cobranças". */
export function descreverDesconto(t: AppTexts["assinar"], desconto: DescontoDoCodigo, moeda: string, idioma: LanguageCode): string {
  const quanto = desconto.percentual !== null ? `${new Intl.NumberFormat(LOCAL[idioma], { maximumFractionDigits: 2 }).format(desconto.percentual)}%` : dinheiro(desconto.centavos ?? 0, moeda, idioma);
  const frase = desconto.duracao === DuracaoDoDesconto.PARA_SEMPRE ? t.descontoParaSempre : desconto.duracao === DuracaoDoDesconto.UMA_VEZ ? t.descontoUmaVez : t.descontoPorMeses;
  return frase.replace("{desconto}", quanto).replace("{meses}", String(desconto.meses ?? ""));
}

/** Os dois planos, com o valor que a Stripe diz. Só para quem ainda não assina. */
export function usePlanosDaAssinatura(ligado: boolean) {
  return useQuery({ queryKey: ["billing", "planos"], queryFn: getPlanosDaAssinatura, enabled: ligado });
}

/** Quanto fica hoje com o código — a conta é da Stripe. Sem código, nada é pedido. Trocar de plano pede de novo. */
export function usePrevia(plano: Plano, codigo: string | null) {
  return useQuery({ queryKey: ["billing", "previa", plano, codigo], queryFn: () => getPreviaDaAssinatura({ plano, codigo: codigo ?? "" }), enabled: codigo !== null });
}

/**
 * Esta conta tem acesso agora? Com `conferirACada` (a tela de concluído), pergunta de novo nesse
 * intervalo ATÉ a resposta ser sim — inclusive depois de uma falha — e então para.
 */
export function useSituacaoDaAssinatura(conferirACada?: number) {
  return useQuery({
    queryKey: ["billing", "assinatura"],
    queryFn: getSituacaoDaAssinatura,
    refetchInterval: (consulta) => (conferirACada && consulta.state.data?.temAcesso !== true ? conferirACada : false),
  });
}
