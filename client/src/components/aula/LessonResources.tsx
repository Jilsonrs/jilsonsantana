import { useState } from "react";
import { FileDown } from "lucide-react";
import * as api from "@/lib/api";
import type { ArquivoDaAula } from "@/lib/api";
import { useIdioma, useT } from "@/lib/language";
import { usePaginaDaAula } from "@/lib/pagina-da-aula";
import { tamanhoLegivel } from "@/lib/tamanho-de-arquivo";

/**
 * Os ARQUIVOS PARA BAIXAR de uma aula (como na Udemy — operador, 29/09/2026). O
 * link é do nosso site: o arquivo sai com o nome original, e só para quem pode.
 */
export function ListaDeArquivos({
  lessonId,
  arquivos,
  comoAdmin,
}: {
  lessonId: number;
  arquivos: ArquivoDaAula[];
  comoAdmin: boolean;
}) {
  const idioma = useIdioma();
  return (
    <ul className="space-y-2">
      {arquivos.map((arquivo) => (
        <li key={arquivo.id}>
          <a
            href={api.enderecoDoArquivo(lessonId, arquivo.id, comoAdmin)}
            download
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-tint-foreground hover:underline"
          >
            <FileDown className="size-4 shrink-0" aria-hidden="true" />
            {arquivo.originalName}
            <span className="text-muted-foreground">· {tamanhoLegivel(arquivo.sizeBytes, idioma)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * "Recursos" junto ao nome da aula, na lista do curso (o print 02 do operador,
 * da Udemy). Só busca os arquivos quando abre: a lista pode ter dezenas de aulas.
 */
export function RecursosNaLista({ lessonId }: { lessonId: number }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const { data, comoAdmin } = usePaginaDaAula(aberto ? lessonId : null);
  const arquivos = data?.aula.arquivos;

  return (
    <details className="pl-7" onToggle={(e) => setAberto(e.currentTarget.open)}>
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
        {t.aula.recursos}
      </summary>
      <div className="pt-2">
        {data && !data.aula.liberada && <p className="text-xs text-muted-foreground">{t.aula.recursosSoAssinantes}</p>}
        {arquivos && <ListaDeArquivos lessonId={lessonId} arquivos={arquivos} comoAdmin={comoAdmin} />}
      </div>
    </details>
  );
}
