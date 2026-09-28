import { ContentStatus, LessonKind, contarPalavras, MINIMO_DE_PALAVRAS_DA_DESCRICAO } from "@jilson/core";
import type { AdminCourseCard, AdminCourseDetail, AdminModule } from "@/lib/api";

// O PREENCHIMENTO do curso: no cartão da lista do admin (plano aprovado pelo
// operador em 27/09/2026 — no lugar do "Concluir seu curso" da Udemy) e no passo
// Publicar do editor (28/09). Calculado dos campos que o curso já tem; o vídeo de
// cada aula entra como quinto item na etapa 3 do Bloco U. Admin fica em
// português, com o texto aqui (decisão de 23/09).

type CamposDoPreenchimento = Pick<
  AdminCourseCard,
  "thumbnailUrl" | "hasIntroVideo" | "descriptionWordCount" | "publishedLessonCount" | "lessonsWithoutVideo"
>;

/** Aulas publicadas NA CADEIA: aula publicada dentro de módulo publicado. */
export function contarAulasPublicadas(modulos: AdminModule[]): number {
  return modulos
    .filter((m) => m.status === ContentStatus.PUBLISHED)
    .reduce((soma, m) => soma + m.lessons.filter((l) => l.status === ContentStatus.PUBLISHED).length, 0);
}

/** Os mesmos campos do cartão, montados do curso inteiro (o editor tem o curso, não o cartão). */
export function camposDoCurso(curso: AdminCourseDetail): CamposDoPreenchimento {
  return {
    thumbnailUrl: curso.thumbnailUrl,
    hasIntroVideo: curso.introVideoId !== null,
    descriptionWordCount: contarPalavras(curso.description),
    publishedLessonCount: contarAulasPublicadas(curso.modules),
    lessonsWithoutVideo: curso.modules
      .filter((m) => m.status === ContentStatus.PUBLISHED)
      .flatMap((m) => m.lessons)
      .filter((l) => l.status === ContentStatus.PUBLISHED && l.kind === LessonKind.VIDEO && !l.bunnyVideoId).length,
  };
}

// O quinto item (Bloco A, entra com o vídeo das aulas — 28/09/2026): aula de
// VÍDEO publicada sem o vídeo. Aula de texto não conta. Curso sem aula publicada
// NÃO ganha este item de graça (sairia com 20% sem nada preenchido), e o que
// falta ali já é "Nenhuma aula publicada": sem mensagem repetida.
function faltaNosVideos(quantas: number): string | null {
  if (quantas === 0) return null;
  return quantas === 1 ? "1 aula sem vídeo" : `${quantas} aulas sem vídeo`;
}

// Descrição com menos de 200 palavras conta como FALTA, sem impedir o salvar
// (decisão do operador, 28/09/2026).
function faltaNaDescricao(palavras: number): string {
  return palavras === 0 ? "Falta a descrição" : `Descrição curta (menos de ${MINIMO_DE_PALAVRAS_DA_DESCRICAO} palavras)`;
}

export function preenchimentoDoCurso(curso: CamposDoPreenchimento): { porcentagem: number; faltando: string[] } {
  const itens = [
    { ok: Boolean(curso.thumbnailUrl), falta: "Falta a capa" },
    { ok: curso.hasIntroVideo, falta: "Falta o vídeo de apresentação" },
    {
      ok: curso.descriptionWordCount >= MINIMO_DE_PALAVRAS_DA_DESCRICAO,
      falta: faltaNaDescricao(curso.descriptionWordCount),
    },
    { ok: curso.publishedLessonCount > 0, falta: "Nenhuma aula publicada" },
    {
      ok: curso.publishedLessonCount > 0 && curso.lessonsWithoutVideo === 0,
      falta: faltaNosVideos(curso.lessonsWithoutVideo),
    },
  ];
  const feitos = itens.filter((item) => item.ok).length;
  return {
    porcentagem: Math.round((feitos / itens.length) * 100),
    faltando: itens.filter((item) => !item.ok).flatMap((item) => (item.falta ? [item.falta] : [])),
  };
}

/** O status do curso em português: o valor do banco (enum) nunca aparece na tela. */
export const ROTULO_DO_STATUS: Record<ContentStatus, string> = {
  PUBLISHED: "Publicado",
  DRAFT: "Rascunho",
  ARCHIVED: "Arquivado",
};
