import { useQuery } from "@tanstack/react-query";
import { DuracaoDoDesconto, TELA_DE_CONCLUIDO, type DescontoDoCodigo, type Plano } from "@jilson/core";
import { confirmarSemLogin, getPlanosDaAssinatura, getPlanosSemLogin, getPreviaDaAssinatura, getPreviaSemLogin, getSituacaoDaAssinatura } from "@/lib/api";
import type { AppTexts } from "@/lib/language";

// ASSINAR (Fase 4, etapa 4.2): os endereços, o dinheiro por extenso e as três leituras da tela.

export { TELA_DE_ASSINAR, TELA_DE_CONCLUIDO } from "@jilson/core";

/** O que o endereço da confirmação leva quando a pessoa REATIVOU a assinatura. Só muda o TÍTULO da tela: quem diz que a assinatura valeu continua sendo o servidor. */
export const REATIVOU = "reativou";

/** Para onde vai quem acabou de pagar: a tela de confirmação — com a marca de que reativou, para o título continuar "Reativar assinatura" (decisão do operador, 11/10/2026). */
export const telaDeConcluido = (reativar: boolean | undefined): string => (reativar ? `${TELA_DE_CONCLUIDO}?${REATIVOU}=1` : TELA_DE_CONCLUIDO);

const LOCAL = "pt-BR";

/** O valor como o aluno lê: "R$ 99,90". Os centavos vêm do servidor. */
export function dinheiro(centavos: number, moeda: string): string {
  return new Intl.NumberFormat(LOCAL, { style: "currency", currency: moeda.toUpperCase() }).format(centavos / 100);
}

/** O desconto do código por extenso: "100% de desconto em todas as cobranças". */
export function descreverDesconto(t: AppTexts["assinar"], desconto: DescontoDoCodigo, moeda: string): string {
  const quanto = desconto.percentual !== null ? `${new Intl.NumberFormat(LOCAL, { maximumFractionDigits: 2 }).format(desconto.percentual)}%` : dinheiro(desconto.centavos ?? 0, moeda);
  const frase = desconto.duracao === DuracaoDoDesconto.PARA_SEMPRE ? t.descontoParaSempre : desconto.duracao === DuracaoDoDesconto.UMA_VEZ ? t.descontoUmaVez : t.descontoPorMeses;
  return frase.replace("{desconto}", quanto).replace("{meses}", String(desconto.meses ?? ""));
}

/** Os dois planos, com o valor que a Stripe diz. Só para quem ainda não assina. */
export function usePlanosDaAssinatura(ligado: boolean) {
  return useQuery({ queryKey: ["billing", "planos"], queryFn: getPlanosDaAssinatura, enabled: ligado });
}

/**
 * "O pagamento já valeu?" para quem assinou SEM CONTA (etapa 4.7, passo 6e2): pergunta a cada
 * `conferirACada` até a resposta ser sim — o aviso da Stripe é que faz a conta nascer. Sem tentativa, nada.
 */
export function useConfirmacaoSemLogin(tentativa: string | null, conferirACada = 2000) {
  return useQuery({
    queryKey: ["billing", "visitante", "confirmacao", tentativa],
    queryFn: () => confirmarSemLogin(tentativa ?? ""),
    enabled: tentativa !== null,
    refetchInterval: (consulta) => (consulta.state.data?.confirmada ? false : conferirACada),
  });
}

/** Os dois planos para o VISITANTE, sem login (a tela pública de assinar — etapa 4.7, passo 6c). */
export function usePlanosSemLogin() {
  return useQuery({ queryKey: ["billing", "visitante", "planos"], queryFn: getPlanosSemLogin });
}

/**
 * Quanto fica hoje com o código — a conta é da Stripe. Sem código, nada é pedido. Trocar para um
 * plano ainda não visto pede de novo; o que já veio fica: **nada de pedir sozinha** ao voltar para a
 * aba ou ao reconectar (achado P1 da revisão de segurança da etapa 4.7, passo 1, 19/10/2026) — cada
 * pedido gasta uma das 10 tentativas de 15 minutos, e quem só comparou os planos pararia no limite.
 * Não perde nada: o servidor confere o código de novo ao assinar, e o `CodigoInvalido` relê a prévia.
 */
export function usePrevia(plano: Plano, codigo: string | null, semLogin = false) {
  return useQuery({
    // `semLogin`: a tela pública pergunta pela rota do visitante (etapa 4.7, passo 6e).
    queryKey: ["billing", "previa", semLogin ? "sem-login" : "logado", plano, codigo],
    queryFn: () => (semLogin ? getPreviaSemLogin : getPreviaDaAssinatura)({ plano, codigo: codigo ?? "" }),
    enabled: codigo !== null,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
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
