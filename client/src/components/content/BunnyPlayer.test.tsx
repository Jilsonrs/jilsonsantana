// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import type { OuvintesDoPlayer } from "@/lib/player-do-bunny";

// O player do Bunny é ouvido pelo NOSSO módulo; aqui ele vira dublê.
const ouvirPlayer = vi.fn();
vi.mock("@/lib/player-do-bunny", () => ({
  ouvirPlayer: (...args: unknown[]) => ouvirPlayer(...args),
}));
/** Os avisos que o player entregou ao NOSSO módulo, para o teste disparar. */
const avisos = () => ouvirPlayer.mock.calls[0][1] as Required<OuvintesDoPlayer>;

import { BunnyPlayer } from "./BunnyPlayer";

// TROCAR DE ABA NÃO RECOMEÇA O VÍDEO (operador, 03/10/2026). O servidor assina o
// endereço de novo a cada busca (token e validade novos); se o player trocasse de
// endereço, recarregaria do zero.
// Vale até 2100: o endereço que ainda vale é o caso do dia a dia (o vencido tem testes abaixo).
const ATE_2100 = 4102444800;
const ENDERECO = (video: string, token: string) =>
  `https://iframe.mediadelivery.net/embed/762605/${video}?token=${token}&expires=${ATE_2100}&autoplay=false`;

beforeEach(() => {
  ouvirPlayer.mockReset().mockReturnValue(() => {});
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

// ONDE COMEÇA (Bloco AULA — decisões do operador, 06/10/2026): a aula abre no ponto
// guardado na CONTA, e SEMPRE TOCANDO — o "pausou, volta pausado" de 05/10 foi
// revogado. Tocar sozinho vem do servidor (a aula toca; a apresentação abre pausada).
const AULA = `https://iframe.mediadelivery.net/embed/762605/aaa?token=t1&expires=${ATE_2100}&autoplay=true`;
const params = () => new URL(document.querySelector("iframe")?.getAttribute("src") ?? "").searchParams;

describe("BunnyPlayer — onde a aula começa", () => {
  it("com ponto: abre nele (em segundos inteiros), tocando, com o token do servidor", () => {
    render(<BunnyPlayer src={AULA} title="Aula" comecarEm={125.7} />);
    expect(params().get("t")).toBe("125s");
    expect(params().get("autoplay")).toBe("true");
    expect(params().get("token")).toBe("t1");
  });

  it("sem ponto, ou antes do começo útil (5 s): o endereço como veio", () => {
    const { unmount } = render(<BunnyPlayer src={AULA} title="Aula" comecarEm={null} />);
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(AULA);
    unmount();
    render(<BunnyPlayer src={AULA} title="Aula" comecarEm={4} />);
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(AULA);
  });

  it("o player nunca muda o tocar sozinho: nem na aula com ponto, nem na apresentação", () => {
    const { unmount } = render(<BunnyPlayer src={AULA} title="Aula" comecarEm={300} />);
    expect(params().get("autoplay")).toBe("true");
    unmount();
    render(<BunnyPlayer src={ENDERECO("aaa", "t1")} title="Apresentação" />);
    expect(params().get("autoplay")).toBe("false");
  });

  it("a mesma aula com OUTRO vídeo (o operador trocou): abre no ponto que veio com ele", () => {
    const { rerender } = render(<BunnyPlayer src={AULA} title="Aula" comecarEm={300} />);
    rerender(<BunnyPlayer src={AULA.replace("/aaa?", "/bbb?")} title="Aula" comecarEm={30} />);
    expect(params().get("t")).toBe("30s");
  });

  it("o vídeo de apresentação não é ouvido", () => {
    render(<BunnyPlayer src={ENDERECO("aaa", "t1")} title="Apresentação" />);
    expect(ouvirPlayer).not.toHaveBeenCalled();
  });
});

describe("BunnyPlayer — os avisos para gravar o ponto", () => {
  it("o vídeo andou, pausou, voltou a tocar: avisa cada um", () => {
    const [aoAndar, aoPausar, aoTocar] = [vi.fn(), vi.fn(), vi.fn()];
    render(<BunnyPlayer src={AULA} title="Aula" aoAndar={aoAndar} aoPausar={aoPausar} aoTocar={aoTocar} />);

    avisos().aoAndar(40, 600);
    avisos().aoPausar(41);
    avisos().aoTocar();

    expect(aoAndar).toHaveBeenCalledWith(40, 600);
    expect(aoPausar).toHaveBeenCalledWith(41);
    expect(aoTocar).toHaveBeenCalledTimes(1);
  });

  it("viu até o fim: avisa; o aviso de tempo ATRASADO não sai; dar play de novo (rever) volta a avisar", () => {
    const [aoTerminar, aoAndar, aoPausar] = [vi.fn(), vi.fn(), vi.fn()];
    render(<BunnyPlayer src={AULA} title="Aula" aoTerminar={aoTerminar} aoAndar={aoAndar} aoPausar={aoPausar} />);

    avisos().aoTerminar();
    avisos().aoAndar(599, 600);
    avisos().aoPausar(599);
    expect(aoTerminar).toHaveBeenCalledTimes(1);
    expect(aoAndar).not.toHaveBeenCalled();
    expect(aoPausar).not.toHaveBeenCalled();

    avisos().aoTocar();
    avisos().aoAndar(1, 600);
    expect(aoAndar).toHaveBeenCalledWith(1, 600);
  });
});

// O ENDEREÇO VENCIDO (decisão do operador, 06/10/2026: "se expirar, recarrega a
// aula"). Abrir o player com ele vencido dá 403 (doc do Bunny); a aba aberta de um
// dia para o outro pede um novo, e o player recarrega no mesmo ponto, tocando.
describe("BunnyPlayer — o endereço vencido", () => {
  const comValidade = (token: string, expira: number) =>
    `https://iframe.mediadelivery.net/embed/762605/aaa?token=${token}&expires=${expira}&autoplay=true`;
  const VENCIDO = comValidade("velho", 1);
  const NOVO = comValidade("novo", ATE_2100);
  afterEach(() => vi.useRealTimers());

  it("vencido: pede um endereço novo; quando ele chega, recarrega no ponto em que o vídeo estava, tocando", async () => {
    const aoVencer = vi.fn();
    const { rerender } = render(<BunnyPlayer src={VENCIDO} title="Aula" comecarEm={125} aoVencer={aoVencer} />);
    await waitFor(() => expect(aoVencer).toHaveBeenCalledTimes(1));
    avisos().aoAndar(200, 600);

    rerender(<BunnyPlayer src={NOVO} title="Aula" comecarEm={125} aoVencer={aoVencer} />);

    expect(params().get("token")).toBe("novo");
    expect(params().get("t")).toBe("200s");
    expect(params().get("autoplay")).toBe("true");
  });

  it("vencido antes de o vídeo andar: recarrega no ponto com que abriu", async () => {
    const aoVencer = vi.fn();
    const { rerender } = render(<BunnyPlayer src={VENCIDO} title="Aula" comecarEm={125} aoVencer={aoVencer} />);
    await waitFor(() => expect(aoVencer).toHaveBeenCalledTimes(1));

    rerender(<BunnyPlayer src={NOVO} title="Aula" comecarEm={125} aoVencer={aoVencer} />);

    expect(params().get("t")).toBe("125s");
  });

  it("perto de vencer, o relógio pede um endereço novo — uma vez", () => {
    vi.useFakeTimers();
    const vinteMinutos = Math.floor(Date.now() / 1000) + 20 * 60;
    const aoVencer = vi.fn();
    render(<BunnyPlayer src={comValidade("t", vinteMinutos)} title="Aula" aoVencer={aoVencer} />);
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(aoVencer).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(aoVencer).toHaveBeenCalledTimes(1);
  });

  it("play num endereço vencido (relógio atrasado na aba em segundo plano): pede, sem repetir a cada aviso", () => {
    vi.useFakeTimers();
    const aoVencer = vi.fn();
    render(<BunnyPlayer src={VENCIDO} title="Aula" aoVencer={aoVencer} />);
    // O relógio ainda não andou: quem pede é o play.
    avisos().aoTocar();
    expect(aoVencer).toHaveBeenCalledTimes(1);
    avisos().aoAndar(5.3, 600);
    avisos().aoAndar(5.6, 600);
    vi.advanceTimersByTime(0);
    expect(aoVencer).toHaveBeenCalledTimes(1);
  });

  it("endereço que ainda vale: nada é pedido", () => {
    vi.useFakeTimers();
    const aoVencer = vi.fn();
    render(<BunnyPlayer src={NOVO} title="Aula" aoVencer={aoVencer} />);
    avisos().aoTocar();
    avisos().aoAndar(5, 600);
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(aoVencer).not.toHaveBeenCalled();
  });
});
