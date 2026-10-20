import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CancelarInput, MotivoDoCancelamento, ReembolsoFeito } from "@jilson/core";
import { cancelarMinhaAssinatura, reembolsarMinhaAssinatura } from "@/lib/api";
import { CHAVE_DA_MINHA_ASSINATURA, codigoDaRecusa, passouDoLimite } from "@/lib/faturamento";

// CANCELAR A ASSINATURA (Fase 4, etapa 4.6, sessão b): o que a tela de cancelar guarda e faz.
// Quem decide o que cabe (parar a renovação, o reembolso, terminar na hora) é o SERVIDOR; aqui
// só vão o motivo e o comentário — os dois opcionais — e a resposta dele.

/** O que a tela mostra depois de dar certo. */
export type Cancelado =
  /** A renovação parou: o acesso continua até a data. */
  | { como: "parou"; acessoAte: string | null }
  /** A cobrança estava atrasada: a assinatura terminou agora. */
  | { como: "terminou" }
  /** O dinheiro foi devolvido, e o acesso terminou agora. */
  | ({ como: "reembolsado" } & ReembolsoFeito);

/**
 * Por que não deu: o prazo do reembolso acabou, a devolução falhou depois de encerrar, muitas
 * tentativas seguidas (o limite das rotas de cobrança — etapa 4.7, passo 1), ou outra coisa.
 */
export type FalhaAoCancelar = "prazo" | "devolucao" | "limite" | "erro";

function paraFalha(erro: unknown): FalhaAoCancelar {
  const codigo = codigoDaRecusa(erro);
  if (codigo === "ForaDoPrazo") return "prazo";
  if (codigo === "DevolucaoFalhou") return "devolucao";
  if (passouDoLimite(erro)) return "limite";
  return "erro";
}

export function useCancelamento() {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState<MotivoDoCancelamento | null>(null);
  const [comentario, setComentario] = useState("");
  const [feito, setFeito] = useState<Cancelado | null>(null);
  const [falha, setFalha] = useState<FalhaAoCancelar | null>(null);

  /** Só o que a pessoa disse: sem motivo e sem comentário, o corpo vai vazio. */
  const oQueDisse = (): CancelarInput => ({ ...(motivo ? { motivo } : {}), ...(comentario.trim() ? { comentario: comentario.trim() } : {}) });
  // Deu certo ou não, a assinatura pode ter mudado (o prazo acabou, ela foi encerrada): o resumo
  // e esta tela leem de novo.
  const lerDeNovo = () => void queryClient.invalidateQueries({ queryKey: CHAVE_DA_MINHA_ASSINATURA });
  const aoFalhar = (erro: unknown) => {
    setFalha(paraFalha(erro));
    lerDeNovo();
  };

  const parar = useMutation({
    mutationFn: () => cancelarMinhaAssinatura(oQueDisse()),
    onMutate: () => setFalha(null),
    onSuccess: (resposta) => {
      setFeito(resposta.terminou ? { como: "terminou" } : { como: "parou", acessoAte: resposta.acessoAte });
      lerDeNovo();
    },
    onError: aoFalhar,
  });
  const reembolsar = useMutation({
    mutationFn: () => reembolsarMinhaAssinatura(oQueDisse()),
    onMutate: () => setFalha(null),
    onSuccess: (resposta) => {
      setFeito({ como: "reembolsado", ...resposta });
      lerDeNovo();
    },
    onError: aoFalhar,
  });

  const enviando: "parar" | "reembolsar" | null = parar.isPending ? "parar" : reembolsar.isPending ? "reembolsar" : null;
  return { motivo, setMotivo, comentario, setComentario, feito, falha, enviando, parar: () => parar.mutate(), reembolsar: () => reembolsar.mutate() };
}
