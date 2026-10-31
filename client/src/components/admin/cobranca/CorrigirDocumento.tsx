import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { mensagemDaAcaoQueFalhou } from "@/lib/cobranca-acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** CORRIGIR O CPF OU CNPJ (etapa 4.7b, passo 3b): vale para as próximas faturas. O número é conferido no servidor. */
export function CorrigirDocumento({ quem }: { quem: { conta: string } | { visitante: string } }) {
  const [documento, setDocumento] = useState("");
  const queryClient = useQueryClient();
  const corrigir = useMutation({
    mutationFn: () => api.adminCorrigirDocumento(quem, documento.trim()),
    onSuccess: () => {
      setDocumento("");
      return queryClient.invalidateQueries({ queryKey: ["admin", "cobranca", "ficha"] });
    },
  });
  return (
    <form
      className="max-w-md space-y-2"
      onSubmit={(evento) => {
        evento.preventDefault();
        if (documento.trim()) corrigir.mutate();
      }}
    >
      <Label htmlFor="cpf-novo">Corrigir o CPF ou CNPJ</Label>
      <div className="flex gap-2">
        <Input id="cpf-novo" value={documento} maxLength={30} autoComplete="off" onChange={(evento) => setDocumento(evento.target.value)} />
        <Button type="submit" variant="outline" disabled={corrigir.isPending || !documento.trim()}>
          {corrigir.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
      {corrigir.isSuccess ? <p role="status" className="text-sm text-foreground">Feito: {corrigir.data.detalhe}.</p> : null}
      {corrigir.isError ? <p role="alert" className="text-sm font-medium text-destructive">{mensagemDaAcaoQueFalhou(corrigir.error)}</p> : null}
    </form>
  );
}
