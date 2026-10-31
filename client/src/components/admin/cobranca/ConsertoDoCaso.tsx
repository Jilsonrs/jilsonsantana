import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ConsertoDoCaso as Conserto } from "@jilson/core";
import * as api from "@/lib/api";
import { mensagemDaAcaoQueFalhou } from "@/lib/cobranca-acoes";
import { Button } from "@/components/ui/button";
import { ResponderComProvas } from "@/components/admin/cobranca/ResponderComProvas";

const DO_CONSERTO: Record<Conserto, { rotulo: string; efeito: string }> = {
  "anular-cobranca": { rotulo: "Anular a cobrança em aberto", efeito: "A cobrança em aberto é anulada: ela não será mais tentada." },
  "soltar-agendamento": { rotulo: "Soltar o agendamento", efeito: "A troca de plano que ficou pela metade é desfeita; a assinatura segue como está." },
  "encerrar-na-hora": { rotulo: "Encerrar agora, sem devolver", efeito: "A assinatura termina agora e a pessoa perde o acesso. Nada é devolvido." },
  "devolver-de-novo": { rotulo: "Devolver de novo", efeito: "Tenta devolver de novo o valor que não voltou. Se falhar outra vez, o caso continua aberto." },
  "aceitar-pix": { rotulo: "Aceitar este Pix", efeito: "O Pix que a pessoa pagou vira a assinatura pré-paga, no preço de hoje do plano: as aulas abrem agora." },
  "devolver-pix": { rotulo: "Devolver o Pix", efeito: "O Pix volta inteiro para a pessoa, e ela pode pagar de novo pela tela." },
  "devolver-este-pagamento": { rotulo: "Devolver este pagamento", efeito: "O dinheiro que entrou volta inteiro para a pessoa." },
  "aceitar-contestacao": { rotulo: "Aceitar a perda", efeito: "A escola não manda provas: o banco encerra a contestação como perdida, e o dinheiro fica com a pessoa. Não tem volta." },
  "liberar-de-novo": { rotulo: "Liberar de novo", efeito: "Só se a escola ganhou a contestação (e as outras desta assinatura): o período que a pessoa pagou volta a valer até o fim. A assinatura continua cancelada." },
  // A prévia e o envio têm tela própria (`ResponderComProvas`); o rótulo fica aqui com os outros.
  "enviar-provas": { rotulo: "Responder com provas", efeito: "As provas vão ao banco." },
};

/** O conserto de um caso (etapa 4.7b, passo 3b): o botão, a confirmação dizendo o efeito, e o que a Stripe respondeu. */
export function ConsertoDoCaso({ casoId, conserto }: { casoId: number; conserto: Conserto }) {
  if (conserto === "enviar-provas") return <ResponderComProvas casoId={casoId} />;
  return <ConsertoComConfirmacao casoId={casoId} conserto={conserto} />;
}

function ConsertoComConfirmacao({ casoId, conserto }: { casoId: number; conserto: Conserto }) {
  const [confirmando, setConfirmando] = useState(false);
  const queryClient = useQueryClient();
  const fazer = useMutation({
    mutationFn: () => api.adminResolverCaso(casoId, conserto),
    onSuccess: () => {
      setConfirmando(false);
      return queryClient.invalidateQueries({ queryKey: ["admin", "cobranca", "casos"] });
    },
  });
  const { rotulo, efeito } = DO_CONSERTO[conserto];
  return (
    <div className="space-y-2">
      {confirmando ? (
        <div role="group" aria-label="Confirmar" className="space-y-2 rounded-xl border border-border/60 p-3">
          <p className="text-sm text-foreground">{efeito}</p>
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
          {rotulo}
        </Button>
      )}
      {fazer.isSuccess ? <p role="status" className="text-sm text-foreground">Feito: {fazer.data.detalhe}.</p> : null}
      {fazer.isError ? <p role="alert" className="text-sm font-medium text-destructive">{mensagemDaAcaoQueFalhou(fazer.error)}</p> : null}
    </div>
  );
}
