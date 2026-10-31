import type { ContagemDasAssinaturas, FiltroDasAssinaturas } from "@jilson/core";
import { ORDEM_DOS_FILTROS, ROTULO_DO_FILTRO } from "@/lib/cobranca-admin";
import { Button } from "@/components/ui/button";

type Props = {
  filtro: FiltroDasAssinaturas;
  /** A contagem de cada filtro; enquanto carrega, os botões aparecem sem número. */
  contagem: ContagemDasAssinaturas | undefined;
  aoEscolher: (filtro: FiltroDasAssinaturas) => void;
};

/** Os filtros da lista de assinaturas, com quantas há em cada situação (etapa 4.7b, passo 1b). */
export function FiltrosDasAssinaturas({ filtro, contagem, aoEscolher }: Props) {
  return (
    <div role="group" aria-label="Filtrar por situação" className="flex flex-wrap gap-2">
      {ORDEM_DOS_FILTROS.map((opcao) => (
        <Button key={opcao} type="button" size="sm" variant={opcao === filtro ? "default" : "outline"} aria-pressed={opcao === filtro} onClick={() => aoEscolher(opcao)}>
          {ROTULO_DO_FILTRO[opcao]}
          {contagem ? ` (${contagem[opcao]})` : ""}
        </Button>
      ))}
    </div>
  );
}
