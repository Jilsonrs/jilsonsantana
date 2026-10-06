import { Link } from "react-router-dom";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { useIdioma, useT } from "@/lib/language";
import { haQuantoTempo, previaDoTexto, tituloDaNotificacao, useMarcarLida, useNotificacoes } from "@/lib/notificacoes";

/**
 * AS NOTIFICAÇÕES — a lista (decisão do operador, 06/10/2026, a partir da Udemy):
 * em Meus estudos, embaixo de Salvos; o sino é só mais um atalho. Cada uma mostra
 * o título, as 2 primeiras linhas e a data; clicar abre a mensagem completa
 * (`NotificacaoPage`), que tem o caminho de volta para cá.
 */
export function NotificacoesPage() {
  const t = useT();
  const idioma = useIdioma();
  const { data, isLoading, isError } = useNotificacoes();
  const { mutate: marcar } = useMarcarLida();

  return (
    <PageContainer>
      <PageHeader
        title={t.notificacoes.titulo}
        actions={
          data && data.naoLidas > 0 ? (
            <button type="button" onClick={() => marcar(undefined)} className="text-sm font-medium text-primary hover:underline">
              {t.notificacoes.marcarTodas}
            </button>
          ) : null
        }
      />
      {isLoading && <p className="text-muted-foreground">{t.comum.carregando}</p>}
      {isError && (
        <p role="alert" className="text-sm text-destructive">
          {t.notificacoes.erro}
        </p>
      )}
      {data && data.itens.length === 0 && <p className="text-muted-foreground">{t.notificacoes.vazio}</p>}

      {data && data.itens.length > 0 && (
        <ul className="max-w-3xl divide-y divide-border rounded-2xl border border-border/60 bg-card">
          {data.itens.map((n) => (
            <li key={n.id}>
              <Link to={`/aluno/notificacoes/${n.id}`} className="flex gap-3 px-5 py-4 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.lida ? "bg-transparent" : "bg-primary"}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">
                    {tituloDaNotificacao(n, t)}
                    {!n.lida && <span className="sr-only"> ({t.notificacoes.naoLida})</span>}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{previaDoTexto(n.texto)}</span>
                  <time dateTime={n.criadaEm} className="mt-1 block text-xs text-muted-foreground">
                    {haQuantoTempo(n.criadaEm, idioma)}
                  </time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
