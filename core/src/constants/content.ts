// Content-model domain constants — shared by client AND server (Phase 2).
// These mirror the Prisma native enums in server/prisma/schema.prisma 1:1:
// Zod schemas (Block 2) validate against THESE values; Postgres enforces them at
// the DB. Keep both sides in lockstep. `as const` objects (runtime access) +
// derived union types — never a TS `enum` (CLAUDE.md → Shared core/ package).

export const Level = {
  INICIANTE: "INICIANTE",
  INTERMEDIARIO: "INTERMEDIARIO",
  AVANCADO: "AVANCADO",
  // "Todos os níveis" (decisão do operador, 28/09/2026 — como na Udemy).
  TODOS_OS_NIVEIS: "TODOS_OS_NIVEIS",
} as const;
export type Level = (typeof Level)[keyof typeof Level];

// O tipo da aula (Bloco E, etapa 2 — operador, 28/09/2026). O quiz entra numa
// etapa própria. Aula de vídeo não tem texto; aula de texto não tem vídeo.
export const LessonKind = {
  VIDEO: "VIDEO",
  TEXT: "TEXT",
} as const;
export type LessonKind = (typeof LessonKind)[keyof typeof LessonKind];

// Quantos caracteres cabe no texto de uma aula de texto. Proposta do agente no
// plano de 28/09/2026, aprovado pelo operador; muda nesta linha.
export const LIMITE_DO_TEXTO_DA_AULA = 20000;

// ARQUIVOS PARA BAIXAR de cada aula, só para assinantes (Bloco E, etapa 2, parte
// 2e — propostas do agente no plano de 28/09/2026, aprovado pelo operador). O
// servidor recusa o que passar disto; a tela confere antes, para poupar o envio.
export const LIMITE_DO_ARQUIVO_DA_AULA_MB = 50;
export const EXTENSOES_DOS_ARQUIVOS_DA_AULA = [
  "pdf",
  "xlsx",
  "xlsm",
  "xls",
  "csv",
  "docx",
  "pptx",
  "pbix",
  "zip",
  "txt",
  "sql",
  "py",
  "ipynb",
  "json",
] as const;

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


// Quantos caracteres cabe em cada campo das informações básicas do curso
// (decisão do operador, 27/09/2026). 60 e 120 são os limites da Udemy; 60 é
// também o que o Google mostra do título no resultado da busca. Um lugar só:
// o servidor recusa acima disto e a tela mostra o contador com os mesmos números.
export const LIMITE_DO_SLUG = 80;
export const LIMITES_DO_CURSO = {
  title: 60,
  subtitle: 120,
  slug: LIMITE_DO_SLUG,
  description: 5000,
  // Cada item das três listas (o que vai aprender, pré-requisitos, para quem é):
  // 160, como na Udemy (decisão do operador, 28/09/2026).
  itemDaLista: 160,
} as const;

// Abaixo disto a descrição conta como "curta" no que falta do curso, SEM impedir
// o salvar (decisão do operador, 28/09/2026 — 200 é o mínimo da Udemy).
export const MINIMO_DE_PALAVRAS_DA_DESCRICAO = 200;

/**
 * Quantas palavras tem um texto. A descrição é Markdown: os marcadores (`-`,
 * `**`, `1.`) não contam, porque só conta o pedaço que tem pelo menos uma letra.
 * Um lugar só: o servidor (cartão da lista) e a tela (o ✓ do editor) contam igual.
 */
export function contarPalavras(texto: string | null | undefined): number {
  return (texto ?? "").split(/\s+/).filter((pedaco) => /\p{L}/u.test(pedaco)).length;
}
