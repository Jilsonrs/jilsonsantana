import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ContentStatus, LessonKind } from "@jilson/core";
import { useSession } from "@/lib/auth-client";
import { useT } from "@/lib/language";
import { cn } from "@/lib/utils";
import { usePaginaDaAula } from "@/lib/pagina-da-aula";
import { useMenuDoCursoFechado } from "@/lib/menu-do-curso";
import { porcentagemDoCurso, useConcluirAula } from "@/lib/progresso";
import { useIrPara } from "@/lib/versao";
import { useIdsSalvos } from "@/lib/salvos";
import { BotaoSalvar } from "@/components/content/BotaoSalvar";
import { PageContainer } from "@/components/layout/PageLayout";
import { CourseContentsNav } from "@/components/aula/CourseContentsNav";
import { LessonContent } from "@/components/aula/LessonContent";
import { CourseDetails } from "@/components/aula/CourseDetails";
import { BotaoDaIa, PainelDaIa } from "@/components/aula/AiDock";
import { List } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";

/** O servidor respondeu 404? (aula que não existe, ou fora da cadeia publicada). */
function naoEncontrada(erro: unknown): boolean {
  if (typeof erro !== "object" || erro === null || !("response" in erro)) return false;
  // Seguro: a linha acima provou que é um objeto com `response`; o resto é opcional.
  return (erro as { response?: { status?: number } }).response?.status === 404;
}

/**
 * A PÁGINA DA AULA (etapa 4 do Bloco U — decisões do operador, 28–29/09/2026, no
 * estilo do LinkedIn Learning): o conteúdo do curso no nível 2, o player grande,
 * e a IA num botão flutuante que abre um painel à direita e encolhe o player.
 * Visitante também entra: a prévia grátis toca sem login.
 */
export function LessonPage() {
  const { id } = useParams();
  const lessonId = /^\d+$/.test(id ?? "") ? Number(id) : null;
  const t = useT();
  const { data: session } = useSession();
  const { data, isError, error, comoAdmin, carregandoSessao } = usePaginaDaAula(lessonId);
  const [iaAberta, setIaAberta] = useState(false);
  const [menuDoCursoFechado, fecharMenuDoCurso] = useMenuDoCursoFechado();
  const { mutate: concluir } = useConcluirAula();
  // Com versão nova no servidor, a próxima aula abre carregando a página (06/10/2026).
  const irPara = useIrPara();
  const salvos = useIdsSalvos(Boolean(session));

  // A aula que esta pessoa pode concluir agora: logada, liberada e ainda não
  // concluída (Fase 5, 03/10/2026). O visitante da prévia grátis não tem progresso.
  const concluivel = data && session && data.aula.liberada && !data.concluidas.includes(data.aula.id) ? data.aula : null;
  const textoParaConcluir = concluivel?.kind === LessonKind.TEXT ? concluivel.id : null;

  // Efeito: ABRIR a aula de texto é o que a conclui (decisão do operador,
  // 03/10/2026) — uma escrita no servidor disparada pela tela que abriu.
  useEffect(() => {
    if (textoParaConcluir !== null) concluir({ lessonId: textoParaConcluir, comoAdmin });
  }, [textoParaConcluir, comoAdmin, concluir]);

  if (lessonId === null || (isError && naoEncontrada(error))) {
    return <Aviso texto={t.aula.naoEncontrada} />;
  }
  if (isError) return <Aviso texto={t.aula.erro} alerta />;
  if (carregandoSessao || !data) return <Aviso texto={t.aula.carregando} />;

  const { curso, aula } = data;
  const porcentagem = porcentagemDoCurso(curso, data.concluidas);
  const concluirVideo = concluivel?.kind === LessonKind.VIDEO ? () => concluir({ lessonId: concluivel.id, comoAdmin }) : undefined;
  const temArquivos = curso.modulos.some((m) => m.aulas.some((a) => a.id === aula.id && a.temArquivos));
  // A PRÓXIMA aula da lista que a pessoa vê (operador, 05/10/2026): o fim do vídeo
  // leva até ela, na hora, seja vídeo ou texto. Na última aula, o vídeo só termina.
  const lista = curso.modulos.flatMap((m) => m.aulas);
  const proxima = lista[lista.findIndex((a) => a.id === aula.id) + 1];
  const irParaAProxima = proxima ? () => irPara(`/aluno/aula/${proxima.id}`) : undefined;
  return (
    <div className="flex min-h-full flex-col">
      {/* Barra Superior Customizada da Aula (Avatar flutua por cima, à direita) */}
      <div className="relative flex min-h-[60px] md:min-h-[80px] items-center px-4 sm:px-6 md:px-[50px] border-b border-border/40 bg-card/50">
        <div className="flex items-center gap-5 max-w-[80%]">
          {/* Botão DESKTOP: reabre a barra lateral se estiver fechada */}
          {menuDoCursoFechado && (
            <button
              type="button"
              onClick={() => fecharMenuDoCurso(false)}
              className="hidden md:flex items-center gap-2 px-3 py-2 -ml-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-black/5 rounded-md transition-colors"
              aria-label={t.aula.conteudoDoCurso}
            >
              <List className="size-5" />
              <span>{t.aula.conteudoDoCurso}</span>
            </button>
          )}

          {/* Botão MOBILE: abre a gaveta por cima da tela */}
          <div className="md:hidden -ml-3">
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-black/5 rounded-md transition-colors"
                  aria-label={t.aula.conteudoDoCurso}
                >
                  <List className="size-5" />
                  <span>{t.aula.conteudoDoCurso}</span>
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0 flex flex-col bg-surface-alt">
                <SheetTitle className="sr-only">{t.aula.conteudoDoCurso}</SheetTitle>
                <div className="flex-1 overflow-y-auto p-4 py-8">
                  <CourseContentsNav lessonId={lessonId} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex flex-col justify-center py-3 gap-1">
            <h1 className="text-lg md:text-2xl font-display font-bold tracking-tight text-foreground truncate flex items-center gap-3">
              {aula.title}
              {aula.status !== ContentStatus.PUBLISHED && (
                <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                  {aula.status === ContentStatus.ARCHIVED ? t.aula.arquivado : t.aula.rascunho}
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm md:text-[0.95rem] text-muted-foreground truncate">
                {curso.title}
              </span>
              {/* Salvar o curso para depois (decisão do operador, 03/10/2026): só logado, só curso publicado. */}
              {session && curso.status === ContentStatus.PUBLISHED && (
                <BotaoSalvar tipo="cursos" id={curso.id} salvo={salvos.cursos.has(curso.id)} nome={t.aula.salvarCurso} texto={t.aula.salvarCurso} />
              )}
              {/* O quanto do curso já foi, como no cartão (operador, 06/10/2026): o
                  mesmo número da barra embaixo. Só para quem está logado. */}
              {session && (
                <span className="shrink-0 text-sm text-muted-foreground">
                  {porcentagem}% {t.curso.concluido}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* O progresso no curso (desenho do Antigravity; o número é real desde
            03/10/2026): aulas concluídas ÷ aulas da lista. Só para quem está logado. */}
        {session && (
          <div
            role="progressbar"
            aria-label={t.aula.progressoNoCurso}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={porcentagem}
            className="absolute bottom-0 left-4 right-4 sm:left-6 sm:right-6 md:left-[50px] md:right-[50px] h-[3px] bg-primary/10"
          >
            <div className="h-full bg-primary rounded-r-full transition-all duration-500" style={{ width: `${porcentagem}%` }} />
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-[20px] pb-6 sm:px-6 sm:pb-8 md:px-[50px] md:pb-8">
        <div className={cn("grid gap-6", iaAberta && "lg:grid-cols-[minmax(0,1fr)_360px]")}>
          <div className="min-w-0 space-y-8">
            <LessonContent aula={aula} comoAdmin={comoAdmin} temArquivos={temArquivos} aoConcluir={concluirVideo} aoTerminar={irParaAProxima} />

            {/* Em toda aula, liberada ou não (operador, 29/09/2026). */}
            <CourseDetails curso={curso} />
          {/* No desktop, o visitante não tem o shell, então o menu fica aqui no fim da página.
              No celular, todos agora usam a gaveta lá no topo. */}
          <div className="hidden md:block">
            {!session && <CourseContentsNav lessonId={lessonId} />}
          </div>
        </div>
        {iaAberta && (
          <div className="hidden lg:block relative">
            <div className="sticky top-8 h-[calc(100vh-64px)]">
              <PainelDaIa aoFechar={() => setIaAberta(false)} />
            </div>
          </div>
        )}
      </div>
      <BotaoDaIa aberto={iaAberta} aoAlternar={() => setIaAberta(!iaAberta)} />
      </div>
    </div>
  );
}

function Aviso({ texto, alerta = false }: { texto: string; alerta?: boolean }) {
  return (
    <PageContainer>
      <p role={alerta ? "alert" : undefined} className={cn("py-16 text-center", alerta ? "font-medium text-destructive" : "text-muted-foreground")}>
        {texto}
      </p>
    </PageContainer>
  );
}
