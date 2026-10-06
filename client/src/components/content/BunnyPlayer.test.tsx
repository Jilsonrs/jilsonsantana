// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

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
// Vale até 2100: o endereço que ainda vale é o caso do dia a dia (o vencido tem testes abaixo).
const ATE_2100 = 4102444800;
const ENDERECO = (video: string, token: string) =>
  `https://iframe.mediadelivery.net/embed/762605/${video}?token=${token}&expires=${ATE_2100}&autoplay=false`;

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
const AULA = `https://iframe.mediadelivery.net/embed/762605/aaa?token=t1&expires=${ATE_2100}&autoplay=true`;
// O ponto é da aula 11 com o vídeo "aaa" (06/10/2026).
const PONTO = "jilson:ponto-da-aula:11:aaa";
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

  it("a aula trocou de vídeo: o ponto do vídeo antigo não vale, e a aula abre do começo", () => {
    localStorage.setItem("jilson:ponto-da-aula:11:velho", JSON.stringify({ segundos: 480, pausado: true }));
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

// O ENDEREÇO VENCIDO (decisão do operador, 06/10/2026: "se expirar, recarrega a
// aula"). Abrir o player com ele vencido dá 403 (doc do Bunny); a aba aberta de um
// dia para o outro pede um novo, e o player recarrega no mesmo ponto.
describe("BunnyPlayer — o endereço vencido", () => {
  const comValidade = (token: string, expira: number) =>
    `https://iframe.mediadelivery.net/embed/762605/aaa?token=${token}&expires=${expira}&autoplay=true`;
  const VENCIDO = comValidade("velho", 1);
  const NOVO = comValidade("novo", ATE_2100);
  afterEach(() => vi.useRealTimers());

  it("vencido: pede um endereço novo; quando ele chega, o player recarrega no ponto, pausado se estava", async () => {
    localStorage.setItem(PONTO, JSON.stringify({ segundos: 125, pausado: true }));
    const aoVencer = vi.fn();
    const { rerender } = render(<BunnyPlayer src={VENCIDO} title="Aula" lembrarComo="11" aoVencer={aoVencer} />);
    await waitFor(() => expect(aoVencer).toHaveBeenCalledTimes(1));

    rerender(<BunnyPlayer src={NOVO} title="Aula" lembrarComo="11" aoVencer={aoVencer} />);
    expect(params().get("token")).toBe("novo");
    expect(params().get("t")).toBe("125s");
    expect(params().get("autoplay")).toBe("false");
  });

  it("perto de vencer, o relógio pede um endereço novo — uma vez", () => {
    vi.useFakeTimers();
    const vinteMinutos = Math.floor(Date.now() / 1000) + 20 * 60;
    const aoVencer = vi.fn();
    render(<BunnyPlayer src={comValidade("t", vinteMinutos)} title="Aula" lembrarComo="11" aoVencer={aoVencer} />);
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(aoVencer).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(aoVencer).toHaveBeenCalledTimes(1);
  });

  it("play num endereço vencido (relógio atrasado na aba em segundo plano): pede, sem repetir a cada aviso", () => {
    vi.useFakeTimers();
    const aoVencer = vi.fn();
    render(<BunnyPlayer src={VENCIDO} title="Aula" lembrarComo="11" aoVencer={aoVencer} />);
    // O relógio ainda não andou: quem pede é o play.
    avisos().aoMudar({ segundos: 5, pausado: false });
    expect(aoVencer).toHaveBeenCalledTimes(1);
    avisos().aoMudar({ segundos: 5.3, pausado: false });
    avisos().aoMudar({ segundos: 5.6, pausado: false });
    vi.advanceTimersByTime(0);
    expect(aoVencer).toHaveBeenCalledTimes(1);
  });

  it("endereço que ainda vale: nada é pedido", () => {
    vi.useFakeTimers();
    const aoVencer = vi.fn();
    render(<BunnyPlayer src={NOVO} title="Aula" lembrarComo="11" aoVencer={aoVencer} />);
    avisos().aoMudar({ segundos: 5, pausado: false });
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(aoVencer).not.toHaveBeenCalled();
  });
});
