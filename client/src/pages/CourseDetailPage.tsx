import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CourseHighlights, CourseLayers } from "@/components/content/CoursePremiumFeatures";
import { BunnyPlayer } from "@/components/content/BunnyPlayer";
import { PageContainer } from "@/components/layout/PageLayout";
import { useT } from "@/lib/language";
import { contagem } from "@/lib/contagem";
import { horasEMinutos } from "@/lib/duracao-do-curso";
import { CourseIncludes } from "@/components/content/CourseIncludes";

// O TEXTO DA TELA segue o idioma do app; o CONTEÚDO do curso (título, descrição,
// aulas, FAQ) sai como o operador escreveu, no idioma do próprio curso. O link
// direto não filtra por idioma: abre em qualquer um (decisão do operador, 24/09).
export function CourseDetailPage() {
  const t = useT();
  const { slug } = useParams<{ slug: string }>();
  const { data: course, isLoading, isError } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => api.getCourseBySlug(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-muted-foreground mt-8">{t.comum.carregando}</p>
      </PageContainer>
    );
  }

  if (isError || !course) {
    return (
      <PageContainer>
        <p className="mt-8 text-sm text-destructive">{t.curso.naoEncontrado}</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-12">
        <header className="space-y-4 border-b border-border/40 pb-8">
          {course.level && (
            <Badge variant="secondary" className="rounded-full px-3.5 py-1 text-sm sm:text-[0.925rem] font-semibold text-foreground bg-muted/80">
              {t.niveis[course.level]}
            </Badge>
          )}
          <h1 className="text-4xl font-bold tracking-tight text-foreground">{course.title}</h1>
          {course.subtitle && <p className="text-xl text-muted-foreground max-w-[80ch]">{course.subtitle}</p>}
          <p className="text-sm font-medium text-muted-foreground pt-2">
            {contagem(course.moduleCount, t.curso.modulo, t.curso.modulos)} ·{" "}
              {contagem(course.lessonCount, t.curso.aula, t.curso.aulas)} ·{" "}
              {/* A duração dos vídeos publicados (operador, 30/09/2026). */}
              {horasEMinutos(course.videoSeconds)}
          </p>
        </header>

        <div className="grid gap-12 md:grid-cols-[1fr_300px]">
          <div className="space-y-12">
            {/* O vídeo de apresentação toca para QUALQUER visitante: é ativo de venda,
                a única exceção ao portão de vídeo (CLAUDE.md → Access Architecture). */}
            {course.introVideoEmbedUrl && (
              <BunnyPlayer src={course.introVideoEmbedUrl} title={t.curso.videoApresentacao} />
            )}
            <CourseHighlights destaques={course.highlights ?? []} />
            <CourseLayers camadas={course.camadas} />

            <section>
              <h2 className="text-2xl font-semibold">{t.curso.conteudo}</h2>
              <Accordion type="multiple" className="mt-6">
                {course.modules.map((mod) => (
                  <AccordionItem key={mod.id} value={String(mod.id)}>
                    <AccordionTrigger className="text-lg font-medium">{mod.title}</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-3 pt-2">
                        {mod.lessons.map((lesson) => (
                          <li key={lesson.id} className="text-base text-muted-foreground flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/40"></span>
                            {/* Cada aula abre a página da aula (etapa 4 do Bloco U, 29/09/2026). */}
                            <Link to={`/aluno/aula/${lesson.id}`} className="hover:text-foreground hover:underline">
                              {lesson.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            {course.faq && course.faq.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold">{t.curso.faq}</h2>
                <Accordion type="multiple" className="mt-6">
                  {course.faq.map((item, i) => (
                    <AccordionItem key={i} value={String(i)}>
                      <AccordionTrigger className="text-lg font-medium text-left">{item.pergunta}</AccordionTrigger>
                      <AccordionContent className="text-base text-muted-foreground leading-relaxed">{item.resposta}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}
          </div>

          <aside className="space-y-10">
            <CourseIncludes materiais={course.materiais ?? []} inclui={course.inclui} />
            {course.learnTags.length > 0 && (
              <section className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold">{t.curso.aprender}</h2>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {course.learnTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="relative overflow-hidden rounded-[10px] border border-black/[0.08] bg-white px-4 py-2 font-medium text-[0.95rem] text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 cursor-default hover:-translate-y-[1px] hover:bg-gradient-to-br hover:from-white hover:to-[#F0F7FF] hover:shadow-[0_6px_20px_-4px_rgba(35,143,232,0.22)] before:pointer-events-none before:absolute before:top-0 before:right-0 before:bottom-0 before:left-0 before:-translate-x-full before:bg-[linear-gradient(110deg,transparent_20%,rgba(35,143,232,0.09)_50%,transparent_80%)] before:transition-transform before:duration-500 hover:before:translate-x-full"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {course.requirements.length > 0 && (
              <section className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold">{t.curso.requisitos}</h2>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {course.requirements.map((req) => (
                    <li key={req} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {course.personas.length > 0 && (
              <section className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold">{t.curso.paraQuem}</h2>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {course.personas.map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}
