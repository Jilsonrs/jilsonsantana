// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { CobrancaDaFicha } from "@jilson/core";

type Quem = { conta: string } | { visitante: string };
const adminDevolverPagamento = vi.fn<(quem: Quem, cobranca: string, centavos: number, encerrar: boolean) => Promise<{ detalhe: string }>>();
vi.mock("@/lib/api", () => ({
  adminDevolverPagamento: (quem: Quem, cobranca: string, centavos: number, encerrar: boolean) => adminDevolverPagamento(quem, cobranca, centavos, encerrar),
}));

import { DevolverPagamento } from "./DevolverPagamento";

// "DEVOLVER UM PAGAMENTO" NA FICHA (etapa 4.7b, passo 4a — P139). O que protege: o valor começa no que falta voltar e não
// passa dele; o que não é valor não segue; a confirmação diz o efeito; vai a conta (ou o visitante), a cobrança e o valor
// em centavos; o que não deu diz por quê; a cobrança sem nada a devolver não tem o botão.

const cobranca = (extra: Partial<CobrancaDaFicha> = {}): CobrancaDaFicha => ({ id: "ch_1", em: "2026-11-20T15:00:00.000Z", centavos: 9990, moeda: "brl", forma: "cartao", cartao: { bandeira: "visa", final: "4242" }, situacao: "paga", devolvido: 0, motivoDaFalha: null, recibo: null, contestacao: null, ...extra });
const abrir = (extra: Partial<CobrancaDaFicha> = {}, quem: Quem = { conta: "u-1" }) => renderWithProviders(<DevolverPagamento cobranca={cobranca(extra)} quem={quem} />);
const campo = () => screen.getByLabelText(/^Quanto devolver/) as HTMLInputElement;

beforeEach(() => {
  adminDevolverPagamento.mockReset().mockResolvedValue({ detalhe: "R$ 10,00 devolvidos desta cobrança; com acesso às aulas" });
});

describe("devolver um pagamento", () => {
  it("começa no que falta voltar; uma parte; a confirmação diz o efeito; vai a conta, a cobrança e os centavos", async () => {
    abrir({ situacao: "devolvida-em-parte", devolvido: 2000 });
    fireEvent.click(screen.getByRole("button", { name: "Devolver" }));
    expect(campo().value).toBe("79,90");
    fireEvent.change(campo(), { target: { value: "10,00" } });
    fireEvent.click(screen.getByRole("button", { name: "Devolver" }));
    expect(screen.getByRole("group", { name: "Confirmar a devolução" }).textContent).toMatch(/^Devolve R\$\s10,00 desta cobrança\. A assinatura e o acesso continuam como estão\./);
    expect(adminDevolverPagamento).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText("Feito: R$ 10,00 devolvidos desta cobrança; com acesso às aulas.")).toBeTruthy();
    expect(adminDevolverPagamento.mock.calls).toEqual([[{ conta: "u-1" }, "ch_1", 1000, false]]);
  });

  it("'E encerrar a assinatura agora': a confirmação diz que o acesso acaba, e vai junto", async () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Devolver" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "E encerrar a assinatura agora" }));
    fireEvent.click(screen.getByRole("button", { name: "Devolver" }));
    expect(screen.getByRole("group", { name: "Confirmar a devolução" }).textContent).toMatch(/^Encerra agora a assinatura desta cobrança e devolve R\$\s99,90: a pessoa perde o acesso às aulas, e nada mais é cobrado\./);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText(/^Feito:/)).toBeTruthy();
    expect(adminDevolverPagamento.mock.calls).toEqual([[{ conta: "u-1" }, "ch_1", 9990, true]]);
  });

  it("acima do que falta, ou o que não é valor: não segue, e diz o limite", () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Devolver" }));
    for (const valor of ["100,00", "abc"]) {
      fireEvent.change(campo(), { target: { value: valor } });
      expect((screen.getByRole("button", { name: "Devolver" }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByRole("alert").textContent).toMatch(/^Digite um valor em reais, como 99,90, até R\$\s99,90\.$/);
    }
  });

  it("o visitante vai como visitante; o que não deu diz por quê", async () => {
    adminDevolverPagamento.mockRejectedValue({ response: { data: { error: "ValorAcimaDoQueFalta" } } });
    abrir({}, { visitante: "ficha-1" });
    fireEvent.click(screen.getByRole("button", { name: "Devolver" }));
    fireEvent.click(screen.getByRole("button", { name: "Devolver" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("O valor passa do que falta voltar desta cobrança.");
    expect(adminDevolverPagamento.mock.calls).toEqual([[{ visitante: "ficha-1" }, "ch_1", 9990, false]]);
  });

  it("a que falhou, a já devolvida e a contestada não têm o botão", () => {
    for (const situacao of ["falhou", "devolvida", "contestada"] as const) {
      const { unmount } = abrir({ situacao });
      expect(screen.queryByRole("button", { name: "Devolver" })).toBeNull();
      unmount();
    }
  });
});
