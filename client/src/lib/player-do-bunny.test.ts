import { describe, it, expect, vi, beforeEach } from "vitest";

// Este módulo É a fronteira com o pacote `player.js`, então aqui (e só aqui) o
// pacote vira dublê: um player que guarda os ouvintes para o teste disparar.
const ouvintes = new Map<string, (dados?: unknown) => void>();
const off = vi.fn();
vi.mock("player.js", () => ({
  default: {
    Player: class {
      on(evento: string, ouvinte: (dados?: unknown) => void) {
        ouvintes.set(evento, ouvinte);
      }
      off(evento: string) {
        off(evento);
        ouvintes.delete(evento);
      }
    },
  },
}));

import { chegouAoFim, ouvirPlayer } from "./player-do-bunny";

// Cast: o player de mentira não lê o iframe; o que importa aqui é que ele ainda
// está na página (sair da página tem teste próprio, com o player.js de verdade).
const iframe = { isConnected: true, contentWindow: {} } as HTMLIFrameElement;
const assistiu = (seconds: number, duration: number) => ouvintes.get("timeupdate")?.({ seconds, duration });

beforeEach(() => {
  ouvintes.clear();
  off.mockReset();
});

describe("chegouAoFim", () => {
  it("89% não; 90% sim; duração desconhecida nunca", () => {
    expect(chegouAoFim(89, 100)).toBe(false);
    expect(chegouAoFim(90, 100)).toBe(true);
    expect(chegouAoFim(5, 0)).toBe(false);
  });
});

// A AULA EM VÍDEO CONCLUI AOS 90% (decisão do operador, 03/10/2026), uma vez só.
describe("ouvirPlayer — concluir", () => {
  it("a 89% não conclui; a 90% conclui, e uma vez só", () => {
    const aoConcluir = vi.fn();
    ouvirPlayer(iframe, { aoConcluir });

    assistiu(89, 100);
    expect(aoConcluir).not.toHaveBeenCalled();

    assistiu(90, 100);
    assistiu(95, 100);
    ouvintes.get("ended")?.();
    expect(aoConcluir).toHaveBeenCalledTimes(1);
  });

  it("pulou para o fim: o vídeo terminou, conclui", () => {
    const aoConcluir = vi.fn();
    ouvirPlayer(iframe, { aoConcluir });
    ouvintes.get("ended")?.();
    expect(aoConcluir).toHaveBeenCalledTimes(1);
  });

  it("dado estranho do player não conclui nem quebra", () => {
    const aoConcluir = vi.fn();
    const aoAndar = vi.fn();
    ouvirPlayer(iframe, { aoConcluir, aoAndar });

    ouvintes.get("timeupdate")?.("90");
    ouvintes.get("timeupdate")?.({ seconds: "95", duration: 100 });
    ouvintes.get("timeupdate")?.(null);

    expect(aoConcluir).not.toHaveBeenCalled();
    expect(aoAndar).not.toHaveBeenCalled();
  });
});

// O FIM leva à próxima aula (05/10/2026); o PONTO vai para a conta (Bloco AULA, 06/10/2026).
describe("ouvirPlayer — o fim, o ponto e a pausa", () => {
  it("o fim avisa \"terminou\"; os 90% não", () => {
    const aoTerminar = vi.fn();
    ouvirPlayer(iframe, { aoTerminar });
    assistiu(95, 100);
    expect(aoTerminar).not.toHaveBeenCalled();
    ouvintes.get("ended")?.();
    expect(aoTerminar).toHaveBeenCalledTimes(1);
  });

  it("andou, pausou, voltou a tocar: o segundo e a duração; a pausa no último segundo avisado", () => {
    const aoAndar = vi.fn();
    const aoPausar = vi.fn();
    const aoTocar = vi.fn();
    ouvirPlayer(iframe, { aoAndar, aoPausar, aoTocar });

    assistiu(42, 100);
    ouvintes.get("pause")?.();
    ouvintes.get("play")?.();

    expect(aoAndar).toHaveBeenCalledWith(42, 100);
    expect(aoPausar).toHaveBeenCalledWith(42);
    expect(aoTocar).toHaveBeenCalledTimes(1);
  });

  it("depois de parar de ouvir, nada mais chega", () => {
    const aoConcluir = vi.fn();
    const aoTerminar = vi.fn();
    const aoAndar = vi.fn();
    const aoPausar = vi.fn();
    const aoTocar = vi.fn();
    const parar = ouvirPlayer(iframe, { aoConcluir, aoTerminar, aoAndar, aoPausar, aoTocar });
    const [tempo, fim, pausa, play] = [ouvintes.get("timeupdate"), ouvintes.get("ended"), ouvintes.get("pause"), ouvintes.get("play")];

    parar();
    tempo?.({ seconds: 99, duration: 100 });
    fim?.();
    pausa?.();
    play?.();

    expect(off).toHaveBeenCalledWith("timeupdate");
    expect(off).toHaveBeenCalledWith("ended");
    expect(off).toHaveBeenCalledWith("pause");
    expect(off).toHaveBeenCalledWith("play");
    expect(aoConcluir).not.toHaveBeenCalled();
    expect(aoTerminar).not.toHaveBeenCalled();
    expect(aoAndar).not.toHaveBeenCalled();
    expect(aoPausar).not.toHaveBeenCalled();
    expect(aoTocar).not.toHaveBeenCalled();
  });
});
