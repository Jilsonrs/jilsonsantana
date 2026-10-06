import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { useIdioma, useT } from "@/lib/language";
import { haQuantoTempo, tituloDaNotificacao, useMarcarLida, useNotificacoes } from "@/lib/notificacoes";

// A peça que desenha o Markdown só baixa nesta tela (CLAUDE.md → Client: direta,
// ela entraria no pacote que todo aluno baixa). Lista padrão: negrito, itálico e
// listas, sem link (revisão de segurança, 04/10/2026).
const MarkdownText = lazy(() => import("@/components/content/MarkdownText").then((m) => ({ default: m.MarkdownText })));

/**
 * UMA NOTIFICAÇÃO, completa (decisão do operador, 06/10/2026, a partir da Udemy):
 * o título, a data, o texto inteiro com os parágrafos, o link do curso, e o
 * caminho de volta para a lista. Chega-se pela lista ou pelo sino. ABRIR é o que a
 * marca como lida.
 */
export function NotificacaoPage() {
  const t = useT();
  const idioma = useIdioma();
  const { id } = useParams();
  const { data, isLoading, isError } = useNotificacoes();
  const { mutate: marcar } = useMarcarLida();
  const n = data?.itens.find((item) => String(item.id) === id);
  const aMarcar = n && !n.lida ? n.id : null;

  // Efeito: abrir a notificação é o que a marca como lida — uma escrita no servidor
  // disparada pela tela que abriu (como abrir a aula de texto a conclui).
  useEffect(() => {
    if (aMarcar !== null) marcar(aMarcar);
  }, [aMarcar, marcar]);

  const voltar = (
    <Link to="/aluno/notificacoes" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden="true" />
      {t.notificacoes.titulo}
    </Link>
  );

  if (isLoading) return <Aviso voltar={voltar} texto={t.comum.carregando} />;
  if (isError) return <Aviso voltar={voltar} texto={t.notificacoes.erro} alerta />;
  if (!n) return <Aviso voltar={voltar} texto={t.notificacoes.naoEncontrada} />;

  return (
    <PageContainer>
      <div className="mb-6">{voltar}</div>
      <PageHeader title={tituloDaNotificacao(n, t)} description={<time dateTime={n.criadaEm}>{haQuantoTempo(n.criadaEm, idioma)}</time>} />
      <article className="max-w-3xl">
        <Suspense fallback={<p className="whitespace-pre-line text-sm text-foreground">{n.texto}</p>}>
          <MarkdownText texto={n.texto} />
        </Suspense>
        {n.curso?.slug && (
          <Link to={`/aluno/curso/${n.curso.slug}`} className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
            {t.notificacoes.irParaOCurso}
          </Link>
        )}
      </article>
    </PageContainer>
  );
}

function Aviso({ voltar, texto, alerta = false }: { voltar: ReactNode; texto: string; alerta?: boolean }) {
  return (
    <PageContainer>
      <div className="mb-6">{voltar}</div>
      <p role={alerta ? "alert" : undefined} className={alerta ? "text-sm text-destructive" : "text-muted-foreground"}>
        {texto}
      </p>
    </PageContainer>
  );
}
