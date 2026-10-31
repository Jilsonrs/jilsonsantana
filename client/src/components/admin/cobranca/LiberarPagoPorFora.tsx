import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Plano } from "@jilson/core";
import * as api from "@/lib/api";
import { mensagemDaAcaoQueFalhou } from "@/lib/cobranca-acoes";
import { Button } from "@/components/ui/button";

/**
 * LIBERAR ACESSO PAGO POR FORA (etapa 4.7b, passo 4d — decisão do operador P120): quando a pessoa pagou fora da Stripe (um
 * Pix direto, uma transferência). O servidor cria uma assinatura pré-paga de verdade, paga por fora: não renova e não cobra
 * cartão. Não é cortesia: fica no registro quem liberou, o plano e até quando.
 */
export function LiberarPagoPorFora({ conta, quem }: { conta: string; quem: string }) {
  const [aberto, setAberto] = useState(false);
  const [plano, setPlano] = useState<Plano>("mensal");
  const [confirmando, setConfirmando] = useState(false);
  const queryClient = useQueryClient();
  const liberar = useMutation({
    mutationFn: () => api.adminLiberarPagoPorFora(conta, plano),
    onSuccess: () => {
      setAberto(false);
      setConfirmando(false);
      return queryClient.invalidateQueries({ queryKey: ["admin", "cobranca", "ficha"] });
    },
  });
  const fechar = () => {
    setAberto(false);
    setConfirmando(false);
  };
  return (
    <div className="space-y-2">
      {!aberto ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            liberar.reset();
            setPlano("mensal");
            setAberto(true);
          }}
        >
          Liberar acesso pago por fora
        </Button>
      ) : confirmando ? (
        <div role="group" aria-label="Confirmar a liberação" className="space-y-2 rounded-xl border border-border/60 p-3">
          <p className="text-sm text-foreground">
            {quem} ganha acesso por {plano === "anual" ? "um ano" : "um mês"}, pago por fora. A assinatura não renova e não cobra cartão. Fica no registro quem liberou.
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={liberar.isPending} onClick={() => liberar.mutate()}>
              {liberar.isPending ? "Liberando…" : "Confirmar"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
              Voltar
            </Button>
          </div>
        </div>
      ) : (
        <fieldset className="max-w-md space-y-2">
          <legend className="text-sm font-medium text-foreground">Liberar acesso pago por fora</legend>
          <p className="text-sm text-muted-foreground">Para quando a pessoa pagou fora da Stripe (um Pix direto, uma transferência).</p>
          <div className="flex gap-4">
            {(["mensal", "anual"] as const).map((opcao) => (
              <label key={opcao} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input type="radio" name={`plano-${conta}`} value={opcao} checked={plano === opcao} onChange={() => setPlano(opcao)} className="h-4 w-4 border-border/60 text-primary focus:ring-primary" />
                {opcao === "anual" ? "Anual" : "Mensal"}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => setConfirmando(true)}>
              Liberar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={fechar}>
              Cancelar
            </Button>
          </div>
        </fieldset>
      )}
      {liberar.isSuccess ? (
        <p role="status" className="text-sm text-foreground">
          Feito: {liberar.data.detalhe}.
        </p>
      ) : null}
      {liberar.isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mensagemDaAcaoQueFalhou(liberar.error)}
        </p>
      ) : null}
    </div>
  );
}
