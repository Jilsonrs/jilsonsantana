import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AssinaturaDaLista } from "@jilson/core";
import * as api from "@/lib/api";
import { dataCurta } from "@/lib/cobranca-admin";
import { mensagemDaAcaoQueFalhou } from "@/lib/cobranca-acoes";
import { Button } from "@/components/ui/button";

type Acao = { rotulo: string; efeito: string; fazer: () => Promise<{ detalhe: string }> };

/** A ação que cabe a esta assinatura agora — ou nenhuma. */
function acaoPara(assinatura: AssinaturaDaLista, quem: string): Acao | null {
  if (assinatura.situacao === "ativa") {
    const ate = assinatura.pagoAte ? dataCurta(assinatura.pagoAte) : "o fim do período pago";
    return { rotulo: "Cancelar no fim do período", efeito: `${quem} continua com acesso até ${ate}, e a assinatura não renova.`, fazer: () => api.adminCancelar(assinatura.id) };
  }
  if (assinatura.situacao === "atrasada") {
    return { rotulo: "Cancelar agora", efeito: "A cobrança está atrasada: a assinatura termina agora, sem acesso, e a cobrança em aberto não é mais tentada.", fazer: () => api.adminCancelar(assinatura.id) };
  }
  if (assinatura.situacao === "vai-cancelar") {
    return { rotulo: "Desfazer o cancelamento", efeito: "A assinatura volta a renovar no fim do período.", fazer: () => api.adminDesfazerCancelamento(assinatura.id) };
  }
  return null;
}

/**
 * A ação de UMA assinatura na ficha (etapa 4.7b, passo 3a): o botão, a confirmação dizendo o efeito, e o que a Stripe
 * respondeu. Depois, a ficha é lida de novo.
 */
export function AcoesDaAssinatura({ assinatura, quem }: { assinatura: AssinaturaDaLista; quem: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const queryClient = useQueryClient();
  const acao = acaoPara(assinatura, quem);
  const fazer = useMutation({
    mutationFn: () => (acao ? acao.fazer() : Promise.reject(new Error("sem ação"))),
    onSuccess: () => {
      setConfirmando(false);
      return queryClient.invalidateQueries({ queryKey: ["admin", "cobranca", "ficha"] });
    },
  });
  if (!acao) return null;
  return (
    <div className="mt-3 space-y-2">
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
