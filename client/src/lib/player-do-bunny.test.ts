import { describe, it, expect, vi, beforeEach } from "vitest";

// Este módulo É a fronteira com o pacote `player.js`, então aqui (e só aqui) o
// pacote vira dublê: um player que guarda os ouvintes para o teste disparar.
const ouvintes = new Map<string, (dados: unknown) => void>();
const off = vi.fn();
vi.mock("player.js", () => ({
  default: {
    Player: class {
      on(evento: string, ouvinte: (dados: unknown) => void) {
        ouvintes.set(evento, ouvinte);
      }
      off(evento: string) {
        off(evento);
        ouvintes.delete(evento);
      }
    },
  },
}));

import { chegouAoFim, ouvirConclusao } from "./player-do-bunny";

// A AULA EM VÍDEO CONCLUI AOS 90% (decisão do operador, 03/10/2026), uma vez só.
const iframe = {} as HTMLIFrameElement; // Cast: o player de mentira não lê o iframe.
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

describe("ouvirConclusao", () => {
  it("a 89% não conclui; a 90% conclui, e uma vez só", () => {
    const aoConcluir = vi.fn();
    ouvirConclusao(iframe, aoConcluir);

    assistiu(89, 100);
    expect(aoConcluir).not.toHaveBeenCalled();

    assistiu(90, 100);
    assistiu(95, 100);
    ouvintes.get("ended")?.(undefined);
    expect(aoConcluir).toHaveBeenCalledTimes(1);
  });

  it("pulou para o fim: o vídeo terminou, conclui", () => {
    const aoConcluir = vi.fn();
    ouvirConclusao(iframe, aoConcluir);

    ouvintes.get("ended")?.(undefined);

    expect(aoConcluir).toHaveBeenCalledTimes(1);
  });

  it("dado estranho do player não conclui nem quebra", () => {
    const aoConcluir = vi.fn();
    ouvirConclusao(iframe, aoConcluir);

    ouvintes.get("timeupdate")?.("90");
    ouvintes.get("timeupdate")?.({ seconds: "95", duration: 100 });
    ouvintes.get("timeupdate")?.(null);

    expect(aoConcluir).not.toHaveBeenCalled();
  });

  it("depois de parar de ouvir, nada conclui", () => {
    const aoConcluir = vi.fn();
    const parar = ouvirConclusao(iframe, aoConcluir);
    const ultimoTimeupdate = ouvintes.get("timeupdate");

    parar();
    ultimoTimeupdate?.({ seconds: 99, duration: 100 });

    expect(off).toHaveBeenCalledWith("timeupdate");
    expect(off).toHaveBeenCalledWith("ended");
    expect(aoConcluir).not.toHaveBeenCalled();
  });
});
