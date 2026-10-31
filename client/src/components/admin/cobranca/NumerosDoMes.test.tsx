// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { NumerosDoMes as Numeros } from "@jilson/core";

const adminNumerosDoMes = vi.fn<() => Promise<Numeros>>();
vi.mock("@/lib/api", () => ({ adminNumerosDoMes: () => adminNumerosDoMes() }));

import { NumerosDoMes } from "./NumerosDoMes";

// OS NÚMEROS DO MÊS NO TOPO DA COBRANÇA (etapa 4.7b, passo 6c — P143). O que protege: carregando; a falha diz e "tentar de
// novo" pede de novo; cada número com o rótulo dele (os assinantes divididos em mensal, anual e Pix e pagas por fora; o
// dinheiro em reais); sem a Stripe, o dinheiro é "—" e a faixa diz por quê.

const NUMEROS: Numeros = { desde: "2026-11-01T03:00:00.000Z", ativos: { mensal: 12, anual: 5, prePagas: 3, total: 20 }, novos: 4, encerradas: 2, atrasados: 1, entrou: 129870, devolvido: 9990 };

beforeEach(() => {
  adminNumerosDoMes.mockReset().mockResolvedValue(NUMEROS);
});

describe("os números do mês", () => {
  it("carregando", () => {
    adminNumerosDoMes.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<NumerosDoMes />);
    expect(screen.getByText("Carregando os números do mês…")).toBeTruthy();
  });

  it("cada número com o rótulo, os assinantes divididos, o dinheiro em reais e desde quando", async () => {
    renderWithProviders(<NumerosDoMes />);
    const faixa = await screen.findByRole("region", { name: "Os números do mês" });
    expect(within(faixa).getByText("Desde 01/11/2026 (o mês de Brasília).")).toBeTruthy();
    const valorDe = (rotulo: string) => within(faixa).getByText(rotulo).nextElementSibling?.textContent;
    expect(valorDe("Assinantes agora")).toBe("20");
    expect(within(faixa).getByText("mensal 12 · anual 5 · Pix e pagas por fora 3")).toBeTruthy();
    expect([valorDe("Novos no mês"), valorDe("Encerradas no mês"), valorDe("Atrasadas agora")]).toEqual(["4", "2", "1"]);
    expect(valorDe("Entrou no mês")).toMatch(/^R\$\s1\.298,70$/);
    expect(valorDe("Devolvido no mês")).toMatch(/^R\$\s99,90$/);
  });

  it("sem a Stripe: o dinheiro é '—', e a faixa diz por quê; o resto aparece", async () => {
    adminNumerosDoMes.mockResolvedValue({ ...NUMEROS, entrou: null, devolvido: null });
    renderWithProviders(<NumerosDoMes />);
    const faixa = await screen.findByRole("region", { name: "Os números do mês" });
    expect(within(faixa).getByText("Entrou no mês").nextElementSibling?.textContent).toBe("—");
    expect(within(faixa).getByText("A Stripe não respondeu agora.")).toBeTruthy();
    expect(within(faixa).getByText("Assinantes agora").nextElementSibling?.textContent).toBe("20");
  });

  it("a assinatura sem plano conhecido entra como 'outros', e a soma fecha", async () => {
    adminNumerosDoMes.mockResolvedValue({ ...NUMEROS, ativos: { mensal: 12, anual: 5, prePagas: 3, total: 21 } });
    renderWithProviders(<NumerosDoMes />);
    expect(await screen.findByText("mensal 12 · anual 5 · Pix e pagas por fora 3 · outros 1")).toBeTruthy();
  });

  it("a falha: diz que não carregou, e 'tentar de novo' pede de novo", async () => {
    adminNumerosDoMes.mockRejectedValueOnce(new Error("fora do ar"));
    renderWithProviders(<NumerosDoMes />);
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar os números do mês.");
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("region", { name: "Os números do mês" })).toBeTruthy();
    expect(adminNumerosDoMes).toHaveBeenCalledTimes(2);
  });
});
