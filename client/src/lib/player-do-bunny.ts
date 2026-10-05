import playerjs from "player.js";

// OUVIR O PLAYER DO BUNNY. O player do Bunny fala o protocolo player.js (doc do
// Bunny, "Playback control API"): `timeupdate` traz os segundos e a duração;
// `play`, `pause` e `ended`, o que aconteceu. O pacote fica SÓ aqui: o resto do
// site não o conhece, e os testes simulam este módulo.
//
// O que a página da aula ouve:
//   - os 90% que CONCLUEM a aula (Fase 5 — decisão do operador, 03/10/2026);
//   - o FIM do vídeo, que leva à próxima aula (operador, 05/10/2026);
//   - o PONTO e a PAUSA, para quem sair e voltar abrir onde parou (05/10/2026).

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

export type OuvintesDoPlayer = {
  /** UMA vez: aos 90% do vídeo, ou no fim (quem pula para o fim também conclui). */
  aoConcluir?: () => void;
  /** O vídeo terminou. */
  aoTerminar?: () => void;
  /** O ponto e se está pausado, a cada mudança (tocando, pausou, voltou a tocar). */
  aoMudar?: (estado: { segundos: number; pausado: boolean }) => void;
};

/** Ouve o player no iframe. Devolve a função que para de ouvir. */
export function ouvirPlayer(iframe: HTMLIFrameElement, { aoConcluir, aoTerminar, aoMudar }: OuvintesDoPlayer): () => void {
  const player = new playerjs.Player(iframe);
  let parado = false;
  let concluiu = false;
  let segundos = 0;
  const concluir = () => {
    if (parado || concluiu) return;
    concluiu = true;
    aoConcluir?.();
  };
  const aoAtualizar = (dados: unknown) => {
    const tempo = tempoAssistido(dados);
    if (!tempo || parado) return;
    segundos = tempo.segundos;
    aoMudar?.({ segundos, pausado: false });
    if (chegouAoFim(tempo.segundos, tempo.duracao)) concluir();
  };
  const aoPausar = () => {
    if (!parado) aoMudar?.({ segundos, pausado: true });
  };
  const aoTocar = () => {
    if (!parado) aoMudar?.({ segundos, pausado: false });
  };
  const aoFim = () => {
    if (parado) return;
    concluir();
    aoTerminar?.();
  };
  player.on("timeupdate", aoAtualizar);
  player.on("pause", aoPausar);
  player.on("play", aoTocar);
  player.on("ended", aoFim);
  return () => {
    parado = true;
    player.off("timeupdate", aoAtualizar);
    player.off("pause", aoPausar);
    player.off("play", aoTocar);
    player.off("ended", aoFim);
  };
}
