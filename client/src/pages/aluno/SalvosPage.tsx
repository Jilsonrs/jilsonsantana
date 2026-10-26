import { Link } from "react-router";
import { FileText, PlayCircle } from "lucide-react";
import { LessonKind } from "@jilson/core";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/PageLayout";
import { CourseCard } from "@/components/content/CourseCard";
import { BotaoSalvar } from "@/components/content/BotaoSalvar";
import { useT } from "@/lib/language";
import { useSalvos } from "@/lib/salvos";

/**
 * SALVOS — o que o aluno guardou para assistir depois, cursos e aulas juntos
 * (decisão do operador, 03/10/2026, "como no LinkedIn"; um item de Meus estudos,
 * depois de Minhas trilhas). Os cursos levam à primeira aula; as aulas, à página
 * delas. Cada item tira dos salvos pelo mesmo botão da aula e do curso. Só o que
 * continua publicado aparece (o servidor filtra).
 */
export function SalvosPage() {
  const t = useT();
  const { data, isLoading, isError } = useSalvos(true);
  const vazio = data !== undefined && data.cursos.length === 0 && data.aulas.length === 0;

  return (
    <PageContainer>
      <PageHeader title={t.nav.salvos} />
      {isLoading && <p className="text-muted-foreground">{t.comum.carregando}</p>}
      {isError && (
        <p role="alert" className="text-sm text-destructive">
          {t.salvos.erro}
        </p>
      )}
      {vazio && (
        <div className="max-w-xl rounded-2xl border border-border/60 bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">{t.salvos.vazio}</p>
        </div>
      )}

      {data && data.cursos.length > 0 && (
        <PageSection title={t.catalogo.cursos}>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.cursos.map((curso) => (
              <li key={curso.id} className="relative">
                <CourseCard {...curso} destino={`/aluno/curso/${curso.slug}`} />
                <div className="absolute right-3 top-3 rounded-full border border-border/40 bg-background/85 backdrop-blur-sm shadow-sm">
                  <BotaoSalvar tipo="cursos" id={curso.id} salvo nome={`${t.aula.salvarCurso}: ${curso.title}`} />
                </div>
              </li>
            ))}
          </ul>
        </PageSection>
      )}

      {data && data.aulas.length > 0 && (
        <PageSection title={t.catalogo.aulas}>
          <ul className="max-w-3xl space-y-3">
            {data.aulas.map((aula) => {
              const Icone = aula.kind === LessonKind.TEXT ? FileText : PlayCircle;
              return (
                <li key={aula.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-colors hover:bg-muted/40">
                  <Link to={`/aluno/aula/${aula.id}`} className="flex min-w-0 flex-1 items-center gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground" aria-hidden="true">
                      <Icone className="size-5" />
                    </div>
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground">{aula.title}</span>
                      <span className="block text-sm text-muted-foreground">{aula.curso.title}</span>
                    </span>
                  </Link>
                  <BotaoSalvar tipo="aulas" id={aula.id} salvo nome={`${t.aula.salvarParaDepois}: ${aula.title}`} />
                </li>
              );
            })}
          </ul>
        </PageSection>
      )}
    </PageContainer>
  );
}
