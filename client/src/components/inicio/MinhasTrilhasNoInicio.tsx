import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMyTrilhas } from "@/lib/api";
import { TrilhaCard } from "@/components/content/TrilhaCard";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/language";
import { useProgressoDasTrilhas } from "@/lib/progresso";

/** Quantas trilhas salvas o painel mostra; o resto fica a um clique, em "Ver todas". */
const NO_PAINEL = 3;

/**
 * As trilhas salvas pelo aluno, no painel do Início (operador, 29/09/2026). É o
 * único bloco do painel com dado real hoje — o progresso é da Fase 5.
 */
export function MinhasTrilhasNoInicio() {
  const t = useT();
  // Mesma chave da tela Minhas trilhas: uma busca só.
  // A barra de quem já começou (Bloco MEDIR, etapa 3 — 09/10/2026). A tela é de quem está logado.
  const progresso = useProgressoDasTrilhas(true);
  const { data: trilhas, isLoading, isError } = useQuery({
    queryKey: ["myTrilhas"],
    queryFn: getMyTrilhas,
  });
  const temTrilha = !!trilhas && trilhas.length > 0;

  return (
    <section aria-labelledby="minhas-trilhas" className="mt-14">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="minhas-trilhas" className="text-xl font-semibold">
          {t.nav.minhasTrilhas}
        </h2>
        {temTrilha && (
          <Link to="/aluno/minhas-trilhas" className="text-sm font-medium text-primary hover:underline">
            {t.inicio.verTodas}
          </Link>
        )}
      </div>

      <div className="mt-6">
        {isLoading && <p className="text-muted-foreground">{t.comum.carregando}</p>}
        {isError && <p className="text-sm text-destructive">{t.minhasTrilhas.erro}</p>}

        {!isLoading && !isError && !temTrilha && (
          // O vazio tem SAÍDA: as trilhas prontas, de onde se salva uma.
          <div className="space-y-4">
            <p className="text-muted-foreground">{t.inicio.nenhumaTrilha}</p>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/trilhas">{t.inicio.verTrilhas}</Link>
            </Button>
          </div>
        )}

        {temTrilha && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trilhas.slice(0, NO_PAINEL).map((trilha) => (
              <TrilhaCard
                key={trilha.id}
                to={`/aluno/minhas-trilhas/${trilha.id}`}
                name={trilha.name}
                description={trilha.description}
                skillsCovered={trilha.skillsCovered}
                progresso={progresso.get(trilha.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
