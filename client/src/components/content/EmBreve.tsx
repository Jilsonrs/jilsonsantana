import { useT } from "@/lib/language";

/**
 * A etiqueta EM BREVE das telas de fundo claro — do aluno e do Dashboard do admin.
 * É a mesma que o menu mostra (`app.nav.emBreve`); o menu desenha a dele à parte.
 */
export function EmBreve() {
  const t = useT();
  return (
    <span className="inline-flex items-center rounded-full border border-border/80 bg-muted/40 px-2 py-0.5 font-mono text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase shadow-sm">
      {t.nav.emBreve}
    </span>
  );
}
