import type { ListaDeAssinaturas } from "@jilson/core";
import { detalhesDaLinha, textoDaSituacao } from "@/lib/cobranca-admin";
import { Button } from "@/components/ui/button";

type Props = {
  /** A página atual; vazio enquanto carrega ou quando falhou. */
  dados: ListaDeAssinaturas | undefined;
  carregando: boolean;
  falhou: boolean;
  aoTentarDeNovo: () => void;
  /** A busca em vigor, para a frase de "nada encontrado". */
  busca: string | undefined;
  pagina: number;
  aoMudarDePagina: (pagina: number) => void;
};

/** A lista das assinaturas, com os estados de carregando, erro e vazio, e as páginas (etapa 4.7b, passo 1b). */
export function ListaDasAssinaturas({ dados, carregando, falhou, aoTentarDeNovo, busca, pagina, aoMudarDePagina }: Props) {
  if (carregando) return <p className="text-muted-foreground">Carregando…</p>;
  if (falhou || !dados) {
    return (
      <div role="alert" className="space-y-3">
        <p className="font-medium text-destructive">Não foi possível carregar as assinaturas.</p>
        <Button type="button" variant="outline" onClick={aoTentarDeNovo}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  if (dados.assinaturas.length === 0) {
    return <p className="text-muted-foreground">{busca ? `Nada encontrado para “${busca}”.` : "Nenhuma assinatura nesta situação."}</p>;
  }
  return (
    <div className="space-y-4">
      <ul aria-label="Assinaturas" className="divide-y divide-border rounded-2xl border border-border/60">
        {dados.assinaturas.map((assinatura) => (
          <li key={assinatura.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{assinatura.aluno ? (assinatura.aluno.nome ?? assinatura.aluno.email) : "Sem conta na escola"}</p>
              {assinatura.aluno?.nome ? <p className="truncate text-sm text-muted-foreground">{assinatura.aluno.email}</p> : null}
            </div>
            <div className="text-sm sm:text-right">
              <p className="text-foreground">{textoDaSituacao(assinatura)}</p>
              <p className="text-muted-foreground">{detalhesDaLinha(assinatura)}</p>
            </div>
          </li>
        ))}
      </ul>
      {pagina > 1 || dados.temMais ? (
        <nav aria-label="Páginas" className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" disabled={pagina <= 1} onClick={() => aoMudarDePagina(pagina - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">Página {pagina}</span>
          <Button type="button" variant="outline" size="sm" disabled={!dados.temMais} onClick={() => aoMudarDePagina(pagina + 1)}>
            Próxima
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
