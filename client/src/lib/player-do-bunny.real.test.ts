// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { ouvirPlayer } from "./player-do-bunny";

// SAIR DE UMA AULA DE VÍDEO NÃO PODE DERRUBAR A PRÓXIMA (achado do operador,
// 06/10/2026: a passagem automática e a troca de aula abriam a tela de erro). Aqui
// o pacote `player.js` é o DE VERDADE — o arquivo irmão o troca por dublê, e foi por
// isso que o defeito passou: ao parar de ouvir, o `player.js` manda uma mensagem
// para a janela do iframe, que já saiu da página e não existe mais.

const ORIGEM = "https://iframe.mediadelivery.net";
const ENDERECO = `${ORIGEM}/embed/762605/aaa?token=t&expires=4102444800`;

/** O player avisa que está pronto, como o do Bunny faz depois de carregar. */
function playerPronto(iframe: HTMLIFrameElement) {
  window.dispatchEvent(
    new MessageEvent("message", {
      origin: ORIGEM,
      data: JSON.stringify({ context: "player.js", version: "0.0.11", event: "ready", value: { src: iframe.src } }),
    }),
  );
}

describe("ouvirPlayer com o player.js de verdade", () => {
  it("o iframe saiu da página (a pessoa foi para outra aula): parar de ouvir não quebra", () => {
    const iframe = document.createElement("iframe");
    iframe.src = ENDERECO;
    document.body.appendChild(iframe);
    const pararDeOuvir = ouvirPlayer(iframe, { aoTerminar: () => {}, aoAndar: () => {}, aoPausar: () => {} });
    playerPronto(iframe);

    iframe.remove(); // o React tira o iframe da página antes de limpar o efeito
    expect(() => pararDeOuvir()).not.toThrow();
  });

  it("com o iframe ainda na página (troca de vídeo na mesma aula), também não quebra", () => {
    const iframe = document.createElement("iframe");
    iframe.src = ENDERECO;
    document.body.appendChild(iframe);
    const pararDeOuvir = ouvirPlayer(iframe, { aoTerminar: () => {} });
    playerPronto(iframe);
    expect(() => pararDeOuvir()).not.toThrow();
    iframe.remove();
  });
});
