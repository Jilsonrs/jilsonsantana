import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import type { Level, Layer } from "@jilson/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/language";
import { contagem } from "@/lib/contagem";
import { horasEMinutos } from "@/lib/duracao-do-curso";

// Only the fields actually rendered — shared by the full catalog card (which
// has moduleCount/lessonCount) and search results (which don't), so callers
// never need to fake fields just to satisfy the type.
export type CourseCardProps = {
  slug: string;
  title: string;
  subtitle: string | null;
  level: Level | null;
  thumbnailUrl: string | null;
  camadas?: Layer[];
  moduleCount?: number;
  lessonCount?: number;
  /** A duração dos vídeos publicados, em segundos: "· 1h 05min" (operador, 30/09/2026). */
  videoSeconds?: number;
  /**
   * Para onde o cartão leva. Sem ele, a página PÚBLICA do curso (a de venda). O
   * catálogo passa `/aluno/curso/<slug>` para quem está logado (operador, 29/09/2026).
   */
  destino?: string;
  /**
   * A porcentagem do aluno neste curso, só quando ele já COMEÇOU (pedido do
   * operador de 30/09/2026, a partir da Mosh). Sem ela, o cartão não tem barra.
   */
  progresso?: number;
};

export function CourseCard(course: CourseCardProps) {
  const t = useT();
  return (
    <Link to={course.destino ?? `/curso/${course.slug}`} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl">
      <Card className="group flex h-full flex-col overflow-hidden border border-border/50 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md">
        <div className="p-6 pb-0 flex-none">
          <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-surface-alt">
            {course.thumbnailUrl ? (
              <img
                src={course.thumbnailUrl}
                alt={`Capa de ${course.title}`}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center border border-dashed border-border/50 bg-surface-alt/50">
                <BookOpen className="mb-2 h-6 w-6 text-muted-foreground/40" />
                <span className="font-mono text-[10px] tracking-widest text-muted-foreground/60 uppercase">Sem imagem</span>
              </div>
            )}
          </div>
        </div>
        <CardHeader className="flex-none p-6 pb-4 pt-5">
          <CardTitle className="font-display text-[1.15rem] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {course.title}
          </CardTitle>
          {course.subtitle && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
              {course.subtitle}
            </p>
          )}
        </CardHeader>
        <CardContent className="mt-auto flex flex-col gap-4 p-6 pt-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            {course.level && (
              <Badge variant="secondary" className="rounded-full px-3 py-0.5 font-medium text-xs">
                {t.niveis[course.level]}
              </Badge>
            )}
            {course.moduleCount !== undefined && course.lessonCount !== undefined && (
              <span className="font-mono text-xs font-medium tracking-wide text-muted-foreground">
                {contagem(course.moduleCount, t.curso.modulo, t.curso.modulos)} ·{" "}
                {contagem(course.lessonCount, t.curso.aula, t.curso.aulas)}
                {course.videoSeconds !== undefined && ` · ${horasEMinutos(course.videoSeconds)}`}
              </span>
            )}
          </div>
          {course.progresso !== undefined && (
            <div className="space-y-1.5">
              <div
                role="progressbar"
                aria-label={t.aula.progressoNoCurso}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={course.progresso}
                className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10"
              >
                <div className="h-full rounded-full bg-primary" style={{ width: `${course.progresso}%` }} />
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                {course.progresso}% {t.curso.concluido}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
