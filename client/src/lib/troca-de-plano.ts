import { useState } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Plano, type TrocaDePlano } from "@jilson/core";
import { desistirDaTroca, getMinhaAssinatura, getTrocaDePlano, mudarDePlano } from "@/lib/api";
import { CHAVE_DA_MINHA_ASSINATURA, codigoDaRecusa } from "@/lib/faturamento";
import { semInterromper } from "@/lib/versao";

// MUDAR DE PLANO (Fase 4, etapa 4.6, sessão b): o que a tela de mudar de plano lê e faz. Quem
// decide para qual plano dá para ir, quanto custa e quando vale é o SERVIDOR; daqui vão só PARA
// QUAL plano e, na troca que vale na hora, o instante da conta mostrada — é o que faz o valor
// cobrado ser exatamente o que a pessoa leu.

export const CHAVE_DA_TROCA_DE_PLANO = ["billing", "troca-de-plano"] as const;

/**
 * A troca que a conta pode fazer agora, já com a conta da Stripe. NÃO é relida sozinha (o valor
 * mudaria de centavo em centavo na frente da pessoa) nem fica guardada depois de a tela fechar:
 * cada visita pede uma conta nova. Quando o servidor diz que ela envelheceu, a tela pede outra.
 */
export function useOfertaDeTroca(ligada: boolean) {
  return useQuery({ queryKey: CHAVE_DA_TROCA_DE_PLANO, queryFn: getTrocaDePlano, enabled: ligada, gcTime: 0, staleTime: Infinity, refetchOnWindowFocus: false });
}

/** O que a tela mostra depois de dar certo: vale agora, ou ficou marcado para a data. */
export type PlanoMudado = { como: "trocado" } | { como: "marcado"; em: string };
/** Por que não deu: o cartão foi recusado, a confirmação do banco não foi concluída, ou outra coisa. */
export type FalhaNaTroca = "recusado" | "banco" | "erro";

/** Entre uma leitura e outra, enquanto a Stripe aplica a troca que o banco acabou de confirmar. */
const ESPERA = 1500;

/**
 * Depois de o banco confirmar, a Stripe aplica a troca sozinha — em instantes. Lê a assinatura
 * até ela dizer "anual" (poucas vezes): assim o resumo já abre com o plano novo.
 */
async function esperarOPlanoNovo(queryClient: QueryClient): Promise<void> {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const assinatura = await queryClient.fetchQuery({ queryKey: CHAVE_DA_MINHA_ASSINATURA, queryFn: getMinhaAssinatura, staleTime: 0 }).catch(() => null);
    if (assinatura && "plano" in assinatura && assinatura.plano === Plano.ANUAL) return;
    await new Promise((resolver) => setTimeout(resolver, ESPERA));
  }
}

export function useMudarDePlano(chavePublicavel: string | undefined) {
  const queryClient = useQueryClient();
  const [feito, setFeito] = useState<PlanoMudado | null>(null);
  const [falha, setFalha] = useState<FalhaNaTroca | null>(null);
  const [enviando, setEnviando] = useState(false);
  /** A janela do banco está aberta: a pessoa precisa concluir a confirmação nela. */
  const [noBanco, setNoBanco] = useState(false);
  /** A conta mostrada envelheceu e foi pedida de novo: a pessoa confere o valor e confirma outra vez. */
  const [valorAtualizado, setValorAtualizado] = useState(false);

  // Dois cliques, uma troca: enquanto envia, o botão fica desligado (é a tela que garante).
  async function mudar(troca: TrocaDePlano) {
    setEnviando(true);
    setFalha(null);
    setValorAtualizado(false);
    try {
      // Carregar a página no meio cortaria a troca — e a confirmação do banco (`lib/versao.ts`).
      await semInterromper(async () => {
        const resposta = await mudarDePlano(troca.quando === "agora" ? { plano: Plano.ANUAL, previaDe: troca.previaDe } : { plano: Plano.MENSAL });
        if (resposta.estado === "trocado") return setFeito({ como: "trocado" });
        if (resposta.estado === "marcado") return setFeito({ como: "marcado", em: resposta.em });
        // O BANCO PEDIU UMA CONFIRMAÇÃO: a troca só vale depois dela. A janela do banco abre por
        // cima da tela; o segredo fica só na memória deste passo.
        setNoBanco(true);
        const { confirmarNoBanco } = await import("@/lib/stripe-do-site");
        const banco = chavePublicavel ? await confirmarNoBanco(chavePublicavel, resposta.segredo) : "nao-concluido";
        if (banco === "confirmado") {
          await esperarOPlanoNovo(queryClient);
          return setFeito({ como: "trocado" });
        }
        // NÃO CONCLUIU: a troca pendente é desfeita JÁ — a tela diz "nada foi cobrado", e a
        // cobrança não pode ficar esperando. Se o servidor disser que o pagamento já tinha
        // passado, o plano mudou.
        const desfeita = await desistirDaTroca();
        if (desfeita.trocado) setFeito({ como: "trocado" });
        else setFalha("banco");
      });
    } catch (erro) {
      const codigo = codigoDaRecusa(erro);
      if (codigo === "PreviaVencida") {
        setValorAtualizado(true);
        await queryClient.invalidateQueries({ queryKey: CHAVE_DA_TROCA_DE_PLANO });
      } else setFalha(codigo === "CartaoRecusado" ? "recusado" : "erro");
    } finally {
      setNoBanco(false);
      setEnviando(false);
      // Deu certo ou não, a assinatura pode ter mudado: o resumo e esta tela leem de novo.
      void queryClient.invalidateQueries({ queryKey: CHAVE_DA_MINHA_ASSINATURA });
    }
  }

  return { feito, falha, enviando, noBanco, valorAtualizado, mudar };
}
