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
    <section className="space-y-3">
      <h3 className="font-semibold">{titulo}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
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
    <section aria-labelledby="sobre-o-curso" className="space-y-8 border-t border-border/60 pt-8">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="sobre-o-curso" className="text-xl font-semibold">
          {t.aula.sobreOCurso}
        </h2>
        {curso.level && <Badge variant="secondary">{t.niveis[curso.level]}</Badge>}
      </div>

      {curso.description && (
        <Suspense fallback={null}>
          <MarkdownText texto={curso.description} className="max-w-3xl text-base leading-relaxed" />
        </Suspense>
      )}

      {curso.learnTags.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold">{t.curso.aprender}</h3>
          <div className="flex flex-wrap gap-2">
            {curso.learnTags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-8 sm:grid-cols-2">
        <Lista titulo={t.curso.requisitos} itens={curso.requirements} />
        <Lista titulo={t.curso.paraQuem} itens={curso.personas} />
      </div>

      <LayerSelo camadas={curso.camadas} />

      {destaques.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-3">
          {destaques.map((h, i) => (
            <HighlightCard key={i} {...h} />
          ))}
        </div>
      )}

      {perguntas.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold">{t.curso.faq}</h3>
          <Accordion type="multiple">
            {perguntas.map((item, i) => (
              <AccordionItem key={i} value={String(i)}>
                <AccordionTrigger>{item.pergunta}</AccordionTrigger>
                <AccordionContent>{item.resposta}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}
    </section>
  );
}
