import { LessonKind } from "@jilson/core";
import { prisma } from "./prisma.js";
import { estadoDoVideo } from "./bunny-stream.js";

type AulaComVideo = {
  id: number;
  kind: string;
  bunnyVideoId: string | null;
  bunnyVideoReady: boolean;
  videoDurationSeconds: number | null;
};

/** O que foi lembrado agora de uma aula: o vídeo está pronto, e quanto ele dura. */
export type VideoConfirmado = { bunnyVideoReady: true; videoDurationSeconds: number | null };

/**
 * Pergunta ao Bunny SÓ pelas aulas de vídeo cujo vídeo ainda não foi confirmado
 * como pronto — ou que estão prontas mas ainda sem DURAÇÃO — e grava as que
 * ficaram prontas, com a duração (decisões do operador, 29/09/2026: ao voltar
 * para o editor, a aula pronta volta recolhida; e o topo do editor soma a
 * duração dos vídeos). É isto que preenche a duração dos vídeos que já existiam
 * antes da coluna. Devolve o que foi gravado agora, por aula.
 *
 * Sem Bunny configurado, ou com o Bunny fora do ar, não confirma nada e não
 * quebra nada: a aula só volta aberta mais uma vez.
 */
export async function confirmarVideosProntos(aulas: AulaComVideo[]): Promise<Map<number, VideoConfirmado>> {
  const pendentes = aulas.filter(
    (a) => a.kind === LessonKind.VIDEO && a.bunnyVideoId && (!a.bunnyVideoReady || a.videoDurationSeconds === null),
  );
  const confirmadas = new Map<number, VideoConfirmado>();
  await Promise.all(
    pendentes.map(async (aula) => {
      const videoId = aula.bunnyVideoId as string; // filtrado acima: nunca null aqui
      const estado = await estadoDoVideo("aulas", videoId);
      if (!estado?.pronto) return;
      const lembrado: VideoConfirmado = { bunnyVideoReady: true, videoDurationSeconds: estado.duracaoEmSegundos ?? null };
      // Só se a aula ainda aponta para ESTE vídeo: uma troca no meio não herda o
      // "pronto" nem a duração.
      const { count } = await prisma.lesson.updateMany({
        where: { id: aula.id, bunnyVideoId: videoId },
        data: lembrado,
      });
      if (count > 0) confirmadas.set(aula.id, lembrado);
    }),
  );
  return confirmadas;
}
