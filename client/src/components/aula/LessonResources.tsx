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
    <ul className="grid gap-3 sm:grid-cols-2">
      {arquivos.map((arquivo) => (
        <li key={arquivo.id}>
          <a
            href={api.enderecoDoArquivo(lessonId, arquivo.id, comoAdmin)}
            download
            className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <FileDown className="size-5" aria-hidden="true" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                {arquivo.originalName}
              </span>
              <span className="text-xs text-muted-foreground">{tamanhoLegivel(arquivo.sizeBytes, idioma)}</span>
            </div>
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
  const idioma = useIdioma();
  const [aberto, setAberto] = useState(false);
  const { data, comoAdmin } = usePaginaDaAula(aberto ? lessonId : null);
  const arquivos = data?.aula.arquivos;

  return (
    <details className="pl-7 pb-2" onToggle={(e) => setAberto(e.currentTarget.open)}>
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground mb-2">
        {t.aula.recursos}
      </summary>
      <div className="pt-1">
        {data && !data.aula.arquivosLiberados && <p className="text-xs text-muted-foreground">{t.aula.recursosSoAssinantes}</p>}
        {arquivos && (
          <ul className="flex flex-col gap-2">
            {arquivos.map((arquivo) => (
              <li key={arquivo.id}>
                <a
                  href={api.enderecoDoArquivo(lessonId, arquivo.id, comoAdmin)}
                  download
                  className="group flex items-center gap-2 py-1 transition-colors hover:text-primary"
                >
                  <FileDown className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
                  <span className="truncate text-[0.8rem] font-medium text-muted-foreground transition-colors group-hover:text-primary">
                    {arquivo.originalName}
                  </span>
                  <span className="ml-auto shrink-0 text-[0.7rem] text-muted-foreground/60">
                    {tamanhoLegivel(arquivo.sizeBytes, idioma)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
