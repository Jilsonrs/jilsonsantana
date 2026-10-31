import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import type { QuemDaFicha } from "@/lib/cobranca-ficha";
import { mensagemDaAcaoQueFalhou } from "@/lib/cobranca-acoes";
import { Button } from "@/components/ui/button";

/** CONFERIR NA STRIPE pela ficha (etapa 4.7b, passo 3a): a sincronia de sempre — e, pela ficha do visitante, a conta nasce se o pagamento passou. */
export function ConferirDaFicha({ quem }: { quem: QuemDaFicha }) {
  const queryClient = useQueryClient();
  const conferir = useMutation({
    mutationFn: () => api.adminConferir(quem),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "cobranca", "ficha"] }),
  });
  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" disabled={conferir.isPending} onClick={() => conferir.mutate()}>
        {conferir.isPending ? "Conferindo…" : "Conferir na Stripe"}
      </Button>
      {conferir.isSuccess ? (
        <p role="status" className="text-sm text-foreground">
          Conferido: {conferir.data.detalhe}.
        </p>
      ) : null}
      {conferir.isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mensagemDaAcaoQueFalhou(conferir.error)}
        </p>
      ) : null}
    </div>
  );
}
