// Content-model domain constants — shared by client AND server (Phase 2).
// These mirror the Prisma native enums in server/prisma/schema.prisma 1:1:
// Zod schemas (Block 2) validate against THESE values; Postgres enforces them at
// the DB. Keep both sides in lockstep. `as const` objects (runtime access) +
// derived union types — never a TS `enum` (CLAUDE.md → Shared core/ package).

export const Level = {
  INICIANTE: "INICIANTE",
  INTERMEDIARIO: "INTERMEDIARIO",
  AVANCADO: "AVANCADO",
} as const;
export type Level = (typeof Level)[keyof typeof Level];

// One status set shared by Course, Module and Lesson.
export const ContentStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;
export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

// Metodologia 3 Camadas — agnostic of tool ("Excel 365" is only the MODERNO
// example in the Excel context, never in the global text). A course marks WHICH
// layers it shows via Course.camadas[] (may be 1, 2 or 3 — not a boolean).
export const Layer = {
  UNIVERSAL: "UNIVERSAL",
  MODERNO: "MODERNO",
  IA: "IA",
} as const;
export type Layer = (typeof Layer)[keyof typeof Layer];

// A PlanItem points at EITHER a whole course OR a standalone lesson (free mix).
export const PlanItemType = {
  COURSE: "COURSE",
  LESSON: "LESSON",
} as const;
export type PlanItemType = (typeof PlanItemType)[keyof typeof PlanItemType];

// Global "selo 3 camadas" — one icon + color per layer, NEVER per course (per
// course the operator only PICKS which layers via Course.camadas[]). This is what
// keeps it premium without recurring per-course copy (the Xperiun trap). A course
// whose story the global text doesn't fit uses Course.camadaOverride? (the exception).
//
// `icon` is a stable token mapped to a Lucide component in the client (Block 5):
// stack-2→Layers, bolt→Zap, sparkles→Sparkles. Stored as a string so core/ stays
// free of any UI dependency. `accent` (the blue --primary "brilho do JilsonAI")
// is true ONLY for the IA layer — the single colored one.
//
// OS TEXTOS (nome e frase de cada camada) NÃO moram mais aqui: estão no
// dicionário, em `common.camadas`, nos dois idiomas e editáveis em Admin →
// Textos (decisão do operador, 24/09/2026). Aqui ficam só o ícone e a cor.
export type LayerConfig = {
  icon: string;
  accent: boolean;
};

export const LAYER_CONFIG: Record<Layer, LayerConfig> = {
  UNIVERSAL: { icon: "stack-2", accent: false },
  MODERNO: { icon: "bolt", accent: false },
  IA: { icon: "sparkles", accent: true },
};

// Temporário: Slug do curso em destaque até existir a escolha no painel admin.
export const FEATURED_COURSE_SLUG = "agentic-ai-na-pratica";

