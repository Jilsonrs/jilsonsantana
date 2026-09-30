import { LessonKind } from "@jilson/core";
import type { AdminModule } from "@/lib/api";

/**
 * A DURAÇÃO DO CURSO no topo do editor (decisão do operador, 29/09/2026, a partir
 * da Udemy): a soma de TODO vídeo enviado — aula de vídeo com vídeo, de qualquer
 * status, inclusive rascunho. A aula de texto não conta. Vídeo que o Bunny ainda
 * processa entra quando a duração dele chegar.
 *
 * É SOMA, nunca coluna (`courses.md` → derivados): o que o banco guarda é a
 * duração de cada aula.
 */
export function segundosDeVideo(modulos: AdminModule[]): number {
  return modulos
    .flatMap((m) => m.lessons)
    .filter((l) => l.kind === LessonKind.VIDEO && l.bunnyVideoId)
    .reduce((total, l) => total + (l.videoDurationSeconds ?? 0), 0);
}

/**
 * "2h 35min de vídeo", "45min de vídeo", "0min de vídeo" (formato do operador,
 * 29/09/2026). Arredonda para o minuto mais próximo; com qualquer vídeo, nunca
 * diz "0min": um vídeo curto conta como 1min.
 */
export function textoDaDuracao(segundos: number): string {
  if (segundos <= 0) return "0min de vídeo";
  const minutos = Math.max(1, Math.round(segundos / 60));
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return horas > 0 ? `${horas}h ${String(resto).padStart(2, "0")}min de vídeo` : `${resto}min de vídeo`;
}
