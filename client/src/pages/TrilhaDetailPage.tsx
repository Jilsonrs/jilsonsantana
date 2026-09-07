import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { PlanModuleAccordion } from "@/components/content/PlanModuleAccordion";
import { SaveTrilhaButton } from "@/components/content/SaveTrilhaButton";

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
        <div className="mt-3">
          <PlanModuleAccordion planModules={trilha.planModules} />
        </div>
      </section>
    </div>
  );
}
