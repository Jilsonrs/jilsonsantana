import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { PlanModuleAccordion } from "@/components/content/PlanModuleAccordion";
import { SaveTrilhaButton } from "@/components/content/SaveTrilhaButton";
import { PageContainer } from "@/components/layout/PageLayout";

export function TrilhaDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: trilha, isLoading, isError } = useQuery({
    queryKey: ["trilha", slug],
    queryFn: () => api.getTrilhaBySlug(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-muted-foreground mt-8">Carregando…</p>
      </PageContainer>
    );
  }
  
  if (isError || !trilha) {
    return (
      <PageContainer>
        <p className="mt-8 text-sm text-destructive">Trilha não encontrada.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-12">
        <header className="space-y-4 border-b border-border/40 pb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">{trilha.name}</h1>
          {trilha.description && <p className="text-xl text-muted-foreground max-w-[80ch]">{trilha.description}</p>}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex flex-wrap gap-2">
              {trilha.skillsCovered.map((skill) => (
                <Badge key={skill} variant="secondary" className="px-3 py-1">
                  {skill}
                </Badge>
              ))}
            </div>
            <SaveTrilhaButton planId={trilha.id} />
          </div>
        </header>

        <section>
          <h2 className="text-2xl font-semibold">Conteúdo da trilha</h2>
          <div className="mt-6">
            <PlanModuleAccordion planModules={trilha.planModules} />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
