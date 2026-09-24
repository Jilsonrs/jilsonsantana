import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMyTrilhas } from "@/lib/api";
import { TrilhaCard } from "@/components/content/TrilhaCard";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";

// As trilhas que o aluno salvou. Sem esta tela, salvar uma trilha é um beco sem
// saída: o clone não recebe slug e só é alcançável por id.
export function MyTrilhasPage() {
  const { data: trilhas, isLoading, isError } = useQuery({
    queryKey: ["myTrilhas"],
    queryFn: getMyTrilhas,
  });

  return (
    <PageContainer>
      <PageHeader 
        title="Minhas trilhas" 
        description="Trilhas e seleções que você salvou para estudar."
      />

      {isLoading && <p className="mt-8 text-muted-foreground">Carregando…</p>}
      {isError && (
        <p className="mt-8 text-sm text-destructive">Não foi possível carregar suas trilhas.</p>
      )}

      {!isLoading && !isError && trilhas?.length === 0 && (
        // O vazio precisa de SAÍDA: esta tela existe para acabar com um beco sem
        // saída, e um vazio sem link para o catálogo seria outro beco.
        <div className="mt-12 space-y-4">
          <p className="text-muted-foreground text-lg">Você ainda não salvou nenhuma trilha.</p>
          <Button asChild size="lg">
            <Link to="/cursos">Ver trilhas do catálogo</Link>
          </Button>
        </div>
      )}

      {!isLoading && !isError && trilhas && trilhas.length > 0 && (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trilhas.map((trilha) => (
            <TrilhaCard
              key={trilha.id}
              to={`/minhas-trilhas/${trilha.id}`}
              name={trilha.name}
              description={trilha.description}
              skillsCovered={trilha.skillsCovered}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
