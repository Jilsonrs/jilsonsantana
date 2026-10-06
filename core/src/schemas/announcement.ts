import { z } from "zod";

// COMUNICAÇÃO → NOTIFICAÇÕES (bloco C1 — decisões do operador, 06/10/2026): o aviso
// que o operador escreve. Contrato da rota de admin (validação) E da tela
// (zodResolver) — uma fonte só. Texto aparado nas pontas.
//
// Para quem: TODOS = todo mundo com conta; CURSO = quem já começou aquele curso.

export const ANNOUNCEMENT_AUDIENCES = ["TODOS", "CURSO"] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

/** O título cabe no sino; o texto, o mesmo limite das mensagens do curso. */
export const LIMITES_DO_AVISO = { titulo: 120, texto: 2000 } as const;

const texto = (max: number) =>
  z.string().trim().min(1, "Campo obrigatório.").max(max, `Use no máximo ${max} caracteres.`);

export const announcementSchema = z
  .object({
    title: texto(LIMITES_DO_AVISO.titulo),
    body: texto(LIMITES_DO_AVISO.texto),
    audience: z.enum(ANNOUNCEMENT_AUDIENCES),
    courseId: z.number().int().positive().nullable().optional(),
  })
  .refine((a) => a.audience !== "CURSO" || (a.courseId !== null && a.courseId !== undefined), {
    message: "Escolha o curso.",
    path: ["courseId"],
  });
export type AnnouncementInput = z.infer<typeof announcementSchema>;
