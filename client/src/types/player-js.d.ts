// O pacote `player.js` (Embedly, 0.1.0) não traz tipos. Só o que o nosso módulo
// usa (`client/src/lib/player-do-bunny.ts`); o resto do site não importa o pacote.
declare module "player.js" {
  type Ouvinte = (dados: unknown) => void;
  class Player {
    constructor(iframe: HTMLIFrameElement);
    on(evento: string, ouvinte: Ouvinte): void;
    off(evento: string, ouvinte?: Ouvinte): void;
  }
  const playerjs: { Player: typeof Player };
  export default playerjs;
}
