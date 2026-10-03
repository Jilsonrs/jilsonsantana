// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// O player do Bunny é ouvido pelo NOSSO módulo; aqui ele vira dublê.
const ouvirConclusao = vi.fn();
vi.mock("@/lib/player-do-bunny", () => ({
  ouvirConclusao: (...args: unknown[]) => ouvirConclusao(...args),
}));

import { BunnyPlayer } from "./BunnyPlayer";

// TROCAR DE ABA NÃO RECOMEÇA O VÍDEO (operador, 03/10/2026). O servidor assina o
// endereço de novo a cada busca (token e validade novos); se o player trocasse de
// endereço, recarregaria do zero e tocaria o que estava pausado.
const ENDERECO = (video: string, token: string) =>
  `https://iframe.mediadelivery.net/embed/762605/${video}?token=${token}&expires=1&autoplay=false`;

beforeEach(() => {
  ouvirConclusao.mockReset().mockReturnValue(() => {});
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

    expect(ouvirConclusao).toHaveBeenCalledTimes(1);
  });
});
