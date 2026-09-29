import { useT } from "@/lib/language";

/**
 * A etiqueta EM BREVE das telas do aluno (fundo claro), no idioma do app. É a
 * mesma que o menu mostra; o menu desenha a dele à parte porque, lá, as seções
 * de admin ficam sempre em português (`etiquetaEmBreve`, lib/navigation).
 */
export function EmBreve() {
  const t = useT();
  return (
    <span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[0.55rem] font-normal tracking-[0.08em] text-muted-foreground">
      {t.nav.emBreve}
    </span>
  );
}
