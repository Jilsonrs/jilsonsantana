import { z } from "zod";
import { Level, ContentStatus, Layer, PlanItemType } from "../constants/content.js";

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

// kebab-case slug (matches the public /curso/:slug, /trilha/:slug routes).
export const slugSchema = z
  .string()
  .min(1)
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

// ── Course ───────────────────────────────────────────────────────────────────
export const courseCreateSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  level: levelSchema.optional(),
  learnTags: z.array(z.string().min(1)).optional(),
  requirements: z.array(z.string().min(1)).optional(),
  personas: z.array(z.string().min(1)).optional(),
  highlights: z.array(highlightSchema).optional(),
  faq: z.array(faqItemSchema).optional(),
  camadas: z.array(layerSchema).optional(),
  camadaOverride: camadaOverrideSchema.optional(),
  thumbnailUrl: z.string().url().optional(),
  introVideoId: z.string().optional(),
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

// ── Lesson ─────────────────────────────────────────────────────────────────--
export const lessonCreateSchema = z.object({
  moduleId: z.number().int().positive(),
  title: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
  displayOrder: z.number().int().optional(),
  status: contentStatusSchema.optional(),
});
export const lessonUpdateSchema = lessonCreateSchema.partial().omit({ moduleId: true });
export type LessonCreateInput = z.infer<typeof lessonCreateSchema>;
export type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>;

// ── LearningPlan (trilha) ──────────────────────────────────────────────────--
// isTemplate / ownerUserId are NOT client-settable: the server sets them (admin
// curated => isTemplate true, owner null; member save/clone => owner = the user).
export const planCreateSchema = z.object({
  slug: slugSchema.optional(),
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
