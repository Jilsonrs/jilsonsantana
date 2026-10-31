// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { CodigoCriado, CriarCodigoInput } from "@jilson/core";

const adminCriarCodigo = vi.fn<(pedido: CriarCodigoInput) => Promise<CodigoCriado>>();
vi.mock("@/lib/api", () => ({ adminCriarCodigo: (pedido: CriarCodigoInput) => adminCriarCodigo(pedido) }));

import { CriarCodigo } from "./CriarCodigo";

// CRIAR UM CÓDIGO PROMOCIONAL (etapa 4.7b, passo 6d — P142). O que protege: a cortesia manda só os usos (e a data, se
// houver) — o código e os 100% são do servidor; o desconto manda o texto em maiúsculas, o percentual, a duração e a
// validade; o campo que não passa diz qual é e não manda nada; o mesmo conteúdo enviado de novo leva o MESMO pedido (a
// resposta que se perdeu não cria outro código), e o conteúdo mudado leva outro; o que o servidor recusou diz por quê.

const preencher = (rotulo: string, valor: string) => fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
const criar = () => fireEvent.click(screen.getByRole("button", { name: "Criar código" }));

beforeEach(() => {
  adminCriarCodigo.mockReset().mockResolvedValue({ codigo: "PRESENTE-K7Q2X9", detalhe: "PRESENTE-K7Q2X9 · 100% em todas as cobranças · até 3 usos" });
});

describe("criar um código promocional", () => {
  it("a cortesia manda só os usos — sem código nem percentual — e diz o que foi criado", async () => {
    renderWithProviders(<CriarCodigo />);
    expect((screen.getByRole("radio", { name: "Cortesia (100%)" }) as HTMLInputElement).checked).toBe(true);
    preencher("Quantos usos", "3");
    criar();
    expect((await screen.findByRole("status")).textContent).toBe("Criado: PRESENTE-K7Q2X9 · 100% em todas as cobranças · até 3 usos.");
    expect(adminCriarCodigo.mock.calls).toEqual([[{ tipo: "cortesia", usos: 3, pedido: expect.stringMatching(/^[a-f0-9]{32}$/) }]]);
  });

  it("a cortesia com data manda a data", async () => {
    renderWithProviders(<CriarCodigo />);
    preencher("Vale até (opcional)", "2026-12-31");
    criar();
    await screen.findByRole("status");
    expect(adminCriarCodigo.mock.calls[0]?.[0]).toMatchObject({ tipo: "cortesia", usos: 1, validoAte: "2026-12-31" });
  });

  it("o desconto manda o texto em maiúsculas, o percentual, a duração e a validade", async () => {
    renderWithProviders(<CriarCodigo />);
    fireEvent.click(screen.getByRole("radio", { name: "Desconto" }));
    preencher("Código", "black-50");
    preencher("Desconto (%)", "50");
    fireEvent.click(screen.getByRole("radio", { name: "Todas as cobranças" }));
    preencher("Vale até", "2026-11-30");
    criar();
    await screen.findByRole("status");
    expect(adminCriarCodigo.mock.calls).toEqual([[{ tipo: "desconto", codigo: "BLACK-50", percentual: 50, duracao: "para-sempre", validoAte: "2026-11-30", pedido: expect.stringMatching(/^[a-f0-9]{32}$/) }]]);
  });

  it("o campo que não passa diz qual é, e nada é enviado", () => {
    renderWithProviders(<CriarCodigo />);
    preencher("Quantos usos", "21");
    criar();
    expect(screen.getByRole("alert").textContent).toBe("A cortesia vale de 1 a 20 usos.");
    fireEvent.click(screen.getByRole("radio", { name: "Desconto" }));
    preencher("Código", "BLACK50");
    preencher("Desconto (%)", "100");
    preencher("Vale até", "2026-11-30");
    criar();
    expect(screen.getByRole("alert").textContent).toBe("O desconto vai de 1% a 99%.");
    preencher("Desconto (%)", "40");
    preencher("Vale até", "");
    criar();
    expect(screen.getByRole("alert").textContent).toBe("Escolha até quando o código vale.");
    preencher("Código", "AB");
    preencher("Vale até", "2026-11-30");
    criar();
    expect(screen.getByRole("alert").textContent).toBe("O código leva letras, números e hífen: de 4 a 30.");
    expect(adminCriarCodigo).not.toHaveBeenCalled();
  });

  it("o mesmo conteúdo enviado de novo leva o MESMO pedido; mudou um campo, é outro pedido; depois de criado, outro", async () => {
    adminCriarCodigo.mockRejectedValueOnce(new Error("a resposta se perdeu"));
    renderWithProviders(<CriarCodigo />);
    preencher("Quantos usos", "2");
    criar();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível. Tente de novo.");
    criar();
    await screen.findByRole("status");
    const [primeiro, segundo] = adminCriarCodigo.mock.calls.map(([corpo]) => corpo.pedido);
    expect(segundo).toBe(primeiro);
    preencher("Quantos usos", "2");
    criar();
    await vi.waitFor(() => expect(adminCriarCodigo).toHaveBeenCalledTimes(3));
    expect(adminCriarCodigo.mock.calls[2]?.[0].pedido).not.toBe(primeiro);
    adminCriarCodigo.mockRejectedValueOnce(new Error("de novo"));
    preencher("Quantos usos", "4");
    criar();
    await screen.findByRole("alert");
    preencher("Quantos usos", "5");
    criar();
    await vi.waitFor(() => expect(adminCriarCodigo).toHaveBeenCalledTimes(5));
    expect(adminCriarCodigo.mock.calls[4]?.[0].pedido).not.toBe(adminCriarCodigo.mock.calls[3]?.[0].pedido);
  });

  it("o texto que já existe: diz isso", async () => {
    adminCriarCodigo.mockRejectedValue({ response: { data: { error: "CodigoJaExiste" } } });
    renderWithProviders(<CriarCodigo />);
    fireEvent.click(screen.getByRole("radio", { name: "Desconto" }));
    preencher("Código", "BLACK50");
    preencher("Desconto (%)", "50");
    preencher("Vale até", "2026-11-30");
    criar();
    expect((await screen.findByRole("alert")).textContent).toBe("Já existe um código ativo com esse texto. Escolha outro, ou pause o que existe.");
  });
});
