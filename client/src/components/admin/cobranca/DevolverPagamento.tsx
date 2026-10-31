import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CobrancaDaFicha } from "@jilson/core";
import * as api from "@/lib/api";
import { dinheiro } from "@/lib/cobranca-ficha";
import { centavosDoTexto, faltaVoltar, textoDosCentavos } from "@/lib/cobranca-devolucao";
import { mensagemDaAcaoQueFalhou } from "@/lib/cobranca-acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * DEVOLVER UM PAGAMENTO (etapa 4.7b, passo 4a — decisão do operador P139): esta cobrança, inteira ou em parte — o valor
 * começa no que falta voltar, e não passa dele. Só devolver não mexe no acesso; com "E encerrar a assinatura agora"
 * (decisão do operador, 31/10/2026), a assinatura desta cobrança acaba antes. A confirmação diz o efeito.
 */
export function DevolverPagamento({ cobranca, quem }: { cobranca: CobrancaDaFicha; quem: { conta: string } | { visitante: string } }) {
  const falta = faltaVoltar(cobranca);
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [encerrar, setEncerrar] = useState(false);
  const queryClient = useQueryClient();
  const devolver = useMutation({
    // O que já voltou, como a tela mostrou: se o de agora for outro, o servidor não devolve (o pedido repetido não devolve duas vezes).
    mutationFn: (centavos: number) => api.adminDevolverPagamento(quem, cobranca.id, centavos, cobranca.devolvido, encerrar),
    onSuccess: () => {
      setAberto(false);
      setConfirmando(null);
      return queryClient.invalidateQueries({ queryKey: ["admin", "cobranca", "ficha"] });
    },
  });
  const centavos = centavosDoTexto(texto);
  const valido = centavos !== null && centavos <= falta;
  const campo = `devolver-${cobranca.id}`;

  return (
    <div className="mt-2 space-y-2 sm:text-left">
      {!aberto ? (
        falta > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              devolver.reset();
              setTexto(textoDosCentavos(falta));
              setEncerrar(false);
              setAberto(true);
            }}
          >
            Devolver
          </Button>
        ) : null
      ) : confirmando === null ? (
        <form
          className="space-y-2"
          onSubmit={(evento) => {
            evento.preventDefault();
            if (valido) setConfirmando(centavos);
          }}
        >
          <Label htmlFor={campo}>Quanto devolver (até {dinheiro(falta, cobranca.moeda)})</Label>
          <div className="flex flex-wrap gap-2">
            <Input id={campo} inputMode="decimal" value={texto} maxLength={20} autoComplete="off" onChange={(evento) => setTexto(evento.target.value)} />
            <Button type="submit" size="sm" disabled={!valido}>
              Devolver
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={encerrar} onChange={(evento) => setEncerrar(evento.target.checked)} className="h-4 w-4 rounded border-border/60 text-primary focus:ring-primary" />
            E encerrar a assinatura agora
          </label>
          {texto.trim() && !valido ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              Digite um valor em reais, como 99,90, até {dinheiro(falta, cobranca.moeda)}.
            </p>
          ) : null}
        </form>
      ) : (
        <div role="group" aria-label="Confirmar a devolução" className="space-y-2 rounded-xl border border-border/60 p-3">
          <p className="text-sm text-foreground">
            {encerrar
              ? `Encerra agora a assinatura desta cobrança e devolve ${dinheiro(confirmando, cobranca.moeda)}: a pessoa perde o acesso às aulas, e nada mais é cobrado.`
              : `Devolve ${dinheiro(confirmando, cobranca.moeda)} desta cobrança. A assinatura e o acesso continuam como estão.`}
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={devolver.isPending} onClick={() => devolver.mutate(confirmando)}>
              {devolver.isPending ? "Devolvendo…" : "Confirmar"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmando(null)}>
              Voltar
            </Button>
          </div>
        </div>
      )}
      {devolver.isSuccess ? (
        <p role="status" className="text-sm text-foreground">
          Feito: {devolver.data.detalhe}.
        </p>
      ) : null}
      {devolver.isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mensagemDaAcaoQueFalhou(devolver.error)}
        </p>
      ) : null}
    </div>
  );
}
