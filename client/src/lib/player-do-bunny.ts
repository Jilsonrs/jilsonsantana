import playerjs from "player.js";

// OUVIR O PLAYER DO BUNNY (Fase 5 — decisão do operador, 03/10/2026: a aula em
// vídeo conta como concluída sozinha, ao chegar a 90%). O player do Bunny fala o
// protocolo player.js (doc do Bunny, "Playback control API"): o evento
// `timeupdate` traz os segundos assistidos e a duração; `ended`, o fim. O pacote
// fica SÓ aqui: o resto do site não o conhece, e os testes simulam este módulo.

/** A partir de quanto do vídeo a aula conta como concluída. */
export const PARTE_QUE_CONCLUI = 0.9;

/** Chegou aos 90%? Duração desconhecida (zero) nunca conclui. */
export function chegouAoFim(segundos: number, duracao: number): boolean {
  return duracao > 0 && segundos / duracao >= PARTE_QUE_CONCLUI;
}

function tempoAssistido(dados: unknown): { segundos: number; duracao: number } | null {
  if (typeof dados !== "object" || dados === null) return null;
  // Seguro: a linha acima provou que é um objeto; os dois campos são conferidos abaixo.
  const { seconds, duration } = dados as { seconds?: unknown; duration?: unknown };
  return typeof seconds === "number" && typeof duration === "number" ? { segundos: seconds, duracao: duration } : null;
}

/**
 * Ouve o player no iframe e chama `aoConcluir` UMA vez: quando o aluno chega a
 * 90% do vídeo, ou quando o vídeo termina (quem pula para o fim também conclui).
 * Devolve a função que para de ouvir.
 */
export function ouvirConclusao(iframe: HTMLIFrameElement, aoConcluir: () => void): () => void {
  const player = new playerjs.Player(iframe);
  let encerrado = false;
  const concluir = () => {
    if (encerrado) return;
    encerrado = true;
    aoConcluir();
  };
  const aoAtualizar = (dados: unknown) => {
    const tempo = tempoAssistido(dados);
    if (tempo && chegouAoFim(tempo.segundos, tempo.duracao)) concluir();
  };
  const aoTerminar = () => concluir();
  player.on("timeupdate", aoAtualizar);
  player.on("ended", aoTerminar);
  return () => {
    encerrado = true;
    player.off("timeupdate", aoAtualizar);
    player.off("ended", aoTerminar);
  };
}
