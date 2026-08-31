import { Layers, Zap, Sparkles, type LucideIcon } from "lucide-react";

// Maps the icon tokens stored in core/ (Course.highlights[].icon, the global
// LAYER_CONFIG) to a Lucide component. Fixed set per CLAUDE.md ("Icons from a
// fixed Lucide set, avoid bespoke art per course"). Extend this map, never add
// per-course icon rendering, when Bloco 6 introduces a new token.
const ICONS: Record<string, LucideIcon> = {
  "stack-2": Layers,
  bolt: Zap,
  sparkles: Sparkles,
};

// Sparkles as the neutral fallback keeps an unmapped token rendering something
// reasonable instead of a blank icon slot.
export function resolveIcon(token: string): LucideIcon {
  return ICONS[token] ?? Sparkles;
}
