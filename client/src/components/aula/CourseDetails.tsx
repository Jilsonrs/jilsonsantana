import { lazy, Suspense } from "react";
import type { PaginaDaAula } from "@/lib/api";
import { useT } from "@/lib/language";
import { contagem } from "@/lib/contagem";
import { horasEMinutos } from "@/lib/duracao-do-curso";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CourseHighlights, CourseLayers } from "@/components/content/CoursePremiumFeatures";

// A peça do Markdown só baixa quando a descrição aparece (CLAUDE.md → Client).
const MarkdownText = lazy(() => import("@/components/content/MarkdownText").then((m) => ({ default: m.MarkdownText })));

import { ClipboardList, Users } from "lucide-react";

function Lista({ titulo, itens, icon: Icon }: { titulo: string; itens: string[]; icon: React.ElementType }) {
  if (itens.length === 0) return null;
  return (
    <section className="flex flex-col pt-8 lg:px-4">
      <div>
        <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 text-primary ring-1 ring-primary/10">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="font-display text-[1.4rem] font-bold tracking-tight text-foreground mb-6">{titulo}</h3>
        <ul className="space-y-4">
          {itens.map((item) => (
            <li key={item} className="flex items-start gap-3 text-[0.95rem] leading-relaxed text-muted-foreground">
              <span className="mt-2 flex size-1.5 shrink-0 rounded-full bg-primary/40" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * "SOBRE O CURSO", embaixo do player em TODA aula — como a aba Visão geral do
 * LinkedIn Learning (decisão do operador, 29/09/2026). Não é página de venda: é
 * para o aluno saber se o curso é para ele. O conteúdo em acordeão não entra (já
 * está no nível 2), e o vídeo de apresentação fica só na página pública. Um bloco
 * vazio não aparece.
 */
export function CourseDetails({ curso }: { curso: PaginaDaAula["curso"] }) {
  const t = useT();
  const destaques = curso.highlights ?? [];
  const perguntas = curso.faq ?? [];

  const moduleCount = curso.modulos?.length ?? 0;
  const lessonCount = curso.modulos?.reduce((acc, m) => acc + m.aulas.length, 0) ?? 0;

  return (
    <section aria-labelledby="sobre-o-curso" className="space-y-10 border-t border-border/40 pt-10">
      {/* 1. O que você vai aprender */}
      {curso.learnTags.length > 0 && (
        <section className="space-y-5">
          <h3 className="font-display text-[1.4rem] font-bold tracking-tight text-foreground">{t.curso.aprender}</h3>
          <div className="flex flex-wrap gap-2">
            {curso.learnTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-md px-3 py-1 font-normal text-sm bg-muted/50 hover:bg-muted">
                {tag}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* 2. Diferenciais (sem título) */}
      <CourseHighlights destaques={destaques} />

      {/* 3. Título "Sobre o curso" e Descrição */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="sobre-o-curso" className="font-display text-[1.4rem] font-bold tracking-tight text-foreground">
            {t.aula.sobreOCurso}
          </h2>
          <div className="flex items-center gap-3 pt-1">
            {curso.level && <Badge variant="secondary" className="rounded-full font-medium">{t.niveis[curso.level]}</Badge>}
            {(moduleCount > 0 || lessonCount > 0) && (
              <span className="font-mono text-xs font-medium tracking-wide text-muted-foreground">
                {contagem(moduleCount, t.curso.modulo, t.curso.modulos)} · {contagem(lessonCount, t.curso.aula, t.curso.aulas)} · {horasEMinutos(curso.videoSeconds)}
              </span>
            )}
          </div>
        </div>

        {curso.description && (
          <Suspense fallback={null}>
            <MarkdownText texto={curso.description} className="max-w-3xl text-base leading-relaxed" />
          </Suspense>
        )}
      </div>

      {/* 4 e 5. DNA (Camadas), Requisitos, e Pra quem é - em 4 colunas (DNA ocupa 2) */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <CourseLayers camadas={curso.camadas} />
        </div>
        <Lista titulo={t.curso.paraQuem} itens={curso.personas} icon={Users} />
        <Lista titulo={t.curso.requisitos} itens={curso.requirements} icon={ClipboardList} />
      </div>

      {perguntas.length > 0 && (
        <section className="space-y-6">
          <h3 className="font-display text-[1.4rem] font-bold tracking-tight text-foreground">{t.curso.faq}</h3>
          <Accordion type="multiple" className="rounded-xl border border-border/40 bg-card px-4">
            {perguntas.map((item, i) => (
              <AccordionItem key={i} value={String(i)} className="border-border/40 last:border-0">
                <AccordionTrigger className="text-left font-medium hover:no-underline hover:text-primary transition-colors">{item.pergunta}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{item.resposta}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}
    </section>
  );
}
