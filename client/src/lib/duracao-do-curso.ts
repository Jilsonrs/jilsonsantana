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
 * "2h 35min", "45min", "0min" — o formato curto, igual nos dois idiomas (o
 * cartão do catálogo e a página do curso: "2 módulos · 4 aulas · 1h 05min",
 * operador, 30/09/2026). Arredonda para o minuto mais próximo; com qualquer
 * vídeo, nunca diz "0min": um vídeo curto conta como 1min.
 */
export function horasEMinutos(segundos: number): string {
  if (segundos <= 0) return "0min";
  const minutos = Math.max(1, Math.round(segundos / 60));
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return horas > 0 ? `${horas}h ${String(resto).padStart(2, "0")}min` : `${resto}min`;
}

/**
 * A duração de UMA aula, ao lado dela na página da aula, como no LinkedIn
 * (operador, 06/10/2026): "48s", "1min 22s", "2min", "1h 05min". Com segundos,
 * porque aula é curta e "1min" esconderia a diferença entre 1min e 1min 59s.
 */
export function minutosESegundos(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  if (total >= 3600) return horasEMinutos(total);
  const minutos = Math.floor(total / 60);
  const resto = total % 60;
  if (minutos === 0) return `${resto}s`;
  return resto === 0 ? `${minutos}min` : `${minutos}min ${resto}s`;
}

/** "2h 35min de vídeo" — o topo do editor (formato do operador, 29/09/2026). Admin: em português. */
export function textoDaDuracao(segundos: number): string {
  return `${horasEMinutos(segundos)} de vídeo`;
}
