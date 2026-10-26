import {
  Layers, Zap, Sparkles, Target, Rocket, Award, BookOpen, Briefcase,
  CheckCircle2, Clock, Compass, FileText, Flag, Globe, Key, Lightbulb,
  Map, PieChart, Puzzle, Shield, Star, TrendingUp, Users, Video,
  Brain, Code, Laptop, LineChart, Medal,
  BarChart3, Presentation, Database, Server, Filter, Workflow, Network,
  GitBranch, Repeat, Bot, Cpu, Wand2, Atom, Terminal, Braces,
  LayoutDashboard, Monitor, Calculator, Sigma, Search, Eye, PenTool,
  Activity, Settings, Box,
  createLucideIcon,
  type LucideIcon
} from "lucide-react";

// "Pilha" (`layers-3`) com o desenho de antes do Lucide 1 (decisão do operador, 26/10/2026): na
// versão 1 o Lucide juntou o `layers-3` ao `layers`, e a Pilha ficaria igual ao "Camadas"
// (`stack-2`). Os traços são os do Lucide 0.411 (licença ISC).
const Pilha = createLucideIcon("Layers3", [
  ["path", { d: "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z", key: "8b97xw" }],
  ["path", { d: "m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59", key: "1e5n1m" }],
  ["path", { d: "m6.08 14.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59", key: "1iwflc" }],
]);

// Maps the icon tokens stored in core/ (the global LAYER_CONFIG, MATERIAL_CONFIG)
// to a Lucide component, loaded with the page. Since 05/10/2026 a Destaque may use
// ANY Lucide icon (HighlightIcon.tsx loads the others on demand); these 55 stay
// because courses already saved them — some names here ("bar-chart", "wand",
// "stack-2", "check-circle") are OURS, not Lucide's, and must keep winning.
export const ICONS: Record<string, LucideIcon> = {
  // Gerais & Ensino
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

  // BI & Analytics
  "bar-chart": BarChart3,
  "presentation": Presentation,
  "layout-dashboard": LayoutDashboard,
  "monitor": Monitor,
  "activity": Activity,
  "eye": Eye,
  "search": Search,

  // Dados, SQL & ETL
  "database": Database,
  "server": Server,
  "filter": Filter,
  
  // Automações & Lógica
  "workflow": Workflow,
  "network": Network,
  "git-branch": GitBranch,
  "repeat": Repeat,
  "calculator": Calculator,
  "sigma": Sigma,

  // IA & Agentes
  "bot": Bot,
  "cpu": Cpu,
  "wand": Wand2,
  "atom": Atom,

  // Programação (Python, etc)
  "terminal": Terminal,
  "braces": Braces,

  // Outros
  "pen-tool": PenTool,
  "settings": Settings,
  "box": Box,
  "layers-3": Pilha,
};

// The 55 above: the "sugeridos" of the admin picker, shown before any search.
export const AVAILABLE_ICONS = Object.keys(ICONS).sort();

// Sparkles as the neutral fallback keeps an unmapped token rendering something
// reasonable instead of a blank icon slot.
export function resolveIcon(token: string): LucideIcon {
  return ICONS[token] ?? Sparkles;
}
