import {
  Layers, Zap, Sparkles, Target, Rocket, Award, BookOpen, Briefcase,
  CheckCircle2, Clock, Compass, FileText, Flag, Globe, Key, Lightbulb,
  Map, PieChart, Puzzle, Shield, Star, TrendingUp, Users, Video,
  Brain, Code, Laptop, LineChart, Medal,
  BarChart3, Presentation, Database, Server, Filter, Workflow, Network,
  GitBranch, Repeat, Bot, Cpu, Wand2, Atom, Terminal, Braces,
  LayoutDashboard, Monitor, Calculator, Sigma, Search, Eye, PenTool,
  Activity, Settings, Box, Layers3,
  type LucideIcon
} from "lucide-react";

// Maps the icon tokens stored in core/ (Course.highlights[].icon, the global
// LAYER_CONFIG) to a Lucide component. Fixed set per CLAUDE.md ("Icons from a
// fixed Lucide set, avoid bespoke art per course").
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
  "layers-3": Layers3,
};

// Available icon tokens for the admin select field
export const AVAILABLE_ICONS = Object.keys(ICONS).sort();

// Sparkles as the neutral fallback keeps an unmapped token rendering something
// reasonable instead of a blank icon slot.
export function resolveIcon(token: string): LucideIcon {
  return ICONS[token] ?? Sparkles;
}
