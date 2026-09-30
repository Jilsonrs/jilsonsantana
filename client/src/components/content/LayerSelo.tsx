import { LAYER_CONFIG, type Layer } from "@jilson/core";
import { resolveIcon } from "./icon-registry";
import { cn } from "@/lib/utils";
import { useTextosComuns } from "@/lib/common-texts";

// "Selo 3 camadas" — renders only the layers the course actually marked via
// camadas[] (a course may show 1, 2 or 3, never a boolean). Blue accent is
// driven by LAYER_CONFIG[layer].accent, true only for IA.
//
// Nome e frase de cada camada vêm de `common.camadas`, no idioma do app e com as
// edições do operador em Admin → Textos (decisão dele, 24/09/2026).
export function LayerSelo({ camadas }: { camadas: Layer[] }) {
  const textos = useTextosComuns();
  if (camadas.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 px-6 py-12 sm:px-12 sm:py-16 shadow-2xl mt-16 mb-8">
      <div className="absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 h-[300px] w-[300px] rounded-full bg-indigo-500/20 blur-[100px] pointer-events-none" />
      
      <div className={cn(
        "relative z-10",
        camadas.length === 3 ? "grid gap-12 lg:grid-cols-[1fr_1.5fr] items-center" : "flex flex-col items-center text-center gap-10"
      )}>
        <div className={cn("space-y-6", camadas.length < 3 && "max-w-2xl")}>
          <h2 className="font-display text-4xl font-bold tracking-tighter text-white sm:text-5xl leading-[1.1]">
            O DNA de uma escola <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">moderna</span>.
          </h2>
          <p className="text-[1.1rem] text-slate-300 leading-relaxed">
            Mais que um curso. Uma metodologia pensada para você aprender mais rápido, não quebrar em atualizações e usar IA como seu copiloto.
          </p>
        </div>
        
        <div className={cn(
          "w-full",
          camadas.length === 3 ? "flex flex-col gap-4" :
          camadas.length === 2 ? "grid gap-6 sm:grid-cols-2" :
          "max-w-md"
        )}>
          {camadas.map((layer) => {
            const config = LAYER_CONFIG[layer];
            const Icon = resolveIcon(config.icon);
            return (
              <div key={layer} className={cn(
                "relative flex items-start gap-5 rounded-3xl p-6 transition-colors text-left",
                camadas.length < 3 && "flex-col items-center text-center gap-4",
                config.accent ? "bg-white/10 ring-1 ring-white/20 shadow-lg" : "bg-white/5 hover:bg-white/10"
              )}>
                <div className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                  config.accent ? "bg-primary text-white shadow-[0_0_30px_rgba(59,130,246,0.6)]" : "bg-white/10 text-white/80"
                )}>
                  <Icon className="h-7 w-7 stroke-[1.5px]" />
                </div>
                <div className={cn("space-y-1.5", camadas.length === 3 ? "pt-1" : "")}>
                  <p className="text-[1.15rem] font-bold text-white tracking-tight">{textos.camadas[layer].nome}</p>
                  <p className="text-[0.95rem] leading-relaxed text-slate-300">{textos.camadas[layer].texto}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
