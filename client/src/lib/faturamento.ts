import { useQuery } from "@tanstack/react-query";
import type { CartaoDaAssinatura, LanguageCode } from "@jilson/core";
import { getMinhaAssinatura } from "@/lib/api";
import type { AppTexts } from "@/lib/language";

// FATURAMENTO E ASSINATURA (Fase 4, etapa 4.6): os endereços, a leitura da tela e o que ela
// escreve por extenso (a data e o cartão).

export { TELA_DO_FATURAMENTO, TELA_DE_TROCAR_O_CARTAO } from "@jilson/core";

/** A assinatura da conta, como a Stripe diz agora. Uma chave só: quem muda a assinatura a invalida. */
export const CHAVE_DA_MINHA_ASSINATURA = ["billing", "minha-assinatura"] as const;

export function useMinhaAssinatura() {
  return useQuery({ queryKey: CHAVE_DA_MINHA_ASSINATURA, queryFn: getMinhaAssinatura });
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
