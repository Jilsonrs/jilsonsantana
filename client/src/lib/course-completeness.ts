import type { AdminCourseCard } from "@/lib/api";
import type { ContentStatus } from "@jilson/core";

// O PREENCHIMENTO do curso, no cartão da lista do admin (plano aprovado pelo
// operador em 27/09/2026 — no lugar do "Concluir seu curso" da Udemy). Calculado
// dos campos que o curso já tem; o vídeo de cada aula entra como quinto item na
// etapa 3 do Bloco U. Admin fica em português, com o texto aqui (decisão de 23/09).

type CamposDoPreenchimento = Pick<
  AdminCourseCard,
  "thumbnailUrl" | "hasIntroVideo" | "hasDescription" | "publishedLessonCount"
>;

export function preenchimentoDoCurso(curso: CamposDoPreenchimento): { porcentagem: number; faltando: string[] } {
  const itens = [
    { ok: Boolean(curso.thumbnailUrl), falta: "Falta a capa" },
    { ok: curso.hasIntroVideo, falta: "Falta o vídeo de apresentação" },
    { ok: curso.hasDescription, falta: "Falta a descrição" },
    { ok: curso.publishedLessonCount > 0, falta: "Nenhuma aula publicada" },
  ];
  const feitos = itens.filter((item) => item.ok).length;
  return {
    porcentagem: Math.round((feitos / itens.length) * 100),
    faltando: itens.filter((item) => !item.ok).map((item) => item.falta),
  };
}

/** O status do curso em português: o valor do banco (enum) nunca aparece na tela. */
export const ROTULO_DO_STATUS: Record<ContentStatus, string> = {
  PUBLISHED: "Publicado",
  DRAFT: "Rascunho",
  ARCHIVED: "Arquivado",
};
