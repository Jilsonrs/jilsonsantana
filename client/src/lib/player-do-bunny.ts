import playerjs from "player.js";

// OUVIR O PLAYER DO BUNNY. O player do Bunny fala o protocolo player.js (doc do
// Bunny, "Playback control API"): `timeupdate` traz os segundos e a duração;
// `play`, `pause` e `ended`, o que aconteceu. O pacote fica SÓ aqui: o resto do
// site não o conhece, e os testes simulam este módulo.
//
// O que a página da aula ouve:
//   - os 90% que CONCLUEM a aula (Fase 5 — decisão do operador, 03/10/2026);
//   - o FIM do vídeo, que leva à próxima aula (operador, 05/10/2026);
//   - o PONTO (o vídeo andou, pausou, voltou a tocar), gravado na conta de quem
//     assiste: quem sai e volta abre onde parou (Bloco AULA, 06/10/2026).

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
  /** O vídeo andou (tocando, ou a pessoa pulou para outro ponto): o segundo e a duração. */
  aoAndar?: (segundos: number, duracao: number) => void;
  /** Pausou, no último segundo que o player avisou. */
  aoPausar?: (segundos: number) => void;
  /** Começou ou voltou a tocar. */
  aoTocar?: () => void;
};

/** O que a tela pode fazer com o player que está ouvindo. */
export type ControleDoPlayer = {
  /** Para de ouvir. */
  parar: () => void;
  /**
   * Leva o vídeo a este segundo, SÓ se ele estiver pausado (25/10/2026: outro aparelho andou
   * com a aula enquanto esta aba esperava). Quem decide é o próprio player (`getPaused`), não
   * os avisos de pausa, que no iPhone falharam. Pulando, avisa o ponto novo como se o vídeo
   * tivesse andado: é o que leva a gravação e o envio da saída para ele.
   */
  irParaSePausado: (segundos: number) => void;
};

/** Ouve o player no iframe. Devolve o controle (parar de ouvir, pular se pausado). */
export function ouvirPlayer(iframe: HTMLIFrameElement, ouvintes: OuvintesDoPlayer): ControleDoPlayer {
  const player = new playerjs.Player(iframe);
  let parado = false;
  let concluiu = false;
  let segundos = 0;
  let duracao = 0;
  const concluir = () => {
    if (parado || concluiu) return;
    concluiu = true;
    ouvintes.aoConcluir?.();
  };
  const aoAtualizar = (dados: unknown) => {
    const tempo = tempoAssistido(dados);
    if (!tempo || parado) return;
    segundos = tempo.segundos;
    duracao = tempo.duracao;
    ouvintes.aoAndar?.(tempo.segundos, tempo.duracao);
    if (chegouAoFim(tempo.segundos, tempo.duracao)) concluir();
  };
  const aoPausar = () => {
    if (!parado) ouvintes.aoPausar?.(segundos);
  };
  const aoTocar = () => {
    if (!parado) ouvintes.aoTocar?.();
  };
  const aoFim = () => {
    if (parado) return;
    concluir();
    ouvintes.aoTerminar?.();
  };
  player.on("timeupdate", aoAtualizar);
  player.on("pause", aoPausar);
  player.on("play", aoTocar);
  player.on("ended", aoFim);
  const irParaSePausado = (alvo: number) => {
    if (parado) return;
    player.getPaused((pausado) => {
      if (parado || !pausado) return;
      player.setCurrentTime(alvo);
      segundos = alvo;
      if (duracao > 0) ouvintes.aoAndar?.(alvo, duracao);
    });
  };
  const parar = () => {
    parado = true;
    // A pessoa saiu da aula (a passagem automática, ou o clique em outra): o iframe
    // JÁ SAIU da página quando isto roda, e o `player.js`, ao parar de ouvir, manda
    // uma mensagem para a janela dele, que não existe mais — o erro derrubava a
    // próxima aula na tela de erro (achado do operador, 06/10/2026). Com `parado`,
    // nenhum aviso que ainda chegue faz nada; então, sem a janela, não há o que avisar.
    if (!iframe.isConnected || !iframe.contentWindow) return;
    try {
      player.off("timeupdate", aoAtualizar);
      player.off("pause", aoPausar);
      player.off("play", aoTocar);
      player.off("ended", aoFim);
    } catch {
      // O iframe pode sair da página no meio; parar de ouvir nunca derruba a tela.
    }
  };
  return { parar, irParaSePausado };
}
