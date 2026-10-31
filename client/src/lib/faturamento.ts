import { useQuery } from "@tanstack/react-query";
import { NOME_DA_BANDEIRA, SituacaoDoFaturamento, type CartaoDaAssinatura, type MinhaAssinatura } from "@jilson/core";
import { getMinhaAssinatura, getMinhasCobrancas } from "@/lib/api";
import type { AppTexts } from "@/lib/language";

// FATURAMENTO E ASSINATURA (Fase 4, etapa 4.6): os endereços, a leitura da tela e o que ela
// escreve por extenso (a data e o cartão).

export { TELA_DO_FATURAMENTO, TELA_DE_TROCAR_O_CARTAO, TELA_DE_CANCELAR, TELA_DE_MUDAR_DE_PLANO, TELA_DE_PAGAR_COM_PIX } from "@jilson/core";

/** A assinatura da conta, como a Stripe diz agora. Uma chave só: quem muda a assinatura a invalida. */
export const CHAVE_DA_MINHA_ASSINATURA = ["billing", "minha-assinatura"] as const;

/**
 * `gcTime: 0`: o que a tela leu (o plano, o cartão) é esquecido assim que ela fecha. A chave não
 * leva a conta: sem isto, outra conta que entrasse na mesma aba veria por um instante o plano e
 * o cartão da anterior (achado da revisão de segurança, 11/10/2026). "Sair" já limpa tudo o que
 * as telas guardaram (`Layout`); isto cobre a sessão que acaba SEM o "Sair" — a que o servidor
 * derruba. O custo é ler a Stripe de novo a cada visita — que é o que se quer.
 */
export const CONSULTA_DA_MINHA_ASSINATURA = { queryKey: CHAVE_DA_MINHA_ASSINATURA, queryFn: getMinhaAssinatura, gcTime: 0 } as const;

/** Quem lê a assinatura fora de uma tela (`fetchQuery`) usa a MESMA consulta: uma leitura sem o `gcTime: 0` voltaria a guardar o plano e o cartão por minutos. */
export function useMinhaAssinatura(ligada: boolean = true) {
  return useQuery({ ...CONSULTA_DA_MINHA_ASSINATURA, enabled: ligada });
}

/**
 * As cobranças que passaram e os recibos (etapa 4.7b, passo 6a). `gcTime: 0` pelo mesmo motivo da assinatura: o que a tela
 * leu é esquecido assim que ela fecha, e outra conta na mesma aba nunca vê a lista da anterior.
 */
export const CONSULTA_DAS_MINHAS_COBRANCAS = { queryKey: ["billing", "minhas-cobrancas"] as const, queryFn: getMinhasCobrancas, gcTime: 0 } as const;
export function useMinhasCobrancas(ligada: boolean = true) {
  return useQuery({ ...CONSULTA_DAS_MINHAS_COBRANCAS, enabled: ligada });
}

/** A assinatura de quem TEM acesso: é a que traz plano, cobrança e cartão. */
export type AssinaturaComAcesso = Exclude<MinhaAssinatura, { situacao: typeof SituacaoDoFaturamento.NENHUMA } | { situacao: typeof SituacaoDoFaturamento.TERMINADA }>;

/** A assinatura, se a conta tem acesso por ela — senão nada (nunca assinou, ou terminou). */
export function comAcesso(assinatura: MinhaAssinatura | undefined): AssinaturaComAcesso | null {
  if (!assinatura || assinatura.situacao === SituacaoDoFaturamento.NENHUMA || assinatura.situacao === SituacaoDoFaturamento.TERMINADA) return null;
  return assinatura;
}

/** A data como o aluno lê: "10/11/2026". */
export function dataPorExtenso(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(iso));
}


/** O nome da bandeira, como o aluno lê — ou nada, se não for uma das conhecidas. */
export function nomeDaBandeira(codigo: string): string | undefined {
  return NOME_DA_BANDEIRA[codigo];
}

/** O cartão por extenso: "Visa •••• 4242 · vence em 12/2028". Nunca o número. */
export function descreverCartao(t: AppTexts["faturamento"], cartao: CartaoDaAssinatura): string {
  const bandeira = NOME_DA_BANDEIRA[cartao.bandeira];
  const frase = bandeira ? t.cartao.replace("{bandeira}", bandeira) : t.cartao.replace("{bandeira} ", "");
  return frase.replace("{final}", cartao.final).replace("{mes}", String(cartao.mes).padStart(2, "0")).replace("{ano}", String(cartao.ano));
}

/**
 * O código da recusa que o servidor devolveu (`{ error: "ForaDoPrazo" }`) — ou nada, se a falha
 * foi outra (rede, servidor fora do ar). Lido pela forma da resposta, sem depender do Axios aqui.
 */
export function codigoDaRecusa(erro: unknown): string | null {
  if (typeof erro !== "object" || erro === null || !("response" in erro)) return null;
  // Seguro: a linha acima provou que é um objeto com `response`; o resto é opcional.
  const codigo = (erro as { response?: { data?: { error?: unknown } } }).response?.data?.error;
  return typeof codigo === "string" ? codigo : null;
}

/**
 * O servidor recusou por excesso de tentativas (etapa 4.7, passo 1 — o limite das rotas de
 * cobrança): onde a pessoa clicou, a tela mostra `app.comum.muitasTentativas` no lugar do erro de
 * sempre, que mandaria tentar de novo na hora.
 */
export function passouDoLimite(erro: unknown): boolean {
  return codigoDaRecusa(erro) === "MuitasTentativas";
}
