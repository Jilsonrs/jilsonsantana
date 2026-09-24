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
    <div className="grid gap-4 sm:grid-cols-3">
      {camadas.map((layer) => {
        const config = LAYER_CONFIG[layer];
        const Icon = resolveIcon(config.icon);
        return (
          <div key={layer} className="space-y-2 rounded-lg border border-border p-4">
            <Icon className={cn("h-5 w-5", config.accent ? "text-primary" : "text-foreground")} />
            <p className="text-sm font-medium">{textos.camadas[layer].nome}</p>
            <p className="text-sm text-muted-foreground">{textos.camadas[layer].texto}</p>
          </div>
        );
      })}
    </div>
  );
}
