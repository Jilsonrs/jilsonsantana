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
      className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
    >
      <Sparkles className="size-6" aria-hidden="true" />
    </button>
  );
}

/** O painel à direita do player. Hoje só diz o que vem. */
export function PainelDaIa({ aoFechar }: { aoFechar: () => void }) {
  const t = useT();
  return (
    <aside aria-label={t.aula.iaTitulo} className="rounded-2xl border border-border bg-surface-alt p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="size-5 text-primary" aria-hidden="true" />
          {t.aula.iaTitulo}
        </h2>
        <button
          type="button"
          onClick={aoFechar}
          aria-label={t.aula.fecharIa}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{t.aula.iaEmBreve}</p>
    </aside>
  );
}
