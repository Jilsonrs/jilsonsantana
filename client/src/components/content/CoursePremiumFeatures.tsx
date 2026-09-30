import { LAYER_CONFIG, type Layer } from "@jilson/core";
import { resolveIcon } from "./icon-registry";
import { cn } from "@/lib/utils";
import { useTextosComuns } from "@/lib/common-texts";
import type { PaginaDaAula } from "@/lib/api";

const getGridColsClass = (length: number) => {
  if (length === 1) return "grid-cols-1";
  if (length === 2) return "grid-cols-1 sm:grid-cols-2";
  if (length === 3) return "grid-cols-1 sm:grid-cols-3";
  if (length >= 4) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  return "grid-cols-1";
};

export function CourseHighlights({ destaques }: { destaques: PaginaDaAula["curso"]["highlights"] }) {
  const safeDestaques = destaques ?? [];

  if (safeDestaques.length === 0) return null;

  return (
    <div className={cn("grid gap-8 pt-4", getGridColsClass(safeDestaques.length))}>
      {safeDestaques.map((h, i) => {
        const Icon = resolveIcon(h.icon);
        return (
          <div key={i} className="group relative flex flex-col gap-5">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/20 pointer-events-none" />
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
              <Icon className="h-6 w-6 stroke-[1.5px]" />
            </div>
            <div className="space-y-2">
              <h4 className="font-display text-[1.15rem] font-bold tracking-tight text-foreground">{h.title}</h4>
              <p className="text-[0.95rem] leading-relaxed text-muted-foreground">{h.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CourseLayers({ camadas = [] }: { camadas: Layer[] }) {
  const textos = useTextosComuns();

  if (camadas.length === 0) return null;

  return (
    <section className="space-y-10 py-6">
      <div className="space-y-2">
        <h3 className="font-display text-[1.4rem] font-bold tracking-tight text-foreground">
          O DNA da escola <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">moderna</span>.
        </h3>
        <p className="text-[0.95rem] text-muted-foreground">Uma metodologia construída em camadas.</p>
      </div>

      <div className={cn("grid gap-8", getGridColsClass(camadas.length))}>
        {camadas.map((layer, i) => {
          const config = LAYER_CONFIG[layer];
          const Icon = resolveIcon(config.icon);
          return (
            <div key={layer} className="relative z-10 flex flex-col gap-5">
              {/* Linha horizontal para o próximo nó (escondida no mobile) */}
              {i !== camadas.length - 1 && (
                <div className="absolute top-6 left-[1.5rem] w-[calc(100%+2rem)] h-[2px] bg-border hidden sm:block -z-10" />
              )}
              {/* Linha vertical (mobile fallback) */}
              {i !== camadas.length - 1 && (
                <div className="absolute top-[1.5rem] bottom-[-2rem] left-[1.45rem] w-[2px] bg-border sm:hidden -z-10" />
              )}

              <div className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                config.accent ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-[6px] ring-background" : "bg-muted text-foreground/80 ring-[6px] ring-background"
              )}>
                <Icon className="h-6 w-6 stroke-[1.5px]" />
              </div>
              <div className="space-y-2">
                <p className="font-display text-[1.2rem] font-bold tracking-tight text-foreground">{textos.camadas[layer].nome}</p>
                <p className="text-[0.95rem] leading-relaxed text-muted-foreground">{textos.camadas[layer].texto}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
