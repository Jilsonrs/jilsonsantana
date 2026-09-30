import { lazy, Suspense } from "react";
import type { PaginaDaAula } from "@/lib/api";
import { useT } from "@/lib/language";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LayerSelo } from "@/components/content/LayerSelo";
import { HighlightCard } from "@/components/content/HighlightCard";

// A peça do Markdown só baixa quando a descrição aparece (CLAUDE.md → Client).
const MarkdownText = lazy(() => import("@/components/content/MarkdownText").then((m) => ({ default: m.MarkdownText })));

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <section className="space-y-4">
      <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">{titulo}</h3>
      <ul className="list-disc space-y-2 pl-5 text-[0.95rem] leading-relaxed text-muted-foreground">
        {itens.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
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

  return (
    <section aria-labelledby="sobre-o-curso" className="space-y-10 border-t border-border/40 pt-10">
      <div className="flex flex-wrap items-center gap-4">
        <h2 id="sobre-o-curso" className="font-display text-[1.4rem] font-bold tracking-tight text-foreground">
          {t.aula.sobreOCurso}
        </h2>
        {curso.level && <Badge variant="secondary" className="rounded-full font-medium">{t.niveis[curso.level]}</Badge>}
      </div>

      {curso.description && (
        <Suspense fallback={null}>
          <MarkdownText texto={curso.description} className="max-w-3xl text-base leading-relaxed" />
        </Suspense>
      )}

      {curso.learnTags.length > 0 && (
        <section className="space-y-5">
          <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">{t.curso.aprender}</h3>
          <div className="flex flex-wrap gap-2">
            {curso.learnTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-md px-3 py-1 font-normal text-sm bg-muted/50 hover:bg-muted">
                {tag}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {destaques.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-3">
          {destaques.map((h, i) => (
            <HighlightCard key={i} {...h} />
          ))}
        </div>
      )}

      <div className="grid gap-8 sm:grid-cols-2">
        <Lista titulo={t.curso.requisitos} itens={curso.requirements} />
        <Lista titulo={t.curso.paraQuem} itens={curso.personas} />
      </div>

      <LayerSelo camadas={curso.camadas} />

      {perguntas.length > 0 && (
        <section className="space-y-6">
          <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">{t.curso.faq}</h3>
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
