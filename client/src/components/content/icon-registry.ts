import {
  Layers, Zap, Sparkles, Target, Rocket, Award, BookOpen, Briefcase,
  CheckCircle2, Clock, Compass, FileText, Flag, Globe, Key, Lightbulb,
  Map, PieChart, Puzzle, Shield, Star, TrendingUp, Users, Video,
  Brain, Code, Laptop, LineChart, Medal,
  type LucideIcon
} from "lucide-react";

// Maps the icon tokens stored in core/ (Course.highlights[].icon, the global
// LAYER_CONFIG) to a Lucide component. Fixed set per CLAUDE.md ("Icons from a
// fixed Lucide set, avoid bespoke art per course").
export const ICONS: Record<string, LucideIcon> = {
  "stack-2": Layers,
  "bolt": Zap,
  "sparkles": Sparkles,
  "target": Target,
  "rocket": Rocket,
  "award": Award,
  "book-open": BookOpen,
  "briefcase": Briefcase,
  "check-circle": CheckCircle2,
  "clock": Clock,
  "compass": Compass,
  "file-text": FileText,
  "flag": Flag,
  "globe": Globe,
  "key": Key,
  "lightbulb": Lightbulb,
  "map": Map,
  "pie-chart": PieChart,
  "puzzle": Puzzle,
  "shield": Shield,
  "star": Star,
  "trending-up": TrendingUp,
  "users": Users,
  "video": Video,
  "brain": Brain,
  "code": Code,
  "laptop": Laptop,
  "line-chart": LineChart,
  "medal": Medal,
};

// Available icon tokens for the admin select field
export const AVAILABLE_ICONS = Object.keys(ICONS).sort();

// Sparkles as the neutral fallback keeps an unmapped token rendering something
// reasonable instead of a blank icon slot.
export function resolveIcon(token: string): LucideIcon {
  return ICONS[token] ?? Sparkles;
}
