import { List } from "lucide-react";
import { ContentStatus } from "@jilson/core";
import { useT } from "@/lib/language";
import { useMenuDoCursoFechado } from "@/lib/menu-do-curso";
import { BotaoSalvar } from "@/components/content/BotaoSalvar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CourseContentsNav } from "./CourseContentsNav";

/**
 * O TOPO DA PÁGINA DA AULA (desenho do Antigravity; separado da `LessonPage` no Bloco
 * AULA, etapa 3, 07/10/2026, com as MESMAS classes): o título da aula, o curso, o
 * "Salvar curso", o "% concluído", a barra de progresso e os botões do conteúdo do
 * curso (reabrir a coluna no computador; a gaveta no celular). Fica na tela enquanto a
 * aula seguinte carrega: o título chega antes, pela lista do curso.
 */
export function LessonHeader({
  lessonId,
  titulo,
  status,
  curso,
  logado,
  cursoSalvo,
  porcentagem,
}: {
  lessonId: number;
  titulo: string;
  status: ContentStatus;
  curso: { id: number; title: string; status: ContentStatus };
  logado: boolean;
  cursoSalvo: boolean;
  porcentagem: number;
}) {
  const t = useT();
  const [menuDoCursoFechado, fecharMenuDoCurso] = useMenuDoCursoFechado();
  return (
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

        {/* Botão MOBILE: abre a gaveta por cima da tela. Uma gaveta por AULA (`key`):
            escolher uma aula nela — ou a passagem automática ao fim do vídeo — fecha a
            gaveta, em vez de deixá-la por cima da aula nova (Bloco AULA, 07/10/2026). */}
        <div className="md:hidden -ml-3">
          <Sheet key={lessonId}>
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
            {titulo}
            {status !== ContentStatus.PUBLISHED && (
              <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                {status === ContentStatus.ARCHIVED ? t.aula.arquivado : t.aula.rascunho}
              </span>
            )}
          </h1>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm md:text-[0.95rem] text-muted-foreground truncate">
              {curso.title}
            </span>
            {/* Salvar o curso para depois (decisão do operador, 03/10/2026): só logado, só curso publicado. */}
            {logado && curso.status === ContentStatus.PUBLISHED && (
              <BotaoSalvar tipo="cursos" id={curso.id} salvo={cursoSalvo} nome={t.aula.salvarCurso} texto={t.aula.salvarCurso} />
            )}
            {/* O quanto do curso já foi, como no cartão (operador, 06/10/2026): o
                mesmo número da barra embaixo. Só para quem está logado. */}
            {logado && (
              <span className="shrink-0 text-sm text-muted-foreground">
                {porcentagem}% {t.curso.concluido}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* O progresso no curso (desenho do Antigravity; o número é real desde
          03/10/2026): aulas concluídas ÷ aulas da lista. Só para quem está logado. */}
      {logado && (
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
  );
}
