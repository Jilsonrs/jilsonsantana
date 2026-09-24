import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMyTrilha } from "@/lib/api";
import { PlanModuleAccordion } from "@/components/content/PlanModuleAccordion";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/PageLayout";

// Uma trilha salva do aluno. Mesma árvore da trilha curada (o componente é o
// mesmo), mas alcançada por id: o clone não tem slug.
export function MyTrilhaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: trilha, isLoading, isError } = useQuery({
    queryKey: ["myTrilha", id],
    queryFn: () => getMyTrilha(Number(id)),
    enabled: !!id,
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
        <p className="mt-8 text-sm text-destructive">
          Não foi possível carregar esta trilha.
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-10">
        <header className="space-y-4 border-b border-border/40 pb-8">
          <Link to="/minhas-trilhas" className="inline-block text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            ← Voltar para Minhas Trilhas
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">{trilha.name}</h1>
          {trilha.description && <p className="text-lg text-muted-foreground max-w-[80ch]">{trilha.description}</p>}
          <div className="flex flex-wrap gap-2 pt-2">
            {trilha.skillsCovered.map((skill) => (
              <Badge key={skill} variant="secondary" className="px-3 py-1">
                {skill}
              </Badge>
            ))}
          </div>
        </header>

        <section>
          <div className="mt-6">
            <PlanModuleAccordion planModules={trilha.planModules} />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
