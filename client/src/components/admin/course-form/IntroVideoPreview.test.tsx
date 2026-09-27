// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, act } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";

const getIntroVideoStatus = vi.fn();
vi.mock("@/lib/api", () => ({
  getIntroVideoStatus: (...args: unknown[]) => getIntroVideoStatus(...args),
}));

import { IntroVideoPreview } from "./IntroVideoPreview";

// A prévia do admin se atualiza sozinha quando o Bunny termina de processar
// (pedido do operador, 27/09/2026: o quadro ficava em "Processing video" até
// recarregar a página).

const GUID = "eb1c4f77-0cda-46be-b47d-1118ad7c2ffe";
const EMBED = `https://iframe.mediadelivery.net/embed/999/${GUID}`;
const PROCESSANDO = "O Bunny está processando o vídeo. A prévia atualiza sozinha quando terminar.";
const player = () => screen.getByTitle("Prévia do vídeo de apresentação");

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  getIntroVideoStatus.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("IntroVideoPreview", () => {
  it("processando: avisa; quando o Bunny termina, o aviso some e o quadro é recarregado", async () => {
    getIntroVideoStatus
      .mockResolvedValueOnce({ pronto: false, falhou: false })
      .mockResolvedValueOnce({ pronto: true, falhou: false });
    renderWithProviders(<IntroVideoPreview videoId={GUID} embedUrl={EMBED} />);

    expect(await screen.findByText(PROCESSANDO)).toBeTruthy();
    const antes = player();

    await act(() => vi.advanceTimersByTimeAsync(15_000));

    expect(screen.queryByText(PROCESSANDO)).toBeNull();
    expect(getIntroVideoStatus).toHaveBeenCalledTimes(2);
    expect(getIntroVideoStatus).toHaveBeenCalledWith(GUID);
    // Um quadro NOVO: é o recarregamento que tira o player do "Processing video".
    expect(player()).not.toBe(antes);
    expect(player().getAttribute("src")).toBe(EMBED);
  });

  it("vídeo já pronto: sem aviso, e pergunta uma vez só", async () => {
    getIntroVideoStatus.mockResolvedValue({ pronto: true, falhou: false });
    renderWithProviders(<IntroVideoPreview videoId={GUID} embedUrl={EMBED} />);

    await act(() => vi.advanceTimersByTimeAsync(60_000));

    expect(screen.queryByText(PROCESSANDO)).toBeNull();
    expect(getIntroVideoStatus).toHaveBeenCalledTimes(1);
  });

  it("o Bunny falhou: aparece o aviso para enviar de novo, e para de perguntar", async () => {
    getIntroVideoStatus.mockResolvedValue({ pronto: false, falhou: true });
    renderWithProviders(<IntroVideoPreview videoId={GUID} embedUrl={EMBED} />);

    expect((await screen.findByRole("alert")).textContent).toBe("O Bunny não conseguiu processar este vídeo. Envie de novo.");
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(getIntroVideoStatus).toHaveBeenCalledTimes(1);
  });

  it("depois de 20 minutos sem ficar pronto, para de perguntar", async () => {
    getIntroVideoStatus.mockResolvedValue({ pronto: false, falhou: false });
    renderWithProviders(<IntroVideoPreview videoId={GUID} embedUrl={EMBED} />);
    await screen.findByText(PROCESSANDO);

    await act(() => vi.advanceTimersByTimeAsync(21 * 60_000));
    const chamadas = getIntroVideoStatus.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(5 * 60_000));

    expect(getIntroVideoStatus.mock.calls.length).toBe(chamadas);
  });
});
