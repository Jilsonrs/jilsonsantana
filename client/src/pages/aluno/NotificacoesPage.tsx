import { lazy, Suspense, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/PageLayout";
import { useIdioma, useT } from "@/lib/language";
import { haQuantoTempo, tituloDaNotificacao, useMarcarLida, useNotificacoes } from "@/lib/notificacoes";

// A peça que desenha o Markdown só baixa nesta tela (CLAUDE.md → Client: direta,
// ela entraria no pacote que todo aluno baixa). Lista padrão: negrito, itálico e
// listas, sem link (revisão de segurança, 04/10/2026).
const MarkdownText = lazy(() => import("@/components/content/MarkdownText").then((m) => ({ default: m.MarkdownText })));

/**
 * "VER TODAS" — as notificações de quem está logado, com o texto inteiro e a data
 * (Bloco E, etapa 4 — decisões do operador, 04/10/2026). Chega-se pelo sino; a
 * notificação clicada lá vem no endereço (`#notificacao-<id>`) e a tela rola até ela.
 */
export function NotificacoesPage() {
  const t = useT();
  const idioma = useIdioma();
  const { hash } = useLocation();
  const { data, isLoading, isError } = useNotificacoes();
  const { mutate: marcar } = useMarcarLida();

  // Efeito: rolar até a notificação clicada no sino é mexer no DOM depois que a
  // lista chega — não é estado derivado.
  useEffect(() => {
    if (!data || !hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView?.({ block: "start" });
  }, [data, hash]);

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

      {data?.itens.map((n) => (
        <div key={n.id} id={`notificacao-${n.id}`} className="scroll-mt-24">
          <PageSection
            title={
              <>
                {!n.lida && <span className="mr-2 inline-block size-2 rounded-full bg-primary align-middle" aria-hidden="true" />}
                {tituloDaNotificacao(n, t)}
                {!n.lida && <span className="sr-only"> ({t.notificacoes.naoLida})</span>}
              </>
            }
            description={<time dateTime={n.criadaEm}>{haQuantoTempo(n.criadaEm, idioma)}</time>}
          >
            <Suspense fallback={<p className="whitespace-pre-line text-sm text-foreground">{n.texto}</p>}>
              <MarkdownText texto={n.texto} />
            </Suspense>
            {n.curso?.slug && (
              <Link to={`/aluno/curso/${n.curso.slug}`} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                {t.notificacoes.irParaOCurso}
              </Link>
            )}
          </PageSection>
        </div>
      ))}
    </PageContainer>
  );
}
