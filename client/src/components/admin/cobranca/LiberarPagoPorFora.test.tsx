// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";

const adminLiberarPagoPorFora = vi.fn<(conta: string, plano: string) => Promise<{ detalhe: string }>>();
vi.mock("@/lib/api", () => ({
  adminLiberarPagoPorFora: (conta: string, plano: string) => adminLiberarPagoPorFora(conta, plano),
}));

import { LiberarPagoPorFora } from "./LiberarPagoPorFora";

// "LIBERAR ACESSO PAGO POR FORA" NA FICHA (etapa 4.7b, passo 4d — P120). O que protege: o plano começa no mensal e pode ser
// o anual; a confirmação diz o efeito (por quanto tempo, sem renovar, no registro); confirmar manda a conta e o plano; o que
// não deu diz por quê; "Cancelar" e "Voltar" desistem sem pedir nada.

const abrir = () => {
  renderWithProviders(<LiberarPagoPorFora conta="u-1" quem="Ana Souza" />);
  fireEvent.click(screen.getByRole("button", { name: "Liberar acesso pago por fora" }));
};

beforeEach(() => {
  adminLiberarPagoPorFora.mockReset().mockResolvedValue({ detalhe: "anual pago por fora; com acesso às aulas até 2027-10-31" });
});

describe("liberar acesso pago por fora", () => {
  it("o anual: a confirmação diz um ano, sem renovar; confirmar manda a conta e o plano, e diz o que o servidor fez", async () => {
    abrir();
    expect((screen.getByRole("radio", { name: "Mensal" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Anual" }));
    fireEvent.click(screen.getByRole("button", { name: "Liberar" }));
    expect(screen.getByRole("group", { name: "Confirmar a liberação" }).textContent).toBe("Ana Souza ganha acesso por um ano, pago por fora. A assinatura não renova e não cobra cartão. Fica no registro quem liberou.ConfirmarVoltar");
    expect(adminLiberarPagoPorFora).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText("Feito: anual pago por fora; com acesso às aulas até 2027-10-31.")).toBeTruthy();
    expect(adminLiberarPagoPorFora.mock.calls).toEqual([["u-1", "anual"]]);
  });

  it("a conta que já tem acesso: diz isso", async () => {
    adminLiberarPagoPorFora.mockRejectedValue({ response: { data: { error: "JaTemAcesso" } } });
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Liberar" }));
    expect(screen.getByRole("group", { name: "Confirmar a liberação" }).textContent).toContain("por um mês");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("A pessoa já tem acesso às aulas: nada foi liberado.");
  });

  it("'Voltar' e 'Cancelar' desistem sem pedir nada", () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Liberar" }));
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("button", { name: "Liberar acesso pago por fora" })).toBeTruthy();
    expect(adminLiberarPagoPorFora).not.toHaveBeenCalled();
  });
});
