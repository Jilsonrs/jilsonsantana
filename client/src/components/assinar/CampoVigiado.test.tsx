// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";

// O CAMPO DE PAGAMENTO VIGIADO (E3 da revisão ampla da cobrança, 29/10/2026). O que protege: o campo da Stripe que não
// fica pronto no prazo, ou que falha ao carregar, mostra a frase aprovada pelo operador (P116) e avisa o servidor UMA
// vez — com a tela e o motivo; o que fica pronto não diz nada nem avisa; o que fica pronto tarde apaga a frase.
// A fronteira com o Stripe.js vira dublê: o campo de mentira tem dois botões, "ficar pronto" e "falhar".
const avisarCampoQueNaoAbriu = vi.fn<(corpo: { tela: string; motivo: string }) => Promise<void>>();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  avisarCampoQueNaoAbriu: (corpo: { tela: string; motivo: string }) => avisarCampoQueNaoAbriu(corpo),
}));
vi.mock("@/lib/stripe-do-site", () => ({
  CampoDoCartao: ({ pix, aoFicarPronto, aoFalhar }: { pix?: boolean; aoFicarPronto?: () => void; aoFalhar?: () => void }) => (
    <div data-testid="campo" data-pix={pix ? "sim" : "não"}>
      <button type="button" onClick={() => aoFicarPronto?.()}>
        ficar pronto
      </button>
      <button type="button" onClick={() => aoFalhar?.()}>
        falhar
      </button>
    </div>
  ),
}));

import { CampoVigiado } from "./CampoVigiado";

const FRASE = "O campo de pagamento não carregou. Tente outro navegador ou desative o bloqueador; se continuar, escreva para suporte@jilsonsantana.com.";

beforeEach(() => {
  avisarCampoQueNaoAbriu.mockReset().mockResolvedValue(undefined);
});

describe("o campo de pagamento vigiado", () => {
  it("fica pronto no prazo: nenhuma frase e nenhum aviso — nem depois do prazo", async () => {
    renderWithProviders(<CampoVigiado tela="assinar" espera={30} />);
    fireEvent.click(screen.getByRole("button", { name: "ficar pronto" }));
    await new Promise((fim) => setTimeout(fim, 80));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(avisarCampoQueNaoAbriu).not.toHaveBeenCalled();
  });

  it("não fica pronto no prazo: a frase do operador e UM aviso ao servidor, com a tela e o motivo", async () => {
    renderWithProviders(<CampoVigiado tela="assinar-sem-login" pix espera={30} />);
    expect((await screen.findByRole("alert")).textContent).toBe(FRASE);
    expect(avisarCampoQueNaoAbriu.mock.calls).toEqual([[{ tela: "assinar-sem-login", motivo: "nao-carregou" }]]);
    expect(screen.getByTestId("campo").dataset.pix).toBe("sim");
  });

  it("a Stripe diz que falhou: a frase na hora e UM aviso — o prazo vencendo depois não avisa de novo", async () => {
    renderWithProviders(<CampoVigiado tela="trocar-cartao" espera={60} />);
    fireEvent.click(screen.getByRole("button", { name: "falhar" }));
    expect((await screen.findByRole("alert")).textContent).toBe(FRASE);
    await new Promise((fim) => setTimeout(fim, 120));
    expect(avisarCampoQueNaoAbriu.mock.calls).toEqual([[{ tela: "trocar-cartao", motivo: "erro-ao-carregar" }]]);
  });

  it("fica pronto DEPOIS do prazo (a rede devagar): a frase some, e nenhum aviso a mais", async () => {
    renderWithProviders(<CampoVigiado tela="assinar" espera={30} />);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "ficar pronto" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(avisarCampoQueNaoAbriu).toHaveBeenCalledTimes(1);
  });

  it("o aviso ao servidor que falha (sem rede) não derruba a tela: a frase continua", async () => {
    const registro = vi.spyOn(console, "warn").mockImplementation(() => {});
    avisarCampoQueNaoAbriu.mockRejectedValue(new Error("Network Error"));
    renderWithProviders(<CampoVigiado tela="assinar" espera={30} />);
    expect((await screen.findByRole("alert")).textContent).toBe(FRASE);
    await waitFor(() => expect(registro).toHaveBeenCalled());
    registro.mockRestore();
  });
});
