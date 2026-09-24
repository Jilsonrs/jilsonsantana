import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMyTrilhas } from "@/lib/api";
import { TrilhaCard } from "@/components/content/TrilhaCard";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { useT } from "@/lib/language";

// As trilhas que o aluno salvou. Sem esta tela, salvar uma trilha é um beco sem
// saída: o clone não recebe slug e só é alcançável por id.
export function MyTrilhasPage() {
  const t = useT();
  const { data: trilhas, isLoading, isError } = useQuery({
    queryKey: ["myTrilhas"],
    queryFn: getMyTrilhas,
  });

  return (
    <PageContainer>
      <PageHeader 
        title={t.minhasTrilhas.titulo}
        description={t.minhasTrilhas.descricao}
      />

      {isLoading && <p className="mt-8 text-muted-foreground">{t.comum.carregando}</p>}
      {isError && (
        <p className="mt-8 text-sm text-destructive">{t.minhasTrilhas.erro}</p>
      )}

      {!isLoading && !isError && trilhas?.length === 0 && (
        // O vazio precisa de SAÍDA: esta tela existe para acabar com um beco sem
        // saída, e um vazio sem link para o catálogo seria outro beco.
        <div className="mt-12 space-y-4">
          <p className="text-muted-foreground text-lg">{t.minhasTrilhas.vazio}</p>
          <Button asChild size="lg">
            <Link to="/cursos">{t.minhasTrilhas.verCatalogo}</Link>
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
