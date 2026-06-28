import { LAYER_CONFIG, type Layer } from "@jilson/core";
import { resolveIcon } from "./icon-registry";
import { cn } from "@/lib/utils";

// "Selo 3 camadas" — renders only the layers the course actually marked via
// camadas[] (a course may show 1, 2 or 3, never a boolean). Blue accent is
// driven by LAYER_CONFIG[layer].accent, true only for IA.
export function LayerSelo({ camadas }: { camadas: Layer[] }) {
  if (camadas.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {camadas.map((layer) => {
        const config = LAYER_CONFIG[layer];
        const Icon = resolveIcon(config.icon);
        return (
          <div key={layer} className="space-y-2 rounded-lg border border-border p-4">
            <Icon className={cn("h-5 w-5", config.accent ? "text-primary" : "text-foreground")} />
            <p className="text-sm font-medium">{config.name}</p>
            <p className="text-sm text-muted-foreground">{config.blurb}</p>
          </div>
        );
      })}
    </div>
  );
}
