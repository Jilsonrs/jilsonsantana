import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ConfigDaLista, ItemDaLista, ValoresDoItem } from "@/lib/home-lists";
import { ROTULO_STATUS } from "@/lib/home-lists";
import { HomeListItemForm } from "@/components/admin/HomeListItemForm";
import { Button } from "@/components/ui/button";

// UM item da lista: lê, edita no lugar, ou exclui.
//
// Excluir pede CONFIRMAÇÃO no próprio item, em dois cliques: ele apaga a linha
// de vez (LGPD — o nome não pode ficar guardado), e não há "desfazer". Um
// clique só num botão ao lado de "Editar" é como se apaga a coisa errada.

export function HomeListItem<T extends ItemDaLista>({ item, config }: { item: T; config: ConfigDaLista<T> }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const recarregar = () => queryClient.invalidateQueries({ queryKey: [config.queryKey] });

  const salvar = useMutation({
    mutationFn: (valores: ValoresDoItem) => config.atualizar(item.id, valores),
    onSuccess: async () => {
      await recarregar();
      setEditando(false);
    },
  });
  const excluir = useMutation({
    mutationFn: () => config.excluir(item.id),
    onSuccess: recarregar,
  });

  const { principal, secundario } = config.ler(item);

  if (editando) {
    return (
      <HomeListItemForm
        idBase={`item-${item.id}`}
        principal={config.principal}
        secundario={config.secundario}
        comOrdem={config.comOrdem}
        inicial={{ principal, secundario, displayOrder: item.displayOrder, status: item.status }}
        salvando={salvar.isPending}
        erro={salvar.isError}
        onSalvar={(valores) => salvar.mutate(valores)}
        onCancelar={() => setEditando(false)}
      />
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="rounded-full border px-2 py-0.5 font-medium">{ROTULO_STATUS[item.status]}</span>
        {config.comOrdem && <span>Ordem {item.displayOrder}</span>}
      </div>
      <p className="whitespace-pre-line">{principal}</p>
      <p className="whitespace-pre-line text-sm text-muted-foreground">{secundario}</p>

      {confirmando ? (
        <div className="space-y-2 rounded-md border border-destructive/40 p-3">
          <p className="text-sm">Apagar de vez? Não dá para desfazer.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={excluir.isPending} onClick={() => excluir.mutate()}>
              Excluir de vez
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
            Editar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmando(true)}>
            Excluir
          </Button>
        </div>
      )}

      {excluir.isError && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível excluir. Tente de novo.
        </p>
      )}
    </div>
  );
}
