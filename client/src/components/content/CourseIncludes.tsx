import { FileDown } from "lucide-react";
import { MATERIAL_CONFIG, type Material } from "@jilson/core";
import { useTextosComuns } from "@/lib/common-texts";
import { resolveIcon } from "./icon-registry";

/**
 * "ESTE CURSO INCLUI" — o resumo do que o curso entrega, na página de venda,
 * para quem não lê a descrição (decisões do operador, 04/10/2026, a partir da
 * Udemy). Os arquivos aparecem sozinhos quando alguma aula publicada tem arquivo;
 * os materiais exclusivos são os marcados no passo Publicar. Os textos são globais
 * (`common.inclui` e `common.materiais`, editáveis em Admin → Textos). Sem nada a
 * mostrar, o quadro não aparece. As outras linhas possíveis esperam a P41.
 */
export function CourseIncludes({ materiais, temArquivos }: { materiais: Material[]; temArquivos: boolean }) {
  const textos = useTextosComuns();
  if (!temArquivos && materiais.length === 0) return null;
  return (
    <section className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{textos.inclui.titulo}</h2>
      <ul className="mt-4 space-y-3">
        {temArquivos && (
          <li className="flex items-center gap-3 text-sm text-foreground">
            <FileDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {textos.inclui.arquivos}
          </li>
        )}
        {materiais.map((material) => {
          const Icone = resolveIcon(MATERIAL_CONFIG[material].icon);
          return (
            <li key={material} className="flex items-center gap-3 text-sm text-foreground">
              <Icone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              {textos.materiais[material]}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
