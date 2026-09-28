import { z } from "zod";
import {
  Level,
  ContentStatus,
  Layer,
  PlanItemType,
  LIMITE_DO_SLUG,
  LIMITES_DO_CURSO,
  LessonKind,
  LIMITE_DO_TEXTO_DA_AULA,
} from "../constants/content.js";
import { LANGUAGES } from "./site-text.js";

// Shared content contracts (Phase 2). Consumed by the server (request validation
// in Block 3) AND the client (RHF zodResolver in Block 6) — the single source of
// truth for write payloads. Each enum schema is derived from the matching `core/`
// const so the Zod layer can never drift from the Postgres enums.
//
// Create vs update: create schemas leave DB-defaulted fields OPTIONAL (no Zod
// `.default()`) and let Prisma's `@default` fill them — this also keeps the
// update schemas (`.partial()`) honest: an omitted field means "leave unchanged",
// never "reset to default".

const enumFrom = <T extends string>(obj: Record<string, T>) =>
  z.enum(Object.values(obj) as [T, ...T[]]);

export const levelSchema = enumFrom(Level);
export const contentStatusSchema = enumFrom(ContentStatus);
export const layerSchema = enumFrom(Layer);
export const planItemTypeSchema = enumFrom(PlanItemType);
export const lessonKindSchema = enumFrom(LessonKind);

// kebab-case slug (matches the public /curso/:slug, /trilha/:slug routes).
export const slugSchema = z
  .string()
  .min(1)
  .max(LIMITE_DO_SLUG, `Use no máximo ${LIMITE_DO_SLUG} caracteres.`)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug deve ser kebab-case (a-z, 0-9, hífens)");

// "diferenciais do curso" icon cards — icon is a Lucide token (see design.md).
export const highlightSchema = z.object({
  icon: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1),
});
export type Highlight = z.infer<typeof highlightSchema>;

// per-course FAQ entry — optional feature; renders only if filled.
export const faqItemSchema = z.object({
  pergunta: z.string().min(1),
  resposta: z.string().min(1),
});
export type FaqItem = z.infer<typeof faqItemSchema>;

// per-course override of the GLOBAL 3-camadas text — the exception (e.g. N8N),
// never the routine. A partial override of any layer's name/blurb/icon.
export const camadaOverrideSchema = z.record(
  layerSchema,
  z.object({
    name: z.string().min(1).optional(),
    blurb: z.string().min(1).optional(),
    icon: z.string().min(1).optional(),
  }),
);
export type CamadaOverride = z.infer<typeof camadaOverrideSchema>;

// Endereço de imagem (C4, etapa 1 — plano aprovado pelo operador em 23/09/2026).
// `z.string().url()` RECUSAVA o caminho do próprio site (`/img/curso.jpg`) e
// ACEITAVA `javascript:` e `data:` (medido — CLAUDE.md → Shared `core/`). Vale só:
//   - caminho do próprio site, começando com UMA barra: `//outro-site` o navegador
//     lê como outro endereço;
//   - endereço completo `http://` ou `https://` (é o caso do Bunny,
//     `img.jilsonsantana.com`).
// Espaço, tabulação, quebra de linha e `\` são recusados em qualquer posição: o
// navegador apaga tabulação e quebra de linha de dentro do endereço e troca `\`
// por `/`, então `/<TAB>/outro-site` e `/\outro-site` viram `//outro-site`.
export function enderecoDeImagemValido(valor: string): boolean {
  if (/[\s\\\u0000-\u001f\u007f]/.test(valor)) return false;
  if (valor.startsWith("/")) return !valor.startsWith("//");
  try {
    const { protocol } = new URL(valor);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

export const imageUrlSchema = z
  .string()
  .refine(enderecoDeImagemValido, "endereço de imagem inválido: use /caminho ou https://");

// ID de vídeo do Bunny Stream: o GUID que o Bunny devolve ao criar o vídeo
// (`eb1c4f77-0cda-46be-b47d-1118ad7c2ffe`). Restrito ao formato porque ele vai
// para dentro de um endereço de player numa página — texto livre ali seria um
// jeito de montar outro endereço (backlog P2 da Fase 3, fechado no Bloco U).
export const bunnyVideoIdSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "ID de vídeo do Bunny inválido");

// O fim de um envio de vídeo pelo admin: o id que o Bunny criou no começo.
export const videoUploadCompleteSchema = z.object({ videoId: bunnyVideoIdSchema });

// O começo de um envio de vídeo pelo admin: o NOME DO ARQUIVO que o operador
// escolheu vira o nome do vídeo no Bunny (decisão do operador, 27/09/2026 — o
// Bunny já mostra o ID de cada vídeo ao lado).
export const videoUploadStartSchema = z.object({ titulo: z.string().trim().min(1).max(200) });
export type VideoUploadStartInput = z.infer<typeof videoUploadStartSchema>;
export type VideoUploadCompleteInput = z.infer<typeof videoUploadCompleteSchema>;

// O idioma do conteúdo: a API fala `pt`/`en` (o código do endereço e do
// dicionário); o banco guarda o enum `Language` (PT/EN).
export const contentLanguageSchema = z.enum(LANGUAGES);

// ── Course ───────────────────────────────────────────────────────────────────
const itemDaListaSchema = z
  .string()
  .min(1)
  .max(LIMITES_DO_CURSO.itemDaLista, `Use no máximo ${LIMITES_DO_CURSO.itemDaLista} caracteres.`);

// `language` é OBRIGATÓRIO na criação (operador, 14/09/2026). Na edição ele pode
// vir (é `.partial()`), mas o SERVIDOR só aceita trocar enquanto o curso for
// rascunho (operador, 24/09/2026).
export const courseCreateSchema = z.object({
  slug: slugSchema,
  language: contentLanguageSchema,
  title: z.string().min(1).max(LIMITES_DO_CURSO.title),
  subtitle: z.string().max(LIMITES_DO_CURSO.subtitle).optional(),
  // Markdown (negrito, itálico e listas), guardado como o operador escreveu.
  description: z.string().max(LIMITES_DO_CURSO.description).optional(),
  level: levelSchema.optional(),
  // As três listas: até 160 caracteres por item (operador, 28/09/2026).
  learnTags: z.array(itemDaListaSchema).optional(),
  requirements: z.array(itemDaListaSchema).optional(),
  personas: z.array(itemDaListaSchema).optional(),
  highlights: z.array(highlightSchema).optional(),
  faq: z.array(faqItemSchema).optional(),
  camadas: z.array(layerSchema).optional(),
  camadaOverride: camadaOverrideSchema.optional(),
  thumbnailUrl: imageUrlSchema.optional(),
  introVideoId: bunnyVideoIdSchema.optional(),
  displayOrder: z.number().int().optional(),
  status: contentStatusSchema.optional(),
});
export const courseUpdateSchema = courseCreateSchema.partial();
export type CourseCreateInput = z.infer<typeof courseCreateSchema>;
export type CourseUpdateInput = z.infer<typeof courseUpdateSchema>;

// ── Module ─────────────────────────────────────────────────────────────────--
export const moduleCreateSchema = z.object({
  courseId: z.number().int().positive(),
  title: z.string().min(1),
  layer: layerSchema.optional(),
  displayOrder: z.number().int().optional(),
  status: contentStatusSchema.optional(),
});
// Reparenting (changing courseId) is not a PATCH operation — delete + recreate.
export const moduleUpdateSchema = moduleCreateSchema.partial().omit({ courseId: true });
export type ModuleCreateInput = z.infer<typeof moduleCreateSchema>;
export type ModuleUpdateInput = z.infer<typeof moduleUpdateSchema>;

// ── Estrutura do curso (Bloco E, etapa 2) ─────────────────────────────────────
// A ORDEM INTEIRA de módulos e aulas de um curso, numa gravação só: é o que as
// setas, o "+" e o arrastar mandam. A aula pode mudar de módulo, mas só dentro do
// mesmo curso — quem confere é o servidor.
// Inserir módulo ou aula NUMA POSIÇÃO (o "+" entre dois itens, Bloco E etapa 2):
// `posicao` é o lugar na lista (0 = primeiro). Além do fim, vai para o fim.
export const moduleInsertSchema = z.object({
  title: z.string().trim().min(1),
  posicao: z.number().int().min(0),
});
export const lessonInsertSchema = moduleInsertSchema.extend({ kind: lessonKindSchema });
export type ModuleInsertInput = z.infer<typeof moduleInsertSchema>;
export type LessonInsertInput = z.infer<typeof lessonInsertSchema>;

export const courseStructureSchema = z.object({
  modulos: z.array(
    z.object({
      id: z.number().int().positive(),
      aulas: z.array(z.number().int().positive()),
    }),
  ),
});
export type CourseStructureInput = z.infer<typeof courseStructureSchema>;

// ── Lesson ─────────────────────────────────────────────────────────────────--
export const lessonCreateSchema = z.object({
  moduleId: z.number().int().positive(),
  title: z.string().min(1),
  kind: lessonKindSchema.optional(),
  // O texto da aula de TEXTO (Markdown). O servidor recusa em aula de vídeo.
  content: z
    .string()
    .max(LIMITE_DO_TEXTO_DA_AULA, `Use no máximo ${LIMITE_DO_TEXTO_DA_AULA.toLocaleString("pt-BR")} caracteres.`)
    .optional(),
  tags: z.array(z.string().min(1)).optional(),
  displayOrder: z.number().int().optional(),
  status: contentStatusSchema.optional(),
  // Prévia grátis: a aula toca para qualquer visitante (operador, 27/09/2026).
  // O vídeo em si NÃO entra por aqui: só pelo envio, que confere o envio em
  // andamento desta aula — é isso que impede reusar o vídeo de outra aula.
  isFreePreview: z.boolean().optional(),
});
// O tipo não muda depois de criada: uma aula de vídeo que virasse texto deixaria
// o vídeo dela órfão no Bunny.
export const lessonUpdateSchema = lessonCreateSchema.partial().omit({ moduleId: true, kind: true });
export type LessonCreateInput = z.infer<typeof lessonCreateSchema>;
export type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>;

// ── LearningPlan (trilha) ──────────────────────────────────────────────────--
// isTemplate / ownerUserId are NOT client-settable: the server sets them (admin
// curated => isTemplate true, owner null; member save/clone => owner = the user).
// `language` obrigatório na criação; trocar depois segue a mesma regra do curso
// (só enquanto rascunho, e sem itens do outro idioma).
export const planCreateSchema = z.object({
  slug: slugSchema.optional(),
  language: contentLanguageSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  skillsCovered: z.array(z.string().min(1)).optional(),
  displayOrder: z.number().int().optional(),
  status: contentStatusSchema.optional(),
});
export const planUpdateSchema = planCreateSchema.partial();
export type PlanCreateInput = z.infer<typeof planCreateSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;

// ── PlanModule ─────────────────────────────────────────────────────────────--
export const planModuleCreateSchema = z.object({
  planId: z.number().int().positive(),
  title: z.string().min(1),
  displayOrder: z.number().int().optional(),
});
export const planModuleUpdateSchema = planModuleCreateSchema.partial().omit({ planId: true });
export type PlanModuleCreateInput = z.infer<typeof planModuleCreateSchema>;
export type PlanModuleUpdateInput = z.infer<typeof planModuleUpdateSchema>;

// ── PlanItem ───────────────────────────────────────────────────────────────--
// The free-mix XOR, mirroring the DB CHECK: COURSE ⇒ only courseId, LESSON ⇒
// only lessonId.
export const planItemCreateSchema = z
  .object({
    planModuleId: z.number().int().positive(),
    itemType: planItemTypeSchema,
    courseId: z.number().int().positive().optional(),
    lessonId: z.number().int().positive().optional(),
    displayOrder: z.number().int().optional(),
  })
  .refine(
    (v) =>
      v.itemType === PlanItemType.COURSE
        ? v.courseId != null && v.lessonId == null
        : v.lessonId != null && v.courseId == null,
    { message: "itemType deve casar com exatamente um de courseId/lessonId" },
  );
export type PlanItemCreateInput = z.infer<typeof planItemCreateSchema>;

// PlanItem edits are reorder/move only (type + target are immutable — remove +
// re-add to change them), so this is a plain object (no XOR refine to partial).
export const planItemUpdateSchema = z.object({
  planModuleId: z.number().int().positive().optional(),
  displayOrder: z.number().int().optional(),
});
export type PlanItemUpdateInput = z.infer<typeof planItemUpdateSchema>;
