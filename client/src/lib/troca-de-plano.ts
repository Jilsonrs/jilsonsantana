import { useEffect, useState } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Plano, type MinhaAssinatura, type TrocaDePlano, type TrocaDesfeita } from "@jilson/core";
import { desistirDaTroca, getTrocaDePlano, mudarDePlano } from "@/lib/api";
import { CHAVE_DA_MINHA_ASSINATURA, CONSULTA_DA_MINHA_ASSINATURA, codigoDaRecusa } from "@/lib/faturamento";
import { semInterromper } from "@/lib/versao";

// MUDAR DE PLANO (Fase 4, etapa 4.6, sessão b): o que a tela de mudar de plano lê e faz. Quem
// decide para qual plano dá para ir, quanto custa e quando vale é o SERVIDOR; daqui vão só PARA
// QUAL plano e, na troca que vale na hora, o valor que a tela MOSTROU — o servidor o confere e
// cobra exatamente ele, num clique só, mesmo que a pessoa tenha demorado.

export const CHAVE_DA_TROCA_DE_PLANO = ["billing", "troca-de-plano"] as const;

/**
 * A troca que a conta pode fazer agora, já com a conta da Stripe. NÃO é relida sozinha (o valor
 * mudaria de centavo em centavo na frente da pessoa) nem fica guardada depois de a tela fechar:
 * cada visita pede uma conta nova. Quando o valor mostrado deixa de valer (a tela aberta por
 * muitas horas, o mês que virou), a pessoa é levada ao Início — e na volta vê a conta nova.
 */
export function useOfertaDeTroca(ligada: boolean) {
  return useQuery({ queryKey: CHAVE_DA_TROCA_DE_PLANO, queryFn: getTrocaDePlano, enabled: ligada, gcTime: 0, staleTime: Infinity, refetchOnWindowFocus: false });
}

/** O que a tela mostra depois de dar certo: vale agora, ou ficou marcado para a data. */
export type PlanoMudado = { como: "trocado" } | { como: "marcado"; em: string };
/** Por que não deu: o cartão foi recusado, a confirmação do banco não foi concluída, ou outra coisa. */
export type FalhaNaTroca = "recusado" | "banco" | "erro";

/**
 * Entre uma leitura e outra (enquanto a Stripe aplica a troca que o banco acabou de confirmar) e
 * entre uma tentativa e outra de desfazer, em milissegundos. É um objeto para os testes poderem
 * encurtar a espera sem trocar o relógio de tudo.
 */
export const RITMO = { espera: 1500 };
/** Quantas vezes a tela lê, esperando o servidor dizer "anual" depois de o banco confirmar. */
const LEITURAS = 6;
/** Quantas vezes a tela pede para desfazer a troca que não se concluiu (a assinatura pode estar ocupada). */
const TENTATIVAS_DE_DESFAZER = 3;

const esperar = () => new Promise((resolver) => setTimeout(resolver, RITMO.espera));

/** A assinatura como o SERVIDOR a diz agora — ou nada, se a leitura falhou. */
function lerAAssinatura(queryClient: QueryClient): Promise<MinhaAssinatura | null> {
  return queryClient.fetchQuery({ ...CONSULTA_DA_MINHA_ASSINATURA, staleTime: 0 }).catch(() => null);
}

/**
 * O que o SERVIDOR diz desta troca agora: já vale, ficou marcada — ou nada disso. É por ele que a
 * tela afirma (achado da revisão de segurança, 11/10/2026): a resposta de um pedido pode se
 * perder no caminho depois de a troca ter sido feita.
 */
async function comoFicou(queryClient: QueryClient, troca: TrocaDePlano): Promise<PlanoMudado | null> {
  const assinatura = await lerAAssinatura(queryClient);
  if (!assinatura || !("plano" in assinatura)) return null;
  if (troca.quando === "agora") return assinatura.plano === Plano.ANUAL ? { como: "trocado" } : null;
  return assinatura.trocaMarcada ? { como: "marcado", em: assinatura.trocaMarcada.em } : null;
}

/**
 * Depois de o banco confirmar, a Stripe aplica a troca sozinha — em instantes. Lê a assinatura
 * até o servidor dizer "anual" (poucas vezes): assim o resumo já abre com o plano novo.
 */
async function esperarOPlanoNovo(queryClient: QueryClient, troca: TrocaDePlano): Promise<void> {
  for (let leitura = 1; leitura <= LEITURAS; leitura++) {
    if (await comoFicou(queryClient, troca)) return;
    if (leitura < LEITURAS) await esperar();
  }
}

/**
 * A janela do banco. Qualquer coisa que não seja "confirmado" — a pessoa fechou, o banco recusou,
 * o Stripe.js não carregou ou deu erro — é "não concluído": quem decide o que aconteceu é o
 * servidor, ao desfazer.
 */
async function pedirAoBanco(chavePublicavel: string | undefined, segredo: string): Promise<"confirmado" | "nao-concluido"> {
  if (!chavePublicavel) return "nao-concluido";
  try {
    const { confirmarNoBanco } = await import("@/lib/stripe-do-site");
    return await confirmarNoBanco(chavePublicavel, segredo);
  } catch {
    return "nao-concluido";
  }
}

/**
 * Desfaz a troca que ficou esperando o banco: a cobrança dela não pode ficar em aberto. A
 * assinatura pode estar ocupada por um instante (o aviso da Stripe chegando), e repetir não faz
 * mal: tenta de novo, poucas vezes.
 */
async function desfazerATroca(): Promise<TrocaDesfeita> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await desistirDaTroca();
    } catch (erro) {
      if (tentativa >= TENTATIVAS_DE_DESFAZER) throw erro;
      await esperar();
    }
  }
}

/** A maior espera que o `setTimeout` do navegador conta (2³¹ − 1 ms, uns 24 dias); acima disso ele dispara na hora. */
const MAIOR_ESPERA_DO_NAVEGADOR = 2_147_483_647;

/**
 * O VALOR MOSTRADO VENCEU PELO RELÓGIO (decisão do operador, 11/10/2026: "igual banco que
 * expira […] aqui redireciona"). A tela aberta por horas mostra um valor que já não é o da
 * conta; passado o prazo que o servidor disse (`valeAte`), ela sai sozinha para o Início.
 * Devolve SE venceu — quem navega é a tela.
 */
export function useValorVencido(valeAte: string | undefined): boolean {
  const [venceu, setVenceu] = useState(false);
  // É efeito porque depende do RELÓGIO (e de a aba voltar a ser vista, depois de o computador
  // dormir): nenhum dado da tela muda quando o prazo passa.
  useEffect(() => {
    if (!valeAte) return;
    const fim = new Date(valeAte).getTime();
    let relogio: ReturnType<typeof setTimeout> | undefined;
    const conferir = () => {
      clearTimeout(relogio);
      const falta = fim - Date.now();
      if (falta <= 0) setVenceu(true);
      // Em pedaços: o navegador não conta esperas maiores que uns 24 dias — elas disparam NA HORA.
      else relogio = setTimeout(conferir, Math.min(falta, MAIOR_ESPERA_DO_NAVEGADOR));
    };
    conferir();
    document.addEventListener("visibilitychange", conferir);
    return () => {
      clearTimeout(relogio);
      document.removeEventListener("visibilitychange", conferir);
    };
  }, [valeAte]);
  return venceu;
}

export function useMudarDePlano(chavePublicavel: string | undefined) {
  const queryClient = useQueryClient();
  const [feito, setFeito] = useState<PlanoMudado | null>(null);
  const [falha, setFalha] = useState<FalhaNaTroca | null>(null);
  const [enviando, setEnviando] = useState(false);
  /** A janela do banco está aberta: a pessoa precisa concluir a confirmação nela. */
  const [noBanco, setNoBanco] = useState(false);
  /** O servidor disse que o valor mostrado já não confere com a conta: nada foi cobrado, e a tela leva a pessoa ao Início. */
  const [venceu, setVenceu] = useState(false);

  // Dois cliques, uma troca: enquanto envia, o botão fica desligado (é a tela que garante).
  async function mudar(troca: TrocaDePlano) {
    setEnviando(true);
    setFalha(null);
    try {
      // Carregar a página no meio cortaria a troca — e a confirmação do banco (`lib/versao.ts`).
      await semInterromper(async () => {
        const resposta = await mudarDePlano(troca.quando === "agora" ? { plano: Plano.ANUAL, valorMostrado: troca.hoje.centavos } : { plano: Plano.MENSAL });
        if (resposta.estado === "trocado") return setFeito({ como: "trocado" });
        if (resposta.estado === "marcado") return setFeito({ como: "marcado", em: resposta.em });
        // O BANCO PEDIU UMA CONFIRMAÇÃO: a troca só vale depois dela. A janela do banco abre por
        // cima da tela; o segredo fica só na memória deste passo.
        setNoBanco(true);
        if ((await pedirAoBanco(chavePublicavel, resposta.segredo)) === "confirmado") {
          await esperarOPlanoNovo(queryClient, troca);
          return setFeito({ como: "trocado" });
        }
        // NÃO CONCLUIU: a troca pendente é desfeita JÁ — a cobrança não pode ficar esperando. E
        // "nada foi cobrado" só é dito se o SERVIDOR disser que o plano continua o mesmo: a
        // janela do banco pode dar erro DEPOIS de o pagamento ter passado.
        const desfeita = await desfazerATroca();
        if (desfeita.trocado || desfeita.plano === Plano.ANUAL) setFeito({ como: "trocado" });
        else setFalha("banco");
      });
    } catch (erro) {
      const codigo = codigoDaRecusa(erro);
      if (codigo === "PreviaVencida") setVenceu(true);
      else {
        // QUALQUER outra falha: vale o que o servidor diz AGORA. Se a troca já está feita (a
        // resposta se perdeu no caminho), a tela diz que deu certo em vez de pedir de novo.
        const ficou = await comoFicou(queryClient, troca);
        if (ficou) setFeito(ficou);
        else setFalha(codigo === "CartaoRecusado" ? "recusado" : "erro");
      }
    } finally {
      setNoBanco(false);
      setEnviando(false);
      // Deu certo ou não, a assinatura pode ter mudado: o resumo e esta tela leem de novo.
      void queryClient.invalidateQueries({ queryKey: CHAVE_DA_MINHA_ASSINATURA });
    }
  }

  return { feito, falha, enviando, noBanco, venceu, mudar };
}
