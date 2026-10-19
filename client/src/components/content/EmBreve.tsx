import { useT } from "@/lib/language";

/**
 * A etiqueta EM BREVE das telas de fundo claro. É a mesma que o menu mostra; o
 * menu desenha a dele à parte (`etiquetaEmBreve`, lib/navigation).
 *
 * `texto` fixa a etiqueta: as telas do ADMIN passam a do `pt` direto, porque o
 * Admin fica fora do `useT()` (decisão do operador, 23/09/2026). Com um idioma
 * só (12/10/2026), as duas saem iguais.
 */
export function EmBreve({ texto }: { texto?: string }) {
  const t = useT();
  return (
    <span className="inline-flex items-center rounded-full border border-border/80 bg-muted/40 px-2 py-0.5 font-mono text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase shadow-sm">
      {texto ?? t.nav.emBreve}
    </span>
  );
}
