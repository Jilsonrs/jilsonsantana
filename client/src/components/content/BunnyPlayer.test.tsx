// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// O player do Bunny é ouvido pelo NOSSO módulo; aqui ele vira dublê.
const ouvirPlayer = vi.fn();
vi.mock("@/lib/player-do-bunny", () => ({
  ouvirPlayer: (...args: unknown[]) => ouvirPlayer(...args),
}));
type Avisos = { aoTerminar: () => void; aoMudar: (estado: { segundos: number; pausado: boolean }) => void };
const avisos = () => ouvirPlayer.mock.calls[0][1] as Avisos;

import { BunnyPlayer } from "./BunnyPlayer";

// TROCAR DE ABA NÃO RECOMEÇA O VÍDEO (operador, 03/10/2026). O servidor assina o
// endereço de novo a cada busca (token e validade novos); se o player trocasse de
// endereço, recarregaria do zero e tocaria o que estava pausado.
const ENDERECO = (video: string, token: string) =>
  `https://iframe.mediadelivery.net/embed/762605/${video}?token=${token}&expires=1&autoplay=false`;

beforeEach(() => {
  ouvirPlayer.mockReset().mockReturnValue(() => {});
  localStorage.clear();
});

describe("BunnyPlayer — o endereço", () => {
  it("o mesmo vídeo com token novo: o mesmo quadro, sem recarregar", () => {
    const { rerender } = render(<BunnyPlayer src={ENDERECO("aaa", "t1")} title="Apresentação" />);
    const quadro = document.querySelector("iframe");

    rerender(<BunnyPlayer src={ENDERECO("aaa", "t2")} title="Apresentação" />);

    expect(document.querySelector("iframe")).toBe(quadro);
    expect(quadro?.getAttribute("src")).toBe(ENDERECO("aaa", "t1"));
  });

  it("outro vídeo: troca o endereço", () => {
    const { rerender } = render(<BunnyPlayer src={ENDERECO("aaa", "t1")} title="Aula" />);

    rerender(<BunnyPlayer src={ENDERECO("bbb", "t2")} title="Aula" />);

    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(ENDERECO("bbb", "t2"));
  });

  it("token novo não volta a ouvir o player (o aviso dos 90% continua valendo)", () => {
    const aoConcluir = vi.fn();
    const { rerender } = render(<BunnyPlayer src={ENDERECO("aaa", "t1")} title="Aula" aoConcluir={aoConcluir} />);

    rerender(<BunnyPlayer src={ENDERECO("aaa", "t2")} title="Aula" aoConcluir={aoConcluir} />);

    expect(ouvirPlayer).toHaveBeenCalledTimes(1);
  });
});

// O PONTO DA AULA (decisão do operador, 05/10/2026): quem sai e volta abre onde
// parou — pausado se tinha pausado, tocando se saiu tocando. Ver até o fim apaga.
// A AULA, não o vídeo de apresentação (sem `lembrarComo`, nada é lembrado).
const AULA = "https://iframe.mediadelivery.net/embed/762605/aaa?token=t1&expires=1&autoplay=true";
const PONTO = "jilson:ponto-da-aula:11";
const params = () => new URL(document.querySelector("iframe")?.getAttribute("src") ?? "").searchParams;

describe("BunnyPlayer — o ponto da aula", () => {
  it("saiu pausado: volta no ponto, pausado", () => {
    localStorage.setItem(PONTO, JSON.stringify({ segundos: 125.7, pausado: true }));
    render(<BunnyPlayer src={AULA} title="Aula" lembrarComo="11" />);
    expect(params().get("t")).toBe("125s");
    expect(params().get("autoplay")).toBe("false");
    expect(params().get("token")).toBe("t1");
  });

  it("saiu tocando: volta no ponto, tocando", () => {
    localStorage.setItem(PONTO, JSON.stringify({ segundos: 300, pausado: false }));
    render(<BunnyPlayer src={AULA} title="Aula" lembrarComo="11" />);
    expect(params().get("t")).toBe("300s");
    expect(params().get("autoplay")).toBe("true");
  });

  it("sem ponto guardado, ou ponto estranho: o endereço do servidor, como veio", () => {
    const { unmount } = render(<BunnyPlayer src={AULA} title="Aula" lembrarComo="11" />);
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(AULA);
    unmount();
    localStorage.setItem(PONTO, "{quebrado");
    render(<BunnyPlayer src={AULA} title="Aula" lembrarComo="11" />);
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(AULA);
  });

  it("o vídeo de apresentação não lembra nada", () => {
    localStorage.setItem("jilson:ponto-da-aula:apresentacao", JSON.stringify({ segundos: 90, pausado: true }));
    render(<BunnyPlayer src={AULA} title="Apresentação" />);
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(AULA);
    expect(ouvirPlayer).not.toHaveBeenCalled();
  });

  it("guarda o ponto enquanto assiste, e a pausa na hora", () => {
    render(<BunnyPlayer src={AULA} title="Aula" lembrarComo="11" />);
    avisos().aoMudar({ segundos: 40, pausado: false });
    expect(JSON.parse(localStorage.getItem(PONTO) ?? "null")).toEqual({ segundos: 40, pausado: false });
    avisos().aoMudar({ segundos: 41, pausado: true });
    expect(JSON.parse(localStorage.getItem(PONTO) ?? "null")).toEqual({ segundos: 41, pausado: true });
  });

  it("viu até o fim: apaga o ponto, avisa, e um aviso atrasado não o guarda de novo", () => {
    const aoTerminar = vi.fn();
    localStorage.setItem(PONTO, JSON.stringify({ segundos: 500, pausado: false }));
    render(<BunnyPlayer src={AULA} title="Aula" lembrarComo="11" aoTerminar={aoTerminar} />);
    avisos().aoTerminar();
    avisos().aoMudar({ segundos: 599, pausado: false });
    expect(localStorage.getItem(PONTO)).toBeNull();
    expect(aoTerminar).toHaveBeenCalledTimes(1);
  });

  it("navegador sem armazenamento: abre como veio e não quebra", () => {
    const ler = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    const gravar = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    render(<BunnyPlayer src={AULA} title="Aula" lembrarComo="11" />);
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(AULA);
    expect(() => avisos().aoMudar({ segundos: 40, pausado: true })).not.toThrow();
    ler.mockRestore();
    gravar.mockRestore();
  });
});
