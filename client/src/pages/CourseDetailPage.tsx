import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LayerSelo } from "@/components/content/LayerSelo";
import { HighlightCard } from "@/components/content/HighlightCard";

export function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: course, isLoading, isError } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => api.getCourseBySlug(slug!),
    enabled: !!slug,
  });

  if (isLoading) return <p className="mx-auto max-w-3xl px-6 py-16 text-muted-foreground">Carregando…</p>;
  if (isError || !course) {
    return <p className="mx-auto max-w-3xl px-6 py-16 text-muted-foreground">Curso não encontrado.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-12 px-6 py-16">
      <header className="space-y-3">
        {course.level && <Badge variant="secondary">{course.level}</Badge>}
        <h1 className="text-3xl font-semibold tracking-tight">{course.title}</h1>
        {course.subtitle && <p className="text-lg text-muted-foreground">{course.subtitle}</p>}
        <p className="text-sm text-muted-foreground">
          {course.moduleCount} módulos · {course.lessonCount} aulas
        </p>
      </header>

      <LayerSelo camadas={course.camadas} />

      {course.highlights && course.highlights.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {course.highlights.map((h, i) => (
            <HighlightCard key={i} {...h} />
          ))}
        </div>
      )}

      {course.learnTags.length > 0 && (
        <section>
          <h2 className="text-lg font-medium">O que você vai aprender</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {course.learnTags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {course.requirements.length > 0 && (
        <section>
          <h2 className="text-lg font-medium">Pré-requisitos</h2>
          <ul className="mt-3 list-inside list-disc text-sm text-muted-foreground">
            {course.requirements.map((req) => (
              <li key={req}>{req}</li>
            ))}
          </ul>
        </section>
      )}

      {course.personas.length > 0 && (
        <section>
          <h2 className="text-lg font-medium">Pra quem é</h2>
          <ul className="mt-3 list-inside list-disc text-sm text-muted-foreground">
            {course.personas.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-medium">Conteúdo do curso</h2>
        <Accordion type="multiple" className="mt-3">
          {course.modules.map((mod) => (
            <AccordionItem key={mod.id} value={String(mod.id)}>
              <AccordionTrigger>{mod.title}</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2">
                  {mod.lessons.map((lesson) => (
                    <li key={lesson.id} className="text-sm text-muted-foreground">
                      {lesson.title}
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
          <h2 className="text-lg font-medium">Perguntas frequentes</h2>
          <Accordion type="multiple" className="mt-3">
            {course.faq.map((item, i) => (
              <AccordionItem key={i} value={String(i)}>
                <AccordionTrigger>{item.pergunta}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.resposta}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}
    </div>
  );
}
