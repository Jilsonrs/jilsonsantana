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
      className="fixed bottom-6 right-6 z-40 flex h-14 items-center gap-2.5 rounded-full bg-card px-6 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(35,143,232,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none group"
    >
      <Sparkles className="size-5 text-primary transition-transform group-hover:scale-110" aria-hidden="true" />
      <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
        jilson<span className="text-primary">AI</span>
      </span>
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
        <h2 className="flex items-center gap-2 font-display text-[1.4rem] font-extrabold tracking-tight text-foreground">
          <Sparkles className="size-5 text-primary" aria-hidden="true" />
          <span>jilson<span className="text-primary">AI</span></span>
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
