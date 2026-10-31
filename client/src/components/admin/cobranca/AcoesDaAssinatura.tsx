import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AssinaturaDaLista } from "@jilson/core";
import * as api from "@/lib/api";
import { dataCurta } from "@/lib/cobranca-admin";
import { mensagemDaAcaoQueFalhou } from "@/lib/cobranca-acoes";
import { Button } from "@/components/ui/button";

type Acao = { rotulo: string; efeito: string; fazer: () => Promise<{ detalhe: string }> };

/** As ações que cabem a esta assinatura agora — nenhuma, uma ou (a atrasada) duas. */
function acoesPara(assinatura: AssinaturaDaLista, quem: string): Acao[] {
  if (assinatura.situacao === "ativa") {
    const ate = assinatura.pagoAte ? dataCurta(assinatura.pagoAte) : "o fim do período pago";
    return [{ rotulo: "Cancelar no fim do período", efeito: `${quem} continua com acesso até ${ate}, e a assinatura não renova.`, fazer: () => api.adminCancelar(assinatura.id) }];
  }
  if (assinatura.situacao === "atrasada") {
    return [
      // Passo 4b: quando o aluno avisa que resolveu o cartão.
      { rotulo: "Tentar cobrar de novo agora", efeito: "Cobra agora a cobrança em aberto, no cartão da assinatura. Se passar, as aulas voltam na hora; se for recusada, a Stripe segue tentando sozinha.", fazer: () => api.adminCobrarDeNovo(assinatura.id) },
      { rotulo: "Cancelar agora", efeito: "A cobrança está atrasada: a assinatura termina agora, sem acesso, e a cobrança em aberto não é mais tentada.", fazer: () => api.adminCancelar(assinatura.id) },
    ];
  }
  // A paga por fora (passo 6e, P149): desfazer a liberação feita por engano, sem ir à Stripe.
  if (assinatura.situacao === "pre-paga" && assinatura.pagoPorFora === true) {
    return [{ rotulo: "Encerrar agora", efeito: `A assinatura paga por fora termina agora, e ${quem} perde o acesso às aulas. Nada volta pela Stripe: o dinheiro que você recebeu por fora, você devolve por fora.`, fazer: () => api.adminEncerrarPagaPorFora(assinatura.id) }];
  }
  if (assinatura.situacao === "vai-cancelar") {
    return [{ rotulo: "Desfazer o cancelamento", efeito: "A assinatura volta a renovar no fim do período.", fazer: () => api.adminDesfazerCancelamento(assinatura.id) }];
  }
  return [];
}

/**
 * As ações de UMA assinatura na ficha (etapa 4.7b, passos 3a e 4b): cada uma com o botão, a confirmação dizendo o efeito,
 * e o que a Stripe respondeu. Depois, a ficha é lida de novo.
 */
export function AcoesDaAssinatura({ assinatura, quem }: { assinatura: AssinaturaDaLista; quem: string }) {
  const acoes = acoesPara(assinatura, quem);
  if (acoes.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      {acoes.map((acao) => (
        <UmaAcao key={acao.rotulo} acao={acao} />
      ))}
    </div>
  );
}

function UmaAcao({ acao }: { acao: Acao }) {
  const [confirmando, setConfirmando] = useState(false);
  const queryClient = useQueryClient();
  const fazer = useMutation({
    mutationFn: () => acao.fazer(),
    onSuccess: () => {
      setConfirmando(false);
      return queryClient.invalidateQueries({ queryKey: ["admin", "cobranca", "ficha"] });
    },
  });
  return (
    <div className="space-y-2">
      {confirmando ? (
        <div role="group" aria-label="Confirmar" className="space-y-2 rounded-xl border border-border/60 p-3">
          <p className="text-sm text-foreground">{acao.efeito}</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={fazer.isPending} onClick={() => fazer.mutate()}>
              {fazer.isPending ? "Fazendo…" : "Confirmar"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
              Voltar
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => setConfirmando(true)}>
          {acao.rotulo}
        </Button>
      )}
      {fazer.isSuccess ? (
        <p role="status" className="text-sm text-foreground">
          Feito: {fazer.data.detalhe}.
        </p>
      ) : null}
      {fazer.isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mensagemDaAcaoQueFalhou(fazer.error)}
        </p>
      ) : null}
    </div>
  );
}
