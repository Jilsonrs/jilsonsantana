import { LessonKind } from "@jilson/core";
import { prisma } from "./prisma.js";
import { estadoDoVideo } from "./bunny-stream.js";

type AulaComVideo = { id: number; kind: string; bunnyVideoId: string | null; bunnyVideoReady: boolean };

/**
 * Pergunta ao Bunny SÓ pelas aulas de vídeo cujo vídeo ainda não foi confirmado
 * como pronto, e grava as que ficaram prontas (decisão do operador, 29/09/2026: ao
 * voltar para o editor, a aula pronta volta recolhida, e a que ainda processa
 * volta aberta). Devolve os ids confirmados agora.
 *
 * Sem Bunny configurado, ou com o Bunny fora do ar, não confirma nada e não
 * quebra nada: a aula só volta aberta mais uma vez.
 */
export async function confirmarVideosProntos(aulas: AulaComVideo[]): Promise<Set<number>> {
  const pendentes = aulas.filter((a) => a.kind === LessonKind.VIDEO && a.bunnyVideoId && !a.bunnyVideoReady);
  const confirmadas = new Set<number>();
  await Promise.all(
    pendentes.map(async (aula) => {
      const videoId = aula.bunnyVideoId as string; // filtrado acima: nunca null aqui
      const estado = await estadoDoVideo("aulas", videoId);
      if (!estado?.pronto) return;
      // Só se a aula ainda aponta para ESTE vídeo: uma troca no meio não herda o "pronto".
      const { count } = await prisma.lesson.updateMany({
        where: { id: aula.id, bunnyVideoId: videoId },
        data: { bunnyVideoReady: true },
      });
      if (count > 0) confirmadas.add(aula.id);
    }),
  );
  return confirmadas;
}
