import type { Highlight } from "@/lib/api";
import { resolveIcon } from "./icon-registry";

// "Diferenciais do curso" icon cards.
export function HighlightCard({ icon, title, text }: Highlight) {
  const Icon = resolveIcon(icon);
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50/50 via-background to-blue-50/30 p-8 shadow-sm ring-1 ring-primary/10 transition-all hover:shadow-md">
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition-all group-hover:bg-primary/20" />
      <div className="relative">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-background text-primary shadow-sm ring-1 ring-primary/10">
          <Icon className="h-7 w-7" />
        </div>
        <h4 className="font-display text-[1.25rem] font-bold leading-tight tracking-tight text-foreground">{title}</h4>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
