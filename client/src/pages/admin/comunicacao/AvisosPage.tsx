import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { paraQuem, quandoFoiEnviado } from "@/lib/avisos";

export const AVISOS = "admin-avisos";
export const ROTA_DOS_AVISOS = "/admin/comunicacao/notificacoes";

/**
 * COMUNICAÇÃO → NOTIFICAÇÕES (bloco C1 — decisões do operador, 06/10/2026): os
 * avisos que o operador escreve, rascunhos e enviados, o mais novo primeiro. Cada um
 * diz para quem foi e quantos já leram; enviado, pode ser editado (todos veem o
 * texto novo) e apagado (some do sino de todos). Admin: texto em português.
 */
export function AvisosPage() {
  const queryClient = useQueryClient();
  const { data: avisos, isLoading, isError } = useQuery({ queryKey: [AVISOS], queryFn: api.adminGetAvisos });
  const apagar = useMutation({
    mutationFn: api.adminApagarAviso,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [AVISOS] }),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Notificações"
        actions={
          <Button asChild>
            <Link to={`${ROTA_DOS_AVISOS}/nova`}>Nova notificação</Link>
          </Button>
        }
      />

      {isLoading && <p className="mt-8 text-muted-foreground">Carregando…</p>}
      {isError && (
        <p role="alert" className="mt-8 text-sm font-medium text-destructive">
          Não foi possível carregar as notificações.
        </p>
      )}
      {apagar.isError && (
        <p role="alert" className="mt-8 text-sm font-medium text-destructive">
          Não foi possível apagar a notificação.
        </p>
      )}
      {avisos && avisos.length === 0 && (
        <p className="mt-8 text-muted-foreground">Nenhuma notificação ainda. Escreva a primeira em Nova notificação.</p>
      )}

      {avisos && avisos.length > 0 && (
        <ul className="mt-8 divide-y divide-border rounded-2xl border border-border/60 bg-card">
          {avisos.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <Link to={`${ROTA_DOS_AVISOS}/${a.id}`} className="font-medium text-foreground hover:underline">
                  {a.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {paraQuem(a)} · {quandoFoiEnviado(a)}
                  {a.sentAt && ` · ${a.lidas} de ${a.recebidas} leram`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={`${ROTA_DOS_AVISOS}/${a.id}`} aria-label={`Editar: ${a.title}`}>
                    Editar
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Apagar: ${a.title}`}
                  disabled={apagar.isPending}
                  onClick={() => {
                    const aviso = a.sentAt ? " Ela some do sino de todos que receberam." : "";
                    if (confirm(`Apagar a notificação "${a.title}"?${aviso}`)) apagar.mutate(a.id);
                  }}
                >
                  Apagar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
