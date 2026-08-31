import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SaveTrilhaButton } from "@/components/content/SaveTrilhaButton";
import type { PlanItemDetail } from "@/lib/api";

export function TrilhaDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: trilha, isLoading, isError } = useQuery({
    queryKey: ["trilha", slug],
    queryFn: () => api.getTrilhaBySlug(slug!),
    enabled: !!slug,
  });

  if (isLoading) return <p className="mx-auto max-w-3xl px-6 py-16 text-muted-foreground">Carregando…</p>;
  if (isError || !trilha) {
    return <p className="mx-auto max-w-3xl px-6 py-16 text-muted-foreground">Trilha não encontrada.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-16">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{trilha.name}</h1>
        {trilha.description && <p className="text-lg text-muted-foreground">{trilha.description}</p>}
        <div className="flex flex-wrap gap-2">
          {trilha.skillsCovered.map((skill) => (
            <Badge key={skill} variant="secondary">
              {skill}
            </Badge>
          ))}
        </div>
        <SaveTrilhaButton planId={trilha.id} />
      </header>

      <section>
        <h2 className="text-lg font-medium">Conteúdo da trilha</h2>
        <Accordion type="multiple" className="mt-3">
          {trilha.planModules.map((mod) => (
            <AccordionItem key={mod.id} value={String(mod.id)}>
              <AccordionTrigger>{mod.title}</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2">
                  {mod.items.map((item) => (
                    <li key={item.id}>
                      <PlanItemRow item={item} />
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}

function PlanItemRow({ item }: { item: PlanItemDetail }) {
  if (item.course) {
    return (
      <Link to={`/curso/${item.course.slug}`} className="text-sm text-primary hover:underline">
        {item.course.title}
      </Link>
    );
  }
  if (item.lesson) {
    return <span className="text-sm text-muted-foreground">{item.lesson.title}</span>;
  }
  return null;
}
