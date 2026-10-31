import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AssinaturaDaLista } from "@jilson/core";
import * as api from "@/lib/api";
import { dinheiro } from "@/lib/cobranca-ficha";
import { mensagemDaAcaoQueFalhou } from "@/lib/cobranca-acoes";
import { Button } from "@/components/ui/button";

/**
 * CANCELAR E DEVOLVER O DINHEIRO (etapa 4.7b, passo 4a — decisão do operador P114: "um clique"). Primeiro a prévia, do
 * servidor: quanto volta e de quantos pagamentos. A confirmação diz o efeito, e o valor MOSTRADO vai junto — se o de agora
 * for outro, o servidor não faz nada. A assinatura que nunca foi paga (aguardando) não tem a ação.
 */
export function DevolverTudo({ assinatura, quem }: { assinatura: AssinaturaDaLista; quem: string }) {
  const queryClient = useQueryClient();
  const previa = useMutation({ mutationFn: () => api.adminPreviaDeDevolverTudo(assinatura.id) });
  const devolver = useMutation({
    mutationFn: (centavos: number) => api.adminDevolverTudo(assinatura.id, centavos),
    onSuccess: () => {
      previa.reset();
      return queryClient.invalidateQueries({ queryKey: ["admin", "cobranca", "ficha"] });
    },
  });
  if (assinatura.situacao === "aguardando") return null;
  const valor = previa.data;
  const voltar = () => {
    previa.reset();
    devolver.reset();
  };
  const erro = previa.error ?? devolver.error;
  return (
    <div className="mt-3 space-y-2">
      {!valor ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={previa.isPending}
          onClick={() => {
            devolver.reset();
            previa.mutate();
          }}
        >
          {previa.isPending ? "Conferindo…" : "Cancelar e devolver o dinheiro"}
        </Button>
      ) : valor.centavos > 0 ? (
        <div role="group" aria-label="Confirmar a devolução" className="space-y-2 rounded-xl border border-border/60 p-3">
          <p className="text-sm text-foreground">
            Devolve {dinheiro(valor.centavos, valor.moeda ?? "brl")} ({valor.pagamentos === 1 ? "1 pagamento" : `${valor.pagamentos} pagamentos`}), a assinatura acaba agora e {quem} perde o acesso às aulas.
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={devolver.isPending} onClick={() => devolver.mutate(valor.centavos)}>
              {devolver.isPending ? "Devolvendo…" : "Confirmar"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={voltar}>
              Voltar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p role="status" className="text-sm text-muted-foreground">
            Nada a devolver nesta assinatura: o que foi pago já voltou, ou ela não cobrou nada.
          </p>
          <Button type="button" size="sm" variant="ghost" onClick={voltar}>
            Fechar
          </Button>
        </div>
      )}
      {devolver.isSuccess ? (
        <p role="status" className="text-sm text-foreground">
          Feito: {devolver.data.detalhe}.
        </p>
      ) : null}
      {erro ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mensagemDaAcaoQueFalhou(erro)}
        </p>
      ) : null}
    </div>
  );
}
