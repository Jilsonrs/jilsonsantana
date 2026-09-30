import type { Highlight } from "@/lib/api";
import { resolveIcon } from "./icon-registry";

// "Diferenciais do curso" icon cards.
export function HighlightCard({ icon, title, text }: Highlight) {
  const Icon = resolveIcon(icon);
  return (
    <div className="flex gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
