import { useT } from "@/lib/language";

/**
 * A etiqueta EM BREVE das telas de fundo claro, no idioma do app. É a mesma que
 * o menu mostra; o menu desenha a dele à parte porque, lá, as seções de admin
 * ficam sempre em português (`etiquetaEmBreve`, lib/navigation).
 *
 * `texto` fixa a etiqueta: as telas do ADMIN passam a de português, porque o
 * Admin não muda de idioma (decisão do operador, 23/09/2026).
 */
export function EmBreve({ texto }: { texto?: string }) {
  const t = useT();
  return (
    <span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[0.55rem] font-normal tracking-[0.08em] text-muted-foreground">
      {texto ?? t.nav.emBreve}
    </span>
  );
}
