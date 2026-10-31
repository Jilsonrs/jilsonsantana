// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";

const adminPedirCodigoDoEmail = vi.fn<(conta: string, email: string) => Promise<{ minutos: number }>>();
const adminCorrigirEmail = vi.fn<(conta: string, email: string, codigo: string) => Promise<{ email: string }>>();
vi.mock("@/lib/api", () => ({
  adminPedirCodigoDoEmail: (conta: string, email: string) => adminPedirCodigoDoEmail(conta, email),
  adminCorrigirEmail: (conta: string, email: string, codigo: string) => adminCorrigirEmail(conta, email, codigo),
}));

import { CorrigirEmail } from "./CorrigirEmail";

// CORRIGIR O E-MAIL NA FICHA (etapa 4.7b, passo 3c — P121). O que protege: o e-mail certo vai aparado e em minúsculas
// para a conta da ficha; o código só aparece depois de o servidor dizer que saiu, e vai com o MESMO e-mail; o que não
// deu diz por quê (e a conta ocupada, com a frase dela); "Cancelar" desiste sem pedir nada; o carregando trava o botão.

const abrir = () => {
  renderWithProviders(<CorrigirEmail conta="u-1" />);
  fireEvent.click(screen.getByRole("button", { name: "Corrigir o e-mail" }));
};
const pedirO = (email: string) => {
  fireEvent.change(screen.getByLabelText("O e-mail certo"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar o código" }));
};
const erro = (codigo: string) => ({ response: { data: { error: codigo } } });

beforeEach(() => {
  adminPedirCodigoDoEmail.mockReset().mockResolvedValue({ minutos: 10 });
  adminCorrigirEmail.mockReset().mockResolvedValue({ email: "ana@exemplo.com" });
});

describe("corrigir o e-mail", () => {
  it("o e-mail certo (aparado, em minúsculas) → o código → a troca, com o mesmo e-mail; no fim, diz o que aconteceu", async () => {
    abrir();
    pedirO("  Ana@Exemplo.com ");
    expect(await screen.findByText("Código enviado para ana@exemplo.com. Ele vale por 10 minutos.")).toBeTruthy();
    expect(adminPedirCodigoDoEmail.mock.calls).toEqual([["u-1", "ana@exemplo.com"]]);
    fireEvent.change(screen.getByLabelText("O código que a pessoa recebeu"), { target: { value: " 123456 " } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar a troca" }));
    expect(await screen.findByText("E-mail corrigido para ana@exemplo.com. As sessões e a senha antigas foram encerradas.")).toBeTruthy();
    expect(adminCorrigirEmail.mock.calls).toEqual([["u-1", "ana@exemplo.com", "123456"]]);
    expect(screen.queryByLabelText("O código que a pessoa recebeu")).toBeNull();
  });

  it("o código não aparece se o e-mail não saiu: diz por quê, e o formulário continua no e-mail", async () => {
    adminPedirCodigoDoEmail.mockRejectedValueOnce(erro("EmailDeOutraConta"));
    abrir();
    pedirO("ana@exemplo.com");
    expect((await screen.findByRole("alert")).textContent).toBe("Este e-mail já é de outra conta.");
    expect(screen.queryByLabelText("O código que a pessoa recebeu")).toBeNull();
    expect(screen.getByLabelText("O e-mail certo")).toBeTruthy();
  });

  it("o código errado diz isso, e deixa tentar de novo; a conta ocupada tem a frase dela", async () => {
    adminCorrigirEmail.mockRejectedValueOnce(erro("CodigoErrado")).mockRejectedValueOnce(erro("Ocupada"));
    abrir();
    pedirO("ana@exemplo.com");
    fireEvent.change(await screen.findByLabelText("O código que a pessoa recebeu"), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar a troca" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Código errado. Confira com a pessoa e tente de novo.");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar a troca" }));
    expect(await screen.findByText("A conta está com outra operação em andamento. Tente de novo em instantes.")).toBeTruthy();
  });

  it("carregando: o botão diz 'Enviando…' e não deixa clicar de novo", async () => {
    adminPedirCodigoDoEmail.mockReturnValueOnce(new Promise(() => {}));
    abrir();
    pedirO("ana@exemplo.com");
    const botao = await screen.findByRole("button", { name: "Enviando…" });
    expect((botao as HTMLButtonElement).disabled).toBe(true);
  });

  it("'Cancelar' desiste sem pedir nada", () => {
    abrir();
    fireEvent.change(screen.getByLabelText("O e-mail certo"), { target: { value: "ana@exemplo.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("button", { name: "Corrigir o e-mail" })).toBeTruthy();
    expect(adminPedirCodigoDoEmail).not.toHaveBeenCalled();
  });
});
