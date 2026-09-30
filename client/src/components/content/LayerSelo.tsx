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
    <div className="flex flex-col gap-6">
      {camadas.map((layer, index) => {
        const config = LAYER_CONFIG[layer];
        const Icon = resolveIcon(config.icon);
        return (
          <div key={layer} className={cn("flex gap-5 pb-6", index !== camadas.length - 1 ? "border-b border-border/60" : "")}>
            <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Icon className="h-6 w-6 stroke-[1.5px]" />
            </div>
            <div className="space-y-1 pt-1">
              <p className="text-[1.05rem] font-bold text-foreground tracking-tight">{textos.camadas[layer].nome}</p>
              <p className="text-[0.95rem] leading-relaxed text-muted-foreground">{textos.camadas[layer].texto}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
