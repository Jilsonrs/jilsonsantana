import { z } from "zod";
import { contentStatusSchema } from "./content.js";
import { LANGUAGES } from "./site-text.js";

// Depoimentos e perguntas frequentes da home (Bloco C3). Contratos usados pelas
// rotas de admin (validação) E pelas telas (zodResolver) — uma fonte só.
//
// Mesma regra de create × update dos outros schemas (content.ts): campo com
// default no banco fica OPCIONAL no create, sem `.default()` do Zod, para que
// no update (`.partial()`) "omitido" continue significando "não mexa".
//
// Texto é aparado nas pontas: espaço ali nunca é significativo (diferente de
// senha — CLAUDE.md → Client).

const texto = (max: number) => z.string().trim().min(1, "Campo obrigatório.").max(max);

export const testimonialCreateSchema = z.object({
  language: z.enum(LANGUAGES),
  text: texto(1000),
  name: texto(120),
  displayOrder: z.number().int().optional(),
  status: contentStatusSchema.optional(),
});
export const testimonialUpdateSchema = testimonialCreateSchema.partial();
export type TestimonialCreateInput = z.infer<typeof testimonialCreateSchema>;
export type TestimonialUpdateInput = z.infer<typeof testimonialUpdateSchema>;

// "homeFaq" e não "faqItem": `faqItemSchema` já existe e é a FAQ opcional de
// CADA curso (content.ts), outra coisa com outro formato.
export const homeFaqCreateSchema = z.object({
  language: z.enum(LANGUAGES),
  question: texto(300),
  answer: texto(3000),
  displayOrder: z.number().int().optional(),
  status: contentStatusSchema.optional(),
});
export const homeFaqUpdateSchema = homeFaqCreateSchema.partial();
export type HomeFaqCreateInput = z.infer<typeof homeFaqCreateSchema>;
export type HomeFaqUpdateInput = z.infer<typeof homeFaqUpdateSchema>;
