import { useQuery } from "@tanstack/react-query";
import { SituacaoDoFaturamento, type CartaoDaAssinatura, type LanguageCode, type MinhaAssinatura } from "@jilson/core";
import { getMinhaAssinatura } from "@/lib/api";
import type { AppTexts } from "@/lib/language";

// FATURAMENTO E ASSINATURA (Fase 4, etapa 4.6): os endereços, a leitura da tela e o que ela
// escreve por extenso (a data e o cartão).

export { TELA_DO_FATURAMENTO, TELA_DE_TROCAR_O_CARTAO, TELA_DE_CANCELAR, TELA_DE_MUDAR_DE_PLANO } from "@jilson/core";

/** A assinatura da conta, como a Stripe diz agora. Uma chave só: quem muda a assinatura a invalida. */
export const CHAVE_DA_MINHA_ASSINATURA = ["billing", "minha-assinatura"] as const;

/**
 * `gcTime: 0`: o que a tela leu (o plano, o cartão) é esquecido assim que ela fecha. A chave não
 * leva a conta: sem isto, outra conta que entrasse na mesma aba veria por um instante o plano e
 * o cartão da anterior (achado da revisão de segurança, 11/10/2026). "Sair" já limpa tudo o que
 * as telas guardaram (`Layout`); isto cobre a sessão que acaba SEM o "Sair" — a que o servidor
 * derruba. O custo é ler a Stripe de novo a cada visita — que é o que se quer.
 */
export function useMinhaAssinatura(ligada: boolean = true) {
  return useQuery({ queryKey: CHAVE_DA_MINHA_ASSINATURA, queryFn: getMinhaAssinatura, gcTime: 0, enabled: ligada });
}

/** A assinatura de quem TEM acesso: é a que traz plano, cobrança e cartão. */
export type AssinaturaComAcesso = Exclude<MinhaAssinatura, { situacao: typeof SituacaoDoFaturamento.NENHUMA } | { situacao: typeof SituacaoDoFaturamento.TERMINADA }>;

/** A assinatura, se a conta tem acesso por ela — senão nada (nunca assinou, ou terminou). */
export function comAcesso(assinatura: MinhaAssinatura | undefined): AssinaturaComAcesso | null {
  if (!assinatura || assinatura.situacao === SituacaoDoFaturamento.NENHUMA || assinatura.situacao === SituacaoDoFaturamento.TERMINADA) return null;
  return assinatura;
}

/**
 * A data como o aluno lê: "10/11/2026" em português. Em inglês, "Nov 10, 2026" — com o mês por
 * extenso, porque "11/10/2026" quer dizer dias diferentes para um americano e para um europeu.
 */
export function dataPorExtenso(iso: string, idioma: LanguageCode): string {
  const data = new Date(iso);
  return idioma === "en" ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(data) : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(data);
}

// O nome da bandeira é nome próprio, igual nos dois idiomas. A Stripe manda o código dela; o que
// não estiver aqui (bandeira nova, ou "unknown") sai sem nome — só os 4 últimos e a validade.
const BANDEIRAS: Partial<Record<string, string>> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  elo: "Elo",
  hipercard: "Hipercard",
  diners: "Diners Club",
  discover: "Discover",
  jcb: "JCB",
  unionpay: "UnionPay",
};

/** O cartão por extenso: "Visa •••• 4242 · vence em 12/2028". Nunca o número. */
export function descreverCartao(t: AppTexts["faturamento"], cartao: CartaoDaAssinatura): string {
  const bandeira = BANDEIRAS[cartao.bandeira];
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
