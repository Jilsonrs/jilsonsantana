import { z } from "zod";
import {
  ContentStatus,
  slugSchema,
  levelSchema,
  contentStatusSchema,
  layerSchema,
  highlightSchema,
  faqItemSchema,
  contentLanguageSchema,
  type CourseCreateInput,
} from "@jilson/core";
import type { AdminCourseDetail } from "@/lib/api";
import { fromLines, toLines } from "@/lib/array-field";

// A LÓGICA do formulário de curso do admin: o schema da tela, os valores em
// branco e as duas conversões (curso → formulário, formulário → API). Separada
// da página para ela ficar só compondo as seções (CLAUDE.md → Component
// discipline).

export const courseFormSchema = z.object({
  slug: slugSchema,
  language: contentLanguageSchema,
  title: z.string().min(1, "Obrigatório"),
  subtitle: z.string(),
  description: z.string(),
  level: z.union([levelSchema, z.literal("")]),
  learnTagsText: z.string(),
  requirementsText: z.string(),
  personasText: z.string(),
  highlights: z.array(highlightSchema),
  faq: z.array(faqItemSchema),
  camadas: z.array(layerSchema),
  thumbnailUrl: z.string(),
  introVideoId: z.string(),
  displayOrder: z.coerce.number().int(),
  status: contentStatusSchema,
});

export type CourseFormValues = z.infer<typeof courseFormSchema>;

export const blankValues: CourseFormValues = {
  slug: "",
  // Curso novo nasce em português — a escola nasceu em PT. O operador troca no
  // campo Idioma enquanto o curso é rascunho.
  language: "pt",
  title: "",
  subtitle: "",
  description: "",
  level: "",
  learnTagsText: "",
  requirementsText: "",
  personasText: "",
  highlights: [],
  faq: [],
  camadas: [],
  thumbnailUrl: "",
  introVideoId: "",
  displayOrder: 0,
  status: ContentStatus.DRAFT,
};

export function toFormValues(course: AdminCourseDetail): CourseFormValues {
  return {
    slug: course.slug,
    language: course.language,
    title: course.title,
    subtitle: course.subtitle ?? "",
    description: course.description ?? "",
    level: course.level ?? "",
    learnTagsText: toLines(course.learnTags),
    requirementsText: toLines(course.requirements),
    personasText: toLines(course.personas),
    highlights: course.highlights ?? [],
    faq: course.faq ?? [],
    camadas: course.camadas,
    thumbnailUrl: course.thumbnailUrl ?? "",
    introVideoId: course.introVideoId ?? "",
    displayOrder: course.displayOrder,
    status: course.status,
  };
}

// camadaOverride is intentionally NOT round-tripped here (out of scope —
// CLAUDE.md: it's the exception, not the routine); omitting it from the
// payload leaves it untouched server-side (update schema treats an omitted
// field as "leave unchanged", not "reset").
export function toPayload(values: CourseFormValues): CourseCreateInput {
  return {
    slug: values.slug,
    language: values.language,
    title: values.title,
    subtitle: values.subtitle.trim() || undefined,
    description: values.description.trim() || undefined,
    level: values.level === "" ? undefined : values.level,
    learnTags: fromLines(values.learnTagsText),
    requirements: fromLines(values.requirementsText),
    personas: fromLines(values.personasText),
    highlights: values.highlights.filter((h) => h.icon.trim() && h.title.trim() && h.text.trim()),
    faq: values.faq.filter((f) => f.pergunta.trim() && f.resposta.trim()),
    camadas: values.camadas,
    thumbnailUrl: values.thumbnailUrl.trim() || undefined,
    introVideoId: values.introVideoId.trim() || undefined,
    displayOrder: values.displayOrder,
    status: values.status,
  };
}

/**
 * O código de erro que o servidor devolve (`{ error: "SlugTaken" }`), lido do
 * erro do Axios sem depender do Axios aqui: basta a forma `response.data.error`.
 */
export function codigoDoErro(erro: unknown): string | undefined {
  if (typeof erro !== "object" || erro === null || !("response" in erro)) return undefined;
  // Seguro: a linha acima provou que é um objeto com `response`; o resto é opcional.
  const codigo = (erro as { response?: { data?: { error?: unknown } } }).response?.data?.error;
  return typeof codigo === "string" ? codigo : undefined;
}

/**
 * A frase que o formulário mostra quando o salvamento falha. Antes a tela não
 * dizia nada, e a falha passava despercebida (achado da etapa 3c, 24/09/2026).
 * Admin fica em português, com o texto aqui (decisão do operador, 23/09).
 */
export function mensagemDeErroAoSalvar(erro: unknown): string {
  switch (codigoDoErro(erro)) {
    case "SlugTaken":
      return "Este slug já está em uso por outro curso.";
    case "LanguageLocked":
      return "O idioma trava depois que o curso é publicado.";
    case "LanguageInUse":
      return "Este curso está numa trilha de outro idioma. Tire-o da trilha antes de trocar o idioma.";
    default:
      return "Não foi possível salvar o curso. Tente de novo.";
  }
}
