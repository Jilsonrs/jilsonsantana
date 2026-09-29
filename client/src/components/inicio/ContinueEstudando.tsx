import { Sparkles } from "lucide-react";
import { EmBreve } from "@/components/content/EmBreve";
import { useT } from "@/lib/language";

/**
 * "Continue estudando" — EM BREVE até existir o progresso das aulas (Fase 5):
 * sem `LessonProgress` não há "a aula em que você parou". Antes dizia que as
 * aulas apareceriam "assim que você começar um curso", o que não acontecia.
 */
export function ContinueEstudando() {
  const t = useT();
  return (
    <section aria-labelledby="continue" className="mt-12">
      <div className="flex items-center gap-2">
        <h2 id="continue" className="text-xl font-semibold">
          {t.inicio.continueTitulo}
        </h2>
        <EmBreve />
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-10 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-alt">
          <Sparkles className="size-5 text-primary" strokeWidth={1.5} />
        </div>
        <p className="mt-6 max-w-[52ch] leading-relaxed text-muted-foreground">
          {t.inicio.continueEmBreve}
        </p>
      </div>
    </section>
  );
}
