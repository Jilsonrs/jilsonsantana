import { Sparkles, X } from "lucide-react";
import { useT } from "@/lib/language";

/**
 * O botão flutuante da IA, no canto inferior direito (como no LinkedIn Learning —
 * decisão do operador, 29/09/2026: entra já, abrindo um painel com "Em breve").
 * O JilsonAI de verdade é a Fase 6; o painel já ocupa o lugar dele, e o player
 * encolhe quando ele abre.
 */
export function BotaoDaIa({ aberto, aoAlternar }: { aberto: boolean; aoAlternar: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={aoAlternar}
      aria-expanded={aberto}
      aria-label={aberto ? t.aula.fecharIa : t.aula.abrirIa}
      className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-[#8A2BE2] text-primary-foreground shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(138,43,226,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
    >
      <Sparkles className="size-6" aria-hidden="true" />
    </button>
  );
}

/** O painel à direita do player. Hoje só diz o que vem. */
export function PainelDaIa({ aoFechar }: { aoFechar: () => void }) {
  const t = useT();
  return (
    <aside aria-label={t.aula.iaTitulo} className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-b from-surface-alt to-background p-6 shadow-xl">
      <div className="absolute -right-4 -top-4 opacity-[0.03] pointer-events-none">
        <Sparkles className="size-32" aria-hidden="true" />
      </div>
      <div className="relative z-10 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-bold font-display tracking-tight text-foreground">
          <Sparkles className="size-5 text-primary" aria-hidden="true" />
          {t.aula.iaTitulo}
        </h2>
        <button
          type="button"
          onClick={aoFechar}
          aria-label={t.aula.fecharIa}
          className="flex size-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p className="relative z-10 mt-6 text-sm leading-relaxed text-muted-foreground/90">{t.aula.iaEmBreve}</p>
    </aside>
  );
}
