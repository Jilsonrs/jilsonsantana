import { LAYER_CONFIG, type Layer } from "@jilson/core";
import { resolveIcon } from "./icon-registry";
import { cn } from "@/lib/utils";
import { useTextosComuns } from "@/lib/common-texts";
import { useT } from "@/lib/language";
import type { PaginaDaAula } from "@/lib/api";

type Props = {
  destaques: PaginaDaAula["curso"]["highlights"];
  camadas: Layer[];
};

export function CoursePremiumFeatures({ destaques, camadas = [] }: Props) {
  const textos = useTextosComuns();
  const t = useT();
  const safeDestaques = destaques ?? [];

  if (safeDestaques.length === 0 && camadas.length === 0) return null;

  return (
    <section className="relative my-16">
      <div className={cn(
        "relative z-10 grid gap-16",
        safeDestaques.length > 0 && camadas.length > 0 ? "lg:grid-cols-2" : "lg:grid-cols-1 max-w-3xl mx-auto"
      )}>
        {/* COLUNA ESQUERDA: DESTAQUES */}
        {safeDestaques.length > 0 && (
          <div className="space-y-10">
            <div className="space-y-3">
              <h3 className="font-display text-3xl font-bold tracking-tighter text-foreground sm:text-4xl">
                {t.curso.diferenciais ?? "Diferenciais do curso"}
              </h3>
              <p className="text-[1.05rem] text-muted-foreground">O que faz este curso ser diferente.</p>
            </div>
            
            <div className="flex flex-col gap-8">
              {safeDestaques.map((h, i) => {
                const Icon = resolveIcon(h.icon);
                return (
                  <div key={i} className="group relative flex gap-5">
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/20 pointer-events-none" />
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
                      <Icon className="h-6 w-6 stroke-[1.5px]" />
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <h4 className="font-display text-[1.15rem] font-bold tracking-tight text-foreground">{h.title}</h4>
                      <p className="text-[0.95rem] leading-relaxed text-muted-foreground">{h.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COLUNA DIREITA: AS 3 CAMADAS (TIMELINE) */}
        {camadas.length > 0 && (
          <div className="space-y-10">
            <div className="space-y-3">
              <h3 className="font-display text-3xl font-bold tracking-tighter text-foreground sm:text-4xl">
                O DNA da escola <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">moderna</span>.
              </h3>
              <p className="text-[1.05rem] text-muted-foreground">Uma metodologia construída em camadas.</p>
            </div>

            <div className="relative">
              {/* Linha vertical (Timeline) */}
              <div className="absolute bottom-6 left-[19px] top-6 w-[2px] bg-border" />

              <div className="flex flex-col gap-10">
                {camadas.map((layer) => {
                  const config = LAYER_CONFIG[layer];
                  const Icon = resolveIcon(config.icon);
                  return (
                    <div key={layer} className="relative z-10 flex gap-6">
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        config.accent ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-4 ring-background" : "bg-muted text-foreground/80 ring-4 ring-background"
                      )}>
                        <Icon className="h-5 w-5 stroke-[1.5px]" />
                      </div>
                      <div className="space-y-2 pt-1.5">
                        <p className="font-display text-[1.2rem] font-bold tracking-tight text-foreground">{textos.camadas[layer].nome}</p>
                        <p className="text-[0.95rem] leading-relaxed text-muted-foreground">{textos.camadas[layer].texto}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
