import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CasoDaLista } from "@jilson/core";
import * as api from "@/lib/api";
import { O_QUE_RESOLVE, TIPO_DO_CASO } from "@/lib/cobranca-casos";
import { dinheiro, enderecoDaFicha } from "@/lib/cobranca-ficha";
import { QUEM, quando } from "@/lib/cobranca-registro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Um caso de "Precisa de você": o que aconteceu, com quem, o que resolve — e, aberto, o "Fechar" com uma nota (passo 2c). */
export function CartaoDoCaso({ caso }: { caso: CasoDaLista }) {
  const [fechando, setFechando] = useState(false);
  const [nota, setNota] = useState("");
  const queryClient = useQueryClient();
  const fechar = useMutation({
    mutationFn: () => api.adminFecharCaso(caso.id, nota.trim()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "cobranca", "casos"] }),
  });
  const ficha = enderecoDaFicha(caso.ficha);
  const quem = caso.aluno ? (caso.aluno.nome ?? caso.aluno.email) : "Abrir a ficha";
  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-foreground">{TIPO_DO_CASO[caso.tipo]}</p>
        {caso.urgente && caso.aberto ? <Badge variant="destructive">Urgente</Badge> : null}
      </div>
      <p className="text-sm text-muted-foreground">
        Abriu em {quando(caso.abertoEm)}
        {caso.centavos !== null ? ` · ${dinheiro(caso.centavos, "brl")}` : ""}
      </p>
      {caso.detalhe ? <p className="text-foreground">{caso.detalhe}</p> : null}
      {ficha ? (
        <Link to={ficha} className="text-sm text-primary underline-offset-4 hover:underline">
          {quem}
        </Link>
      ) : null}
      {caso.aberto ? (
        <>
          <p className="text-sm text-muted-foreground">O que resolve: {O_QUE_RESOLVE[caso.tipo]}</p>
          {fechando ? (
            <form
              className="max-w-xl space-y-2"
              onSubmit={(evento) => {
                evento.preventDefault();
                fechar.mutate();
              }}
            >
              <Label htmlFor={`nota-do-caso-${caso.id}`}>O que foi feito (opcional)</Label>
              <Textarea id={`nota-do-caso-${caso.id}`} value={nota} maxLength={500} onChange={(evento) => setNota(evento.target.value)} />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={fechar.isPending}>
                  {fechar.isPending ? "Fechando…" : "Fechar o caso"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setFechando(false)}>
                  Voltar
                </Button>
              </div>
              {fechar.isError ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  Não foi possível fechar o caso. Tente de novo.
                </p>
              ) : null}
            </form>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => setFechando(true)}>
              Fechar
            </Button>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Fechado em {caso.fechadoEm ? quando(caso.fechadoEm) : "—"}
          {caso.fechadoPor ? ` · por ${QUEM[caso.fechadoPor]}` : ""}
          {caso.nota ? ` · ${caso.nota}` : ""}
        </p>
      )}
    </li>
  );
}
