import type { Highlight } from "@/lib/api";
import { resolveIcon } from "./icon-registry";

// "Diferenciais do curso" icon cards.
export function HighlightCard({ icon, title, text }: Highlight) {
  const Icon = resolveIcon(icon);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <h4 className="font-bold text-foreground leading-tight">{title}</h4>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
