// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import type { PlanosDaAssinatura } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";

const getPlanosSemLogin = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getPlanosSemLogin: (...args: unknown[]) => getPlanosSemLogin(...args),
}));

import { AssinarSemLoginPage } from "./AssinarSemLoginPage";

// A TELA PÚBLICA DE ASSINAR, a parte do app (etapa 4.7, passo 6c). O que estes testes protegem:
//   - os planos vêm da rota SEM LOGIN (o visitante não tem sessão), com o Mensal marcado;
//   - carregando, erro e "sem planos" (a Stripe sem os preços) — nunca uma tela em branco.

const PLANOS: PlanosDaAssinatura = {
  chavePublicavel: "pk_test_da_tela",
  planos: [
    { plano: "mensal", centavos: 9990, moeda: "brl" },
    { plano: "anual", centavos: 99500, moeda: "brl" },
  ],
  formasDePagamento: ["card"],
};

beforeEach(() => {
  getPlanosSemLogin.mockReset();
});

describe("a tela pública de assinar (o app)", () => {
  it("enquanto os planos não chegam: Carregando…", () => {
    getPlanosSemLogin.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AssinarSemLoginPage />);
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("os dois planos, da rota sem login, com o Mensal marcado", async () => {
    getPlanosSemLogin.mockResolvedValue(PLANOS);
    renderWithProviders(<AssinarSemLoginPage />);
    const mensal = (await screen.findByRole("radio", { name: /Mensal/ })) as HTMLInputElement;
    const anual = screen.getByRole("radio", { name: /Anual/ }) as HTMLInputElement;
    expect([mensal.checked, anual.checked]).toEqual([true, false]);
    expect(getPlanosSemLogin).toHaveBeenCalledTimes(1);
  });

  it("a leitura falhou: o aviso no lugar dos planos", async () => {
    getPlanosSemLogin.mockRejectedValue(new Error("fora do ar"));
    renderWithProviders(<AssinarSemLoginPage />);
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar os planos. Tente de novo.");
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("sem planos (a Stripe sem os preços): o mesmo aviso, nunca a tela em branco", async () => {
    getPlanosSemLogin.mockResolvedValue({ ...PLANOS, planos: [] });
    renderWithProviders(<AssinarSemLoginPage />);
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar os planos. Tente de novo.");
  });
});
