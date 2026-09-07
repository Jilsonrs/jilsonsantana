import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMyTrilha } from "@/lib/api";
import { PlanModuleAccordion } from "@/components/content/PlanModuleAccordion";
import { Badge } from "@/components/ui/badge";

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
    return <p className="mx-auto max-w-3xl px-6 py-16 text-muted-foreground">Carregando…</p>;
  }
  if (isError || !trilha) {
    return (
      <p className="mx-auto max-w-3xl px-6 py-16 text-sm text-destructive">
        Não foi possível carregar esta trilha.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-16">
      <header className="space-y-3">
        <Link to="/minhas-trilhas" className="inline-block text-sm text-muted-foreground hover:underline">
          ← Minhas trilhas
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{trilha.name}</h1>
        {trilha.description && <p className="text-lg text-muted-foreground">{trilha.description}</p>}
        <div className="flex flex-wrap gap-2">
          {trilha.skillsCovered.map((skill) => (
            <Badge key={skill} variant="secondary">
              {skill}
            </Badge>
          ))}
        </div>
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
