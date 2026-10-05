import { ContentStatus, LessonKind } from "@jilson/core";
import { prisma } from "./prisma.js";

// "ESTE CURSO INCLUI" — as linhas que se calculam sozinhas (decisões do operador:
// os arquivos em 04/10/2026; horas de vídeo, artigos, aulas grátis e legendas em
// 05/10/2026). Cada uma só aparece quando existe. Uma função só, para a página de
// venda, a página da aula e a prévia contarem do mesmo jeito.
//
// Quais aulas contam: o aluno e o visitante, só a cadeia PUBLICADA (aula publicada
// em módulo publicado — o curso, quem chama já conferiu); o admin, todas, como a
// lista de aulas que ele vê. Só números e sim/não: nome de aula ou de arquivo não sai.

export type OQueOCursoInclui = {
  /** Soma das aulas de VÍDEO (a aula de texto não leva o tempo do vídeo antigo). */
  segundosDeVideo: number;
  /** Aulas de texto. */
  artigos: number;
  /** Aulas marcadas como prévia grátis. */
  aulasGratis: number;
  /** Alguma aula tem arquivo para baixar. */
  arquivos: boolean;
  /** TODAS as aulas de vídeo têm legenda em dia (a que precisa ser reenviada não conta). */
  legendas: boolean;
};

export async function oQueOCursoInclui(courseId: number, soPublicado: boolean): Promise<OQueOCursoInclui> {
  const PUBLISHED = ContentStatus.PUBLISHED;
  const where = soPublicado ? { status: PUBLISHED, module: { courseId, status: PUBLISHED } } : { module: { courseId } };
  const aulas = await prisma.lesson.findMany({
    where,
    select: {
      kind: true,
      isFreePreview: true,
      videoDurationSeconds: true,
      caption: { select: { needsResend: true } },
      _count: { select: { files: true } },
    },
  });
  const videos = aulas.filter((a) => a.kind === LessonKind.VIDEO);
  return {
    segundosDeVideo: videos.reduce((total, a) => total + (a.videoDurationSeconds ?? 0), 0),
    artigos: aulas.filter((a) => a.kind === LessonKind.TEXT).length,
    aulasGratis: aulas.filter((a) => a.isFreePreview).length,
    arquivos: aulas.some((a) => a._count.files > 0),
    legendas: videos.length > 0 && videos.every((a) => a.caption !== null && !a.caption.needsResend),
  };
}
